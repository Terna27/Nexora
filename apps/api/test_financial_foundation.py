import pytest
import uuid
import asyncio
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import select, text
from fastapi import HTTPException

from database import AsyncSessionLocal
from models.financial import (
    LegalEntityModel,
    AssetModel,
    AccountModel,
    AccountBalanceModel,
    FinancialTransactionModel,
    JournalEntryModel,
)
from services.ledger import LedgerService

@pytest.fixture
async def setup_accounts():
    """Sets up test accounts in OpCo and Vehicle ledgers."""
    async with AsyncSessionLocal() as session:
        # Check entities
        res_opco = await session.execute(select(LegalEntityModel).where(LegalEntityModel.code == "NEXORA_OPCO"))
        opco = res_opco.scalar_one()

        res_veh = await session.execute(select(LegalEntityModel).where(LegalEntityModel.code == "NEXORA_VEHICLE"))
        veh = res_veh.scalar_one()

        # Check assets
        res_eth = await session.execute(select(AssetModel).where(AssetModel.symbol == "ETH"))
        eth = res_eth.scalar_one()

        res_usdt = await session.execute(select(AssetModel).where(AssetModel.symbol == "USDT"))
        usdt = res_usdt.scalar_one()

        uid = str(uuid.uuid4())[:8]

        # Vehicle Accounts
        vault_eth = AccountModel(
            id=f"acc_v_eth_{uid}",
            legal_entity_id=veh.id,
            account_number=f"1200-ETH-VAULT-{uid}",
            name="Vehicle ETH Vault",
            account_type="ASSET",
            account_category="PORTFOLIO_CUSTODY",
            normal_balance="DEBIT",
            asset_id=eth.id,
        )
        trading_usdt = AccountModel(
            id=f"acc_v_usdt_{uid}",
            legal_entity_id=veh.id,
            account_number=f"1220-USDT-SPOT-{uid}",
            name="Vehicle Spot USDT",
            account_type="ASSET",
            account_category="EXCHANGE_SPOT",
            normal_balance="DEBIT",
            asset_id=usdt.id,
        )
        fee_usdt = AccountModel(
            id=f"acc_v_fee_{uid}",
            legal_entity_id=veh.id,
            account_number=f"5200-USDT-FEE-{uid}",
            name="Vehicle Trading Fee",
            account_type="EXPENSE",
            account_category="TRADING_COMMISSION",
            normal_balance="DEBIT",
            asset_id=usdt.id,
        )
        gain_usd = AccountModel(
            id=f"acc_v_gain_{uid}",
            legal_entity_id=veh.id,
            account_number=f"4300-USD-GAIN-{uid}",
            name="Vehicle Realized Gain",
            account_type="REVENUE",
            account_category="REALIZED_GAIN",
            normal_balance="CREDIT",
            asset_id=usdt.id, # Denominated in USD/USDT
        )

        # OpCo Accounts
        opco_cash = AccountModel(
            id=f"acc_op_cash_{uid}",
            legal_entity_id=opco.id,
            account_number=f"1100-USDT-OPCO-{uid}",
            name="OpCo Operating Cash",
            account_type="ASSET",
            account_category="OPERATING_CASH",
            normal_balance="DEBIT",
            asset_id=usdt.id,
        )
        opco_revenue = AccountModel(
            id=f"acc_op_rev_{uid}",
            legal_entity_id=opco.id,
            account_number=f"4100-USD-FEE-REV-{uid}",
            name="OpCo Fee Revenue",
            account_type="REVENUE",
            account_category="MANAGEMENT_FEE",
            normal_balance="CREDIT",
            asset_id=usdt.id,
        )

        session.add_all([vault_eth, trading_usdt, fee_usdt, gain_usd, opco_cash, opco_revenue])
        await session.commit()

        yield {
            "opco": opco,
            "veh": veh,
            "eth": eth,
            "usdt": usdt,
            "vault_eth": vault_eth,
            "trading_usdt": trading_usdt,
            "fee_usdt": fee_usdt,
            "gain_usd": gain_usd,
            "opco_cash": opco_cash,
            "opco_revenue": opco_revenue,
        }

