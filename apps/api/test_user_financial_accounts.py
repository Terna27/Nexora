import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from database import AsyncSessionLocal
from security import hash_token
from models.user import UserModel, UserSessionModel
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

@pytest.fixture(autouse=True)
async def cleanup_user_financial_test_data():
    yield
    # Note: Immutable double-entry ledger triggers deliberately reject DELETE on POSTED/SETTLED records.
    # We clean up disposable unlinked auth sessions and users where safe.
    async with AsyncSessionLocal() as session:
        pass

async def setup_test_user(session: AsyncSession, email: str, full_name: str) -> tuple[UserModel, str]:
    unique_email = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}@{email.split('@')[1]}"
    user = UserModel(
        id=create_uuid(),
        full_name=full_name,
        email=unique_email,
        password_hash="mock_hash",
        role="investor",
        is_active=True,
        is_verified=True,
    )
    session.add(user)
    await session.flush()

    raw_token = f"test_session_token_{uuid.uuid4()}"
    user_session = UserSessionModel(
        id=create_uuid(),
        user_id=user.id,
        session_token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    session.add(user_session)
    await session.commit()
    return user, raw_token

async def get_or_create_test_entities(session: AsyncSession) -> tuple[LegalEntityModel, AssetModel, AssetModel, AccountModel]:
    # Legal Entity
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

    # Asset: BTC
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

    # Asset: USDT
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

    # OpCo Clearing Account (for balanced double-entry counter-party)
    stmt_op = select(AccountModel).where(AccountModel.account_number == "OPCO-BTC-CLEARING")
    res_op = await session.execute(stmt_op)
    op_acct = res_op.scalar_one_or_none()
    if not op_acct:
        op_acct = AccountModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            account_number="OPCO-BTC-CLEARING",
            name="OpCo BTC Clearing",
            account_type="ASSET",
            account_category="OPERATING_CASH",
            normal_balance="DEBIT",
            asset_id=asset_btc.id,
            user_id=None,
            is_active=True,
        )
        session.add(op_acct)
        await session.flush()

        bal_op = AccountBalanceModel(
            account_id=op_acct.id,
            current_balance=Decimal("1000.00000000"),
            functional_usd_balance=Decimal("95000000.00"),
            version=1,
        )
        session.add(bal_op)

    await session.commit()
    return entity, asset_btc, asset_usdt, op_acct

# ----------------- TEST CASES -----------------

