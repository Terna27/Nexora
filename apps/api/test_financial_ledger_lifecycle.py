import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, update

from database import AsyncSessionLocal
from main import app
from models.financial import (
    LegalEntityModel,
    AssetModel,
    AccountModel,
    AccountBalanceModel,
    FinancialTransactionModel,
    JournalEntryModel,
)
from models.user import UserModel, UserSessionModel
from services.ledger import LedgerService
from security import hash_password, hash_token

def create_uuid() -> str:
    return str(uuid.uuid4())

async def setup_test_investor(session, email: str, full_name: str = "Test Investor"):
    user_id = create_uuid()
    u = UserModel(
        id=user_id,
        full_name=full_name,
        email=email,
        password_hash=hash_password("InvestorSecret123!"),
        role="investor",
        is_active=True,
        is_verified=True,
    )
    session.add(u)
    raw_token = f"tok_{uuid.uuid4().hex}"
    s = UserSessionModel(
        id=create_uuid(),
        user_id=u.id,
        session_token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    session.add(s)
    await session.commit()
    return u, raw_token

async def setup_test_admin(session, email: str):
    user_id = create_uuid()
    u = UserModel(
        id=user_id,
        full_name="Ledger Admin",
        email=email,
        password_hash=hash_password("AdminSecret123!"),
        role="admin",
        is_active=True,
        is_verified=True,
    )
    session.add(u)
    raw_token = f"tok_{uuid.uuid4().hex}"
    s = UserSessionModel(
        id=create_uuid(),
        user_id=u.id,
        session_token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    session.add(s)
    await session.commit()
    return u, raw_token

async def setup_user_account_with_balance(session, user_id: str, asset_symbol: str, balance_amount: Decimal):
    entity = (await session.execute(select(LegalEntityModel).where(LegalEntityModel.code == "NEXORA_OPCO"))).scalar_one()
    asset = (await session.execute(select(AssetModel).where(AssetModel.symbol == asset_symbol.upper()))).scalar_one()

    # Create user custodial liability account
    account_id = create_uuid()
    acct = AccountModel(
        id=account_id,
        legal_entity_id=entity.id,
        account_number=f"2000-CUST-{asset.symbol}-{uuid.uuid4().hex[:6].upper()}",
        name=f"User Custodial Liability {asset.symbol}",
        account_type="LIABILITY",
        account_category="INVESTOR_DEPOSIT",
        normal_balance="CREDIT",
        asset_id=asset.id,
        user_id=user_id,
        is_active=True,
    )
    session.add(acct)
    await session.flush()

    bal = AccountBalanceModel(
        account_id=acct.id,
        current_balance=balance_amount,
        functional_usd_balance=balance_amount if asset.symbol in ("USD", "USDT") else balance_amount * Decimal("2000.00"),
        version=1,
    )
    session.add(bal)
    await session.commit()
    return acct, asset, entity


# =========================================================================
# 1. Double-Entry Invariant & Native Asset Balancing
# =========================================================================

@pytest.mark.asyncio
async def test_double_entry_single_currency_native_balancing():
    """
    Verifies that for transactions in a single currency, both native amounts
    and functional USD amounts must balance (Total Debits = Total Credits).
    """
    async with AsyncSessionLocal() as session:
        entity = (await session.execute(select(LegalEntityModel).where(LegalEntityModel.code == "NEXORA_OPCO"))).scalar_one()
        eth = (await session.execute(select(AssetModel).where(AssetModel.symbol == "ETH"))).scalar_one()

        uid = uuid.uuid4().hex[:6]
        acct1 = AccountModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            account_number=f"1100-ETH-A-{uid}",
            name="ETH Acct A",
            account_type="ASSET",
            account_category="OPERATING_CASH",
            normal_balance="DEBIT",
            asset_id=eth.id,
        )
        acct2 = AccountModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            account_number=f"1100-ETH-B-{uid}",
            name="ETH Acct B",
            account_type="ASSET",
            account_category="OPERATING_CASH",
            normal_balance="DEBIT",
            asset_id=eth.id,
        )
        session.add_all([acct1, acct2])
        await session.commit()

        service = LedgerService(session)

        # Attempt to post a transaction where USD balances but native amounts differ (1.0 ETH vs 1.1 ETH)
        unbalanced_entries = [
            {
                "account_id": acct1.id,
                "asset_id": eth.id,
                "direction": "DEBIT",
                "native_amount": Decimal("1.00000000"),
                "functional_amount_usd": Decimal("2500.00"),
            },
            {
                "account_id": acct2.id,
                "asset_id": eth.id,
                "direction": "CREDIT",
                "native_amount": Decimal("1.10000000"),
                "functional_amount_usd": Decimal("2500.00"),
            },
        ]

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await service.create_and_post_transaction(
                legal_entity_id=entity.id,
                transaction_ref=f"TX-UNBAL-{uuid.uuid4().hex[:6]}",
                idempotency_key=f"idem-unbal-{uuid.uuid4().hex[:6]}",
                payload_hash="payload_unbal",
                source_service="TEST",
                transaction_type="INTERNAL_TRANSFER",
                entries=unbalanced_entries,
            )
        assert exc_info.value.status_code == 422
        assert "unbalanced in native asset" in exc_info.value.detail.lower()

        # Post balanced transaction: 1.0 ETH debit and 1.0 ETH credit
        balanced_entries = [
            {
                "account_id": acct1.id,
                "asset_id": eth.id,
                "direction": "DEBIT",
                "native_amount": Decimal("1.00000000"),
                "functional_amount_usd": Decimal("2500.00"),
            },
            {
                "account_id": acct2.id,
                "asset_id": eth.id,
                "direction": "CREDIT",
                "native_amount": Decimal("1.00000000"),
                "functional_amount_usd": Decimal("2500.00"),
            },
        ]
        tx = await service.create_and_post_transaction(
            legal_entity_id=entity.id,
            transaction_ref=f"TX-BAL-{uuid.uuid4().hex[:6]}",
            idempotency_key=f"idem-bal-{uuid.uuid4().hex[:6]}",
            payload_hash="payload_bal",
            source_service="TEST",
            transaction_type="INTERNAL_TRANSFER",
            entries=balanced_entries,
        )
        assert tx.status == "POSTED"

        # Verify via verify_double_entry_balance
        audit = await service.verify_double_entry_balance(tx.id)
        assert audit["isUsdBalanced"] is True
        assert audit["isNativeBalanced"] is True
        assert audit["entryCount"] == 2