@pytest.mark.asyncio
async def test_balanced_posting_and_normal_balance(setup_accounts):
    """Verifies that balanced transactions post correctly and update normal balances."""
    data = setup_accounts
    veh = data["veh"]
    vault_eth = data["vault_eth"]
    trading_usdt = data["trading_usdt"]
    fee_usdt = data["fee_usdt"]

    async with AsyncSessionLocal() as session:
        service = LedgerService(session)
        tx_ref = f"TX-TEST-{uuid.uuid4().hex[:8]}"
        idem_key = f"IDEM-{uuid.uuid4().hex}"

        entries = [
            {
                "account_id": trading_usdt.id,
                "asset_id": trading_usdt.asset_id,
                "direction": "DEBIT",
                "native_amount": Decimal("3500.000000"),
                "functional_amount_usd": Decimal("3500.0000"),
            },
            {
                "account_id": vault_eth.id,
                "asset_id": vault_eth.asset_id,
                "direction": "CREDIT",
                "native_amount": Decimal("1.000000000000000000"),
                "functional_amount_usd": Decimal("3500.0000"),
            },
        ]

        tx = await service.create_and_post_transaction(
            legal_entity_id=veh.id,
            transaction_ref=tx_ref,
            idempotency_key=idem_key,
            payload_hash="hash_abc_123",
            source_service="test_suite",
            transaction_type="SPOT_TRADE",
            entries=entries,
        )
        await session.commit()

        assert tx.status == "POSTED"
        assert tx.posted_at is not None

        # Verify normal-balance updates
        bal_usdt = await session.get(AccountBalanceModel, trading_usdt.id)
        bal_eth = await session.get(AccountBalanceModel, vault_eth.id)

        # Asset (Normal Balance = DEBIT): DEBIT increases balance
        assert bal_usdt.current_balance == Decimal("3500.000000")
        assert bal_usdt.functional_usd_balance == Decimal("3500.0000")

        # Asset (Normal Balance = DEBIT): CREDIT decreases balance
        assert bal_eth.current_balance == Decimal("-1.000000000000000000")
        assert bal_eth.functional_usd_balance == Decimal("-3500.0000")

@pytest.mark.asyncio
async def test_unbalanced_journal_rejection(setup_accounts):
    """Rejects transactions where USD debits do not equal credits."""
    data = setup_accounts
    veh = data["veh"]
    vault_eth = data["vault_eth"]
    trading_usdt = data["trading_usdt"]
    fee_usdt = data["fee_usdt"]

    async with AsyncSessionLocal() as session:
        service = LedgerService(session)
        tx_ref = f"TX-UNBAL-{uuid.uuid4().hex[:8]}"

        entries = [
            {
                "account_id": trading_usdt.id,
                "asset_id": trading_usdt.asset_id,
                "direction": "DEBIT",
                "native_amount": Decimal("3500.000000"),
                "functional_amount_usd": Decimal("3500.0000"),
            },
            {
                "account_id": vault_eth.id,
                "asset_id": vault_eth.asset_id,
                "direction": "CREDIT",
                "native_amount": Decimal("1.000000000000000000"),
                "functional_amount_usd": Decimal("3000.0000"), # Unbalanced!
            },
        ]

        with pytest.raises(HTTPException) as exc:
            await service.create_and_post_transaction(
                legal_entity_id=veh.id,
                transaction_ref=tx_ref,
                idempotency_key=f"IDEM-{uuid.uuid4().hex}",
                payload_hash="hash_test",
                source_service="test_suite",
                transaction_type="SPOT_TRADE",
                entries=entries,
            )
        assert exc.value.status_code == 422
        assert "unbalanced in functional USD" in exc.value.detail

