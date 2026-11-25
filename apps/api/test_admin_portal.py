import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from database import AsyncSessionLocal
from security import hash_token
from models.user import UserModel, UserSessionModel, AdminAuditLogModel
from models.financial import (
    LegalEntityModel,
    AssetModel,
    AccountModel,
    AccountBalanceModel,
    FinancialTransactionModel,
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

async def get_or_create_test_entities(session: AsyncSession):
    stmt_entity = select(LegalEntityModel).where(LegalEntityModel.code == "NEXORA_OPCO")
    res_entity = await session.execute(stmt_entity)
    entity = res_entity.scalar_one_or_none()
    if not entity:
        entity = LegalEntityModel(
            id=create_uuid(),
            code="NEXORA_OPCO",
            name="Nexora Operating Entity",
            entity_type="OPERATING_COMPANY",
            functional_currency="USD",
        )
        session.add(entity)
        await session.flush()

    stmt_btc = select(AssetModel).where(AssetModel.symbol == "BTC")
    res_btc = await session.execute(stmt_btc)
    asset_btc = res_btc.scalar_one_or_none()
    if not asset_btc:
        asset_btc = AssetModel(
            id=create_uuid(),
            symbol="BTC",
            name="Bitcoin",
            asset_class="CRYPTO_NATIVE",
            base_decimals=8,
            display_decimals=8,
        )
        session.add(asset_btc)
        await session.flush()

    stmt_usdt = select(AssetModel).where(AssetModel.symbol == "USDT")
    res_usdt = await session.execute(stmt_usdt)
    asset_usdt = res_usdt.scalar_one_or_none()
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

    stmt_op_acct = select(AccountModel).where(
        AccountModel.account_number == "OPCO-USDT-CLEARING"
    )
    res_op = await session.execute(stmt_op_acct)
    op_acct = res_op.scalar_one_or_none()
    if not op_acct:
        op_acct = AccountModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            account_number="OPCO-USDT-CLEARING",
            name="OpCo USDT Clearing",
            account_type="ASSET",
            account_category="CLEARING",
            normal_balance="DEBIT",
            asset_id=asset_usdt.id,
            user_id=None,
            is_active=True,
        )
        session.add(op_acct)
        await session.flush()
        op_bal = AccountBalanceModel(
            account_id=op_acct.id,
            current_balance=Decimal("100000.00"),
            functional_usd_balance=Decimal("100000.00"),
            version=1,
        )
        session.add(op_bal)
        await session.flush()

    await session.commit()
    return entity, asset_btc, asset_usdt, op_acct


# -------------------------------------------------------------------------
# Test 1: Unauthenticated admin access is strictly rejected with 401
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_unauthenticated_admin_access_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        for path in [
            "/api/v1/admin/overview",
            "/api/v1/admin/users",
            f"/api/v1/admin/users/{create_uuid()}",
            f"/api/v1/admin/users/{create_uuid()}/accounts",
            f"/api/v1/admin/users/{create_uuid()}/transactions",
            "/api/v1/admin/audit-logs",
        ]:
            res = await ac.get(path)
            assert res.status_code == 401, f"Expected 401 for unauthenticated {path}, got {res.status_code}"
            assert "Authentication required" in res.json().get("detail", "")