# =========================================================================
# 2. Ledger Reconstruction & Drift Reconciliation
# =========================================================================

@pytest.mark.asyncio
async def test_reconstruct_and_reconcile_account_balance():
    """
    Verifies that account balances can be reconstructed from immutable
    journal entries and that any drift in cached/materialized balance is detected and repaired.
    """
    async with AsyncSessionLocal() as session:
        user, _ = await setup_test_investor(session, f"recon_{uuid.uuid4().hex[:6]}@nexora.test")
        acct, asset, entity = await setup_user_account_with_balance(session, user.id, "USDT", Decimal("0.00"))

        service = LedgerService(session)

        # Post a deposit transaction crediting the user liability account by 500 USDT
        op_acct = AccountModel(
            id=create_uuid(),
            legal_entity_id=entity.id,
            account_number=f"1000-CASH-{uuid.uuid4().hex[:6].upper()}",
            name="OpCo Operating Cash",
            account_type="ASSET",
            account_category="OPERATING_CASH",
            normal_balance="DEBIT",
            asset_id=asset.id,
        )
        session.add(op_acct)
        await session.flush()

        deposit_entries = [
            {
                "account_id": op_acct.id,
                "asset_id": asset.id,
                "direction": "DEBIT",
                "native_amount": Decimal("500.00"),
                "functional_amount_usd": Decimal("500.00"),
            },
            {
                "account_id": acct.id,
                "asset_id": asset.id,
                "direction": "CREDIT",
                "native_amount": Decimal("500.00"),
                "functional_amount_usd": Decimal("500.00"),
            },
        ]
        tx = await service.create_and_post_transaction(
            legal_entity_id=entity.id,
            transaction_ref=f"TX-DEP-{uuid.uuid4().hex[:6]}",
            idempotency_key=f"idem-dep-{uuid.uuid4().hex[:6]}",
            payload_hash="payload_dep",
            source_service="TEST",
            transaction_type="DEPOSIT",
            entries=deposit_entries,
        )
        await session.commit()

        # Update materialized balance to match settled state
        stmt_bal = select(AccountBalanceModel).where(AccountBalanceModel.account_id == acct.id)
        bal_record = (await session.execute(stmt_bal)).scalar_one()
        bal_record.current_balance = Decimal("500.00")
        bal_record.functional_usd_balance = Decimal("500.00")
        await session.commit()

        # 1. Reconstruct balance directly from ledger entries
        recon = await service.reconstruct_account_balance(acct.id)
        assert recon["native"] == Decimal("500.00")
        assert recon["functional_usd"] == Decimal("500.00")

        # 2. Check reconciliation: consistent
        reconcile_res = await service.reconcile_account_balance(acct.id, auto_repair=False)
        assert reconcile_res["isConsistent"] is True
        assert reconcile_res["variance"] == "0.00"
        assert reconcile_res["repaired"] is False

        # 3. Simulate drift (e.g. out-of-band edit to materialized balance)
        bal_record.current_balance = Decimal("400.00") # $100 drift
        await session.commit()

        reconcile_drift = await service.reconcile_account_balance(acct.id, auto_repair=False)
        assert reconcile_drift["isConsistent"] is False
        assert reconcile_drift["variance"] == "-100.00"
        assert reconcile_drift["repaired"] is False

        # 4. Repair drift via auto_repair
        reconcile_repair = await service.reconcile_account_balance(acct.id, auto_repair=True)
        assert reconcile_repair["repaired"] is True
        assert reconcile_repair["materializedBalance"] == "400.00"
        assert reconcile_repair["reconstructedBalance"] == "500.00"

        # Re-check after repair
        reconcile_final = await service.reconcile_account_balance(acct.id, auto_repair=False)
        assert reconcile_final["isConsistent"] is True
        assert reconcile_final["materializedBalance"] == "500.00"