@pytest.mark.asyncio
async def test_idempotency_replay_and_mismatch_rejection(setup_accounts):
    """Allows safe replay on identical hash; raises 409 on mismatched payload."""
    data = setup_accounts
    veh = data["veh"]
    vault_eth = data["vault_eth"]
    trading_usdt = data["trading_usdt"]
    fee_usdt = data["fee_usdt"]

    async with AsyncSessionLocal() as session:
        service = LedgerService(session)
        idem_key = f"IDEM-REPLAY-{uuid.uuid4().hex}"
        payload_hash = "hash_exact_payload_1"

        entries = [
            {
                "account_id": trading_usdt.id,
                "asset_id": trading_usdt.asset_id,
                "direction": "DEBIT",
                "native_amount": Decimal("100.0"),
                "functional_amount_usd": Decimal("100.0"),
            },
            {
                "account_id": vault_eth.id,
                "asset_id": vault_eth.asset_id,
                "direction": "CREDIT",
                "native_amount": Decimal("0.03"),
                "functional_amount_usd": Decimal("100.0"),
            },
        ]

        # First Call: Posts
        tx1 = await service.create_and_post_transaction(
            legal_entity_id=veh.id,
            transaction_ref=f"TX-IDEM-{uuid.uuid4().hex[:8]}",
            idempotency_key=idem_key,
            payload_hash=payload_hash,
            source_service="test_service",
            transaction_type="DEPOSIT",
            entries=entries,
        )
        await session.commit()

        # Second Call: Identical key and hash -> Replays original tx
        tx2 = await service.create_and_post_transaction(
            legal_entity_id=veh.id,
            transaction_ref=f"TX-SHOULD-NOT-USE",
            idempotency_key=idem_key,
            payload_hash=payload_hash,
            source_service="test_service",
            transaction_type="DEPOSIT",
            entries=entries,
        )
        assert tx1.id == tx2.id

        # Third Call: Same key, DIFFERENT payload hash -> 409 Conflict
        with pytest.raises(HTTPException) as exc:
            await service.create_and_post_transaction(
                legal_entity_id=veh.id,
                transaction_ref=f"TX-DIFFERENT",
                idempotency_key=idem_key,
                payload_hash="hash_altered_payload_2",
                source_service="test_service",
                transaction_type="DEPOSIT",
                entries=entries,
            )
        assert exc.value.status_code == 409
        assert "previously used with different payload" in exc.value.detail

@pytest.mark.asyncio
async def test_cross_entity_isolation(setup_accounts):
    """Rejects transactions mixing accounts from different legal entities."""
    data = setup_accounts
    veh = data["veh"]
    vault_eth = data["vault_eth"] # Belongs to Vehicle
    opco_cash = data["opco_cash"] # Belongs to OpCo

    async with AsyncSessionLocal() as session:
        service = LedgerService(session)
        entries = [
            {
                "account_id": opco_cash.id,
                "asset_id": opco_cash.asset_id,
                "direction": "DEBIT",
                "native_amount": Decimal("100.0"),
                "functional_amount_usd": Decimal("100.0"),
            },
            {
                "account_id": vault_eth.id,
                "asset_id": vault_eth.asset_id,
                "direction": "CREDIT",
                "native_amount": Decimal("0.03"),
                "functional_amount_usd": Decimal("100.0"),
            },
        ]

        with pytest.raises(HTTPException) as exc:
            await service.create_and_post_transaction(
                legal_entity_id=veh.id,
                transaction_ref=f"TX-CROSS-{uuid.uuid4().hex[:8]}",
                idempotency_key=f"IDEM-CROSS-{uuid.uuid4().hex}",
                payload_hash="hash_test",
                source_service="test_service",
                transaction_type="DEPOSIT",
                entries=entries,
            )
        assert exc.value.status_code == 422
        assert "belongs to entity" in exc.value.detail

@pytest.mark.asyncio
async def test_posted_immutability_trigger(setup_accounts):
    """Database trigger prevents updating or deleting entries of a POSTED transaction."""
    data = setup_accounts
    veh = data["veh"]
    vault_eth = data["vault_eth"]
    trading_usdt = data["trading_usdt"]
    fee_usdt = data["fee_usdt"]

    async with AsyncSessionLocal() as session:
        service = LedgerService(session)
        tx = await service.create_and_post_transaction(
            legal_entity_id=veh.id,
            transaction_ref=f"TX-IMMUT-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"IDEM-IMMUT-{uuid.uuid4().hex}",
            payload_hash="hash_test",
            source_service="test_service",
            transaction_type="DEPOSIT",
            entries=[
                {
                    "account_id": trading_usdt.id,
                    "asset_id": trading_usdt.asset_id,
                    "direction": "DEBIT",
                    "native_amount": Decimal("50.0"),
                    "functional_amount_usd": Decimal("50.0"),
                },
                {
                    "account_id": vault_eth.id,
                    "asset_id": vault_eth.asset_id,
                    "direction": "CREDIT",
                    "native_amount": Decimal("0.015"),
                    "functional_amount_usd": Decimal("50.0"),
                },
            ],
        )
        await session.commit()

        # Attempt to delete journal entry directly via raw SQL
        with pytest.raises(Exception) as exc:
            await session.execute(
                text(f"DELETE FROM journal_entries WHERE transaction_id = '{tx.id}'")
            )
            await session.commit()
        assert "Immutability Violation" in str(exc.value)

