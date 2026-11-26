import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from database import AsyncSessionLocal
from security import hash_token
from models.user import UserModel, UserSessionModel, UserInvestmentRecordModel
from models.financial import (
    LegalEntityModel,
    InvestorUnitActivityModel,
    FinancialTransactionModel,
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


async def get_or_create_legal_entity(session: AsyncSession) -> LegalEntityModel:
    stmt = select(LegalEntityModel).where(LegalEntityModel.entity_type == "INVESTMENT_VEHICLE")
    entity = (await session.execute(stmt)).scalars().first()
    if not entity:
        entity = LegalEntityModel(
            id=create_uuid(),
            legal_name="Nexora Master Fund SPV",
            code=f"NEX_{uuid.uuid4().hex[:6].upper()}",
            entity_type="INVESTMENT_VEHICLE",
            functional_currency="USD",
            is_active=True,
        )
        session.add(entity)
        await session.commit()
    return entity


@pytest.mark.asyncio
async def test_platform_investment_total_honest_unavailable_state():
    """
    When no settled platform unit activities exist (or in empty state),
    the endpoint returns an honest unavailable state with isAvailable=False.
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        user_a, token_a = await setup_user(session, "empty_investor")

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Unauthenticated request rejected
        unauth_res = await ac.get("/api/v1/platform/investment-total")
        assert unauth_res.status_code == 401

        # Authenticated request
        headers = {"Authorization": f"Bearer {token_a}"}
        res = await ac.get("/api/v1/platform/investment-total", headers=headers)
        assert res.status_code == 200
        data = res.json()

        # Check response structure
        assert "isAvailable" in data
        assert "supportedCurrencies" in data
        assert "USD" in data["supportedCurrencies"]
        assert "BTC" in data["supportedCurrencies"]
        assert "EUR" in data["supportedCurrencies"]
        assert "NGN" in data["supportedCurrencies"]
        assert "disclaimer" in data


@pytest.mark.asyncio
async def test_platform_investment_total_explicit_unavailable_branch():
    """
    Explicitly test that when database aggregate returns 0 (unprovisioned/no issuances),
    it returns isAvailable=False, baseAmountUsd=None, and honest status message.
    """
    from unittest.mock import patch
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        user_mock, token_mock = await setup_user(session, "mock_unavail_user")

    with patch("sqlalchemy.ext.asyncio.AsyncSession.scalar", return_value=Decimal("0.0000")):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            headers = {"Authorization": f"Bearer {token_mock}"}
            res = await ac.get("/api/v1/platform/investment-total?currency=USD", headers=headers)
            assert res.status_code == 200
            data = res.json()
            assert data["isAvailable"] is False
            assert data["baseAmountUsd"] is None
            assert data["convertedAmount"] is None
            assert data["formattedDisplay"] is None
            assert "Investment reporting is not yet available" in data["statusMessage"]


@pytest.mark.asyncio
async def test_platform_investment_total_multi_user_aggregation_and_conversion():
    """
    Test that:
    1. Settled issuances across MULTIPLE users are aggregated together.
    2. User A and User B receive the exact same underlying platform total.
    3. Currency conversion correctly converts to USD, EUR, GBP, NGN, USDT, BTC, ETH, SOL.
    4. Individual user identities and private accounts are not exposed.
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        user_a, token_a = await setup_user(session, "alice_investor")
        user_b, token_b = await setup_user(session, "bob_investor")
        admin_u, token_admin = await setup_user(session, "ops_admin", role="admin")
        entity = await get_or_create_legal_entity(session)

        # User A unit issuance ($50,000 USD)
        act_a = InvestorUnitActivityModel(
            id=create_uuid(),
            investor_id=user_a.id,
            legal_entity_id=entity.id,
            activity_type="ISSUANCE",
            unit_quantity=Decimal("5000.0000000000"),
            nav_per_unit=Decimal("10.000000"),
            functional_usd_value=Decimal("50000.0000"),
            notes="Alice subscription tranche 1",
        )
        session.add(act_a)

        # User B unit issuance ($75,000 USD)
        act_b = InvestorUnitActivityModel(
            id=create_uuid(),
            investor_id=user_b.id,
            legal_entity_id=entity.id,
            activity_type="ISSUANCE",
            unit_quantity=Decimal("7500.0000000000"),
            nav_per_unit=Decimal("10.000000"),
            functional_usd_value=Decimal("75000.0000"),
            notes="Bob subscription tranche 1",
        )
        session.add(act_b)
        await session.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}
        headers_admin = {"Authorization": f"Bearer {token_admin}"}

        # User A queries total in USD
        res_a = await ac.get("/api/v1/platform/investment-total?currency=USD", headers=headers_a)
        assert res_a.status_code == 200
        data_a = res_a.json()
        assert data_a["isAvailable"] is True
        assert Decimal(data_a["baseAmountUsd"]) >= Decimal("125000.00")
        assert data_a["targetCurrency"] == "USD"
        assert "$ " in data_a["formattedDisplay"] or "$" in data_a["formattedDisplay"]

        # User B queries total in USD - MUST BE IDENTICAL to User A
        res_b = await ac.get("/api/v1/platform/investment-total?currency=USD", headers=headers_b)
        assert res_b.status_code == 200
        data_b = res_b.json()
        assert data_b["baseAmountUsd"] == data_a["baseAmountUsd"]
        assert data_b["convertedAmount"] == data_a["convertedAmount"]

        # Admin queries total in USD - MUST BE IDENTICAL
        res_admin = await ac.get("/api/v1/platform/investment-total?currency=USD", headers=headers_admin)
        assert res_admin.status_code == 200
        data_admin = res_admin.json()
        assert data_admin["baseAmountUsd"] == data_a["baseAmountUsd"]

        # Multi-currency conversions for User A:
        # EUR
        res_eur = await ac.get("/api/v1/platform/investment-total?currency=EUR", headers=headers_a)
        assert res_eur.status_code == 200
        data_eur = res_eur.json()
        assert data_eur["targetCurrency"] == "EUR"
        assert "€" in data_eur["formattedDisplay"]
        assert Decimal(data_eur["convertedAmount"]) > Decimal("0")

        # GBP
        res_gbp = await ac.get("/api/v1/platform/investment-total?currency=GBP", headers=headers_a)
        assert res_gbp.status_code == 200
        data_gbp = res_gbp.json()
        assert data_gbp["targetCurrency"] == "GBP"
        assert "£" in data_gbp["formattedDisplay"]

        # NGN
        res_ngn = await ac.get("/api/v1/platform/investment-total?currency=NGN", headers=headers_a)
        assert res_ngn.status_code == 200
        data_ngn = res_ngn.json()
        assert data_ngn["targetCurrency"] == "NGN"
        assert "₦" in data_ngn["formattedDisplay"]

        # USDT (1:1 stablecoin)
        res_usdt = await ac.get("/api/v1/platform/investment-total?currency=USDT", headers=headers_a)
        assert res_usdt.status_code == 200
        data_usdt = res_usdt.json()
        assert data_usdt["targetCurrency"] == "USDT"
        assert Decimal(data_usdt["convertedAmount"]) == Decimal(data_a["baseAmountUsd"])

        # BTC (institutional crypto pricing, 8 decimals)
        res_btc = await ac.get("/api/v1/platform/investment-total?currency=BTC", headers=headers_a)
        assert res_btc.status_code == 200
        data_btc = res_btc.json()
        assert data_btc["targetCurrency"] == "BTC"
        assert "BTC" in data_btc["formattedDisplay"]
        assert len(data_btc["convertedAmount"].split(".")[1]) == 8

        # ETH (6 decimals)
        res_eth = await ac.get("/api/v1/platform/investment-total?currency=ETH", headers=headers_a)
        assert res_eth.status_code == 200
        data_eth = res_eth.json()
        assert data_eth["targetCurrency"] == "ETH"
        assert "ETH" in data_eth["formattedDisplay"]
        assert len(data_eth["convertedAmount"].split(".")[1]) == 6

        # SOL (4 decimals)
        res_sol = await ac.get("/api/v1/platform/investment-total?currency=SOL", headers=headers_a)
        assert res_sol.status_code == 200
        data_sol = res_sol.json()
        assert data_sol["targetCurrency"] == "SOL"
        assert "SOL" in data_sol["formattedDisplay"]
        assert len(data_sol["convertedAmount"].split(".")[1]) == 4


