import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from database import AsyncSessionLocal
from security import hash_token
from models.user import UserModel, UserSessionModel, AdminAuditLogModel, UserInvestmentRecordModel
from models.financial import (
    LegalEntityModel,
    AssetModel,
    AccountModel,
    AccountBalanceModel,
    JournalEntryModel,
)


def create_uuid() -> str:
    return str(uuid.uuid4())


async def setup_test_user(session: AsyncSession, email: str, full_name: str, role: str = "investor") -> tuple[UserModel, str]:
    unique_email = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}@{email.split('@')[1]}"
    user = UserModel(
        id=create_uuid(),
        full_name=full_name,
        email=unique_email,
        password_hash="argon2id_mock_hash",
        role=role,
        is_active=True,
        is_verified=True,
        mfa_enabled=False,
    )
    session.add(user)
    await session.flush()

    raw_token = f"session_tok_{role}_{uuid.uuid4()}"
    user_session = UserSessionModel(
        id=create_uuid(),
        user_id=user.id,
        session_token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    session.add(user_session)
    await session.commit()
    return user, raw_token


@pytest.mark.asyncio
async def test_investment_record_lifecycle_and_safeguards():
    """
    Comprehensive test suite for administrator-managed investment amount:
    1. Administrator can query investment record (missing record returns honest empty state: hasRecord=False).
    2. Missing record on investor /me endpoint returns honest empty state (hasRecord=False).
    3. Administrator can create an investment record.
    4. Administrator can update an existing record.
    5. Negative amounts are rejected.
    6. Unsupported currency is rejected.
    7. Substantive reason is strictly enforced.
    8. Audit log is durably recorded with Admin ID, Target User ID, Previous Amount, New Amount, Currency, Reason, Timestamp.
    9. Ordinary investors cannot modify investment records (403 forbidden).
    10. Ordinary investors cannot modify via /users/me/investment-record (405 Method Not Allowed).
    11. Ordinary investors can only view their own record derived from their session.
    12. Financial integrity: manually recorded investment does not alter wallet balances, account balances, or ledger entries.
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        admin_user, admin_token = await setup_test_user(session, "lead.admin@nexora.internal", "Lead Admin", "admin")
        investor_1, investor_token_1 = await setup_test_user(session, "investor1@example.com", "Alice Investor", "investor")
        investor_2, investor_token_2 = await setup_test_user(session, "investor2@example.com", "Bob Investor", "investor")

        # Set up a ledger account for investor_1 to check balance non-interference
        stmt_entity = select(LegalEntityModel).limit(1)
        res_entity = await session.execute(stmt_entity)
        entity = res_entity.scalar_one()

        stmt_usd = select(AssetModel).where(AssetModel.symbol == "USD")
        res_usd = await session.execute(stmt_usd)
        asset_usd = res_usd.scalar_one()

        acct_1 = AccountModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            user_id=investor_1.id,
            asset_id=asset_usd.id,
            account_number=f"ACT-INV-USD-{uuid.uuid4().hex[:6].upper()}",
            name="Alice USD Deposit Account",
            account_type="LIABILITY",
            account_category="INVESTOR_DEPOSIT",
            normal_balance="CREDIT",
            is_active=True,
        )
        session.add(acct_1)
        await session.flush()

        acct_bal = AccountBalanceModel(
            account_id=acct_1.id,
            current_balance=Decimal("1500.00"),
            functional_usd_balance=Decimal("1500.00"),
            version=1,
        )
        session.add(acct_bal)
        await session.commit()

        initial_journal_count = await session.scalar(select(func.count(JournalEntryModel.id)))

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        investor_headers_1 = {"Authorization": f"Bearer {investor_token_1}"}
        investor_headers_2 = {"Authorization": f"Bearer {investor_token_2}"}

        # 1. Admin reads record before any investment has been recorded
        res = await client.get(f"/api/v1/admin/users/{investor_1.id}/investment-record", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["userId"] == investor_1.id
        assert data["hasRecord"] is False
        assert data["amount"] is None

        # 2. Investor reads their own record before any is recorded -> Honest empty state
        res = await client.get("/api/v1/users/me/investment-record", headers=investor_headers_1)
        assert res.status_code == 200
        inv_data = res.json()
        assert inv_data["userId"] == investor_1.id
        assert inv_data["hasRecord"] is False
        assert inv_data["amount"] is None

        # 3. Validation: Reject negative amount
        res = await client.put(
            f"/api/v1/admin/users/{investor_1.id}/investment-record",
            headers=admin_headers,
            json={"amount": -500.0, "currency": "USD", "reason": "Initial manual recording"},
        )
        assert res.status_code == 422 or res.status_code == 400

        # 4. Validation: Reject invalid reason (<3 chars)
        res = await client.put(
            f"/api/v1/admin/users/{investor_1.id}/investment-record",
            headers=admin_headers,
            json={"amount": 250000.0, "currency": "USD", "reason": "ok"},
        )
        assert res.status_code == 422 or res.status_code == 400

        # 5. Validation: Reject unsupported currency
        res = await client.put(
            f"/api/v1/admin/users/{investor_1.id}/investment-record",
            headers=admin_headers,
            json={"amount": 250000.0, "currency": "DOGE", "reason": "Institutional allocation"},
        )
        assert res.status_code == 400
        assert "not supported" in res.json()["detail"].lower()

        # 6. Admin creates initial record for investor_1
        res = await client.put(
            f"/api/v1/admin/users/{investor_1.id}/investment-record",
            headers=admin_headers,
            json={"amount": 250000.50, "currency": "USD", "reason": "Institutional subscription agreement #REF-8842"},
        )
        assert res.status_code == 200
        created = res.json()
        assert created["userId"] == investor_1.id
        assert created["hasRecord"] is True
        assert created["amount"] == "250000.50"
        assert created["currency"] == "USD"
        assert created["updatedByAdminEmail"] == admin_user.email
        assert created["lastReason"] == "Institutional subscription agreement #REF-8842"

        # 7. Admin updates existing record for investor_1
        res = await client.put(
            f"/api/v1/admin/users/{investor_1.id}/investment-record",
            headers=admin_headers,
            json={"amount": 350000.00, "currency": "USD", "reason": "Capital tranche 2 addition verified by custody"},
        )
        assert res.status_code == 200
        updated = res.json()
        assert updated["amount"] == "350000.00"
        assert updated["lastReason"] == "Capital tranche 2 addition verified by custody"

        # 8. Verify Audit log in database
        async with AsyncSessionLocal() as session:
            stmt_audit = (
                select(AdminAuditLogModel)
                .where(
                    AdminAuditLogModel.target_id == investor_1.id,
                    AdminAuditLogModel.action == "ADMIN_USER_INVESTMENT_RECORD_UPDATE",
                )
                .order_by(AdminAuditLogModel.created_at.desc())
            )
            audits = (await session.execute(stmt_audit)).scalars().all()
            assert len(audits) >= 2
            latest_audit = audits[0]
            assert latest_audit.admin_user_id == admin_user.id
            assert latest_audit.target_id == investor_1.id
            assert "350000" in latest_audit.details
            assert latest_audit.reason == "Capital tranche 2 addition verified by custody"
            assert latest_audit.created_at is not None

        # 9. Ordinary investor CANNOT modify investment records
        res = await client.put(
            f"/api/v1/admin/users/{investor_1.id}/investment-record",
            headers=investor_headers_1,
            json={"amount": 999999.00, "currency": "USD", "reason": "Self-awarded investment amount"},
        )
        assert res.status_code == 403

        # 10. Ordinary investor CANNOT modify via /users/me/investment-record
        res = await client.put(
            "/api/v1/users/me/investment-record",
            headers=investor_headers_1,
            json={"amount": 999999.00},
        )
        assert res.status_code == 405  # Method Not Allowed

        # 11. Investor reads their own investment record
        res = await client.get("/api/v1/users/me/investment-record", headers=investor_headers_1)
        assert res.status_code == 200
        inv_data = res.json()
        assert inv_data["userId"] == investor_1.id
        assert inv_data["hasRecord"] is True
        assert inv_data["amount"] == "350000.00"
        assert inv_data["currency"] == "USD"
        assert "disclaimer" in inv_data

        # 12. Investor 2 reads their own investment record (isolated: hasRecord is False)
        res = await client.get("/api/v1/users/me/investment-record", headers=investor_headers_2)
        assert res.status_code == 200
        inv2_data = res.json()
        assert inv2_data["userId"] == investor_2.id
        assert inv2_data["hasRecord"] is False
        assert inv2_data["amount"] is None

        # 13. Financial integrity: Check that wallet balances and ledger journal entries were untouched
        async with AsyncSessionLocal() as session:
            bal_check = await session.get(AccountBalanceModel, acct_1.id)
            assert bal_check.current_balance == Decimal("1500.00")
            assert bal_check.functional_usd_balance == Decimal("1500.00")

            final_journal_count = await session.scalar(select(func.count(JournalEntryModel.id)))
            assert final_journal_count == initial_journal_count