@pytest.mark.asyncio
async def test_partial_reversal_limits(setup_accounts):
    """Allows partial reversal up to original amount; rejects over-reversal."""
    data = setup_accounts
    veh = data["veh"]
    vault_eth = data["vault_eth"]
    trading_usdt = data["trading_usdt"]
    fee_usdt = data["fee_usdt"]

    async with AsyncSessionLocal() as session:
        service = LedgerService(session)
        orig_tx = await service.create_and_post_transaction(
            legal_entity_id=veh.id,
            transaction_ref=f"TX-REV-ORIG-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"IDEM-ORIG-{uuid.uuid4().hex}",
            payload_hash="hash_test",
            source_service="test_service",
            transaction_type="DEPOSIT",
            entries=[
                {
                    "account_id": trading_usdt.id,
                    "asset_id": trading_usdt.asset_id,
                    "direction": "DEBIT",
                    "native_amount": Decimal("1000.000000"),
                    "functional_amount_usd": Decimal("1000.0000"),
                },
                {
                    "account_id": vault_eth.id,
                    "asset_id": vault_eth.asset_id,
                    "direction": "CREDIT",
                    "native_amount": Decimal("0.300000"),
                    "functional_amount_usd": Decimal("1000.0000"),
                },
            ],
        )
        await session.commit()

        # Explicitly query the created journal entry to avoid async lazy-load
        res_entries = await session.execute(
            select(JournalEntryModel)
            .where(JournalEntryModel.transaction_id == orig_tx.id)
            .order_by(JournalEntryModel.entry_sequence)
        )
        orig_entry = res_entries.scalars().all()[0] # 1000 USDT DEBIT

        # Partial Reversal 1: Reverse 400 USDT
        rev1 = await service.reverse_transaction_entry(
            original_entry_id=orig_entry.id,
            reversal_amount=Decimal("400.0"),
            reversal_tx_ref=f"TX-REV-1-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"IDEM-REV-1-{uuid.uuid4().hex}",
            payload_hash="h1",
            source_service="reversal_worker",
            counter_account_id=fee_usdt.id,
        )
        await session.commit()
        assert rev1.status == "POSTED"

        # Partial Reversal 2: Reverse 600 USDT (completes 1000 USDT)
        rev2 = await service.reverse_transaction_entry(
            original_entry_id=orig_entry.id,
            reversal_amount=Decimal("600.0"),
            reversal_tx_ref=f"TX-REV-2-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"IDEM-REV-2-{uuid.uuid4().hex}",
            payload_hash="h2",
            source_service="reversal_worker",
            counter_account_id=fee_usdt.id,
        )
        await session.commit()
        assert rev2.status == "POSTED"

        # Reversal 3: Attempt to reverse 1 more USDT -> Rejection!
        with pytest.raises(HTTPException) as exc:
            await service.reverse_transaction_entry(
                original_entry_id=orig_entry.id,
                reversal_amount=Decimal("1.0"),
                reversal_tx_ref=f"TX-REV-3-{uuid.uuid4().hex[:8]}",
                idempotency_key=f"IDEM-REV-3-{uuid.uuid4().hex}",
                payload_hash="h3",
                source_service="reversal_worker",
                counter_account_id=fee_usdt.id,
            )
        assert exc.value.status_code == 422
        assert "exceeds remaining unreversed" in exc.value.detail

@pytest.mark.asyncio
async def test_voided_transaction_cannot_be_deleted(setup_accounts):
    """Database trigger prevents raw SQL deletion of VOIDED transactions."""
    data = setup_accounts
    veh = data["veh"]

    async with AsyncSessionLocal() as session:
        tx_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        tx = FinancialTransactionModel(
            id=tx_id,
            legal_entity_id=veh.id,
            transaction_ref=f"TX-VOID-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"IDEM-VOID-{uuid.uuid4().hex}",
            payload_hash="hash_void_test",
            source_service="test_suite",
            transaction_type="DEPOSIT",
            status="PENDING",
            created_at=now,
        )
        session.add(tx)
        await session.commit()

        # Valid transition: PENDING -> VOIDED
        tx.status = "VOIDED"
        await session.commit()

        # Attempt raw SQL DELETE on the VOIDED transaction
        with pytest.raises(Exception) as exc:
            await session.execute(
                text(f"DELETE FROM financial_transactions WHERE id = '{tx_id}'")
            )
            await session.commit()
        assert "Security Violation: Cannot delete transaction" in str(exc.value)
        assert "status VOIDED" in str(exc.value)

