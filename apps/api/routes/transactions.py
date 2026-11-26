from typing import Optional, List
from decimal import Decimal
import json
import math
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, distinct

from database import get_db
from routes.auth import get_current_user
from models.user import UserModel
from models.financial import (
    FinancialTransactionModel,
    JournalEntryModel,
    AccountModel,
    AssetModel,
)
from services.ledger import LedgerService
from schemas.finance import (
    UserTransactionsListResponse,
    UserTransactionItemSchema,
    UserWithdrawalRequestSchema,
    UserWithdrawalResponseSchema,
    TransactionDoubleEntryAuditSchema,
)

router = APIRouter(tags=["Transactions"])

@router.get("/transactions/me", response_model=UserTransactionsListResponse)
async def get_my_transactions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type"),
    status: Optional[str] = Query(None, description="Filter by status (PENDING, POSTED, SETTLED, VOIDED)"),
    asset: Optional[str] = Query(None, description="Filter by asset symbol (e.g. BTC, ETH, USDT)"),
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserTransactionsListResponse:
    """
    Authoritative personal transaction history for the authenticated user.
    - Strictly scoped to the authenticated server-side session.
    - Prevents IDOR: never accepts another user's ID.
    - Preserves immutable double-entry records.
    - Returns empty list for users with no activity.
    """
    # Subquery for transactions that touched an account owned by the user
    user_account_tx_subq = (
        select(JournalEntryModel.transaction_id)
        .join(AccountModel, AccountModel.id == JournalEntryModel.account_id)
        .where(AccountModel.user_id == user.id)
    )

    base_condition = or_(
        FinancialTransactionModel.initiator_user_id == user.id,
        FinancialTransactionModel.id.in_(user_account_tx_subq),
    )

    conditions = [base_condition]
    if transaction_type:
        conditions.append(FinancialTransactionModel.transaction_type == transaction_type.upper())
    if status:
        conditions.append(FinancialTransactionModel.status == status.upper())

    # Total count query
    count_query = select(func.count(distinct(FinancialTransactionModel.id))).where(and_(*conditions))
    if asset:
        count_query = count_query.join(
            JournalEntryModel, JournalEntryModel.transaction_id == FinancialTransactionModel.id
        ).join(
            AssetModel, AssetModel.id == JournalEntryModel.asset_id
        ).where(AssetModel.symbol == asset.upper())

    total = await db.scalar(count_query) or 0
    pages = math.ceil(total / page_size) if total > 0 else 0

    if total == 0:
        return UserTransactionsListResponse(
            items=[],
            total=0,
            page=page,
            pageSize=page_size,
            pages=0,
        )

    # Fetch paginated transactions
    query = (
        select(FinancialTransactionModel)
        .where(and_(*conditions))
        .order_by(FinancialTransactionModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if asset:
        query = query.join(
            JournalEntryModel, JournalEntryModel.transaction_id == FinancialTransactionModel.id
        ).join(
            AssetModel, AssetModel.id == JournalEntryModel.asset_id
        ).where(AssetModel.symbol == asset.upper()).distinct()

    res = await db.execute(query)
    transactions = res.scalars().all()

    items: List[UserTransactionItemSchema] = []
    for tx in transactions:
        # Retrieve primary journal entry line associated with the user's account
        entry_stmt = (
            select(JournalEntryModel, AssetModel)
            .join(AssetModel, AssetModel.id == JournalEntryModel.asset_id)
            .join(AccountModel, AccountModel.id == JournalEntryModel.account_id)
            .where(
                JournalEntryModel.transaction_id == tx.id,
                AccountModel.user_id == user.id,
            )
            .order_by(JournalEntryModel.entry_sequence.asc())
        )
        entry_res = await db.execute(entry_stmt)
        entry_row = entry_res.first()

        if entry_row:
            entry, asset_model = entry_row
            asset_sym = asset_model.symbol
            amount_str = f"{entry.native_amount:.{asset_model.display_decimals}f}"
            amount_usd_str = f"{entry.functional_amount_usd:.2f}"
            direction_str = entry.direction
        else:
            # Fallback if transaction was initiated by user before journal entries were finalized
            first_entry_stmt = (
                select(JournalEntryModel, AssetModel)
                .join(AssetModel, AssetModel.id == JournalEntryModel.asset_id)
                .where(JournalEntryModel.transaction_id == tx.id)
                .order_by(JournalEntryModel.entry_sequence.asc())
            )
            first_res = await db.execute(first_entry_stmt)
            first_row = first_res.first()
            if first_row:
                entry, asset_model = first_row
                asset_sym = asset_model.symbol
                amount_str = f"{entry.native_amount:.{asset_model.display_decimals}f}"
                amount_usd_str = f"{entry.functional_amount_usd:.2f}"
                direction_str = entry.direction
            else:
                asset_sym = "USD"
                amount_str = "0.00"
                amount_usd_str = "0.00"
                direction_str = "CREDIT"

        items.append(
            UserTransactionItemSchema(
                id=tx.id,
                transactionRef=tx.transaction_ref,
                transactionType=tx.transaction_type,
                status=tx.status,
                asset=asset_sym,
                amount=amount_str,
                amountUsd=amount_usd_str,
                direction=direction_str,
                description=tx.description,
                postedAt=tx.posted_at.isoformat() if tx.posted_at else None,
                settledAt=tx.settled_at.isoformat() if tx.settled_at else None,
                createdAt=tx.created_at.isoformat(),
                isReversal=bool(tx.reversal_of_id or tx.transaction_type == "REVERSAL"),
                reversalOfId=tx.reversal_of_id,
            )
        )

    return UserTransactionsListResponse(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        pages=pages,
    )


@router.post("/transactions/withdraw", response_model=UserWithdrawalResponseSchema)
async def request_withdrawal(
    req: UserWithdrawalRequestSchema,
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserWithdrawalResponseSchema:
    """
    Submits a withdrawal request for the authenticated user:
    - Idempotency key checked to prevent double-spending or replay.
    - Concurrency-safe: acquires a row-level lock on the user's custodial account.
    - Verifies available funds (settled minus reserved).
    - Stages double-entry journal entries in PENDING status.
    - Reserves funds immediately, reducing available balance.
    """
    ledger_service = LedgerService(db)
    amount_dec = Decimal(str(req.amount))
    tx = await ledger_service.create_withdrawal_request(
        user_id=user.id,
        asset_symbol=req.asset,
        amount=amount_dec,
        destination=req.destination,
        idempotency_key=req.idempotencyKey,
        source_service="PLATFORM_PORTAL",
        notes=req.notes,
    )
    await db.commit()

    meta = {}
    if tx.metadata_json:
        try:
            meta = json.loads(tx.metadata_json) if isinstance(tx.metadata_json, str) else {}
        except Exception:
            meta = {}

    masked_dest = meta.get(
        "destination_masked",
        req.destination[:4] + "..." + req.destination[-4:] if len(req.destination) > 8 else req.destination,
    )

    stmt_acct = (
        select(AccountModel)
        .join(AssetModel, AssetModel.id == AccountModel.asset_id)
        .where(
            AccountModel.user_id == user.id,
            AssetModel.symbol == req.asset.upper(),
            AccountModel.is_active.is_(True),
        )
    )
    user_acct = (await db.execute(stmt_acct)).scalar_one_or_none()
    reserved_str = "0"
    available_str = "0"
    if user_acct:
        bals = await ledger_service.get_account_balances(user_acct.id)
        reserved_str = f"{bals['reserved']:.{bals['decimals']}f}"
        available_str = f"{bals['available']:.{bals['decimals']}f}"

    return UserWithdrawalResponseSchema(
        id=tx.id,
        transactionRef=tx.transaction_ref,
        status=tx.status,
        asset=req.asset.upper(),
        amount=str(amount_dec),
        destinationMasked=masked_dest,
        reservedBalance=reserved_str,
        remainingAvailableBalance=available_str,
        message=f"Withdrawal request {tx.transaction_ref} submitted successfully. Funds are reserved pending administrative review.",
        createdAt=tx.created_at.isoformat(),
    )


@router.get("/transactions/{transaction_id}/audit-double-entry", response_model=TransactionDoubleEntryAuditSchema)
async def audit_transaction_double_entry(
    transaction_id: str,
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TransactionDoubleEntryAuditSchema:
    """
    Audits the double-entry integrity of a transaction:
    - Verifies journal entries >= 2
    - Verifies presence of both debits and credits
    - Verifies USD balancing
    - Verifies native asset balancing for single-currency transactions
    """
    ledger_service = LedgerService(db)
    audit = await ledger_service.verify_double_entry_balance(transaction_id)
    return TransactionDoubleEntryAuditSchema(
        transactionId=audit["transactionId"],
        transactionRef=audit["transactionRef"],
        status=audit["status"],
        entryCount=audit["entryCount"],
        debitEntries=audit["debitEntries"],
        creditEntries=audit["creditEntries"],
        totalUsdDebits=audit["totalUsdDebits"],
        totalUsdCredits=audit["totalUsdCredits"],
        isUsdBalanced=audit["isUsdBalanced"],
        isNativeBalanced=audit["isNativeBalanced"],
    )

