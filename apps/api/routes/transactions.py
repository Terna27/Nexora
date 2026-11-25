from typing import Optional, List
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
from schemas.finance import (
    UserTransactionsListResponse,
    UserTransactionItemSchema,
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