# -------------------------------------------------------------------------
# Test 2: Authenticated non-admin access is rejected with 403 and audited
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_authenticated_non_admin_access_rejected_and_audited():
    async with AsyncSessionLocal() as session:
        investor_user, investor_token = await setup_test_user(
            session, email="investor_user@nexora.test", full_name="Regular Investor", role="investor"
        )

    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {investor_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/admin/overview", headers=headers)
        assert res.status_code == 403, f"Expected 403 for non-admin, got {res.status_code}"
        assert "Administrative privileges required" in res.json().get("detail", "")

        res_users = await ac.get("/api/v1/admin/users", headers=headers)
        assert res_users.status_code == 403

    # Verify that the unauthorized access attempt was logged to admin_audit_logs
    async with AsyncSessionLocal() as session:
        audit_stmt = (
            select(AdminAuditLogModel)
            .where(
                AdminAuditLogModel.admin_user_id == investor_user.id,
                AdminAuditLogModel.action == "ADMIN_UNAUTHORIZED_ACCESS_ATTEMPT",
            )
            .order_by(AdminAuditLogModel.created_at.desc())
        )
        res_audit = await session.execute(audit_stmt)
        audit_events = res_audit.scalars().all()
        assert len(audit_events) >= 1
        assert audit_events[0].outcome == "FORBIDDEN"
        assert audit_events[0].target_entity == "admin_portal"


# -------------------------------------------------------------------------
# Test 3: Authorized admin access succeeds and retrieves overview metrics
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_authorized_admin_overview_metrics():
    async with AsyncSessionLocal() as session:
        admin_user, admin_token = await setup_test_user(
            session, email="staff_admin@nexora.test", full_name="Admin Staff", role="admin"
        )

    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/admin/overview", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "totalUsers" in data
        assert "activeUsers" in data
        assert "verifiedUsers" in data
        assert "investorUsers" in data
        assert "adminUsers" in data
        assert "totalAccounts" in data
        assert "totalTransactions" in data
        assert data["adminUsers"] >= 1


# -------------------------------------------------------------------------
# Test 4: User-list pagination and identity search / status filtering
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_user_list_pagination_and_filters():
    uid = uuid.uuid4().hex[:6]
    async with AsyncSessionLocal() as session:
        admin_user, admin_token = await setup_test_user(
            session, email=f"admin_{uid}@nexora.test", full_name="Admin Search", role="admin"
        )
        user_alpha, _ = await setup_test_user(
            session, email=f"alpha_target_{uid}@domain.test", full_name=f"Alpha Tester {uid}", role="investor"
        )
        user_beta, _ = await setup_test_user(
            session, email=f"beta_target_{uid}@domain.test", full_name=f"Beta Tester {uid}", role="investor"
        )

    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Search by email substring
        res_search = await ac.get(f"/api/v1/admin/users?search=alpha_target_{uid}", headers=headers)
        assert res_search.status_code == 200
        data_search = res_search.json()
        assert data_search["total"] >= 1
        assert any(u["email"] == user_alpha.email for u in data_search["items"])

        # Filter by role
        res_role = await ac.get("/api/v1/admin/users?role=admin", headers=headers)
        assert res_role.status_code == 200
        for u in res_role.json()["items"]:
            assert u["role"] == "admin"

        # Pagination parameters
        res_page = await ac.get("/api/v1/admin/users?page=1&page_size=2", headers=headers)
        assert res_page.status_code == 200
        data_page = res_page.json()
        assert len(data_page["items"]) <= 2
        assert data_page["page"] == 1
        assert data_page["pageSize"] == 2


# -------------------------------------------------------------------------
# Test 5: User detail inspection and session lifecycle counts
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_user_detail_and_session_count():
    async with AsyncSessionLocal() as session:
        admin_user, admin_token = await setup_test_user(
            session, email="admin_detail@nexora.test", full_name="Detail Admin", role="admin"
        )
        target_user, _ = await setup_test_user(
            session, email="target_detail@nexora.test", full_name="Target User Detail", role="investor"
        )

    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get(f"/api/v1/admin/users/{target_user.id}", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == target_user.id
        assert data["email"] == target_user.email
        assert data["role"] == "investor"
        assert data["activeSessionsCount"] >= 1
        assert data["totalSessionsCount"] >= 1
        assert data["lastLoginAt"] is not None

        # 404 for non-existent user
        fake_id = create_uuid()
        res_404 = await ac.get(f"/api/v1/admin/users/{fake_id}", headers=headers)
        assert res_404.status_code == 404


# -------------------------------------------------------------------------
# Test 6: Sensitive field exclusion in admin user responses
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_sensitive_field_exclusion():
    async with AsyncSessionLocal() as session:
        admin_user, admin_token = await setup_test_user(
            session, email="admin_sec@nexora.test", full_name="Sec Admin", role="admin"
        )
        target_user, _ = await setup_test_user(
            session, email="target_sec@nexora.test", full_name="Sec Target", role="investor"
        )

    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Check in list
        res_list = await ac.get(f"/api/v1/admin/users?search={target_user.email}", headers=headers)
        assert res_list.status_code == 200
        for item in res_list.json()["items"]:
            assert "password_hash" not in item
            assert "passwordHash" not in item
            assert "mfa_secret" not in item
            assert "mfaSecret" not in item
            assert "token_hash" not in item
            assert "session_token_hash" not in item

        # Check in detail
        res_detail = await ac.get(f"/api/v1/admin/users/{target_user.id}", headers=headers)
        assert res_detail.status_code == 200
        detail_data = res_detail.json()
        assert "password_hash" not in detail_data
        assert "passwordHash" not in detail_data
        assert "mfa_secret" not in detail_data
        assert "mfaSecret" not in detail_data
        assert "session_token_hash" not in detail_data


# -------------------------------------------------------------------------
# Test 7: Read-only financial account inspection
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_financial_account_inspection():
    uid = uuid.uuid4().hex[:6]
    async with AsyncSessionLocal() as session:
        admin_user, admin_token = await setup_test_user(
            session, email=f"admin_fin_{uid}@nexora.test", full_name="Financial Admin", role="admin"
        )
        target_user, _ = await setup_test_user(
            session, email=f"fin_target_{uid}@nexora.test", full_name="Target Fin User", role="investor"
        )
        entity, asset_btc, asset_usdt, op_acct = await get_or_create_test_entities(session)

        # Provision user account with 2500 USDT balance
        acct_usdt = AccountModel(
            id=create_uuid(),
            user_id=target_user.id,
            legal_entity_id=entity.id,
            account_number=f"USR-USDT-{uid}",
            name="Investor USDT Deposit",
            account_type="LIABILITY",
            account_category="INVESTOR_DEPOSIT",
            normal_balance="CREDIT",
            asset_id=asset_usdt.id,
            is_active=True,
        )
        session.add(acct_usdt)
        await session.flush()

        bal_usdt = AccountBalanceModel(
            account_id=acct_usdt.id,
            current_balance=Decimal("2500.000000"),
            functional_usd_balance=Decimal("2500.0000"),
            version=1,
        )
        session.add(bal_usdt)
        await session.commit()

    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get(f"/api/v1/admin/users/{target_user.id}/accounts", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["userId"] == target_user.id
        assert data["hasAccounts"] is True
        assert data["totalBalanceUsd"] == "2500.00"
        assert len(data["accounts"]) == 1
        assert data["accounts"][0]["asset"] == "USDT"
        assert data["accounts"][0]["settledBalance"] == "2500.00"

        # User with no accounts
        empty_user, _ = await setup_test_user(
            session, email=f"empty_user_{uid}@nexora.test", full_name="Empty User", role="investor"
        )
        res_empty = await ac.get(f"/api/v1/admin/users/{empty_user.id}/accounts", headers=headers)
        assert res_empty.status_code == 200
        data_empty = res_empty.json()
        assert data_empty["hasAccounts"] is False
        assert data_empty["totalBalanceUsd"] is None
        assert len(data_empty["accounts"]) == 0


# -------------------------------------------------------------------------
# Test 8: Read-only financial transaction inspection with lifecycle states
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_financial_transaction_inspection():
    uid = uuid.uuid4().hex[:6]
    async with AsyncSessionLocal() as session:
        admin_user, admin_token = await setup_test_user(
            session, email=f"admin_tx_{uid}@nexora.test", full_name="Tx Admin", role="admin"
        )
        target_user, _ = await setup_test_user(
            session, email=f"tx_target_{uid}@nexora.test", full_name="Tx Target User", role="investor"
        )
        entity, asset_btc, asset_usdt, op_acct = await get_or_create_test_entities(session)

        user_acct = AccountModel(
            id=create_uuid(),
            user_id=target_user.id,
            legal_entity_id=entity.id,
            account_number=f"USR-TX-{uid}",
            name="Investor USDT Deposit",
            account_type="LIABILITY",
            account_category="INVESTOR_DEPOSIT",
            normal_balance="CREDIT",
            asset_id=asset_usdt.id,
            is_active=True,
        )
        session.add(user_acct)
        await session.flush()
        user_bal = AccountBalanceModel(
            account_id=user_acct.id,
            current_balance=Decimal("1000.00"),
            functional_usd_balance=Decimal("1000.00"),
            version=1,
        )
        session.add(user_bal)
        await session.flush()

        # Create balanced 2-legged transaction
        tx = FinancialTransactionModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            transaction_ref=f"TX-ADMIN-INSPECT-{uid}",
            idempotency_key=f"idemp-{uid}",
            payload_hash=f"hash-{uid}",
            source_service="TEST_FIXTURE",
            transaction_type="DEPOSIT",
            status="PENDING",
            initiator_user_id=target_user.id,
            description="Inspection Test Deposit",
        )
        session.add(tx)
        await session.flush()

        entry_user = JournalEntryModel(
            id=create_uuid(),
            transaction_id=tx.id,
            account_id=user_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="CREDIT",
            entry_sequence=1,
            native_amount=Decimal("1000.000000"),
            functional_amount_usd=Decimal("1000.0000"),
            narrative="User credit",
        )
        entry_op = JournalEntryModel(
            id=create_uuid(),
            transaction_id=tx.id,
            account_id=op_acct.id,
            asset_id=asset_usdt.id,
            legal_entity_id=entity.id,
            direction="DEBIT",
            entry_sequence=2,
            native_amount=Decimal("1000.000000"),
            functional_amount_usd=Decimal("1000.0000"),
            narrative="OpCo debit",
        )
        session.add_all([entry_user, entry_op])
        await session.flush()

        # Follow lifecycle: PENDING -> POSTED -> SETTLED
        tx.status = "POSTED"
        tx.posted_at = datetime.now(timezone.utc)
        await session.flush()

        tx.status = "SETTLED"
        tx.settled_at = datetime.now(timezone.utc)
        await session.commit()

    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get(f"/api/v1/admin/users/{target_user.id}/transactions", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1
        tx_item = next(item for item in data["items"] if item["id"] == tx.id)
        assert tx_item["transactionRef"] == f"TX-ADMIN-INSPECT-{uid}"
        assert tx_item["status"] == "SETTLED"
        assert tx_item["asset"] == "USDT"
        assert tx_item["amount"] == "1000.00"
        assert tx_item["direction"] == "CREDIT"


# -------------------------------------------------------------------------
# Test 9: Audit record creation and inspection
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_audit_record_creation_and_listing():
    uid = uuid.uuid4().hex[:6]
    async with AsyncSessionLocal() as session:
        admin_user, admin_token = await setup_test_user(
            session, email=f"audit_admin_{uid}@nexora.test", full_name="Audit Admin", role="admin"
        )
        target_user, _ = await setup_test_user(
            session, email=f"audit_target_{uid}@nexora.test", full_name="Audit Target", role="investor"
        )

    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Trigger audit logging actions
        await ac.get("/api/v1/admin/users", headers=headers)
        await ac.get(f"/api/v1/admin/users/{target_user.id}", headers=headers)
        await ac.get(f"/api/v1/admin/users/{target_user.id}/accounts", headers=headers)
        await ac.get(f"/api/v1/admin/users/{target_user.id}/transactions", headers=headers)

        # Inspect audit logs
        res_logs = await ac.get("/api/v1/admin/audit-logs", headers=headers)
        assert res_logs.status_code == 200
        data = res_logs.json()
        assert data["total"] >= 4
        actions = [log["action"] for log in data["items"]]
        assert "ADMIN_USER_LIST_VIEW" in actions
        assert "ADMIN_USER_DETAIL_VIEW" in actions
        assert "ADMIN_USER_ACCOUNTS_VIEW" in actions
        assert "ADMIN_USER_TRANSACTIONS_VIEW" in actions


# -------------------------------------------------------------------------
# Test 10: PostgreSQL database-level immutability on admin audit records
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_audit_log_database_immutability():
    async with AsyncSessionLocal() as session:
        admin_user, _ = await setup_test_user(
            session, email="audit_immut@nexora.test", full_name="Audit Immutability Admin", role="admin"
        )
        audit_entry = AdminAuditLogModel(
            id=create_uuid(),
            admin_user_id=admin_user.id,
            action="ADMIN_TEST_IMMUTABILITY",
            target_entity="test",
            outcome="SUCCESS",
            details="Trigger immutability test record",
        )
        session.add(audit_entry)
        await session.commit()
        audit_id = audit_entry.id

    # Attempting to UPDATE the audit record must fail via PostgreSQL trigger
    async with AsyncSessionLocal() as session:
        with pytest.raises(Exception) as exc_update:
            await session.execute(
                text("UPDATE admin_audit_logs SET action = 'MODIFIED_ILLEGALLY' WHERE id = :id"),
                {"id": audit_id},
            )
            await session.commit()
        assert "Immutability Violation" in str(exc_update.value)

    # Attempting to DELETE the audit record must fail via PostgreSQL trigger
    async with AsyncSessionLocal() as session:
        with pytest.raises(Exception) as exc_delete:
            await session.execute(
                text("DELETE FROM admin_audit_logs WHERE id = :id"),
                {"id": audit_id},
            )
            await session.commit()
        assert "Immutability Violation" in str(exc_delete.value)


# -------------------------------------------------------------------------
# Test 11: Cross-user and cross-role protection (No IDOR or privilege bypass)
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_cross_user_cross_role_access_protection():
    async with AsyncSessionLocal() as session:
        investor_a, token_a = await setup_test_user(
            session, email="investor_a@nexora.test", full_name="Investor A", role="investor"
        )
        investor_b, _ = await setup_test_user(
            session, email="investor_b@nexora.test", full_name="Investor B", role="investor"
        )

    transport = ASGITransport(app=app)
    headers_a = {"Authorization": f"Bearer {token_a}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Investor A cannot inspect Investor B via admin endpoints
        res_accts = await ac.get(f"/api/v1/admin/users/{investor_b.id}/accounts", headers=headers_a)
        assert res_accts.status_code == 403

        res_txs = await ac.get(f"/api/v1/admin/users/{investor_b.id}/transactions", headers=headers_a)
        assert res_txs.status_code == 403

        res_detail = await ac.get(f"/api/v1/admin/users/{investor_b.id}", headers=headers_a)
        assert res_detail.status_code == 403

        res_audit = await ac.get("/api/v1/admin/audit-logs", headers=headers_a)
        assert res_audit.status_code == 403