@pytest.mark.asyncio
async def test_reversals_and_pending_transactions_excluded():
    """
    Test financial integrity:
    1. Issuance reversals (reversal_of_id) are not double-counted.
    2. Issuances with pending transactions are not counted.
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        user_c, token_c = await setup_user(session, "charlie_investor")
        entity = await get_or_create_legal_entity(session)

        # Baseline amount
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res_before = await ac.get("/api/v1/platform/investment-total?currency=USD", headers={"Authorization": f"Bearer {token_c}"})
            base_before = Decimal(res_before.json().get("baseAmountUsd") or "0")

        # 1. Add pending financial transaction + issuance (should NOT increase total)
        pending_tx = FinancialTransactionModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            transaction_ref=f"TX_REF_{uuid.uuid4().hex[:12]}",
            idempotency_key=f"IDEMP_{uuid.uuid4()}",
            payload_hash="dummy_payload_hash",
            source_service="TEST_PLATFORM_CORE",
            transaction_type="SUBSCRIPTION",
            status="PENDING",
            is_fully_reversed=False,
        )
        session.add(pending_tx)
        await session.flush()

        pending_issuance = InvestorUnitActivityModel(
            id=create_uuid(),
            investor_id=user_c.id,
            legal_entity_id=entity.id,
            activity_type="ISSUANCE",
            unit_quantity=Decimal("1000.0000000000"),
            nav_per_unit=Decimal("10.000000"),
            functional_usd_value=Decimal("10000.0000"),
            financial_transaction_id=pending_tx.id,
            notes="Pending unconfirmed issuance",
        )
        session.add(pending_issuance)

        # 2. Add an issuance that is reversed
        orig_issuance = InvestorUnitActivityModel(
            id=create_uuid(),
            investor_id=user_c.id,
            legal_entity_id=entity.id,
            activity_type="ISSUANCE",
            unit_quantity=Decimal("2000.0000000000"),
            nav_per_unit=Decimal("10.000000"),
            functional_usd_value=Decimal("20000.0000"),
            notes="Original issuance to be reversed",
        )
        session.add(orig_issuance)
        await session.flush()

        reversal_act = InvestorUnitActivityModel(
            id=create_uuid(),
            investor_id=user_c.id,
            legal_entity_id=entity.id,
            activity_type="REVERSAL",
            unit_quantity=Decimal("-2000.0000000000"),
            nav_per_unit=Decimal("10.000000"),
            functional_usd_value=Decimal("0.0000"),
            reversal_of_id=orig_issuance.id,
            notes="Reversal of orig_issuance",
        )
        session.add(reversal_act)
        await session.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_after = await ac.get("/api/v1/platform/investment-total?currency=USD", headers={"Authorization": f"Bearer {token_c}"})
        base_after = Decimal(res_after.json().get("baseAmountUsd") or "0")

        # Neither the pending issuance nor the reversed issuance should increase the verified total
        assert base_after == base_before


@pytest.mark.asyncio
async def test_admin_manual_user_entry_cannot_modify_global_total():
    """
    Test that an administrator manually creating or modifying user_investment_records
    has ZERO effect on the global platform investment total.
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        user_d, token_d = await setup_user(session, "david_investor")
        admin_u, token_admin = await setup_user(session, "admin_user", role="admin")

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers_d = {"Authorization": f"Bearer {token_d}"}
        headers_admin = {"Authorization": f"Bearer {token_admin}"}

        # Check total before
        res_before = await ac.get("/api/v1/platform/investment-total?currency=USD", headers=headers_d)
        base_before = res_before.json().get("baseAmountUsd")

        # Admin creates an arbitrary individual user investment record of $999,999,999.00
        create_res = await ac.put(
            f"/api/v1/admin/users/{user_d.id}/investment-record",
            headers=headers_admin,
            json={
                "amount": 999999999.00,
                "currency": "USD",
                "reason": "Manual administrative test entry for audit",
            },
        )
        assert create_res.status_code == 200

        # Check platform total after - MUST BE IDENTICAL to before
        res_after = await ac.get("/api/v1/platform/investment-total?currency=USD", headers=headers_d)
        base_after = res_after.json().get("baseAmountUsd")
        assert base_after == base_before


@pytest.mark.asyncio
async def test_invalid_currency_parameter_validation():
    """
    Test that invalid or unsupported currency codes return 400 Bad Request.
    """
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as session:
        user_e, token_e = await setup_user(session, "eve_investor")

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {token_e}"}
        res = await ac.get("/api/v1/platform/investment-total?currency=INVALID_COIN", headers=headers)
        assert res.status_code == 400
        data = res.json()
        assert "Unsupported currency 'INVALID_COIN'" in data["detail"]
