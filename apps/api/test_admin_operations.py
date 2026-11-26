import pytest
import asyncio
import uuid
import json
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, update, text
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from database import AsyncSessionLocal
from security import hash_token, hash_password
from models.user import (
    UserModel,
    UserSessionModel,
    AdminAuditLogModel,
    EmailVerificationTokenModel,
    PasswordResetTokenModel,
)
from models.financial import (
    LegalEntityModel,
    AssetModel,
    AccountModel,
    AccountBalanceModel,
    FinancialTransactionModel,
    JournalEntryModel,
)
from services.ledger import LedgerService


def create_uuid() -> str:
    return str(uuid.uuid4())


async def setup_test_user(session: AsyncSession, email: str, full_name: str, role: str = "investor", is_active: bool = True) -> tuple[UserModel, str]:
    unique_email = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}@{email.split('@')[1]}"
    user = UserModel(
        id=create_uuid(),
        full_name=full_name,
        email=unique_email,
        password_hash=hash_password("StrongPassword!2026#"),
        role=role,
        is_active=is_active,
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


async def get_or_create_test_environment(session: AsyncSession):
    # Entity
    stmt_entity = select(LegalEntityModel).where(LegalEntityModel.code == "NEXORA_OPCO")
    entity = (await session.execute(stmt_entity)).scalar_one_or_none()
    if not entity:
        entity = LegalEntityModel(
            id=create_uuid(),
            code="NEXORA_OPCO",
            name="Nexora Operating Company",
            entity_type="OPERATING_COMPANY",
            functional_currency="USD",
        )
        session.add(entity)
        await session.flush()

    # Asset USDT
    stmt_usdt = select(AssetModel).where(AssetModel.symbol == "USDT")
    asset_usdt = (await session.execute(stmt_usdt)).scalar_one_or_none()
    if not asset_usdt:
        asset_usdt = AssetModel(
            id=create_uuid(),
            symbol="USDT",
            name="Tether USD",
            asset_class="TOKEN",
            base_decimals=6,
            display_decimals=2,
        )
        session.add(asset_usdt)
        await session.flush()

    # OpCo Cash Account
    stmt_op = select(AccountModel).where(AccountModel.account_number == "OPCO-USDT-CASH")
    op_acct = (await session.execute(stmt_op)).scalar_one_or_none()
    if not op_acct:
        op_acct = AccountModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            account_number="OPCO-USDT-CASH",
            name="Operating Cash USDT",
            account_type="ASSET",
            account_category="OPERATING_CASH",
            normal_balance="DEBIT",
            asset_id=asset_usdt.id,
            user_id=None,
        )
        session.add(op_acct)
        await session.flush()
        bal = AccountBalanceModel(
            account_id=op_acct.id,
            current_balance=Decimal("1000000.00"),
            functional_usd_balance=Decimal("1000000.00"),
        )
        session.add(bal)
        await session.flush()

    await session.commit()
    return entity, asset_usdt, op_acct


async def create_user_custodial_account(session: AsyncSession, entity: LegalEntityModel, asset: AssetModel, user: UserModel, initial_balance: Decimal = Decimal("0")):
    acct = AccountModel(
        id=create_uuid(),
        legal_entity_id=entity.id,
        account_number=f"USR-{user.id[:8]}-{asset.symbol}",
        name=f"{user.full_name} {asset.symbol} Account",
        account_type="LIABILITY",
        account_category="CUSTODIAL_WALLET",
        normal_balance="CREDIT",
        asset_id=asset.id,
        user_id=user.id,
    )
    session.add(acct)
    await session.flush()
    bal = AccountBalanceModel(
        account_id=acct.id,
        current_balance=initial_balance,
        functional_usd_balance=initial_balance,
    )
    session.add(bal)
    await session.commit()
    return acct