# =========================================================================
# 3. Complete Withdrawal Lifecycle: Creation, Hold, Approval & Settle
# =========================================================================

@pytest.mark.asyncio
async def test_withdrawal_complete_lifecycle():
    """
    Traces complete lifecycle:
    PENDING (Reservation hold created, available reduced, settled unchanged)
    -> POSTED (Approved, funds still reserved)
    -> SETTLED (Materialized balance deducted, reserved released, available preserved).
    """
    async with AsyncSessionLocal() as session:
        investor, inv_token = await setup_test_investor(session, f"inv_wth_{uuid.uuid4().hex[:6]}@nexora.test")
        admin, adm_token = await setup_test_admin(session, f"adm_wth_{uuid.uuid4().hex[:6]}@nexora.test")

        # Setup 1,000 USDT settled balance
        acct, asset, entity = await setup_user_account_with_balance(
            session, investor.id, "USDT", Decimal("1000.00")
        )

    inv_headers = {"Authorization": f"Bearer {inv_token}"}
    adm_headers = {"Authorization": f"Bearer {adm_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Step 1: Check initial portfolio
        port_res0 = await client.get("/api/v1/portfolio/me", headers=inv_headers)
        assert port_res0.status_code == 200
        usdt_bal0 = next(b for b in port_res0.json()["accounts"] if b["asset"] == "USDT")
        assert usdt_bal0["settledBalance"] == "1000.00"
        assert usdt_bal0["reservedBalance"] == "0.00"
        assert usdt_bal0["availableBalance"] == "1000.00"

        # Step 2: Attempt withdrawal exceeding available balance (1,200 USDT)
        wth_excess = await client.post(
            "/api/v1/transactions/withdraw",
            json={
                "asset": "USDT",
                "amount": 1200.0,
                "destination": "0x1111222233334444555566667777888899990000",
                "idempotencyKey": f"idem-excess-{uuid.uuid4().hex}",
            },
            headers=inv_headers,
        )
        assert wth_excess.status_code == 400
        assert "insufficient available balance" in wth_excess.json()["detail"].lower()

        # Step 3: Create valid withdrawal request (400 USDT)
        wth_key = f"idem-valid-{uuid.uuid4().hex}"
        wth_res = await client.post(
            "/api/v1/transactions/withdraw",
            json={
                "asset": "USDT",
                "amount": 400.0,
                "destination": "0x1111222233334444555566667777888899990000",
                "idempotencyKey": wth_key,
                "notes": "Testing production withdrawal",
            },
            headers=inv_headers,
        )
        assert wth_res.status_code == 200
        wth_data = wth_res.json()
        tx_id = wth_data["id"]
        assert wth_data["status"] == "PENDING"
        assert wth_data["reservedBalance"] == "400.00"
        assert wth_data["remainingAvailableBalance"] == "600.00"

        # Step 4: Verify Idempotency replay
        replay_res = await client.post(
            "/api/v1/transactions/withdraw",
            json={
                "asset": "USDT",
                "amount": 400.0,
                "destination": "0x1111222233334444555566667777888899990000",
                "idempotencyKey": wth_key,
            },
            headers=inv_headers,
        )
        assert replay_res.status_code == 200
        assert replay_res.json()["id"] == tx_id

        # Idempotency conflict with different amount
        conflict_res = await client.post(
            "/api/v1/transactions/withdraw",
            json={
                "asset": "USDT",
                "amount": 250.0,
                "destination": "0x1111222233334444555566667777888899990000",
                "idempotencyKey": wth_key,
            },
            headers=inv_headers,
        )
        assert conflict_res.status_code == 409

        # Step 5: Verify portfolio reflects reservation hold
        port_res1 = await client.get("/api/v1/portfolio/me", headers=inv_headers)
        assert port_res1.status_code == 200
        usdt_bal1 = next(b for b in port_res1.json()["accounts"] if b["asset"] == "USDT")
        assert usdt_bal1["settledBalance"] == "1000.00"  # Settled funds NOT deducted prematurely
        assert usdt_bal1["reservedBalance"] == "400.00"  # Reserved funds on hold
        assert usdt_bal1["availableBalance"] == "600.00" # Available funds safely reduced

        # Step 6: Cannot settle while still PENDING
        settle_pending_fail = await client.post(
            f"/api/v1/admin/withdrawals/{tx_id}/settle",
            json={"payoutReference": "0xhash123456789"},
            headers=adm_headers,
        )
        assert settle_pending_fail.status_code == 409
        assert "only posted" in settle_pending_fail.json()["detail"].lower()

        # Step 7: Admin approves withdrawal (transitions to POSTED)
        apprv_res = await client.post(
            f"/api/v1/admin/withdrawals/{tx_id}/approve",
            json={"notes": "Compliance checks passed"},
            headers=adm_headers,
        )
        assert apprv_res.status_code == 200
        assert apprv_res.json()["success"] is True

        # Portfolio after approval: funds remain reserved awaiting payout execution
        port_res2 = await client.get("/api/v1/portfolio/me", headers=inv_headers)
        usdt_bal2 = next(b for b in port_res2.json()["accounts"] if b["asset"] == "USDT")
        assert usdt_bal2["settledBalance"] == "1000.00"
        assert usdt_bal2["reservedBalance"] == "400.00"
        assert usdt_bal2["availableBalance"] == "600.00"

        # Step 8: Settle withdrawal upon external payout confirmation
        payout_ref = "0x5a1e8c9d0b4f3a2e1d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e"
        settle_res = await client.post(
            f"/api/v1/admin/withdrawals/{tx_id}/settle",
            json={"payoutReference": payout_ref, "notes": "Disbursed via Hot Wallet Node #2"},
            headers=adm_headers,
        )
        assert settle_res.status_code == 200
        assert settle_res.json()["success"] is True

        # Step 9: Verify final portfolio balances after settlement
        port_res3 = await client.get("/api/v1/portfolio/me", headers=inv_headers)
        usdt_bal3 = next(b for b in port_res3.json()["accounts"] if b["asset"] == "USDT")
        # Now settled balance is permanently reduced to 600.00, reserved balance returned to 0.00, available is 600.00
        assert usdt_bal3["settledBalance"] == "600.00"
        assert usdt_bal3["reservedBalance"] == "0.00"
        assert usdt_bal3["availableBalance"] == "600.00"

        # Step 10: Verify double entry balance of the settled withdrawal
        audit_res = await client.get(
            f"/api/v1/transactions/{tx_id}/audit-double-entry",
            headers=inv_headers,
        )
        assert audit_res.status_code == 200
        audit_data = audit_res.json()
        assert audit_data["status"] == "SETTLED"
        assert audit_data["isUsdBalanced"] is True
        assert audit_data["isNativeBalanced"] is True
        assert audit_data["entryCount"] == 2


# =========================================================================
# 4. Withdrawal Rejection & Immediate Fund Release
# =========================================================================

@pytest.mark.asyncio
async def test_withdrawal_rejection_releases_reserved_funds():
    """
    Verifies that rejecting a pending withdrawal request immediately transitions
    its status to VOIDED and releases the reserved balance hold back into available balance.
    """
    async with AsyncSessionLocal() as session:
        investor, inv_token = await setup_test_investor(session, f"inv_rej_{uuid.uuid4().hex[:6]}@nexora.test")
        admin, adm_token = await setup_test_admin(session, f"adm_rej_{uuid.uuid4().hex[:6]}@nexora.test")

        # Setup 500 USDT settled balance
        acct, asset, entity = await setup_user_account_with_balance(
            session, investor.id, "USDT", Decimal("500.00")
        )

    inv_headers = {"Authorization": f"Bearer {inv_token}"}
    adm_headers = {"Authorization": f"Bearer {adm_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create withdrawal request of 300 USDT
        wth_res = await client.post(
            "/api/v1/transactions/withdraw",
            json={
                "asset": "USDT",
                "amount": 300.0,
                "destination": "0x9999888877776666555544443333222211110000",
                "idempotencyKey": f"idem-rej-{uuid.uuid4().hex}",
            },
            headers=inv_headers,
        )
        assert wth_res.status_code == 200
        tx_id = wth_res.json()["id"]

        # Check balance: reserved = 300, available = 200
        port_res1 = await client.get("/api/v1/portfolio/me", headers=inv_headers)
        bal1 = next(b for b in port_res1.json()["accounts"] if b["asset"] == "USDT")
        assert bal1["reservedBalance"] == "300.00"
        assert bal1["availableBalance"] == "200.00"

        # Admin rejects withdrawal
        rej_res = await client.post(
            f"/api/v1/admin/withdrawals/{tx_id}/reject",
            json={"reason": "Incorrect network destination address provided"},
            headers=adm_headers,
        )
        assert rej_res.status_code == 200
        assert rej_res.json()["success"] is True

        # Check balance: reserved released back to 0.00, available restored to 500.00
        port_res2 = await client.get("/api/v1/portfolio/me", headers=inv_headers)
        bal2 = next(b for b in port_res2.json()["accounts"] if b["asset"] == "USDT")
        assert bal2["settledBalance"] == "500.00"
        assert bal2["reservedBalance"] == "0.00"
        assert bal2["availableBalance"] == "500.00"

        # Rejection is terminal: cannot approve or reject again
        re_apprv = await client.post(
            f"/api/v1/admin/withdrawals/{tx_id}/approve",
            json={"notes": "Try approve voided"},
            headers=adm_headers,
        )
        assert re_apprv.status_code == 409
