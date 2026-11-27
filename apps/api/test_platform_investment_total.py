import pytest
import uuid
import json
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from database import AsyncSessionLocal
from security import hash_token
from models.user import (
    UserModel,
    UserSessionModel,
    UserInvestmentRecordModel,
    PlatformInvestmentConfigurationModel,
    AdminAuditLogModel,
)
from models.financial import (
    AccountModel,
    AccountBalanceModel,
    AssetModel,
)


def create_uuid() -> str:
    return str(uuid.uuid4())


async def setup_user(session: AsyncSession, email_prefix: str, role: str = "investor") -> tuple[UserModel, str]:
    email = f"{email_prefix}_{uuid.uuid4().hex[:8]}@example.com"
    user = UserModel(
        id=create_uuid(),
        full_name=f"Test {email_prefix.capitalize()}",
        email=email,
        password_hash="mock_hash",
        role=role,
        is_active=True,
        is_verified=True,
        mfa_enabled=False,
    )
    session.add(user)
    await session.flush()

    raw_token = f"tok_{role}_{uuid.uuid4()}"
    sess = UserSessionModel(
        id=create_uuid(),
        user_id=user.id,
        session_token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    session.add(sess)
    await session.commit()
    return user, raw_token


@pytest.mark.asyncio
async def test_admin_platform_investment_access_control():
    """
    Test security and role-based authorization:
    - Unauthenticated cannot access admin configuration endpoints (401).
    - Ordinary investor cannot access admin configuration endpoints (403).
    - Admin has full access.
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        investor_u, investor_tok = await setup_user(session, "standard_investor", role="investor")
        admin_u, admin_tok = await setup_user(session, "platform_admin", role="admin")

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Unauthenticated GET & PUT
        res1 = await ac.get("/api/v1/admin/platform/investment-configuration")
        assert res1.status_code == 401

        res2 = await ac.put(
            "/api/v1/admin/platform/investment-configuration",
            json={"amount": 1000000, "currency": "USD", "reason": "Unauthorized attempt"},
        )
        assert res2.status_code == 401

        # 2. Investor GET & PUT forbidden (403)
        res3 = await ac.get(
            "/api/v1/admin/platform/investment-configuration",
            headers={"Authorization": f"Bearer {investor_tok}"},
        )
        assert res3.status_code == 403

        res4 = await ac.put(
            "/api/v1/admin/platform/investment-configuration",
            headers={"Authorization": f"Bearer {investor_tok}"},
            json={"amount": 1000000, "currency": "USD", "reason": "Self-allocated platform amount"},
        )
        assert res4.status_code == 403

        # 3. Admin GET allowed (200)
        res5 = await ac.get(
            "/api/v1/admin/platform/investment-configuration",
            headers={"Authorization": f"Bearer {admin_tok}"},
        )
        assert res5.status_code == 200


@pytest.mark.asyncio
async def test_admin_platform_investment_validation():
    """
    Test validation safeguards:
    - Rejects negative amounts.
    - Rejects unsupported currencies.
    - Rejects short or missing reasons.
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        admin_u, admin_tok = await setup_user(session, "validator_admin", role="admin")

    headers = {"Authorization": f"Bearer {admin_tok}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Negative amount
        res1 = await ac.put(
            "/api/v1/admin/platform/investment-configuration",
            headers=headers,
            json={"amount": -50000, "currency": "USD", "reason": "Negative amount test"},
        )
        assert res1.status_code in [400, 422]

        # Unsupported currency
        res2 = await ac.put(
            "/api/v1/admin/platform/investment-configuration",
            headers=headers,
            json={"amount": 50000, "currency": "XYZ_COIN", "reason": "Unsupported currency test"},
        )
        assert res2.status_code == 400
        assert "not supported" in res2.json()["detail"].lower()

        # Short reason (< 5 characters)
        res3 = await ac.put(
            "/api/v1/admin/platform/investment-configuration",
            headers=headers,
            json={"amount": 50000, "currency": "USD", "reason": "bad"},
        )
        assert res3.status_code in [400, 422]


@pytest.mark.asyncio
async def test_admin_configures_global_platform_investment_and_audit():
    """
    Test that an authorized administrator can save and update the global platform investment amount,
    that it persists, and an immutable audit log is generated.
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        admin_u, admin_tok = await setup_user(session, "chief_ops_admin", role="admin")

    headers = {"Authorization": f"Bearer {admin_tok}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        update_reason = "Q4 2026 Institutional Allocation Mandate Close #REF-8849"
        res = await ac.put(
            "/api/v1/admin/platform/investment-configuration",
            headers=headers,
            json={
                "amount": 12500000.00,
                "currency": "USD",
                "reason": update_reason,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["isConfigured"] is True
        assert data["amount"] == "12500000.00"
        assert data["currency"] == "USD"
        assert data["updatedByAdminEmail"] == admin_u.email
        assert data["lastReason"] == update_reason

        # Verify persistent read from GET endpoint
        get_res = await ac.get("/api/v1/admin/platform/investment-configuration", headers=headers)
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["amount"] == "12500000.00"
        assert get_data["currency"] == "USD"

    # Verify audit log in database
    async with AsyncSessionLocal() as session:
        stmt_audit = (
            select(AdminAuditLogModel)
            .where(
                AdminAuditLogModel.action == "ADMIN_PLATFORM_INVESTMENT_UPDATE",
                AdminAuditLogModel.admin_user_id == admin_u.id,
            )
            .order_by(AdminAuditLogModel.created_at.desc())
        )
        audit = (await session.execute(stmt_audit)).scalars().first()
        assert audit is not None
        assert audit.reason == update_reason
        assert "12500000" in audit.details


@pytest.mark.asyncio
async def test_investors_receive_identical_global_amount_and_conversions():
    """
    Test that:
    1. Every investor (Alice, Bob) and Admin receives the exact same global platform amount.
    2. Changing display currency converts the same base amount into USD, EUR, GBP, NGN, USDT, BTC, ETH, SOL.
    3. Individual user investment records do NOT alter the global platform amount.
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        alice, alice_tok = await setup_user(session, "alice_investor")
        bob, bob_tok = await setup_user(session, "bob_investor")
        admin_u, admin_tok = await setup_user(session, "lead_admin", role="admin")

        # Set a known platform configuration ($8,000,000.00 USD)
        cfg = PlatformInvestmentConfigurationModel(
            amount=Decimal("8000000.00"),
            currency="USD",
            updated_by_admin_id=admin_u.id,
            last_reason="Global platform investment setup for multi-user test",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(cfg)

        # Give Alice an individual user investment record of $25,000
        alice_rec = UserInvestmentRecordModel(
            user_id=alice.id,
            amount=Decimal("25000.00"),
            currency="USD",
            updated_by_admin_id=admin_u.id,
            last_reason="Alice personal record",
        )
        session.add(alice_rec)
        await session.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers_alice = {"Authorization": f"Bearer {alice_tok}"}
        headers_bob = {"Authorization": f"Bearer {bob_tok}"}
        headers_admin = {"Authorization": f"Bearer {admin_tok}"}

        # 1. Alice queries platform total (should see $8,000,000, NOT her individual $25,000)
        res_alice = await ac.get("/api/v1/platform/investment-total?currency=USD", headers=headers_alice)
        assert res_alice.status_code == 200
        data_alice = res_alice.json()
        assert data_alice["isConfigured"] is True
        assert data_alice["isAvailable"] is True
        assert Decimal(data_alice["baseAmount"]) == Decimal("8000000.00")
        assert Decimal(data_alice["convertedAmount"]) == Decimal("8000000.00")
        assert data_alice["targetCurrency"] == "USD"
        assert "$8,000,000.00 USD" in data_alice["formattedDisplay"]
        # Administrative privacy check: investor endpoint must not expose admin email or audit reasons
        assert "updatedByAdminEmail" not in data_alice or data_alice.get("updatedByAdminEmail") is None
        assert "lastReason" not in data_alice or data_alice.get("lastReason") is None

        # 2. Bob queries platform total (must be IDENTICAL to Alice)
        res_bob = await ac.get("/api/v1/platform/investment-total?currency=USD", headers=headers_bob)
        assert res_bob.status_code == 200
        data_bob = res_bob.json()
        assert data_bob["baseAmount"] == data_alice["baseAmount"]
        assert data_bob["convertedAmount"] == data_alice["convertedAmount"]
        assert data_bob["formattedDisplay"] == data_alice["formattedDisplay"]

        # 3. Admin queries platform total (identical)
        res_admin = await ac.get("/api/v1/platform/investment-total?currency=USD", headers=headers_admin)
        assert res_admin.status_code == 200
        data_admin = res_admin.json()
        assert data_admin["baseAmount"] == data_alice["baseAmount"]

        # 4. Multi-currency conversions for Alice
        # EUR
        res_eur = await ac.get("/api/v1/platform/investment-total?currency=EUR", headers=headers_alice)
        assert res_eur.status_code == 200
        data_eur = res_eur.json()
        assert data_eur["targetCurrency"] == "EUR"
        assert "€" in data_eur["formattedDisplay"]
        assert Decimal(data_eur["convertedAmount"]) > Decimal("0")

        # GBP
        res_gbp = await ac.get("/api/v1/platform/investment-total?currency=GBP", headers=headers_alice)
        assert res_gbp.status_code == 200
        data_gbp = res_gbp.json()
        assert data_gbp["targetCurrency"] == "GBP"
        assert "£" in data_gbp["formattedDisplay"]

        # NGN
        res_ngn = await ac.get("/api/v1/platform/investment-total?currency=NGN", headers=headers_alice)
        assert res_ngn.status_code == 200
        data_ngn = res_ngn.json()
        assert data_ngn["targetCurrency"] == "NGN"
        assert "₦" in data_ngn["formattedDisplay"]

        # USDT (1:1 stablecoin)
        res_usdt = await ac.get("/api/v1/platform/investment-total?currency=USDT", headers=headers_alice)
        assert res_usdt.status_code == 200
        data_usdt = res_usdt.json()
        assert data_usdt["targetCurrency"] == "USDT"
        assert Decimal(data_usdt["convertedAmount"]) == Decimal("8000000.00")

        # BTC (8 decimals)
        res_btc = await ac.get("/api/v1/platform/investment-total?currency=BTC", headers=headers_alice)
        assert res_btc.status_code == 200
        data_btc = res_btc.json()
        assert data_btc["targetCurrency"] == "BTC"
        assert len(data_btc["convertedAmount"].split(".")[1]) == 8

        # ETH (6 decimals)
        res_eth = await ac.get("/api/v1/platform/investment-total?currency=ETH", headers=headers_alice)
        assert res_eth.status_code == 200
        data_eth = res_eth.json()
        assert data_eth["targetCurrency"] == "ETH"
        assert len(data_eth["convertedAmount"].split(".")[1]) == 6

        # SOL (4 decimals)
        res_sol = await ac.get("/api/v1/platform/investment-total?currency=SOL", headers=headers_alice)
        assert res_sol.status_code == 200
        data_sol = res_sol.json()
        assert data_sol["targetCurrency"] == "SOL"
        assert len(data_sol["convertedAmount"].split(".")[1]) == 4


@pytest.mark.asyncio
async def test_financial_ledger_balances_untouched_by_admin_global_amount():
    """
    Test financial separation:
    Administrator setting the platform investment amount must NOT modify:
    - User account balances
    - Financial transaction records
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        admin_u, admin_tok = await setup_user(session, "ledger_safety_admin", role="admin")

        # Query baseline account balances count and total
        stmt_balances = select(func.sum(AccountBalanceModel.current_balance))
        initial_balance_sum = await session.scalar(stmt_balances) or Decimal("0")

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {admin_tok}"}
        res = await ac.put(
            "/api/v1/admin/platform/investment-configuration",
            headers=headers,
            json={
                "amount": 999999999.00,
                "currency": "USD",
                "reason": "Large financial integrity verification amount",
            },
        )
        assert res.status_code == 200

    async with AsyncSessionLocal() as session:
        stmt_balances_after = select(func.sum(AccountBalanceModel.current_balance))
        after_balance_sum = await session.scalar(stmt_balances_after) or Decimal("0")
        assert after_balance_sum == initial_balance_sum


@pytest.mark.asyncio
async def test_unconfigured_state_honest_reporting():
    """
    Test that when no platform investment configuration has been created,
    the endpoint returns an honest unconfigured state (isConfigured=False, isAvailable=False, baseAmount=None).
    """
    from sqlalchemy import delete
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        user_u, user_tok = await setup_user(session, "unconfig_tester")
        await session.execute(delete(PlatformInvestmentConfigurationModel))
        await session.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {user_tok}"}
        res = await ac.get("/api/v1/platform/investment-total?currency=USD", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["isConfigured"] is False
        assert data["isAvailable"] is False
        assert data["baseAmount"] is None
        assert data["convertedAmount"] is None
        assert "not been configured yet" in data["statusMessage"].lower()


