import uuid
from decimal import Decimal, ROUND_HALF_EVEN
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from fastapi import HTTPException, status

from models.financial import (
    LegalEntityModel,
    AssetModel,
    AccountModel,
    AccountBalanceModel,
    FinancialTransactionModel,
    JournalEntryModel,
    JournalEntryReversalModel,
    IdempotencyRecordModel,
)

def round_usd(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.0001"), rounding=ROUND_HALF_EVEN)

class LedgerService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_and_post_transaction(
        self,
        legal_entity_id: str,
        transaction_ref: str,
        idempotency_key: str,
        payload_hash: str,
        source_service: str,
        transaction_type: str,
        entries: List[Dict[str, Any]],
        description: Optional[str] = None,
        initiator_user_id: Optional[str] = None,
        reversal_of_id: Optional[str] = None,
    ) -> FinancialTransactionModel:
        """
        Creates and posts a double-entry financial transaction with:
        - Strict idempotency checking (hash-match replay or 409 mismatch)
        - Deterministic account balance locking (ordered by account_id ASC)
        - Normal balance arithmetic
        - Strict functional USD balancing check
        """
        # 1. Idempotency Check
        stmt_idem = select(IdempotencyRecordModel).where(
            IdempotencyRecordModel.legal_entity_id == legal_entity_id,
            IdempotencyRecordModel.source_service == source_service,
            IdempotencyRecordModel.idempotency_key == idempotency_key,
        )
        res_idem = await self.session.execute(stmt_idem)
        existing_idem = res_idem.scalar_one_or_none()

        if existing_idem:
            if existing_idem.payload_hash != payload_hash:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Idempotency violation: Key '{idempotency_key}' previously used with different payload.",
                )
            # Replay existing transaction
            stmt_tx = select(FinancialTransactionModel).where(
                FinancialTransactionModel.id == existing_idem.financial_tx_id
            )
            res_tx = await self.session.execute(stmt_tx)
            return res_tx.scalar_one()

        # 2. Basic Entry Validation
        if len(entries) < 2:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Transaction must contain at least 2 journal entries.",
            )

        directions = {e["direction"] for e in entries}
        if not ("DEBIT" in directions and "CREDIT" in directions):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Transaction must contain both DEBIT and CREDIT journal entries.",
            )

        # 3. Functional USD Balancing Verification
        usd_debits = Decimal("0.0000")
        usd_credits = Decimal("0.0000")
        for e in entries:
            usd_amt = round_usd(Decimal(str(e["functional_amount_usd"])))
            if e["direction"] == "DEBIT":
                usd_debits += usd_amt
            else:
                usd_credits += usd_amt

        if usd_debits != usd_credits:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Transaction is unbalanced in functional USD: Debits={usd_debits}, Credits={usd_credits}",
            )

        # 4. Lock Affected Accounts in Strict Ascending Order (Deadlock Prevention)
        account_ids = sorted(list({e["account_id"] for e in entries}))
        stmt_lock_accounts = (
            select(AccountModel)
            .where(AccountModel.id.in_(account_ids))
            .order_by(AccountModel.id.asc())
            .with_for_update()
        )
        res_accounts = await self.session.execute(stmt_lock_accounts)
        accounts_by_id = {acc.id: acc for acc in res_accounts.scalars().all()}

        if len(accounts_by_id) != len(account_ids):
            missing = set(account_ids) - set(accounts_by_id.keys())
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"One or more accounts not found: {missing}",
            )

        # Ensure all accounts belong to the specified legal entity
        for acc in accounts_by_id.values():
            if acc.legal_entity_id != legal_entity_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Account {acc.account_number} belongs to entity {acc.legal_entity_id}, not {legal_entity_id}.",
                )

        # Lock or initialize account balances
        stmt_lock_balances = (
            select(AccountBalanceModel)
            .where(AccountBalanceModel.account_id.in_(account_ids))
            .order_by(AccountBalanceModel.account_id.asc())
            .with_for_update()
        )
        res_balances = await self.session.execute(stmt_lock_balances)
        balances_by_id = {b.account_id: b for b in res_balances.scalars().all()}

        for acc_id in account_ids:
            if acc_id not in balances_by_id:
                new_bal = AccountBalanceModel(
                    account_id=acc_id,
                    current_balance=Decimal("0"),
                    functional_usd_balance=Decimal("0"),
                    version=0,
                )
                self.session.add(new_bal)
                balances_by_id[acc_id] = new_bal

        # 5. Create Transaction Record in PENDING status
        now = datetime.now(timezone.utc)
        tx = FinancialTransactionModel(
            id=str(uuid.uuid4()),
            legal_entity_id=legal_entity_id,
            transaction_ref=transaction_ref,
            idempotency_key=idempotency_key,
            payload_hash=payload_hash,
            source_service=source_service,
            transaction_type=transaction_type,
            status="PENDING",
            initiator_user_id=initiator_user_id,
            reversal_of_id=reversal_of_id,
            description=description,
            created_at=now,
        )
        self.session.add(tx)
        await self.session.flush()

        # 6. Insert Journal Entries and Update Materialized Balances
        for idx, entry in enumerate(entries, start=1):
            acc = accounts_by_id[entry["account_id"]]
            bal = balances_by_id[entry["account_id"]]

            native_amt = Decimal(str(entry["native_amount"]))
            usd_amt = round_usd(Decimal(str(entry["functional_amount_usd"])))
            direction = entry["direction"]

            # Validate account asset matches entry asset
            if acc.asset_id != entry["asset_id"]:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Account {acc.account_number} asset ({acc.asset_id}) does not match entry asset ({entry['asset_id']}).",
                )

            j_entry = JournalEntryModel(
                id=str(uuid.uuid4()),
                transaction_id=tx.id,
                account_id=acc.id,
                asset_id=acc.asset_id,
                legal_entity_id=legal_entity_id,
                direction=direction,
                native_amount=native_amt,
                historical_carrying_rate=Decimal(str(entry.get("historical_carrying_rate") or "0")) if entry.get("historical_carrying_rate") else None,
                current_settlement_rate=Decimal(str(entry.get("current_settlement_rate") or "0")) if entry.get("current_settlement_rate") else None,
                functional_amount_usd=usd_amt,
                entry_sequence=idx,
                narrative=entry.get("narrative"),
                created_at=now,
            )
            self.session.add(j_entry)

            # Normal-balance arithmetic
            if acc.normal_balance == "DEBIT":
                if direction == "DEBIT":
                    bal.current_balance += native_amt
                    bal.functional_usd_balance += usd_amt
                else:
                    bal.current_balance -= native_amt
                    bal.functional_usd_balance -= usd_amt
            else: # CREDIT normal balance
                if direction == "CREDIT":
                    bal.current_balance += native_amt
                    bal.functional_usd_balance += usd_amt
                else:
                    bal.current_balance -= native_amt
                    bal.functional_usd_balance -= usd_amt

            bal.version += 1
            bal.updated_at = now

        # Flush all journal entries while parent tx is still PENDING
        await self.session.flush()

        # 7. Post Transaction (Triggers deferred balance verification trigger)
        tx.status = "POSTED"
        tx.posted_at = now

        # 8. Store Idempotency Record
        idem_record = IdempotencyRecordModel(
            id=str(uuid.uuid4()),
            legal_entity_id=legal_entity_id,
            source_service=source_service,
            idempotency_key=idempotency_key,
            payload_hash=payload_hash,
            financial_tx_id=tx.id,
            expires_at=datetime.fromtimestamp(now.timestamp() + 86400 * 30, tz=timezone.utc),
            created_at=now,
        )
        self.session.add(idem_record)

        await self.session.flush()
        return tx

    async def reverse_transaction_entry(
        self,
        original_entry_id: str,
        reversal_amount: Decimal,
        reversal_tx_ref: str,
        idempotency_key: str,
        payload_hash: str,
        source_service: str,
        counter_account_id: str,
        narrative: Optional[str] = None,
    ) -> FinancialTransactionModel:
        """
        Executes a concurrency-safe full or partial reversal with:
        - Row-level lock on the original journal entry (preventing race conditions)
        - Cumulative reversal calculation within the same transaction
        - Strict prevention of over-reversals
        - Account normal-balance arithmetic
        """
        # 1. Lock the original journal entry row explicitly
        stmt_lock_orig = (
            select(JournalEntryModel)
            .where(JournalEntryModel.id == original_entry_id)
            .with_for_update()
        )
        res_orig = await self.session.execute(stmt_lock_orig)
        orig_entry = res_orig.scalar_one_or_none()

        if not orig_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Original journal entry '{original_entry_id}' not found.",
            )

        # 2. Check cumulative reversals already applied to this specific entry (both native and USD)
        stmt_rev_sum = select(
            text("COALESCE(SUM(reversed_amount), 0) AS sum_native"),
            text("COALESCE(SUM(reversed_functional_usd), 0) AS sum_usd"),
        ).select_from(JournalEntryReversalModel).where(
            JournalEntryReversalModel.original_entry_id == original_entry_id
        )
        res_rev_sum = await self.session.execute(stmt_rev_sum)
        row = res_rev_sum.fetchone()
        already_reversed_native = Decimal(str(row[0] or "0"))
        already_reversed_usd = Decimal(str(row[1] or "0"))

        rev_amt = Decimal(str(reversal_amount))
        if (already_reversed_native + rev_amt) > orig_entry.native_amount:
            remaining = orig_entry.native_amount - already_reversed_native
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Reversal amount {rev_amt} exceeds remaining unreversed native amount {remaining}.",
            )

        # Invert direction for reversal
        rev_direction = "CREDIT" if orig_entry.direction == "DEBIT" else "DEBIT"
        counter_direction = "DEBIT" if rev_direction == "CREDIT" else "CREDIT"

        # Calculate proportionate functional USD
        fraction = rev_amt / orig_entry.native_amount
        rev_usd = round_usd(orig_entry.functional_amount_usd * fraction)

        if (already_reversed_usd + rev_usd) > orig_entry.functional_amount_usd:
            remaining_usd = orig_entry.functional_amount_usd - already_reversed_usd
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Reversal USD amount {rev_usd} exceeds remaining unreversed functional amount {remaining_usd}.",
            )

        entries = [
            {
                "account_id": orig_entry.account_id,
                "asset_id": orig_entry.asset_id,
                "direction": rev_direction,
                "native_amount": rev_amt,
                "functional_amount_usd": rev_usd,
                "narrative": f"Reversal of entry {orig_entry.id}: {narrative or ''}",
            },
            {
                "account_id": counter_account_id,
                "asset_id": orig_entry.asset_id,
                "direction": counter_direction,
                "native_amount": rev_amt,
                "functional_amount_usd": rev_usd,
                "narrative": f"Offset for reversal of entry {orig_entry.id}",
            },
        ]

        # Post the reversal transaction
        rev_tx = await self.create_and_post_transaction(
            legal_entity_id=orig_entry.legal_entity_id,
            transaction_ref=reversal_tx_ref,
            idempotency_key=idempotency_key,
            payload_hash=payload_hash,
            source_service=source_service,
            transaction_type="REVERSAL",
            entries=entries,
            description=f"Partial/Full Reversal of Tx {orig_entry.transaction_id}",
            reversal_of_id=orig_entry.transaction_id,
        )

        # Find the reversal entry in the new tx explicitly to avoid async lazy-load
        stmt_find_reversal = select(JournalEntryModel).where(
            JournalEntryModel.transaction_id == rev_tx.id,
            JournalEntryModel.entry_sequence == 1,
        )
        res_find = await self.session.execute(stmt_find_reversal)
        reversal_entry = res_find.scalar_one()

        # Record reversal link with both native and functional USD
        link = JournalEntryReversalModel(
            id=str(uuid.uuid4()),
            original_entry_id=orig_entry.id,
            reversal_entry_id=reversal_entry.id,
            reversed_amount=rev_amt,
            reversed_functional_usd=rev_usd,
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(link)

        # Update parent transaction reversal completion flag
        if (already_reversed_native + rev_amt) >= orig_entry.native_amount:
            stmt_parent = select(FinancialTransactionModel).where(
                FinancialTransactionModel.id == orig_entry.transaction_id
            ).with_for_update()
            res_parent = await self.session.execute(stmt_parent)
            parent_tx = res_parent.scalar_one()
            parent_tx.is_fully_reversed = True

        await self.session.flush()
        return rev_tx