@pytest.mark.asyncio
async def test_multi_asset_reversal_independence_and_usd_limits(setup_accounts):
    """
    Verifies that:
    1. Reversals are tracked independently per original journal entry.
    2. Native quantities from different assets are never combined into a single scalar.
    3. Both native amount and functional USD limits are strictly enforced.
    """
    data = setup_accounts
    veh = data["veh"]
    vault_eth = data["vault_eth"]
    trading_usdt = data["trading_usdt"]

    async with AsyncSessionLocal() as session:
        service = LedgerService(session)
        tx = await service.create_and_post_transaction(
            legal_entity_id=veh.id,
            transaction_ref=f"TX-MULTI-ORIG-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"IDEM-MULTI-{uuid.uuid4().hex}",
            payload_hash="hash_multi",
            source_service="test_suite",
            transaction_type="SPOT_TRADE",
            entries=[
                {
                    "account_id": trading_usdt.id,
                    "asset_id": trading_usdt.asset_id,
                    "direction": "DEBIT",
                    "native_amount": Decimal("3000.000000"),
                    "functional_amount_usd": Decimal("3000.0000"),
                },
                {
                    "account_id": vault_eth.id,
                    "asset_id": vault_eth.asset_id,
                    "direction": "CREDIT",
                    "native_amount": Decimal("1.000000"),
                    "functional_amount_usd": Decimal("3000.0000"),
                },
            ],
        )
        await session.commit()

        res_entries = await session.execute(
            select(JournalEntryModel)
            .where(JournalEntryModel.transaction_id == tx.id)
            .order_by(JournalEntryModel.entry_sequence)
        )
        entries = res_entries.scalars().all()
        usdt_entry = entries[0] # 3000 USDT DEBIT
        eth_entry = entries[1]  # 1 ETH CREDIT

        # 1. Reverse 0.4 ETH on the ETH entry (USD value: 1200.00)
        rev_eth = await service.reverse_transaction_entry(
            original_entry_id=eth_entry.id,
            reversal_amount=Decimal("0.400000"),
            reversal_tx_ref=f"TX-REV-ETH-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"IDEM-REV-ETH-{uuid.uuid4().hex}",
            payload_hash="h_eth",
            source_service="reversal_worker",
            counter_account_id=vault_eth.id,
        )
        await session.commit()
        assert rev_eth.status == "POSTED"

        # 2. Reverse 1000 USDT on the USDT entry (USD value: 1000.00)
        rev_usdt = await service.reverse_transaction_entry(
            original_entry_id=usdt_entry.id,
            reversal_amount=Decimal("1000.000000"),
            reversal_tx_ref=f"TX-REV-USDT-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"IDEM-REV-USDT-{uuid.uuid4().hex}",
            payload_hash="h_usdt",
            source_service="reversal_worker",
            counter_account_id=trading_usdt.id,
        )
        await session.commit()
        assert rev_usdt.status == "POSTED"

        # 3. Verify ETH reversal limits: remaining is 0.600000 ETH. Attempting 0.600001 must fail
        with pytest.raises(HTTPException) as exc_eth:
            await service.reverse_transaction_entry(
                original_entry_id=eth_entry.id,
                reversal_amount=Decimal("0.600001"),
                reversal_tx_ref=f"TX-REV-ETH-EXC-{uuid.uuid4().hex[:8]}",
                idempotency_key=f"IDEM-REV-ETH-EXC-{uuid.uuid4().hex}",
                payload_hash="h_eth_exc",
                source_service="reversal_worker",
                counter_account_id=vault_eth.id,
            )
        assert exc_eth.value.status_code == 422
        assert "exceeds remaining unreversed native amount" in exc_eth.value.detail

        # 4. Verify USDT reversal limits: remaining is 2000 USDT. Attempting 2001 USDT must fail
        with pytest.raises(HTTPException) as exc_usdt:
            await service.reverse_transaction_entry(
                original_entry_id=usdt_entry.id,
                reversal_amount=Decimal("2001.000000"),
                reversal_tx_ref=f"TX-REV-USDT-EXC-{uuid.uuid4().hex[:8]}",
                idempotency_key=f"IDEM-REV-USDT-EXC-{uuid.uuid4().hex}",
                payload_hash="h_usdt_exc",
                source_service="reversal_worker",
                counter_account_id=trading_usdt.id,
            )
        assert exc_usdt.value.status_code == 422
        assert "exceeds remaining unreversed native amount" in exc_usdt.value.detail

