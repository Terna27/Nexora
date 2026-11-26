import uuid
import json
import hashlib
from decimal import Decimal, ROUND_HALF_EVEN
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func, update, case, and_, or_
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

        # 3b. Native Asset Balancing Verification
        # For single-asset transactions (e.g. deposits, withdrawals, transfers, reversals), native debits must equal native credits
        asset_ids = {e["asset_id"] for e in entries}
        if len(asset_ids) == 1:
            native_debits = Decimal("0")
            native_credits = Decimal("0")
            for e in entries:
                amt = Decimal(str(e["native_amount"]))
                if e["direction"] == "DEBIT":
                    native_debits += amt
                else:
                    native_credits += amt
            if native_debits != native_credits:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Transaction is unbalanced in native asset: Debits={native_debits}, Credits={native_credits}",
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

    async def get_account_balances(self, account_id: str) -> Dict[str, Any]:
        """
        Authoritative balance calculator for an account:
        - Settled balance: Materialized current balance on the account
        - Reserved balance: Sum of native debits on this account in PENDING or POSTED transactions
        - Pending balance: Sum of native amounts on this account in PENDING transactions
        - Available balance: max(0, settled_balance - reserved_balance)
        - Functional USD balance: Current USD equivalent
        """
        stmt_acct = select(AccountModel, AssetModel).join(AssetModel, AssetModel.id == AccountModel.asset_id).where(AccountModel.id == account_id)
        res_acct = await self.session.execute(stmt_acct)
        acct_row = res_acct.first()
        if not acct_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account '{account_id}' not found.")
        account, asset = acct_row

        stmt_bal = select(AccountBalanceModel).where(AccountBalanceModel.account_id == account_id)
        bal_row = (await self.session.execute(stmt_bal)).scalar_one_or_none()
        settled_native = bal_row.current_balance if bal_row else Decimal("0")
        functional_usd = bal_row.functional_usd_balance if bal_row else Decimal("0.00")

        # Reserved / held debits: transactions in PENDING or POSTED state that haven't been settled or voided
        stmt_reserved = (
            select(func.coalesce(func.sum(JournalEntryModel.native_amount), Decimal("0")))
            .join(FinancialTransactionModel, FinancialTransactionModel.id == JournalEntryModel.transaction_id)
            .where(
                JournalEntryModel.account_id == account.id,
                JournalEntryModel.direction == "DEBIT",
                FinancialTransactionModel.status.in_(["PENDING", "POSTED"]),
                FinancialTransactionModel.is_fully_reversed.is_(False),
            )
        )
        reserved_native = await self.session.scalar(stmt_reserved) or Decimal("0")

        # Pending debits/credits in PENDING status
        stmt_pending = (
            select(func.coalesce(func.sum(JournalEntryModel.native_amount), Decimal("0")))
            .join(FinancialTransactionModel, FinancialTransactionModel.id == JournalEntryModel.transaction_id)
            .where(
                JournalEntryModel.account_id == account.id,
                FinancialTransactionModel.status == "PENDING",
            )
        )
        pending_native = await self.session.scalar(stmt_pending) or Decimal("0")

        available_native = max(Decimal("0"), settled_native - reserved_native)

        return {
            "account_id": account.id,
            "account_number": account.account_number,
            "asset_symbol": asset.symbol,
            "asset_name": asset.name,
            "decimals": asset.display_decimals,
            "settled": settled_native,
            "reserved": reserved_native,
            "pending": pending_native,
            "available": available_native,
            "functional_usd": functional_usd,
        }

    async def reconstruct_account_balance(self, account_id: str) -> Dict[str, Decimal]:
        """
        Reconstructs the authoritative account balance directly from the posted double-entry journal entries.
        Considers transactions with status in ('POSTED', 'SETTLED') that are not fully reversed.
        Uses normal-balance arithmetic.
        """
        stmt_acct = select(AccountModel).where(AccountModel.id == account_id)
        acct = (await self.session.execute(stmt_acct)).scalar_one_or_none()
        if not acct:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account '{account_id}' not found.")

        stmt_entries = (
            select(JournalEntryModel)
            .join(FinancialTransactionModel, FinancialTransactionModel.id == JournalEntryModel.transaction_id)
            .where(
                JournalEntryModel.account_id == account_id,
                FinancialTransactionModel.status.in_(["POSTED", "SETTLED"]),
            )
            .order_by(JournalEntryModel.created_at.asc(), JournalEntryModel.entry_sequence.asc())
        )
        entries = (await self.session.execute(stmt_entries)).scalars().all()

        reconstructed_native = Decimal("0")
        reconstructed_usd = Decimal("0.0000")

        for e in entries:
            if acct.normal_balance == "DEBIT":
                if e.direction == "DEBIT":
                    reconstructed_native += e.native_amount
                    reconstructed_usd += e.functional_amount_usd
                else:
                    reconstructed_native -= e.native_amount
                    reconstructed_usd -= e.functional_amount_usd
            else: # CREDIT normal balance
                if e.direction == "CREDIT":
                    reconstructed_native += e.native_amount
                    reconstructed_usd += e.functional_amount_usd
                else:
                    reconstructed_native -= e.native_amount
                    reconstructed_usd -= e.functional_amount_usd

        return {
            "native": reconstructed_native,
            "functional_usd": round_usd(reconstructed_usd),
        }

    async def reconcile_account_balance(self, account_id: str, auto_repair: bool = False) -> Dict[str, Any]:
        """
        Reconciles the cached/materialized AccountBalanceModel against the reconstructed ledger balance.
        Detects any drift and optionally resynchronizes if requested.
        """
        stmt_acct = select(AccountModel, AssetModel).join(AssetModel, AssetModel.id == AccountModel.asset_id).where(AccountModel.id == account_id)
        res_acct = await self.session.execute(stmt_acct)
        acct_row = res_acct.first()
        if not acct_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account '{account_id}' not found.")
        account, asset = acct_row

        reconstructed = await self.reconstruct_account_balance(account_id)

        stmt_bal = select(AccountBalanceModel).where(AccountBalanceModel.account_id == account_id)
        bal = (await self.session.execute(stmt_bal)).scalar_one_or_none()

        cached_native = bal.current_balance if bal else Decimal("0")
        cached_usd = bal.functional_usd_balance if bal else Decimal("0.00")

        variance_native = cached_native - reconstructed["native"]
        variance_usd = cached_usd - reconstructed["functional_usd"]
        is_consistent = (variance_native == Decimal("0")) and (variance_usd == Decimal("0"))

        repaired = False
        if not is_consistent and auto_repair:
            now = datetime.now(timezone.utc)
            if not bal:
                bal = AccountBalanceModel(
                    account_id=account_id,
                    current_balance=reconstructed["native"],
                    functional_usd_balance=reconstructed["functional_usd"],
                    version=1,
                    updated_at=now,
                )
                self.session.add(bal)
            else:
                bal.current_balance = reconstructed["native"]
                bal.functional_usd_balance = reconstructed["functional_usd"]
                bal.version += 1
                bal.updated_at = now
            await self.session.flush()
            repaired = True

        stmt_cnt = (
            select(func.count(JournalEntryModel.id))
            .join(FinancialTransactionModel, FinancialTransactionModel.id == JournalEntryModel.transaction_id)
            .where(
                JournalEntryModel.account_id == account_id,
                FinancialTransactionModel.status.in_(["POSTED", "SETTLED"]),
            )
        )
        posted_entries_count = await self.session.scalar(stmt_cnt) or 0

        return {
            "accountId": account.id,
            "accountNumber": account.account_number,
            "asset": asset.symbol,
            "materializedBalance": f"{cached_native:.{asset.display_decimals}f}",
            "reconstructedBalance": f"{reconstructed['native']:.{asset.display_decimals}f}",
            "variance": f"{variance_native:.{asset.display_decimals}f}",
            "isConsistent": is_consistent,
            "repaired": repaired,
            "postedJournalEntriesCount": posted_entries_count,
        }

    async def verify_double_entry_balance(self, transaction_id: str) -> Dict[str, Any]:
        """
        Verifies double-entry balancing for a specific transaction:
        - Must have at least 2 entries
        - Must have both DEBIT and CREDIT
        - USD debits must equal credits
        - For single asset transactions, native debits must equal native credits
        """
        stmt_tx = select(FinancialTransactionModel).where(FinancialTransactionModel.id == transaction_id)
        tx = (await self.session.execute(stmt_tx)).scalar_one_or_none()
        if not tx:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction '{transaction_id}' not found.")

        stmt_entries = select(JournalEntryModel).where(JournalEntryModel.transaction_id == transaction_id).order_by(JournalEntryModel.entry_sequence)
        entries = (await self.session.execute(stmt_entries)).scalars().all()

        entry_count = len(entries)
        debit_count = sum(1 for e in entries if e.direction == "DEBIT")
        credit_count = sum(1 for e in entries if e.direction == "CREDIT")

        usd_debits = sum((round_usd(e.functional_amount_usd) for e in entries if e.direction == "DEBIT"), Decimal("0.0000"))
        usd_credits = sum((round_usd(e.functional_amount_usd) for e in entries if e.direction == "CREDIT"), Decimal("0.0000"))
        is_usd_balanced = (usd_debits == usd_credits)

        asset_ids = {e.asset_id for e in entries}
        is_native_balanced = True
        if len(asset_ids) == 1:
            native_debits = sum((e.native_amount for e in entries if e.direction == "DEBIT"), Decimal("0"))
            native_credits = sum((e.native_amount for e in entries if e.direction == "CREDIT"), Decimal("0"))
            is_native_balanced = (native_debits == native_credits)

        return {
            "transactionId": tx.id,
            "transactionRef": tx.transaction_ref,
            "status": tx.status,
            "entryCount": entry_count,
            "debitEntries": debit_count,
            "creditEntries": credit_count,
            "totalUsdDebits": f"{usd_debits:.2f}",
            "totalUsdCredits": f"{usd_credits:.2f}",
            "isUsdBalanced": is_usd_balanced,
            "isNativeBalanced": is_native_balanced,
        }

    async def create_withdrawal_request(
        self,
        user_id: str,
        asset_symbol: str,
        amount: Decimal,
        destination: str,
        idempotency_key: str,
        source_service: str = "PLATFORM_PORTAL",
        notes: Optional[str] = None,
    ) -> FinancialTransactionModel:
        """
        Creates a new withdrawal request in PENDING status:
        - Validates asset, positive amount, and decimal precision
        - Validates destination format (non-empty)
        - Idempotency checking with hash replay / 409 conflict
        - Row-level lock on user custodial account (preventing race conditions)
        - Authoritative available balance verification (settled minus reserved)
        - Double-entry journal entries creation (DEBIT user custodial liability, CREDIT OpCo cash asset)
        - Reserves funds without touching settled balance
        """
        if amount <= Decimal("0"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Withdrawal amount must be strictly positive.",
            )

        dest_clean = destination.strip()
        if len(dest_clean) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid withdrawal destination address.",
            )

        # 1. Resolve Asset
        stmt_asset = select(AssetModel).where(AssetModel.symbol == asset_symbol.upper())
        asset = (await self.session.execute(stmt_asset)).scalar_one_or_none()
        if not asset or not asset.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Asset '{asset_symbol}' is not supported or not active.",
            )

        # Validate decimal scale
        if amount.as_tuple().exponent < -asset.base_decimals:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Withdrawal amount exceeds maximum decimal precision ({asset.base_decimals}) for {asset.symbol}.",
            )

        # 2. Find and Lock User's Custodial Account
        stmt_user_acct = (
            select(AccountModel)
            .where(
                AccountModel.user_id == user_id,
                AccountModel.asset_id == asset.id,
                AccountModel.is_active.is_(True),
            )
            .with_for_update()
        )
        user_acct = (await self.session.execute(stmt_user_acct)).scalar_one_or_none()
        if not user_acct:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active custodial account found for user in asset {asset.symbol}.",
            )

        # 3. Idempotency Check
        payload_raw = f"wth_{user_id}_{asset.symbol}_{amount:.8f}_{dest_clean}"
        payload_hash = hashlib.sha256(payload_raw.encode("utf-8")).hexdigest()
        stmt_idem = select(IdempotencyRecordModel).where(
            IdempotencyRecordModel.legal_entity_id == user_acct.legal_entity_id,
            IdempotencyRecordModel.source_service == source_service,
            IdempotencyRecordModel.idempotency_key == idempotency_key,
        )
        existing_idem = (await self.session.execute(stmt_idem)).scalar_one_or_none()
        if existing_idem:
            if existing_idem.payload_hash != payload_hash:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Idempotency violation: Key '{idempotency_key}' previously used with different withdrawal payload.",
                )
            stmt_existing_tx = select(FinancialTransactionModel).where(
                FinancialTransactionModel.id == existing_idem.financial_tx_id
            )
            return (await self.session.execute(stmt_existing_tx)).scalar_one()

        # 4. Verify Available Balance
        balances = await self.get_account_balances(user_acct.id)
        if balances["available"] < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient available balance. Settled: {balances['settled']} {asset.symbol}, "
                    f"Reserved: {balances['reserved']} {asset.symbol}, Available: {balances['available']} {asset.symbol}, "
                    f"Requested: {amount} {asset.symbol}."
                ),
            )

        # 5. Resolve OpCo Cash Account for Counter-Entry
        stmt_opco_acct = (
            select(AccountModel)
            .where(
                AccountModel.legal_entity_id == user_acct.legal_entity_id,
                AccountModel.asset_id == asset.id,
                AccountModel.user_id.is_(None),
                AccountModel.account_category == "OPERATING_CASH",
                AccountModel.is_active.is_(True),
            )
        )
        opco_acct = (await self.session.execute(stmt_opco_acct)).scalars().first()
        if not opco_acct:
            stmt_any_opco = (
                select(AccountModel)
                .where(
                    AccountModel.legal_entity_id == user_acct.legal_entity_id,
                    AccountModel.asset_id == asset.id,
                    AccountModel.user_id.is_(None),
                )
            )
            opco_acct = (await self.session.execute(stmt_any_opco)).scalars().first()
            if not opco_acct:
                opco_acct = AccountModel(
                    id=str(uuid.uuid4()),
                    legal_entity_id=user_acct.legal_entity_id,
                    account_number=f"OPCO-{asset.symbol}-CASH",
                    name=f"Operating Cash {asset.symbol}",
                    account_type="ASSET",
                    account_category="OPERATING_CASH",
                    normal_balance="DEBIT",
                    asset_id=asset.id,
                    user_id=None,
                    is_active=True,
                )
                self.session.add(opco_acct)
                await self.session.flush()

        # 6. Estimate USD value
        if asset.symbol in ("USD", "USDT"):
            usd_amount = round_usd(amount)
        else:
            usd_amount = round_usd(amount * Decimal("1.0000"))

        now = datetime.now(timezone.utc)
        tx_id = str(uuid.uuid4())
        tx_ref = f"TX-WTH-{uuid.uuid4().hex[:8].upper()}"

        masked_dest = (
            dest_clean[:6] + "..." + dest_clean[-4:]
            if len(dest_clean) > 10
            else dest_clean[:2] + "..." + dest_clean[-2:]
        )

        metadata = {
            "destination": dest_clean,
            "destination_masked": masked_dest,
            "asset_symbol": asset.symbol,
            "requested_amount": str(amount),
            "notes": notes,
        }

        # 7. Create Financial Transaction in PENDING status
        tx = FinancialTransactionModel(
            id=tx_id,
            legal_entity_id=user_acct.legal_entity_id,
            transaction_ref=tx_ref,
            idempotency_key=idempotency_key,
            payload_hash=payload_hash,
            source_service=source_service,
            transaction_type="WITHDRAWAL",
            status="PENDING",
            initiator_user_id=user_id,
            description=f"Withdrawal {amount} {asset.symbol} to {masked_dest}",
            metadata_json=json.dumps(metadata),
            created_at=now,
        )
        self.session.add(tx)
        await self.session.flush()

        # 8. Create Journal Entries
        j_debit = JournalEntryModel(
            id=str(uuid.uuid4()),
            transaction_id=tx.id,
            account_id=user_acct.id,
            asset_id=asset.id,
            legal_entity_id=user_acct.legal_entity_id,
            direction="DEBIT",
            native_amount=amount,
            functional_amount_usd=usd_amount,
            entry_sequence=1,
            narrative=f"Withdrawal hold: {amount} {asset.symbol}",
            created_at=now,
        )
        j_credit = JournalEntryModel(
            id=str(uuid.uuid4()),
            transaction_id=tx.id,
            account_id=opco_acct.id,
            asset_id=asset.id,
            legal_entity_id=user_acct.legal_entity_id,
            direction="CREDIT",
            native_amount=amount,
            functional_amount_usd=usd_amount,
            entry_sequence=2,
            narrative=f"Withdrawal clearing offset: {amount} {asset.symbol}",
            created_at=now,
        )
        self.session.add_all([j_debit, j_credit])

        # 9. Store Idempotency Record
        idem = IdempotencyRecordModel(
            id=str(uuid.uuid4()),
            legal_entity_id=user_acct.legal_entity_id,
            source_service=source_service,
            idempotency_key=idempotency_key,
            payload_hash=payload_hash,
            financial_tx_id=tx.id,
            expires_at=datetime.fromtimestamp(now.timestamp() + 86400 * 30, tz=timezone.utc),
            created_at=now,
        )
        self.session.add(idem)
        await self.session.flush()

        return tx

    async def approve_withdrawal(
        self,
        withdrawal_id: str,
        admin_user_id: str,
        admin_email: str,
        notes: Optional[str] = None,
    ) -> FinancialTransactionModel:
        """
        Approves a pending withdrawal request:
        - Row-level lock (FOR UPDATE)
        - Strictly enforces status == 'PENDING'
        - Verifies balance sufficiency taking into account other POSTED withdrawals
        - Transitions status to POSTED (approved and committed to ledger)
        - Records approval metadata
        """
        stmt = (
            select(FinancialTransactionModel)
            .where(
                FinancialTransactionModel.id == withdrawal_id,
                FinancialTransactionModel.transaction_type == "WITHDRAWAL",
            )
            .with_for_update()
        )
        res = await self.session.execute(stmt)
        tx = res.scalar_one_or_none()
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Withdrawal request with ID '{withdrawal_id}' was not found.",
            )

        if tx.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot approve withdrawal in '{tx.status}' state. Only PENDING withdrawals can be approved.",
            )

        # Verify balance sufficiency
        entry_stmt = (
            select(JournalEntryModel, AccountBalanceModel, AccountModel)
            .join(AccountModel, AccountModel.id == JournalEntryModel.account_id)
            .outerjoin(AccountBalanceModel, AccountBalanceModel.account_id == AccountModel.id)
            .where(
                JournalEntryModel.transaction_id == tx.id,
                JournalEntryModel.direction == "DEBIT",
            )
        )
        entry_row = (await self.session.execute(entry_stmt)).first()
        if entry_row:
            entry, balance, acct = entry_row
            settled_balance = balance.current_balance if balance else Decimal("0")

            # Sum other POSTED withdrawals on this account
            stmt_committed = (
                select(func.coalesce(func.sum(JournalEntryModel.native_amount), Decimal("0")))
                .join(FinancialTransactionModel, FinancialTransactionModel.id == JournalEntryModel.transaction_id)
                .where(
                    JournalEntryModel.account_id == acct.id,
                    JournalEntryModel.direction == "DEBIT",
                    FinancialTransactionModel.id != tx.id,
                    FinancialTransactionModel.status == "POSTED",
                    FinancialTransactionModel.transaction_type == "WITHDRAWAL",
                    FinancialTransactionModel.is_fully_reversed.is_(False),
                )
            )
            committed_posted = await self.session.scalar(stmt_committed) or Decimal("0")
            available_balance = settled_balance - committed_posted

            if available_balance < entry.native_amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient available balance for approval. Account has {settled_balance} settled with {committed_posted} committed to other approved withdrawals (available: {available_balance}), required: {entry.native_amount}",
                )

        now = datetime.now(timezone.utc)
        tx.status = "POSTED"
        tx.posted_at = now

        meta = {}
        if tx.metadata_json:
            try:
                meta = json.loads(tx.metadata_json) if isinstance(tx.metadata_json, str) else {}
            except Exception:
                meta = {}

        meta["approved_by_admin_id"] = admin_user_id
        meta["approved_by_admin_email"] = admin_email
        meta["approved_at"] = now.isoformat()
        meta["approval_notes"] = (notes or "Administrative approval granted").strip()
        tx.metadata_json = json.dumps(meta)

        await self.session.flush()
        return tx

    async def reject_withdrawal(
        self,
        withdrawal_id: str,
        admin_user_id: str,
        admin_email: str,
        reason: str,
    ) -> FinancialTransactionModel:
        """
        Rejects a pending withdrawal request:
        - Row-level lock (FOR UPDATE)
        - Strictly enforces status == 'PENDING'
        - Requires substantive reason (min 5 chars)
        - Transitions status to VOIDED (releasing reserved balance)
        - Records rejection metadata
        """
        if not reason or len(reason.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A substantive rejection reason (at least 5 characters) is required.",
            )

        stmt = (
            select(FinancialTransactionModel)
            .where(
                FinancialTransactionModel.id == withdrawal_id,
                FinancialTransactionModel.transaction_type == "WITHDRAWAL",
            )
            .with_for_update()
        )
        res = await self.session.execute(stmt)
        tx = res.scalar_one_or_none()
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Withdrawal request with ID '{withdrawal_id}' was not found.",
            )

        if tx.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot reject withdrawal in '{tx.status}' state. Only PENDING withdrawals can be rejected.",
            )

        now = datetime.now(timezone.utc)
        rejection_reason = reason.strip()

        tx.status = "VOIDED"

        meta = {}
        if tx.metadata_json:
            try:
                meta = json.loads(tx.metadata_json) if isinstance(tx.metadata_json, str) else {}
            except Exception:
                meta = {}

        meta["rejected_by_admin_id"] = admin_user_id
        meta["rejected_by_admin_email"] = admin_email
        meta["rejected_at"] = now.isoformat()
        meta["rejection_reason"] = rejection_reason
        tx.metadata_json = json.dumps(meta)

        await self.session.flush()
        return tx

    async def settle_withdrawal(
        self,
        withdrawal_id: str,
        payout_reference: str,
        admin_user_id: Optional[str] = None,
        admin_email: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> FinancialTransactionModel:
        """
        Settles an approved (POSTED) withdrawal upon authoritative payout confirmation:
        - Row-level lock on transaction
        - Validates transaction is in POSTED status (only approved withdrawals can be settled)
        - Updates AccountBalanceModel.current_balance (deducting settled funds)
        - Transitions status to SETTLED
        - Records payout confirmation details and timestamp
        """
        payout_ref_clean = payout_reference.strip()
        if len(payout_ref_clean) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid authoritative payout confirmation reference (e.g. tx hash or bank wire ref) is required.",
            )

        stmt = (
            select(FinancialTransactionModel)
            .where(
                FinancialTransactionModel.id == withdrawal_id,
                FinancialTransactionModel.transaction_type == "WITHDRAWAL",
            )
            .with_for_update()
        )
        res = await self.session.execute(stmt)
        tx = res.scalar_one_or_none()
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Withdrawal request with ID '{withdrawal_id}' was not found.",
            )

        if tx.status != "POSTED":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot settle withdrawal in '{tx.status}' state. Only POSTED (approved) withdrawals can be settled.",
            )

        now = datetime.now(timezone.utc)

        # Find the entries to deduct materialized balance
        stmt_entries = (
            select(JournalEntryModel, AccountModel)
            .join(AccountModel, AccountModel.id == JournalEntryModel.account_id)
            .where(JournalEntryModel.transaction_id == tx.id)
            .order_by(JournalEntryModel.entry_sequence.asc())
        )
        entries = (await self.session.execute(stmt_entries)).all()

        for entry, account in entries:
            stmt_bal = (
                select(AccountBalanceModel)
                .where(AccountBalanceModel.account_id == account.id)
                .with_for_update()
            )
            bal = (await self.session.execute(stmt_bal)).scalar_one_or_none()
            if not bal:
                bal = AccountBalanceModel(
                    account_id=account.id,
                    current_balance=Decimal("0"),
                    functional_usd_balance=Decimal("0"),
                    version=0,
                )
                self.session.add(bal)

            # Normal-balance arithmetic
            if account.normal_balance == "DEBIT":
                if entry.direction == "DEBIT":
                    bal.current_balance += entry.native_amount
                    bal.functional_usd_balance += entry.functional_amount_usd
                else:
                    bal.current_balance -= entry.native_amount
                    bal.functional_usd_balance -= entry.functional_amount_usd
            else: # CREDIT normal balance (e.g. user liability account)
                if entry.direction == "CREDIT":
                    bal.current_balance += entry.native_amount
                    bal.functional_usd_balance += entry.functional_amount_usd
                else:
                    bal.current_balance -= entry.native_amount
                    bal.functional_usd_balance -= entry.functional_amount_usd

            bal.version += 1
            bal.updated_at = now

        tx.status = "SETTLED"
        tx.settled_at = now

        meta = {}
        if tx.metadata_json:
            try:
                meta = json.loads(tx.metadata_json) if isinstance(tx.metadata_json, str) else {}
            except Exception:
                meta = {}

        meta["settled_by_admin_id"] = admin_user_id
        meta["settled_by_admin_email"] = admin_email
        meta["settled_at"] = now.isoformat()
        meta["payout_reference"] = payout_ref_clean
        meta["settlement_notes"] = notes
        tx.metadata_json = json.dumps(meta)

        await self.session.flush()
        return tx