# -------------------------------------------------------------------------
# Test 1: Real Platform Dashboard Aggregation
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_dashboard_real_statistics():
    async with AsyncSessionLocal() as session:
        admin, admin_token = await setup_test_user(session, "dash_admin@nexora.test", "Dash Admin", role="admin")
        active_u, _ = await setup_test_user(session, "active_user@nexora.test", "Active User", is_active=True)
        susp_u, _ = await setup_test_user(session, "susp_user@nexora.test", "Susp User", is_active=False)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/admin/overview", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        data = res.json()

        assert data["totalUsers"] >= 3
        assert data["activeUsers"] >= 2
        assert data["suspendedUsers"] >= 1
        assert data["verifiedUsers"] >= 3
        assert "investorUsers" in data
        assert "adminUsers" in data
        # Honest reporting for invested capital
        assert "Investment reporting is not yet available." in data["investedCapitalStatusMessage"]
        # Real counters
        assert "pendingWithdrawalsCount" in data
        assert "completedWithdrawalsCount" in data
        assert "failedWithdrawalsCount" in data


# -------------------------------------------------------------------------
# Test 2: User Account Suspension and Immediate Session Revocation
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_user_suspension_and_session_revocation():
    async with AsyncSessionLocal() as session:
        admin, admin_token = await setup_test_user(session, "susp_admin@nexora.test", "Susp Admin", role="admin")
        investor, inv_token = await setup_test_user(session, "target_susp@nexora.test", "Target Investor", role="investor")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Investor is initially active and can access me
        res_me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {inv_token}"})
        assert res_me.status_code == 200

        # 2. Admin cannot suspend self
        res_self = await client.post(
            f"/api/v1/admin/users/{admin.id}/suspend",
            json={"reason": "Self suspend attempt"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_self.status_code == 400

        # 3. Admin suspends investor
        res_susp = await client.post(
            f"/api/v1/admin/users/{investor.id}/suspend",
            json={"reason": "Suspicious login from untrusted IP"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_susp.status_code == 200
        assert res_susp.json()["success"] is True

        # 4. Investor session is now invalid (revoked immediately)
        res_me_revoked = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {inv_token}"})
        assert res_me_revoked.status_code == 401

        # 5. Investor cannot log in while suspended
        res_login = await client.post(
            "/api/v1/auth/login",
            json={"email": investor.email, "password": "StrongPassword!2026#"},
        )
        assert res_login.status_code == 403
        assert "suspended" in res_login.json()["detail"].lower()

        # 6. Audit log is recorded
        async with AsyncSessionLocal() as session:
            stmt = select(AdminAuditLogModel).where(
                AdminAuditLogModel.action == "ADMIN_USER_SUSPEND",
                AdminAuditLogModel.target_id == investor.id,
            )
            audit = (await session.execute(stmt)).scalars().first()
            assert audit is not None
            assert audit.admin_user_id == admin.id
            assert "Suspicious login" in audit.reason


# -------------------------------------------------------------------------
# Test 3: User Account Reactivation
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_user_reactivation():
    async with AsyncSessionLocal() as session:
        admin, admin_token = await setup_test_user(session, "react_admin@nexora.test", "React Admin", role="admin")
        investor, _ = await setup_test_user(session, "target_react@nexora.test", "Target Reactivate", role="investor", is_active=False)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Initially suspended -> cannot login
        res_login1 = await client.post(
            "/api/v1/auth/login",
            json={"email": investor.email, "password": "StrongPassword!2026#"},
        )
        assert res_login1.status_code == 403

        # Admin reactivates account
        res_react = await client.post(
            f"/api/v1/admin/users/{investor.id}/reactivate",
            json={"reason": "Identity verified via support verification call"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_react.status_code == 200
        assert res_react.json()["success"] is True

        # Now can log in successfully
        res_login2 = await client.post(
            "/api/v1/auth/login",
            json={"email": investor.email, "password": "StrongPassword!2026#"},
        )
        assert res_login2.status_code == 200
        assert res_login2.json()["user"]["email"] == investor.email


# -------------------------------------------------------------------------
# Test 4: Safe Account Deletion & PII Anonymization
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_safe_account_removal_and_anonymization():
    async with AsyncSessionLocal() as session:
        admin, admin_token = await setup_test_user(session, "del_admin@nexora.test", "Del Admin", role="admin")
        investor, inv_token = await setup_test_user(session, "target_del@nexora.test", "Target Deletion", role="investor")
        entity, asset_usdt, _ = await get_or_create_test_environment(session)
        # Empty balance account
        acct = await create_user_custodial_account(session, entity, asset_usdt, investor, initial_balance=Decimal("0.00"))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Reject if confirmation email does not match
        res_mismatch = await client.post(
            f"/api/v1/admin/users/{investor.id}/anonymize-delete",
            json={"confirmEmail": "wrong@email.com", "reason": "Right to be forgotten"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_mismatch.status_code == 400
        assert "does not match" in res_mismatch.json()["detail"].lower()

        # 2. Reject self-deletion
        res_self = await client.post(
            f"/api/v1/admin/users/{admin.id}/anonymize-delete",
            json={"confirmEmail": admin.email, "reason": "Self delete"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_self.status_code == 400

        # 3. Successful safe removal
        res_del = await client.post(
            f"/api/v1/admin/users/{investor.id}/anonymize-delete",
            json={"confirmEmail": investor.email, "reason": "Verified user GDPR deletion request"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_del.status_code == 200
        assert res_del.json()["success"] is True

        # 4. Verify PII is anonymized and account is inactive
        async with AsyncSessionLocal() as session:
            stmt = select(UserModel).where(UserModel.id == investor.id)
            user_in_db = (await session.execute(stmt)).scalars().first()
            assert user_in_db is not None
            assert user_in_db.full_name == "Deactivated User"
            assert user_in_db.email.startswith("anonymized_")
            assert user_in_db.is_active is False
            assert user_in_db.is_verified is False

        # 5. Session token is revoked
        res_me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {inv_token}"})
        assert res_me.status_code == 401


# -------------------------------------------------------------------------
# Test 5: Rejection of Account Deletion with Positive Balance
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_deletion_rejected_if_positive_balance():
    async with AsyncSessionLocal() as session:
        admin, admin_token = await setup_test_user(session, "del_pos_admin@nexora.test", "Del Pos Admin", role="admin")
        investor, _ = await setup_test_user(session, "rich_user@nexora.test", "Rich Investor", role="investor")
        entity, asset_usdt, _ = await get_or_create_test_environment(session)
        # User with 5,000 USD balance
        await create_user_custodial_account(session, entity, asset_usdt, investor, initial_balance=Decimal("5000.00"))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            f"/api/v1/admin/users/{investor.id}/anonymize-delete",
            json={"confirmEmail": investor.email, "reason": "Delete user with funds"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 400
        assert "positive settled balance" in res.json()["detail"].lower()


# -------------------------------------------------------------------------
# Test 6: Withdrawal Review, Approval, and Balance Verification
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_withdrawal_approval_workflow():
    async with AsyncSessionLocal() as session:
        admin, admin_token = await setup_test_user(session, "wth_appr_admin@nexora.test", "Wth Appr Admin", role="admin")
        investor, _ = await setup_test_user(session, "wth_user@nexora.test", "Wth User", role="investor")
        entity, asset_usdt, op_acct = await get_or_create_test_environment(session)
        # Create user account with 1,000 USDT balance
        user_acct = await create_user_custodial_account(session, entity, asset_usdt, investor, initial_balance=Decimal("1000.00"))

        # Create PENDING withdrawal of 200 USDT
        tx_id = create_uuid()
        tx = FinancialTransactionModel(
            id=tx_id,
            legal_entity_id=entity.id,
            transaction_ref=f"TX-WTH-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"idem-wth-{uuid.uuid4().hex[:8]}",
            payload_hash="payload_wth_hash",
            source_service="PLATFORM_PORTAL",
            transaction_type="WITHDRAWAL",
            status="PENDING",
            initiator_user_id=investor.id,
            description="Withdrawal to external custody 0x71C...32A4",
            metadata_json=json.dumps({"destination": "0x71C234567890abcdef1234567890abcdef123432A4"}),
        )
        session.add(tx)
        await session.flush()

        # Add entries
        j_debit = JournalEntryModel(
            transaction_id=tx.id,
            account_id=user_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="DEBIT",
            native_amount=Decimal("200.00"),
            functional_amount_usd=Decimal("200.00"),
            entry_sequence=1,
        )
        j_credit = JournalEntryModel(
            transaction_id=tx.id,
            account_id=op_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="CREDIT",
            native_amount=Decimal("200.00"),
            functional_amount_usd=Decimal("200.00"),
            entry_sequence=2,
        )
        session.add_all([j_debit, j_credit])
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Listing includes pending request with masked destination
        res_list = await client.get("/api/v1/admin/withdrawals?status=PENDING", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_list.status_code == 200
        data_list = res_list.json()
        target_wth = next((w for w in data_list["items"] if w["id"] == tx_id), None)
        assert target_wth is not None
        assert target_wth["status"] == "PENDING"
        assert target_wth["amount"] == "200.00"
        assert target_wth["destinationMasked"] == "0x71C2...32A4"

        # 2. Approve withdrawal
        res_appr = await client.post(
            f"/api/v1/admin/withdrawals/{tx_id}/approve",
            json={"notes": "Approved for institutional payout processing"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_appr.status_code == 200
        assert res_appr.json()["success"] is True

        # 3. Status is now POSTED in database
        async with AsyncSessionLocal() as session:
            stmt = select(FinancialTransactionModel).where(FinancialTransactionModel.id == tx_id)
            tx_db = (await session.execute(stmt)).scalars().first()
            assert tx_db.status == "POSTED"
            assert tx_db.posted_at is not None

        # 4. Duplicate approval attempt returns 409 Conflict
        res_dup = await client.post(
            f"/api/v1/admin/withdrawals/{tx_id}/approve",
            json={"notes": "Duplicate approval attempt"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_dup.status_code == 409
        assert "cannot approve" in res_dup.json()["detail"].lower()


# -------------------------------------------------------------------------
# Test 7: Withdrawal Rejection and Reserved Funds Release
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_withdrawal_rejection_workflow():
    async with AsyncSessionLocal() as session:
        admin, admin_token = await setup_test_user(session, "wth_rej_admin@nexora.test", "Wth Rej Admin", role="admin")
        investor, _ = await setup_test_user(session, "wth_rej_user@nexora.test", "Wth Rej User", role="investor")
        entity, asset_usdt, op_acct = await get_or_create_test_environment(session)
        user_acct = await create_user_custodial_account(session, entity, asset_usdt, investor, initial_balance=Decimal("500.00"))

        tx_id = create_uuid()
        tx = FinancialTransactionModel(
            id=tx_id,
            legal_entity_id=entity.id,
            transaction_ref=f"TX-WTH-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"idem-wth-{uuid.uuid4().hex[:8]}",
            payload_hash="payload_wth_rej",
            source_service="PLATFORM_PORTAL",
            transaction_type="WITHDRAWAL",
            status="PENDING",
            initiator_user_id=investor.id,
            description="Withdrawal to be rejected",
        )
        session.add(tx)
        await session.flush()
        j_debit = JournalEntryModel(
            transaction_id=tx.id,
            account_id=user_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="DEBIT",
            native_amount=Decimal("150.00"),
            functional_amount_usd=Decimal("150.00"),
            entry_sequence=1,
        )
        j_credit = JournalEntryModel(
            transaction_id=tx.id,
            account_id=op_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="CREDIT",
            native_amount=Decimal("150.00"),
            functional_amount_usd=Decimal("150.00"),
            entry_sequence=2,
        )
        session.add_all([j_debit, j_credit])
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Rejection requires substantive reason
        res_no_reason = await client.post(
            f"/api/v1/admin/withdrawals/{tx_id}/reject",
            json={"reason": "bad"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_no_reason.status_code == 400

        # 2. Reject withdrawal
        res_rej = await client.post(
            f"/api/v1/admin/withdrawals/{tx_id}/reject",
            json={"reason": "Destination address format invalid for USDT"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_rej.status_code == 200
        assert res_rej.json()["success"] is True

        # 3. Status is now VOIDED
        async with AsyncSessionLocal() as session:
            stmt = select(FinancialTransactionModel).where(FinancialTransactionModel.id == tx_id)
            tx_db = (await session.execute(stmt)).scalars().first()
            assert tx_db.status == "VOIDED"
            meta = json.loads(tx_db.metadata_json)
            assert "Destination address format invalid" in meta["rejection_reason"]

        # 4. Duplicate rejection returns 409
        res_dup = await client.post(
            f"/api/v1/admin/withdrawals/{tx_id}/reject",
            json={"reason": "Second rejection attempt"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_dup.status_code == 409


# -------------------------------------------------------------------------
# Test 8: Concurrent Withdrawal Approval Atomicity
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_concurrent_withdrawal_approval_atomicity():
    async with AsyncSessionLocal() as session:
        admin, admin_token = await setup_test_user(session, "concur_wth_admin@nexora.test", "Concur Admin", role="admin")
        investor, _ = await setup_test_user(session, "concur_wth_user@nexora.test", "Concur User", role="investor")
        entity, asset_usdt, op_acct = await get_or_create_test_environment(session)
        user_acct = await create_user_custodial_account(session, entity, asset_usdt, investor, initial_balance=Decimal("1000.00"))

        tx_id = create_uuid()
        tx = FinancialTransactionModel(
            id=tx_id,
            legal_entity_id=entity.id,
            transaction_ref=f"TX-WTH-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"idem-wth-{uuid.uuid4().hex[:8]}",
            payload_hash="payload_wth_concur",
            source_service="PLATFORM_PORTAL",
            transaction_type="WITHDRAWAL",
            status="PENDING",
            initiator_user_id=investor.id,
            description="Withdrawal for concurrency test",
        )
        session.add(tx)
        await session.flush()
        j_debit = JournalEntryModel(
            transaction_id=tx.id,
            account_id=user_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="DEBIT",
            native_amount=Decimal("100.00"),
            functional_amount_usd=Decimal("100.00"),
            entry_sequence=1,
        )
        j_credit = JournalEntryModel(
            transaction_id=tx.id,
            account_id=op_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="CREDIT",
            native_amount=Decimal("100.00"),
            functional_amount_usd=Decimal("100.00"),
            entry_sequence=2,
        )
        session.add_all([j_debit, j_credit])
        await session.commit()

    async def attempt_approval(attempt_num: int):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            return await client.post(
                f"/api/v1/admin/withdrawals/{tx_id}/approve",
                json={"notes": f"Attempt {attempt_num}"},
                headers={"Authorization": f"Bearer {admin_token}"},
            )

    # Run 5 concurrent approvals
    results = await asyncio.gather(
        attempt_approval(1),
        attempt_approval(2),
        attempt_approval(3),
        attempt_approval(4),
        attempt_approval(5),
    )

    statuses = [r.status_code for r in results]
    # Exactly one request succeeds with 200; the other 4 must receive 409 Conflict
    assert statuses.count(200) == 1, f"Expected exactly 1 success, got: {statuses}"
    assert statuses.count(409) == 4, f"Expected 4 conflict responses, got: {statuses}"


# -------------------------------------------------------------------------
# Test 9: Authorization Boundary: Ordinary Users Blocked
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_operations_forbidden_to_ordinary_users():
    async with AsyncSessionLocal() as session:
        investor, inv_token = await setup_test_user(session, "rogue_user@nexora.test", "Rogue User", role="investor")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {inv_token}"}

        # Overview
        assert (await client.get("/api/v1/admin/overview", headers=headers)).status_code == 403

        # Users
        assert (await client.get("/api/v1/admin/users", headers=headers)).status_code == 403

        # Suspend
        assert (await client.post(f"/api/v1/admin/users/{investor.id}/suspend", json={"reason": "test"}, headers=headers)).status_code == 403

        # Reactivate
        assert (await client.post(f"/api/v1/admin/users/{investor.id}/reactivate", json={"reason": "test"}, headers=headers)).status_code == 403

        # Anonymize Delete
        assert (await client.post(f"/api/v1/admin/users/{investor.id}/anonymize-delete", json={"confirmEmail": investor.email, "reason": "test"}, headers=headers)).status_code == 403

        # Withdrawals
        assert (await client.get("/api/v1/admin/withdrawals", headers=headers)).status_code == 403
        assert (await client.post(f"/api/v1/admin/withdrawals/any-id/approve", json={}, headers=headers)).status_code == 403
        assert (await client.post(f"/api/v1/admin/withdrawals/any-id/reject", json={"reason": "test reason"}, headers=headers)).status_code == 403

        # Transactions
        assert (await client.get("/api/v1/admin/transactions", headers=headers)).status_code == 403


# -------------------------------------------------------------------------
# Test 10: Multi-Withdrawal Balance Depletion & Over-Approval Prevention
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_over_approval_prevention_across_multiple_withdrawals():
    """
    Verifies that when a user has a 1,000 USDT balance, approving Withdrawal A (700 USDT)
    commits that balance, so attempting to subsequently approve Withdrawal B (500 USDT)
    is rejected with 400 Insufficient Available Balance.
    """
    async with AsyncSessionLocal() as session:
        admin, admin_token = await setup_test_user(session, "multi_appr_admin@nexora.test", "Multi Admin", role="admin")
        investor, _ = await setup_test_user(session, "multi_user@nexora.test", "Multi User", role="investor")
        entity, asset_usdt, op_acct = await get_or_create_test_environment(session)
        # Create user account with exactly 1,000 USDT
        user_acct = await create_user_custodial_account(session, entity, asset_usdt, investor, initial_balance=Decimal("1000.00"))

        # Withdrawal A: 700 USDT
        tx_a_id = create_uuid()
        tx_a = FinancialTransactionModel(
            id=tx_a_id,
            legal_entity_id=entity.id,
            transaction_ref=f"TX-WTH-A-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"idem-wth-a-{uuid.uuid4().hex[:8]}",
            payload_hash="payload_wth_a",
            source_service="PLATFORM_PORTAL",
            transaction_type="WITHDRAWAL",
            status="PENDING",
            initiator_user_id=investor.id,
            description="Withdrawal Request A (700 USDT)",
        )
        session.add(tx_a)
        await session.flush()
        j_debit_a = JournalEntryModel(
            transaction_id=tx_a.id,
            account_id=user_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="DEBIT",
            native_amount=Decimal("700.00"),
            functional_amount_usd=Decimal("700.00"),
            entry_sequence=1,
        )
        j_credit_a = JournalEntryModel(
            transaction_id=tx_a.id,
            account_id=op_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="CREDIT",
            native_amount=Decimal("700.00"),
            functional_amount_usd=Decimal("700.00"),
            entry_sequence=2,
        )
        session.add_all([j_debit_a, j_credit_a])

        # Withdrawal B: 500 USDT
        tx_b_id = create_uuid()
        tx_b = FinancialTransactionModel(
            id=tx_b_id,
            legal_entity_id=entity.id,
            transaction_ref=f"TX-WTH-B-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"idem-wth-b-{uuid.uuid4().hex[:8]}",
            payload_hash="payload_wth_b",
            source_service="PLATFORM_PORTAL",
            transaction_type="WITHDRAWAL",
            status="PENDING",
            initiator_user_id=investor.id,
            description="Withdrawal Request B (500 USDT)",
        )
        session.add(tx_b)
        await session.flush()
        j_debit_b = JournalEntryModel(
            transaction_id=tx_b.id,
            account_id=user_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="DEBIT",
            native_amount=Decimal("500.00"),
            functional_amount_usd=Decimal("500.00"),
            entry_sequence=1,
        )
        j_credit_b = JournalEntryModel(
            transaction_id=tx_b.id,
            account_id=op_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="CREDIT",
            native_amount=Decimal("500.00"),
            functional_amount_usd=Decimal("500.00"),
            entry_sequence=2,
        )
        session.add_all([j_debit_b, j_credit_b])
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Approve Withdrawal A (700 USDT). Available is 1,000, so this succeeds.
        res_a = await client.post(
            f"/api/v1/admin/withdrawals/{tx_a_id}/approve",
            json={"notes": "Approved A"},
            headers=headers,
        )
        assert res_a.status_code == 200
        assert res_a.json()["success"] is True

        # 2. Attempt to approve Withdrawal B (500 USDT).
        # Account has 1,000 settled but 700 committed to POSTED Withdrawal A (remaining available: 300).
        # Must fail with 400 Bad Request.
        res_b = await client.post(
            f"/api/v1/admin/withdrawals/{tx_b_id}/approve",
            json={"notes": "Approved B attempt"},
            headers=headers,
        )
        assert res_b.status_code == 400
        assert "insufficient available balance" in res_b.json()["detail"].lower()


# -------------------------------------------------------------------------
# Test 11: Suspension Invalidates Tokens (Password Reset & Verification)
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_user_suspension_invalidates_password_reset_and_verification_tokens():
    """
    Verifies that suspending a user invalidates any outstanding password reset
    and email verification tokens in addition to active sessions.
    """
    async with AsyncSessionLocal() as session:
        admin, admin_token = await setup_test_user(session, "token_guard_admin@nexora.test", "Guard Admin", role="admin")
        investor, _ = await setup_test_user(session, "token_target@nexora.test", "Token Target", role="investor")

        # Create an active password reset token
        now = datetime.now(timezone.utc)
        reset_tok = PasswordResetTokenModel(
            id=create_uuid(),
            user_id=investor.id,
            token_hash=hash_token(f"test_reset_secret_{uuid.uuid4().hex}"),
            expires_at=now + timedelta(hours=1),
        )
        # Create an active email verification token
        verif_tok = EmailVerificationTokenModel(
            id=create_uuid(),
            user_id=investor.id,
            token_hash=hash_token(f"test_verif_secret_{uuid.uuid4().hex}"),
            expires_at=now + timedelta(hours=24),
        )
        session.add_all([reset_tok, verif_tok])
        await session.commit()
        reset_id = reset_tok.id
        verif_id = verif_tok.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Suspend investor
        res_susp = await client.post(
            f"/api/v1/admin/users/{investor.id}/suspend",
            json={"reason": "Compromised account detected"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_susp.status_code == 200

    # Verify both tokens have been invalidated (used_at is set)
    async with AsyncSessionLocal() as session:
        stmt_rst = select(PasswordResetTokenModel).where(PasswordResetTokenModel.id == reset_id)
        rst_db = (await session.execute(stmt_rst)).scalar_one()
        assert rst_db.used_at is not None

        stmt_vrf = select(EmailVerificationTokenModel).where(EmailVerificationTokenModel.id == verif_id)
        vrf_db = (await session.execute(stmt_vrf)).scalar_one()
        assert vrf_db.used_at is not None