@pytest.mark.asyncio
async def test_unauthenticated_access_rejection():
    """Requirement 2: Unauthenticated access rejection on portfolio and transactions endpoints."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_portfolio = await client.get("/api/v1/portfolio/me")
        assert res_portfolio.status_code == 401
        assert "Authentication required" in res_portfolio.json()["detail"]

        res_transactions = await client.get("/api/v1/transactions/me")
        assert res_transactions.status_code == 401
        assert "Authentication required" in res_transactions.json()["detail"]

@pytest.mark.asyncio
async def test_empty_account_handling():
    """Requirement 8 & 9: Clean empty account handling and explicit unavailable metrics for new users."""
    async with AsyncSessionLocal() as session:
        user, token = await setup_test_user(session, "empty_user@fin.test", "Empty Account User")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/v1/portfolio/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["userId"] == user.id
        assert data["hasAccounts"] is False
        assert data["status"] == "UNPROVISIONED"
        assert data["totalBalanceUsd"] is None  # Strict rule: never fabricate $0.00 when unprovisioned!
        assert data["isAvailable"] is False
        assert data["accounts"] == []
        assert data["metrics"]["totalEarningsUsd"] is None
        assert data["metrics"]["activePrincipalUsd"] is None
        assert data["metrics"]["accruedDailyYieldUsd"] is None
        assert "totalEarningsUsd" in data["unsupportedMetrics"]

        # Check transactions endpoint for empty user
        res_tx = await client.get(
            "/api/v1/transactions/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res_tx.status_code == 200
        data_tx = res_tx.json()
        assert data_tx["items"] == []
        assert data_tx["total"] == 0
        assert data_tx["pages"] == 0

@pytest.mark.asyncio
async def test_authenticated_portfolio_and_authoritative_balances():
    """Requirement 1, 5, 10: Authenticated retrieval, correct authoritative balance derivation, decimal precision."""
    async with AsyncSessionLocal() as session:
        user, token = await setup_test_user(session, "alice_investor@fin.test", "Alice Investor")
        entity, asset_btc, asset_usdt, _ = await get_or_create_test_entities(session)

        # Provision BTC account for user
        acc_btc = AccountModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            account_number=f"ACC-BTC-{uuid.uuid4().hex[:8]}",
            name="[TEST] Alice BTC Custodial Wallet",
            account_type="LIABILITY",
            account_category="CUSTODIAL_WALLET",
            normal_balance="CREDIT",
            asset_id=asset_btc.id,
            user_id=user.id,
            is_active=True,
        )
        session.add(acc_btc)

        # Provision USDT account for user
        acc_usdt = AccountModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            account_number=f"ACC-USDT-{uuid.uuid4().hex[:8]}",
            name="[TEST] Alice USDT Custodial Wallet",
            account_type="LIABILITY",
            account_category="CUSTODIAL_WALLET",
            normal_balance="CREDIT",
            asset_id=asset_usdt.id,
            user_id=user.id,
            is_active=True,
        )
        session.add(acc_usdt)
        await session.flush()

        # Set authoritative balances
        bal_btc = AccountBalanceModel(
            account_id=acc_btc.id,
            current_balance=Decimal("1.25000000"),
            functional_usd_balance=Decimal("118750.00"),
            version=1,
        )
        bal_usdt = AccountBalanceModel(
            account_id=acc_usdt.id,
            current_balance=Decimal("5000.00"),
            functional_usd_balance=Decimal("5000.00"),
            version=1,
        )
        session.add_all([bal_btc, bal_usdt])
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/v1/portfolio/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["userId"] == user.id
        assert data["hasAccounts"] is True
        assert data["status"] == "PROVISIONED"
        assert data["isAvailable"] is True
        # Total USD balance: 118750.00 + 5000.00 = 123750.00
        assert data["totalBalanceUsd"] == "123750.00"
        assert len(data["accounts"]) == 2

        btc_acct = next(a for a in data["accounts"] if a["asset"] == "BTC")
        assert btc_acct["settledBalance"] == "1.25000000"
        assert btc_acct["availableBalance"] == "1.25000000"
        assert btc_acct["functionalUsdBalance"] == "118750.00"
        assert btc_acct["decimals"] == 8

        usdt_acct = next(a for a in data["accounts"] if a["asset"] == "USDT")
        assert usdt_acct["settledBalance"] == "5000.00"
        assert usdt_acct["functionalUsdBalance"] == "5000.00"
        assert usdt_acct["decimals"] == 2

@pytest.mark.asyncio
async def test_user_a_cannot_access_user_b_portfolio_or_transactions():
    """Requirement 3 & 4: Strict user isolation, IDOR prevention, cross-tenant isolation."""
    async with AsyncSessionLocal() as session:
        user_a, token_a = await setup_test_user(session, "user_a@fin.test", "User A")
        user_b, token_b = await setup_test_user(session, "user_b@fin.test", "User B")
        entity, asset_btc, _, op_acct = await get_or_create_test_entities(session)

        # Create account and balance for User B only
        acc_b = AccountModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            account_number=f"ACC-B-{uuid.uuid4().hex[:8]}",
            name="[TEST] User B BTC Vault",
            account_type="LIABILITY",
            account_category="CUSTODIAL_WALLET",
            normal_balance="CREDIT",
            asset_id=asset_btc.id,
            user_id=user_b.id,
            is_active=True,
        )
        session.add(acc_b)
        await session.flush()

        bal_b = AccountBalanceModel(
            account_id=acc_b.id,
            current_balance=Decimal("0"),
            functional_usd_balance=Decimal("0.00"),
            version=1,
        )
        session.add(bal_b)
        await session.commit()

        # Post double-entry transaction using LedgerService
        service = LedgerService(session)
        tx_b_ref = f"TX-B-{uuid.uuid4().hex[:8]}"
        tx_b = await service.create_and_post_transaction(
            legal_entity_id=entity.id,
            transaction_ref=tx_b_ref,
            idempotency_key=f"idem-b-{uuid.uuid4().hex[:8]}",
            payload_hash="mock_payload_hash",
            source_service="TEST",
            transaction_type="DEPOSIT",
            entries=[
                {
                    "account_id": op_acct.id,
                    "asset_id": asset_btc.id,
                    "direction": "DEBIT",
                    "native_amount": Decimal("9.99000000"),
                    "functional_amount_usd": Decimal("949050.00"),
                    "narrative": "[TEST] Debit OpCo clearing",
                },
                {
                    "account_id": acc_b.id,
                    "asset_id": asset_btc.id,
                    "direction": "CREDIT",
                    "native_amount": Decimal("9.99000000"),
                    "functional_amount_usd": Decimal("949050.00"),
                    "narrative": "[TEST] Credit User B account",
                },
            ],
            description="[TEST] User B deposit",
            initiator_user_id=user_b.id,
        )
        # Settle transaction
        tx_b.status = "SETTLED"
        tx_b.settled_at = datetime.now(timezone.utc)
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # User A attempts to view their own portfolio (should be empty, not User B's!)
        res_a = await client.get(
            "/api/v1/portfolio/me",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert res_a.status_code == 200
        data_a = res_a.json()
        assert data_a["userId"] == user_a.id
        assert data_a["hasAccounts"] is False
        assert data_a["totalBalanceUsd"] is None

        # Even if User A tries to pass User B's user_id in query params, it is ignored
        res_a_idor = await client.get(
            f"/api/v1/portfolio/me?user_id={user_b.id}",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert res_a_idor.status_code == 200
        assert res_a_idor.json()["userId"] == user_a.id

        # User A checks transactions: must be empty
        res_tx_a = await client.get(
            "/api/v1/transactions/me",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert res_tx_a.status_code == 200
        assert res_tx_a.json()["items"] == []
        assert res_tx_a.json()["total"] == 0

        # User B checks transactions: sees their 1 transaction
        res_tx_b = await client.get(
            "/api/v1/transactions/me",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert res_tx_b.status_code == 200
        data_tx_b = res_tx_b.json()
        assert data_tx_b["total"] == 1
        assert data_tx_b["items"][0]["transactionRef"] == tx_b.transaction_ref
        assert data_tx_b["items"][0]["amount"] == "9.99000000"

@pytest.mark.asyncio
async def test_transaction_status_pagination_and_filtering():
    """Requirement 6 & 7: Correct transaction statuses (PENDING, POSTED, SETTLED, VOIDED), pagination, filters."""
    async with AsyncSessionLocal() as session:
        user, token = await setup_test_user(session, "trader@fin.test", "Active Trader")
        entity, asset_btc, asset_usdt, op_acct = await get_or_create_test_entities(session)

        # Create user account
        acc = AccountModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            account_number=f"ACC-TRD-{uuid.uuid4().hex[:8]}",
            name="[TEST] Trader Account",
            account_type="LIABILITY",
            account_category="CUSTODIAL_WALLET",
            normal_balance="CREDIT",
            asset_id=asset_btc.id,
            user_id=user.id,
            is_active=True,
        )
        session.add(acc)
        await session.flush()

        bal = AccountBalanceModel(
            account_id=acc.id,
            current_balance=Decimal("0"),
            functional_usd_balance=Decimal("0.00"),
            version=1,
        )
        session.add(bal)
        await session.commit()

        # 1. PENDING transaction
        tx_pending = FinancialTransactionModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            transaction_ref=f"TX-PND-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"idem-pnd-{uuid.uuid4().hex[:8]}",
            payload_hash="hash",
            source_service="TEST",
            transaction_type="DEPOSIT",
            status="PENDING",
            initiator_user_id=user.id,
            description="[TEST] Pending Deposit",
        )
        session.add(tx_pending)
        await session.commit()

        # 2. SETTLED DEPOSIT via LedgerService
        service = LedgerService(session)
        tx_dep = await service.create_and_post_transaction(
            legal_entity_id=entity.id,
            transaction_ref=f"TX-DEP-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"idem-dep-{uuid.uuid4().hex[:8]}",
            payload_hash="hash_dep",
            source_service="TEST",
            transaction_type="DEPOSIT",
            entries=[
                {
                    "account_id": op_acct.id,
                    "asset_id": asset_btc.id,
                    "direction": "DEBIT",
                    "native_amount": Decimal("0.50000000"),
                    "functional_amount_usd": Decimal("47500.00"),
                    "narrative": "[TEST] OpCo debit",
                },
                {
                    "account_id": acc.id,
                    "asset_id": asset_btc.id,
                    "direction": "CREDIT",
                    "native_amount": Decimal("0.50000000"),
                    "functional_amount_usd": Decimal("47500.00"),
                    "narrative": "[TEST] Credit deposit",
                },
            ],
            description="[TEST] Settled Deposit",
            initiator_user_id=user.id,
        )
        tx_dep.status = "SETTLED"
        tx_dep.settled_at = datetime.now(timezone.utc)
        await session.commit()

        # 3. SETTLED WITHDRAWAL via LedgerService
        tx_wth = await service.create_and_post_transaction(
            legal_entity_id=entity.id,
            transaction_ref=f"TX-WTH-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"idem-wth-{uuid.uuid4().hex[:8]}",
            payload_hash="hash_wth",
            source_service="TEST",
            transaction_type="WITHDRAWAL",
            entries=[
                {
                    "account_id": acc.id,
                    "asset_id": asset_btc.id,
                    "direction": "DEBIT",
                    "native_amount": Decimal("0.10000000"),
                    "functional_amount_usd": Decimal("9500.00"),
                    "narrative": "[TEST] Debit withdrawal",
                },
                {
                    "account_id": op_acct.id,
                    "asset_id": asset_btc.id,
                    "direction": "CREDIT",
                    "native_amount": Decimal("0.10000000"),
                    "functional_amount_usd": Decimal("9500.00"),
                    "narrative": "[TEST] OpCo credit",
                },
            ],
            description="[TEST] Settled Withdrawal",
            initiator_user_id=user.id,
        )
        tx_wth.status = "SETTLED"
        tx_wth.settled_at = datetime.now(timezone.utc)
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # All transactions (total 3)
        res_all = await client.get(
            "/api/v1/transactions/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res_all.status_code == 200
        assert res_all.json()["total"] == 3

        # Pagination: page_size=2
        res_page = await client.get(
            "/api/v1/transactions/me?page=1&page_size=2",
            headers={"Authorization": f"Bearer {token}"}
        )
        data_page = res_page.json()
        assert len(data_page["items"]) == 2
        assert data_page["total"] == 3
        assert data_page["pages"] == 2

        # Filter by status=PENDING
        res_pending = await client.get(
            "/api/v1/transactions/me?status=PENDING",
            headers={"Authorization": f"Bearer {token}"}
        )
        data_pending = res_pending.json()
        assert data_pending["total"] == 1
        assert data_pending["items"][0]["status"] == "PENDING"

        # Filter by transaction_type=WITHDRAWAL
        res_wth = await client.get(
            "/api/v1/transactions/me?transaction_type=WITHDRAWAL",
            headers={"Authorization": f"Bearer {token}"}
        )
        data_wth = res_wth.json()
        assert data_wth["total"] == 1
        assert data_wth["items"][0]["transactionType"] == "WITHDRAWAL"
        assert data_wth["items"][0]["direction"] == "DEBIT"

@pytest.mark.asyncio
async def test_migration_and_schema_integrity():
    """Requirement 11: Verify migration behavior and schema integrity on test database."""
    async with AsyncSessionLocal() as session:
        # Query alembic_version table directly
        res = await session.execute(text("SELECT version_num FROM alembic_version;"))
        versions = [r[0] for r in res.fetchall()]
        assert len(versions) > 0
        assert any(v in ["0005_unitization_nav", "0006_admin_audit_log", "0007_user_investment_record", "0008_platform_inv_config"] for v in versions)

        # Query information_schema for core financial tables
        res_tables = await session.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name IN ('accounts', 'account_balances', 'financial_transactions', 'journal_entries');
        """))
        found = {r[0] for r in res_tables.fetchall()}
        assert {"accounts", "account_balances", "financial_transactions", "journal_entries"}.issubset(found)
