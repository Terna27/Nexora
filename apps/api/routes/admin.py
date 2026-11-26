import json
import math
from decimal import Decimal
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, or_, and_, distinct, text

from database import get_db
from routes.auth import require_admin, record_admin_audit_event
from models.user import (
    UserModel,
    UserSessionModel,
    AdminAuditLogModel,
    EmailVerificationTokenModel,
    PasswordResetTokenModel,
    UserInvestmentRecordModel,
)
from models.financial import (
    AccountModel,
    AccountBalanceModel,
    AssetModel,
    FinancialTransactionModel,
    JournalEntryModel,
    JournalEntryReversalModel,
    InvestorUnitActivityModel,
)
from schemas.admin import (
    AdminOverviewResponse,
    AdminUserSummarySchema,
    AdminUserDetailSchema,
    AdminUserListResponse,
    AdminUserAccountsResponse,
    AdminUserActionRequest,
    AdminUserDeleteRequest,
    AdminActionResponse,
    AdminWithdrawalSummarySchema,
    AdminWithdrawalsListResponse,
    AdminWithdrawalActionRequest,
    AdminWithdrawalSettleRequest,
    AdminAccountReconcileRequest,
    AdminTransactionItemSchema,
    AdminTransactionsListResponse,
    AdminAuditLogSchema,
    AdminAuditLogsListResponse,
    AdminInvestmentRecordResponse,
    AdminInvestmentRecordUpdateRequest,
)
from schemas.finance import (
    UserAccountBalanceSchema,
    UserTransactionsListResponse,
    UserTransactionItemSchema,
    AccountReconciliationResponseSchema,
)
from services.ledger import LedgerService

router = APIRouter(prefix="/admin", tags=["Administrative Portal"])


def mask_destination(dest: Optional[str]) -> Optional[str]:
    if not dest:
        return None
    dest = dest.strip()
    if len(dest) <= 8:
        return dest[:2] + "..." + dest[-2:]
    return dest[:6] + "..." + dest[-4:]


def extract_destination(metadata_json_str: Optional[str], description: Optional[str]) -> Optional[str]:
    if metadata_json_str:
        try:
            data = json.loads(metadata_json_str)
            if isinstance(data, dict):
                dest = (
                    data.get("destination")
                    or data.get("destination_address")
                    or data.get("wallet_address")
                    or data.get("bank_account")
                    or data.get("address")
                )
                if dest:
                    return mask_destination(str(dest))
        except Exception:
            pass
    if description:
        words = description.split()
        for w in words:
            if w.startswith("0x") or w.startswith("bc1") or w.startswith("1") or w.startswith("T") or len(w) > 24:
                return mask_destination(w)
    return "Institutional Custody Rail"


# =========================================================================
# 1. OVERVIEW & PLATFORM STATISTICS
# =========================================================================

@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminOverviewResponse:
    """
    Authoritative administrative overview metrics derived strictly from persisted records.
    - User counts, active vs suspended, verified users.
    - Genuine withdrawn capital from settled ledger records.
    - Honest state for invested capital (or real sum if unitization exists).
    - Pending, completed, and failed withdrawal request counters.
    """
    total_users = await db.scalar(select(func.count(UserModel.id))) or 0
    active_users = await db.scalar(select(func.count(UserModel.id)).where(UserModel.is_active.is_(True))) or 0
    suspended_users = await db.scalar(select(func.count(UserModel.id)).where(UserModel.is_active.is_(False))) or 0
    verified_users = await db.scalar(select(func.count(UserModel.id)).where(UserModel.is_verified.is_(True))) or 0
    investor_users = await db.scalar(select(func.count(UserModel.id)).where(UserModel.role == "investor")) or 0
    admin_users = await db.scalar(select(func.count(UserModel.id)).where(UserModel.role == "admin")) or 0

    total_accounts = await db.scalar(select(func.count(AccountModel.id))) or 0
    total_transactions = await db.scalar(select(func.count(FinancialTransactionModel.id))) or 0

    # Total Invested Capital: Trace real investment ledger records
    subq_reversed_issuances = select(InvestorUnitActivityModel.reversal_of_id).where(
        InvestorUnitActivityModel.reversal_of_id.is_not(None)
    )
    stmt_invested = (
        select(func.coalesce(func.sum(InvestorUnitActivityModel.functional_usd_value), Decimal("0.0000")))
        .outerjoin(FinancialTransactionModel, FinancialTransactionModel.id == InvestorUnitActivityModel.financial_transaction_id)
        .where(
            InvestorUnitActivityModel.activity_type == "ISSUANCE",
            InvestorUnitActivityModel.reversal_of_id.is_(None),
            InvestorUnitActivityModel.id.not_in(subq_reversed_issuances),
            or_(
                InvestorUnitActivityModel.financial_transaction_id.is_(None),
                and_(
                    FinancialTransactionModel.status == "SETTLED",
                    FinancialTransactionModel.is_fully_reversed.is_(False),
                ),
            ),
        )
    )
    invested_val = await db.scalar(stmt_invested)
    if invested_val and invested_val > 0:
        total_invested_usd = f"{invested_val:.2f}"
        invested_status_msg = "Derived from settled unit issuance records"
    else:
        total_invested_usd = None
        invested_status_msg = "Investment reporting is not yet available."

    # Total Withdrawn Capital: Real sum of settled WITHDRAWAL debits on user liability accounts minus any reversals
    stmt_withdrawn_gross = (
        select(func.coalesce(func.sum(JournalEntryModel.functional_amount_usd), Decimal("0.0000")))
        .join(FinancialTransactionModel, FinancialTransactionModel.id == JournalEntryModel.transaction_id)
        .join(AccountModel, AccountModel.id == JournalEntryModel.account_id)
        .where(
            FinancialTransactionModel.transaction_type.in_(["WITHDRAWAL", "REDEMPTION"]),
            FinancialTransactionModel.status == "SETTLED",
            FinancialTransactionModel.is_fully_reversed.is_(False),
            AccountModel.user_id.is_not(None),
            AccountModel.account_type == "LIABILITY",
            JournalEntryModel.direction == "DEBIT",
        )
    )
    withdrawn_gross = await db.scalar(stmt_withdrawn_gross) or Decimal("0.0000")

    stmt_withdrawn_reversals = (
        select(func.coalesce(func.sum(JournalEntryReversalModel.reversed_functional_usd), Decimal("0.0000")))
        .join(JournalEntryModel, JournalEntryModel.id == JournalEntryReversalModel.original_entry_id)
        .join(FinancialTransactionModel, FinancialTransactionModel.id == JournalEntryModel.transaction_id)
        .join(AccountModel, AccountModel.id == JournalEntryModel.account_id)
        .where(
            FinancialTransactionModel.transaction_type.in_(["WITHDRAWAL", "REDEMPTION"]),
            FinancialTransactionModel.status == "SETTLED",
            FinancialTransactionModel.is_fully_reversed.is_(False),
            AccountModel.user_id.is_not(None),
            AccountModel.account_type == "LIABILITY",
            JournalEntryModel.direction == "DEBIT",
        )
    )
    withdrawn_reversed = await db.scalar(stmt_withdrawn_reversals) or Decimal("0.0000")
    withdrawn_net = max(Decimal("0.0000"), withdrawn_gross - withdrawn_reversed)
    total_withdrawn_usd = f"{withdrawn_net:.2f}"

    # Withdrawal Request Counters
    pending_withdrawals = await db.scalar(
        select(func.count(FinancialTransactionModel.id)).where(
            FinancialTransactionModel.transaction_type == "WITHDRAWAL",
            FinancialTransactionModel.status == "PENDING",
        )
    ) or 0

    completed_withdrawals = await db.scalar(
        select(func.count(FinancialTransactionModel.id)).where(
            FinancialTransactionModel.transaction_type == "WITHDRAWAL",
            FinancialTransactionModel.status == "SETTLED",
        )
    ) or 0

    failed_withdrawals = await db.scalar(
        select(func.count(FinancialTransactionModel.id)).where(
            FinancialTransactionModel.transaction_type == "WITHDRAWAL",
            FinancialTransactionModel.status == "VOIDED",
        )
    ) or 0

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_OVERVIEW_VIEW",
        target_entity="admin_portal",
        target_id=None,
        ip_address=ip,
        outcome="SUCCESS",
        details="Accessed administrative platform overview metrics",
    )

    return AdminOverviewResponse(
        totalUsers=total_users,
        activeUsers=active_users,
        suspendedUsers=suspended_users,
        verifiedUsers=verified_users,
        investorUsers=investor_users,
        adminUsers=admin_users,
        totalAccounts=total_accounts,
        totalTransactions=total_transactions,
        totalInvestedCapitalUsd=total_invested_usd,
        investedCapitalStatusMessage=invested_status_msg,
        totalWithdrawnCapitalUsd=total_withdrawn_usd,
        pendingWithdrawalsCount=pending_withdrawals,
        completedWithdrawalsCount=completed_withdrawals,
        failedWithdrawalsCount=failed_withdrawals,
    )


# =========================================================================
# 2. USER DIRECTORY & MANAGEMENT
# =========================================================================

@router.get("/users", response_model=AdminUserListResponse)
async def list_admin_users(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by email or full name"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_verified: Optional[bool] = Query(None, description="Filter by verified status"),
    role: Optional[str] = Query(None, description="Filter by user role"),
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUserListResponse:
    """Paginated user directory with search and status filtering."""
    conditions = []
    if search:
        search_term = f"%{search.strip()}%"
        conditions.append(or_(
            UserModel.email.ilike(search_term),
            UserModel.full_name.ilike(search_term),
        ))
    if is_active is not None:
        conditions.append(UserModel.is_active == is_active)
    if is_verified is not None:
        conditions.append(UserModel.is_verified == is_verified)
    if role:
        conditions.append(UserModel.role == role.lower())

    base_filter = and_(*conditions) if conditions else True

    count_stmt = select(func.count(UserModel.id)).where(base_filter)
    total = await db.scalar(count_stmt) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    stmt = (
        select(UserModel)
        .where(base_filter)
        .order_by(UserModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    res = await db.execute(stmt)
    users = res.scalars().all()

    items = [
        AdminUserSummarySchema(
            id=u.id,
            fullName=u.full_name,
            email=u.email,
            role=u.role,
            isActive=u.is_active,
            isVerified=u.is_verified,
            mfaEnabled=u.mfa_enabled,
            createdAt=u.created_at.isoformat(),
            updatedAt=u.updated_at.isoformat(),
        )
        for u in users
    ]

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_USER_LIST_VIEW",
        target_entity="users",
        target_id=None,
        ip_address=ip,
        outcome="SUCCESS",
        details=f"Viewed user directory page {page} with {len(items)} results",
    )

    return AdminUserListResponse(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=total_pages,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetailSchema)
async def get_admin_user_detail(
    user_id: str,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUserDetailSchema:
    """Detailed user profile inspection excluding sensitive hashes and secrets."""
    user_stmt = select(UserModel).where(UserModel.id == user_id)
    target_user = await db.scalar(user_stmt)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found."
        )

    now = datetime.now(timezone.utc)
    active_sessions_stmt = select(func.count(UserSessionModel.id)).where(
        UserSessionModel.user_id == user_id,
        UserSessionModel.revoked_at.is_(None),
        UserSessionModel.expires_at > now,
    )
    active_sessions = await db.scalar(active_sessions_stmt) or 0

    total_sessions_stmt = select(func.count(UserSessionModel.id)).where(
        UserSessionModel.user_id == user_id
    )
    total_sessions = await db.scalar(total_sessions_stmt) or 0

    latest_session_stmt = (
        select(UserSessionModel.created_at)
        .where(UserSessionModel.user_id == user_id)
        .order_by(UserSessionModel.created_at.desc())
        .limit(1)
    )
    last_login_dt = await db.scalar(latest_session_stmt)

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_USER_DETAIL_VIEW",
        target_entity="user",
        target_id=user_id,
        ip_address=ip,
        outcome="SUCCESS",
        details=f"Viewed user detail profile for {target_user.email}",
    )

    return AdminUserDetailSchema(
        id=target_user.id,
        fullName=target_user.full_name,
        email=target_user.email,
        role=target_user.role,
        isActive=target_user.is_active,
        isVerified=target_user.is_verified,
        mfaEnabled=target_user.mfa_enabled,
        createdAt=target_user.created_at.isoformat(),
        updatedAt=target_user.updated_at.isoformat(),
        activeSessionsCount=active_sessions,
        totalSessionsCount=total_sessions,
        lastLoginAt=last_login_dt.isoformat() if last_login_dt else None,
    )


@router.get("/users/{user_id}/accounts", response_model=AdminUserAccountsResponse)
async def get_admin_user_accounts(
    user_id: str,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUserAccountsResponse:
    """Read-only inspection of target user's financial accounts."""
    user_exists = await db.scalar(select(UserModel.id).where(UserModel.id == user_id))
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found."
        )

    stmt = (
        select(AccountModel, AssetModel, AccountBalanceModel)
        .join(AssetModel, AssetModel.id == AccountModel.asset_id)
        .outerjoin(AccountBalanceModel, AccountBalanceModel.account_id == AccountModel.id)
        .where(AccountModel.user_id == user_id, AccountModel.is_active.is_(True))
        .order_by(AssetModel.symbol.asc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    if not rows:
        return AdminUserAccountsResponse(
            userId=user_id,
            hasAccounts=False,
            totalBalanceUsd=None,
            accounts=[],
        )

    account_schemas: List[UserAccountBalanceSchema] = []
    total_usd = Decimal("0.00")
    ledger_service = LedgerService(db)

    for account, asset, _ in rows:
        acct_bal = await ledger_service.get_account_balances(account.id)
        settled_native = acct_bal["settled"]
        reserved_native = acct_bal["reserved"]
        pending_native = acct_bal["pending"]
        available_native = acct_bal["available"]
        functional_usd = acct_bal["functional_usd"]
        total_usd += functional_usd

        account_schemas.append(
            UserAccountBalanceSchema(
                accountId=account.id,
                accountNumber=account.account_number,
                asset=asset.symbol,
                assetName=asset.name,
                accountType=account.account_type,
                accountCategory=account.account_category,
                settledBalance=f"{settled_native:.{asset.display_decimals}f}",
                availableBalance=f"{available_native:.{asset.display_decimals}f}",
                pendingBalance=f"{pending_native:.{asset.display_decimals}f}",
                reservedBalance=f"{reserved_native:.{asset.display_decimals}f}",
                functionalUsdBalance=f"{functional_usd:.2f}",
                decimals=asset.display_decimals,
            )
        )

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_USER_ACCOUNTS_VIEW",
        target_entity="user_accounts",
        target_id=user_id,
        ip_address=ip,
        outcome="SUCCESS",
        details=f"Viewed accounts for user {user_id}",
    )

    return AdminUserAccountsResponse(
        userId=user_id,
        hasAccounts=True,
        totalBalanceUsd=f"{total_usd:.2f}",
        accounts=account_schemas,
    )


@router.get("/users/{user_id}/transactions", response_model=UserTransactionsListResponse)
async def get_admin_user_transactions(
    user_id: str,
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    asset: Optional[str] = Query(None, description="Filter by asset symbol"),
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserTransactionsListResponse:
    """Read-only inspection of target user's financial transactions."""
    user_exists = await db.scalar(select(UserModel.id).where(UserModel.id == user_id))
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found."
        )

    user_account_tx_subq = (
        select(JournalEntryModel.transaction_id)
        .join(AccountModel, AccountModel.id == JournalEntryModel.account_id)
        .where(AccountModel.user_id == user_id)
    )

    base_condition = or_(
        FinancialTransactionModel.initiator_user_id == user_id,
        FinancialTransactionModel.id.in_(user_account_tx_subq),
    )

    conditions = [base_condition]
    if transaction_type:
        conditions.append(FinancialTransactionModel.transaction_type == transaction_type.upper())
    if status:
        conditions.append(FinancialTransactionModel.status == status.upper())

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
        entry_stmt = (
            select(JournalEntryModel, AssetModel)
            .join(AssetModel, AssetModel.id == JournalEntryModel.asset_id)
            .join(AccountModel, AccountModel.id == JournalEntryModel.account_id)
            .where(
                JournalEntryModel.transaction_id == tx.id,
                AccountModel.user_id == user_id,
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

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_USER_TRANSACTIONS_VIEW",
        target_entity="user_transactions",
        target_id=user_id,
        ip_address=ip,
        outcome="SUCCESS",
        details=f"Viewed transactions for user {user_id}",
    )

    return UserTransactionsListResponse(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        pages=pages,
    )


@router.post("/users/{user_id}/suspend", response_model=AdminActionResponse)
async def suspend_user_account(
    user_id: str,
    req: AdminUserActionRequest,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminActionResponse:
    """
    Suspends a user account:
    - Sets is_active = False.
    - Immediately invalidates all active sessions.
    - Preserves records and logs durable audit event with administrator attribution and reason.
    """
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot suspend their own account."
        )

    user_stmt = select(UserModel).where(UserModel.id == user_id)
    target_user = await db.scalar(user_stmt)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found."
        )

    if not target_user.is_active:
        return AdminActionResponse(
            success=True,
            message=f"User '{target_user.email}' is already in a suspended state.",
            targetId=user_id,
        )

    # 1. Update user state
    target_user.is_active = False

    # 2. Invalidate all active sessions immediately and any outstanding tokens
    now = datetime.now(timezone.utc)
    revoke_stmt = (
        update(UserSessionModel)
        .where(UserSessionModel.user_id == user_id, UserSessionModel.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    await db.execute(revoke_stmt)

    await db.execute(
        update(PasswordResetTokenModel)
        .where(PasswordResetTokenModel.user_id == user_id, PasswordResetTokenModel.used_at.is_(None))
        .values(used_at=now)
    )
    await db.execute(
        update(EmailVerificationTokenModel)
        .where(EmailVerificationTokenModel.user_id == user_id, EmailVerificationTokenModel.used_at.is_(None))
        .values(used_at=now)
    )

    # 3. Durable audit log
    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_USER_SUSPEND",
        target_entity="user",
        target_id=user_id,
        ip_address=ip,
        outcome="SUCCESS",
        reason=req.reason.strip(),
        details=f"Suspended user account '{target_user.email}'; revoked all active sessions",
    )

    await db.commit()

    return AdminActionResponse(
        success=True,
        message=f"User account '{target_user.email}' has been suspended and all active sessions revoked.",
        targetId=user_id,
    )


@router.post("/users/{user_id}/reactivate", response_model=AdminActionResponse)
async def reactivate_user_account(
    user_id: str,
    req: AdminUserActionRequest,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminActionResponse:
    """Reactivates a previously suspended user account."""
    user_stmt = select(UserModel).where(UserModel.id == user_id)
    target_user = await db.scalar(user_stmt)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found."
        )

    if target_user.is_active:
        return AdminActionResponse(
            success=True,
            message=f"User '{target_user.email}' is already active.",
            targetId=user_id,
        )

    target_user.is_active = True

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_USER_REACTIVATE",
        target_entity="user",
        target_id=user_id,
        ip_address=ip,
        outcome="SUCCESS",
        reason=req.reason.strip(),
        details=f"Reactivated user account '{target_user.email}'",
    )

    await db.commit()

    return AdminActionResponse(
        success=True,
        message=f"User account '{target_user.email}' has been reactivated.",
        targetId=user_id,
    )


@router.post("/users/{user_id}/anonymize-delete", response_model=AdminActionResponse)
async def anonymize_and_remove_user_account(
    user_id: str,
    req: AdminUserDeleteRequest,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminActionResponse:
    """
    Safely removes a user account through deactivation and PII anonymization:
    - Requires explicit confirmation of the user's email address.
    - Prevents self-deletion.
    - Forbids deletion if the user possesses positive settled financial balances.
    - Forbids deletion if the user has pending unsettled transactions.
    - Revokes all sessions and deactivates accounts.
    - Anonymizes PII to preserve immutable audit and ledger relationships without foreign-key corruption.
    - Logs durable audit event.
    """
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete their own account."
        )

    user_stmt = select(UserModel).where(UserModel.id == user_id)
    target_user = await db.scalar(user_stmt)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found."
        )

    # 1. Require explicit confirmation of target email
    if req.confirmEmail.strip().lower() != target_user.email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation email does not match target user email. Accidental deletion prevented."
        )

    # 2. Check for positive settled balances
    stmt_balances = (
        select(func.coalesce(func.sum(AccountBalanceModel.functional_usd_balance), Decimal("0.00")))
        .join(AccountModel, AccountModel.id == AccountBalanceModel.account_id)
        .where(AccountModel.user_id == user_id, AccountModel.is_active.is_(True))
    )
    active_balance = await db.scalar(stmt_balances) or Decimal("0.00")
    if active_balance > Decimal("0.01"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot remove account with positive settled balance (${active_balance:.2f} USD). Balance must be liquidated or withdrawn first."
        )

    # 3. Check for pending transactions
    stmt_pending = select(func.count(FinancialTransactionModel.id)).where(
        FinancialTransactionModel.initiator_user_id == user_id,
        FinancialTransactionModel.status == "PENDING",
    )
    pending_txs = await db.scalar(stmt_pending) or 0
    if pending_txs > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot remove account with {pending_txs} pending transaction(s). Transactions must be resolved first."
        )

    # 4. Safe deactivation and PII anonymization
    now = datetime.now(timezone.utc)
    old_email = target_user.email

    # Revoke sessions and tokens
    await db.execute(
        update(UserSessionModel)
        .where(UserSessionModel.user_id == user_id)
        .values(revoked_at=now)
    )
    await db.execute(
        update(PasswordResetTokenModel)
        .where(PasswordResetTokenModel.user_id == user_id, PasswordResetTokenModel.used_at.is_(None))
        .values(used_at=now)
    )
    await db.execute(
        update(EmailVerificationTokenModel)
        .where(EmailVerificationTokenModel.user_id == user_id, EmailVerificationTokenModel.used_at.is_(None))
        .values(used_at=now)
    )

    # Deactivate accounts
    await db.execute(
        update(AccountModel)
        .where(AccountModel.user_id == user_id)
        .values(is_active=False)
    )

    # Anonymize PII
    target_user.full_name = "Deactivated User"
    target_user.email = f"anonymized_{target_user.id[:8]}@deleted.nexora.internal"
    target_user.password_hash = "REVOKED_DEACTIVATED_ACCOUNT"
    target_user.mfa_secret = None
    target_user.mfa_enabled = False
    target_user.is_active = False
    target_user.is_verified = False

    # 5. Durable audit log
    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_USER_ANONYMIZE_DELETE",
        target_entity="user",
        target_id=user_id,
        ip_address=ip,
        outcome="SUCCESS",
        reason=req.reason.strip(),
        details=f"Safely removed and PII-anonymized user account previously known as '{old_email}'",
    )

    await db.commit()

    return AdminActionResponse(
        success=True,
        message=f"User account '{old_email}' has been safely removed and anonymized. Financial records and audit logs are preserved.",
        targetId=user_id,
    )


@router.get("/users/{user_id}/investment-record", response_model=AdminInvestmentRecordResponse)
async def get_admin_user_investment_record(
    user_id: str,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminInvestmentRecordResponse:
    """
    Get administrator-managed investment record for a specific user.
    """
    target_user = await db.get(UserModel, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found.",
        )

    stmt = select(UserInvestmentRecordModel).where(UserInvestmentRecordModel.user_id == user_id)
    rec = (await db.execute(stmt)).scalars().first()

    if not rec:
        return AdminInvestmentRecordResponse(
            id=None,
            userId=user_id,
            hasRecord=False,
            amount=None,
            currency=None,
            updatedByAdminId=None,
            updatedByAdminEmail=None,
            lastReason=None,
            createdAt=None,
            updatedAt=None,
        )

    admin_email: Optional[str] = None
    if rec.updated_by_admin_id:
        admin_obj = await db.get(UserModel, rec.updated_by_admin_id)
        if admin_obj:
            admin_email = admin_obj.email

    amount_str = f"{rec.amount:.2f}" if rec.currency in ["USD", "USDT"] else f"{rec.amount:.8f}".rstrip("0").rstrip(".")

    return AdminInvestmentRecordResponse(
        id=rec.id,
        userId=user_id,
        hasRecord=True,
        amount=amount_str,
        currency=rec.currency,
        updatedByAdminId=rec.updated_by_admin_id,
        updatedByAdminEmail=admin_email,
        lastReason=rec.last_reason,
        createdAt=rec.created_at.isoformat() if rec.created_at else None,
        updatedAt=rec.updated_at.isoformat() if rec.updated_at else None,
    )


@router.put("/users/{user_id}/investment-record", response_model=AdminInvestmentRecordResponse)
async def update_admin_user_investment_record(
    user_id: str,
    req: AdminInvestmentRecordUpdateRequest,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminInvestmentRecordResponse:
    """
    Create or update administrator-managed investment record for a specific user.
    Ensures:
    - Decimal-safe financial validation (amount >= 0).
    - Supported platform currency check.
    - Mandatory substantive audit reason (len >= 3).
    - Durable audit log of Admin ID, Target User ID, Previous Amount, New Amount, Currency, Reason, Timestamp.
    - Complete isolation from ledger accounts, balances, and journal entries.
    """
    target_user = await db.get(UserModel, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found.",
        )

    if req.amount < Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Investment amount must be greater than or equal to zero.",
        )

    if not req.reason or len(req.reason.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A substantive reason (at least 3 characters) is required for updating the investment amount.",
        )

    currency_clean = req.currency.strip().upper()
    asset_stmt = select(AssetModel).where(AssetModel.symbol == currency_clean)
    asset_res = await db.execute(asset_stmt)
    asset = asset_res.scalars().first()
    if not asset and currency_clean != "USD":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Currency '{currency_clean}' is not supported. Supported currencies include USD, USDT, BTC, ETH, SOL.",
        )

    stmt = select(UserInvestmentRecordModel).where(UserInvestmentRecordModel.user_id == user_id)
    rec = (await db.execute(stmt)).scalars().first()

    prev_amount = rec.amount if rec else None
    now = datetime.now(timezone.utc)

    if rec:
        rec.amount = req.amount
        rec.currency = currency_clean
        rec.updated_by_admin_id = admin_user.id
        rec.last_reason = req.reason.strip()
        rec.updated_at = now
    else:
        rec = UserInvestmentRecordModel(
            user_id=user_id,
            amount=req.amount,
            currency=currency_clean,
            updated_by_admin_id=admin_user.id,
            last_reason=req.reason.strip(),
            created_at=now,
            updated_at=now,
        )
        db.add(rec)

    ip = request.client.host if request.client else "unknown"
    audit_details = json.dumps({
        "previous_amount": str(prev_amount) if prev_amount is not None else None,
        "new_amount": str(req.amount),
        "currency": currency_clean,
    })

    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_USER_INVESTMENT_RECORD_UPDATE",
        target_entity="user_investment_record",
        target_id=user_id,
        ip_address=ip,
        outcome="SUCCESS",
        reason=req.reason.strip(),
        details=audit_details,
    )

    await db.commit()
    await db.refresh(rec)

    amount_str = f"{rec.amount:.2f}" if rec.currency in ["USD", "USDT"] else f"{rec.amount:.8f}".rstrip("0").rstrip(".")

    return AdminInvestmentRecordResponse(
        id=rec.id,
        userId=user_id,
        hasRecord=True,
        amount=amount_str,
        currency=rec.currency,
        updatedByAdminId=rec.updated_by_admin_id,
        updatedByAdminEmail=admin_user.email,
        lastReason=rec.last_reason,
        createdAt=rec.created_at.isoformat() if rec.created_at else None,
        updatedAt=rec.updated_at.isoformat() if rec.updated_at else None,
    )



# =========================================================================
# 3. WITHDRAWAL OPERATIONS & RECONCILIATION
# =========================================================================

@router.get("/withdrawals", response_model=AdminWithdrawalsListResponse)
async def list_admin_withdrawals(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (PENDING, POSTED, SETTLED, VOIDED)"),
    search: Optional[str] = Query(None, description="Search by ref, email, or asset"),
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminWithdrawalsListResponse:
    """
    Paginated administrative list of withdrawal requests with real ledger data.
    - Exposes masked withdrawal destinations to prevent sensitive data exposure.
    - Accurately reports status (PENDING, POSTED/APPROVED, SETTLED, VOIDED/REJECTED).
    """
    conditions = [FinancialTransactionModel.transaction_type == "WITHDRAWAL"]

    if status_filter and status_filter.upper() != "ALL":
        conditions.append(FinancialTransactionModel.status == status_filter.upper())

    if search:
        search_term = f"%{search.strip()}%"
        user_matches = select(UserModel.id).where(
            or_(
                UserModel.email.ilike(search_term),
                UserModel.full_name.ilike(search_term),
            )
        )
        conditions.append(or_(
            FinancialTransactionModel.transaction_ref.ilike(search_term),
            FinancialTransactionModel.initiator_user_id.in_(user_matches),
            FinancialTransactionModel.description.ilike(search_term),
        ))

    base_filter = and_(*conditions)

    count_stmt = select(func.count(FinancialTransactionModel.id)).where(base_filter)
    total = await db.scalar(count_stmt) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    if total == 0:
        return AdminWithdrawalsListResponse(
            items=[],
            total=0,
            page=page,
            pageSize=page_size,
            totalPages=0,
        )

    stmt = (
        select(FinancialTransactionModel, UserModel)
        .outerjoin(UserModel, UserModel.id == FinancialTransactionModel.initiator_user_id)
        .where(base_filter)
        .order_by(FinancialTransactionModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    res = await db.execute(stmt)
    rows = res.all()

    items: List[AdminWithdrawalSummarySchema] = []
    for tx, user in rows:
        # Fetch associated journal entry line for amount and asset
        entry_stmt = (
            select(JournalEntryModel, AssetModel, AccountModel)
            .join(AssetModel, AssetModel.id == JournalEntryModel.asset_id)
            .join(AccountModel, AccountModel.id == JournalEntryModel.account_id)
            .where(JournalEntryModel.transaction_id == tx.id)
            .order_by(JournalEntryModel.entry_sequence.asc())
        )
        entry_res = await db.execute(entry_stmt)
        entry_rows = entry_res.all()

        asset_sym = "USD"
        amount_str = "0.00"
        amount_usd_str = "0.00"
        acct_id = None
        acct_num = None

        # Prefer DEBIT entry (user liability account)
        selected_entry = None
        for entry_item, asset_item, acct_item in entry_rows:
            if entry_item.direction == "DEBIT":
                selected_entry = (entry_item, asset_item, acct_item)
                break
        if not selected_entry and entry_rows:
            selected_entry = entry_rows[0]

        if selected_entry:
            e, a, acc = selected_entry
            asset_sym = a.symbol
            amount_str = f"{e.native_amount:.{a.display_decimals}f}"
            amount_usd_str = f"{e.functional_amount_usd:.2f}"
            acct_id = acc.id
            acct_num = acc.account_number

        meta: Dict[str, Any] = {}
        if tx.metadata_json:
            try:
                meta = json.loads(tx.metadata_json) if isinstance(tx.metadata_json, str) else {}
            except Exception:
                meta = {}

        # Derive payout status
        if tx.status == "PENDING":
            payout_status = "PENDING_REVIEW"
        elif tx.status == "POSTED":
            payout_status = "AWAITING_PAYOUT_EXECUTION"
        elif tx.status == "SETTLED":
            payout_status = "COMPLETED"
        elif tx.status == "VOIDED":
            payout_status = "REJECTED"
        else:
            payout_status = tx.status

        items.append(
            AdminWithdrawalSummarySchema(
                id=tx.id,
                transactionRef=tx.transaction_ref,
                userId=user.id if user else tx.initiator_user_id,
                userEmail=user.email if user else None,
                userFullName=user.full_name if user else None,
                accountId=acct_id,
                accountNumber=acct_num,
                asset=asset_sym,
                amount=amount_str,
                amountUsd=amount_usd_str,
                status=tx.status,
                destinationMasked=extract_destination(tx.metadata_json, tx.description),
                createdAt=tx.created_at.isoformat(),
                settledAt=tx.settled_at.isoformat() if tx.settled_at else None,
                rejectionReason=meta.get("rejection_reason"),
                approvalNotes=meta.get("approval_notes"),
                payoutReference=meta.get("payout_reference"),
                payoutStatus=payout_status,
            )
        )

    return AdminWithdrawalsListResponse(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=total_pages,
    )


@router.get("/withdrawals/{withdrawal_id}", response_model=AdminWithdrawalSummarySchema)
async def get_admin_withdrawal_detail(
    withdrawal_id: str,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminWithdrawalSummarySchema:
    """Detailed inspection of a specific withdrawal request."""
    stmt = (
        select(FinancialTransactionModel, UserModel)
        .outerjoin(UserModel, UserModel.id == FinancialTransactionModel.initiator_user_id)
        .where(
            FinancialTransactionModel.id == withdrawal_id,
            FinancialTransactionModel.transaction_type == "WITHDRAWAL",
        )
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Withdrawal with ID '{withdrawal_id}' was not found."
        )

    tx, user = row
    entry_stmt = (
        select(JournalEntryModel, AssetModel, AccountModel)
        .join(AssetModel, AssetModel.id == JournalEntryModel.asset_id)
        .join(AccountModel, AccountModel.id == JournalEntryModel.account_id)
        .where(JournalEntryModel.transaction_id == tx.id)
    )
    entry_res = await db.execute(entry_stmt)
    entry_rows = entry_res.all()

    asset_sym = "USD"
    amount_str = "0.00"
    amount_usd_str = "0.00"
    acct_id = None
    acct_num = None

    selected_entry = None
    for entry_item, asset_item, acct_item in entry_rows:
        if entry_item.direction == "DEBIT":
            selected_entry = (entry_item, asset_item, acct_item)
            break
    if not selected_entry and entry_rows:
        selected_entry = entry_rows[0]

    if selected_entry:
        e, a, acc = selected_entry
        asset_sym = a.symbol
        amount_str = f"{e.native_amount:.{a.display_decimals}f}"
        amount_usd_str = f"{e.functional_amount_usd:.2f}"
        acct_id = acc.id
        acct_num = acc.account_number

    meta: Dict[str, Any] = {}
    if tx.metadata_json:
        try:
            meta = json.loads(tx.metadata_json) if isinstance(tx.metadata_json, str) else {}
        except Exception:
            meta = {}

    if tx.status == "PENDING":
        payout_status = "PENDING_REVIEW"
    elif tx.status == "POSTED":
        payout_status = "AWAITING_PAYOUT_EXECUTION"
    elif tx.status == "SETTLED":
        payout_status = "COMPLETED"
    elif tx.status == "VOIDED":
        payout_status = "REJECTED"
    else:
        payout_status = tx.status

    return AdminWithdrawalSummarySchema(
        id=tx.id,
        transactionRef=tx.transaction_ref,
        userId=user.id if user else tx.initiator_user_id,
        userEmail=user.email if user else None,
        userFullName=user.full_name if user else None,
        accountId=acct_id,
        accountNumber=acct_num,
        asset=asset_sym,
        amount=amount_str,
        amountUsd=amount_usd_str,
        status=tx.status,
        destinationMasked=extract_destination(tx.metadata_json, tx.description),
        createdAt=tx.created_at.isoformat(),
        settledAt=tx.settled_at.isoformat() if tx.settled_at else None,
        rejectionReason=meta.get("rejection_reason"),
        approvalNotes=meta.get("approval_notes"),
        payoutReference=meta.get("payout_reference"),
        payoutStatus=payout_status,
    )


@router.post("/withdrawals/{withdrawal_id}/approve", response_model=AdminActionResponse)
async def approve_withdrawal_request(
    withdrawal_id: str,
    req: AdminWithdrawalActionRequest,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminActionResponse:
    """
    Approves a pending withdrawal request:
    - Enforces row-level lock (FOR UPDATE) to prevent race conditions or duplicate approvals.
    - Strictly rejects non-PENDING withdrawals with 409 Conflict.
    - Verifies balance sufficiency in the user's subledger account.
    - Transitions status to POSTED (approved and committed to ledger).
    - Logs durable audit record with administrator attribution.
    - Honestly reports that automated payout execution is not integrated, requiring manual reconciliation.
    """
    ledger_service = LedgerService(db)
    tx = await ledger_service.approve_withdrawal(
        withdrawal_id=withdrawal_id,
        admin_user_id=admin_user.id,
        admin_email=admin_user.email,
        notes=req.notes,
    )

    approval_notes = (req.notes or "Administrative approval granted").strip()
    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_WITHDRAWAL_APPROVE",
        target_entity="financial_transaction",
        target_id=tx.id,
        ip_address=ip,
        outcome="SUCCESS",
        reason=approval_notes,
        details=f"Approved withdrawal {tx.transaction_ref} (status moved to POSTED)",
    )

    await db.commit()

    return AdminActionResponse(
        success=True,
        message=f"Withdrawal {tx.transaction_ref} approved and posted to ledger. Payout execution provider integration is not configured; manual disbursement reconciliation required.",
        targetId=tx.id,
    )


@router.post("/withdrawals/{withdrawal_id}/reject", response_model=AdminActionResponse)
async def reject_withdrawal_request(
    withdrawal_id: str,
    req: AdminWithdrawalActionRequest,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminActionResponse:
    """
    Rejects a pending withdrawal request:
    - Enforces row-level lock (FOR UPDATE) to prevent race conditions.
    - Strictly rejects non-PENDING withdrawals with 409 Conflict.
    - Requires rejection reason.
    - Transitions status to VOIDED, releasing reserved/pending balance in subledger.
    - Logs durable audit record.
    """
    rejection_reason = (req.reason or "").strip()
    ledger_service = LedgerService(db)
    tx = await ledger_service.reject_withdrawal(
        withdrawal_id=withdrawal_id,
        admin_user_id=admin_user.id,
        admin_email=admin_user.email,
        reason=rejection_reason,
    )

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_WITHDRAWAL_REJECT",
        target_entity="financial_transaction",
        target_id=tx.id,
        ip_address=ip,
        outcome="SUCCESS",
        reason=rejection_reason,
        details=f"Rejected withdrawal {tx.transaction_ref}: {rejection_reason}",
    )

    await db.commit()

    return AdminActionResponse(
        success=True,
        message=f"Withdrawal {tx.transaction_ref} rejected and voided. Reserved funds released.",
        targetId=tx.id,
    )


@router.post("/withdrawals/{withdrawal_id}/settle", response_model=AdminActionResponse)
async def settle_withdrawal_request(
    withdrawal_id: str,
    req: AdminWithdrawalSettleRequest,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminActionResponse:
    """
    Authoritatively settles an approved (POSTED) withdrawal upon confirmed external payout:
    - Row-level lock on the transaction.
    - Validates transaction is in POSTED status.
    - Permanently deducts materialized balance from the user's AccountBalanceModel.
    - Releases the reserved balance hold.
    - Transitions transaction status to SETTLED.
    - Records payout reference, admin attribution, and audit event.
    """
    ledger_service = LedgerService(db)
    tx = await ledger_service.settle_withdrawal(
        withdrawal_id=withdrawal_id,
        payout_reference=req.payoutReference,
        admin_user_id=admin_user.id,
        admin_email=admin_user.email,
        notes=req.notes,
    )

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_WITHDRAWAL_SETTLE",
        target_entity="financial_transaction",
        target_id=tx.id,
        ip_address=ip,
        outcome="SUCCESS",
        reason=req.payoutReference,
        details=f"Settled withdrawal {tx.transaction_ref} with payout reference '{req.payoutReference}'",
    )

    await db.commit()

    return AdminActionResponse(
        success=True,
        message=f"Withdrawal {tx.transaction_ref} settled. Subledger balances successfully deducted and reconciled.",
        targetId=tx.id,
    )


@router.post("/accounts/{account_id}/reconcile", response_model=AccountReconciliationResponseSchema)
async def reconcile_account(
    account_id: str,
    req: AdminAccountReconcileRequest,
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AccountReconciliationResponseSchema:
    """
    Audits materialized account balance against full journal-entry ledger reconstruction:
    - Detects any drift between AccountBalanceModel and reconstructed entries.
    - If autoRepair is True, safely resynchronizes materialized balance to match ledger.
    - Durable audit logging.
    """
    ledger_service = LedgerService(db)
    result = await ledger_service.reconcile_account_balance(account_id, auto_repair=req.autoRepair)

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_ACCOUNT_RECONCILE",
        target_entity="account",
        target_id=account_id,
        ip_address=ip,
        outcome="SUCCESS",
        reason=f"autoRepair={req.autoRepair}",
        details=f"Reconciled account {result['accountNumber']}. Consistent: {result['isConsistent']}, Repaired: {result['repaired']}",
    )

    await db.commit()

    return AccountReconciliationResponseSchema(
        accountId=result["accountId"],
        accountNumber=result["accountNumber"],
        asset=result["asset"],
        materializedBalance=result["materializedBalance"],
        reconstructedBalance=result["reconstructedBalance"],
        variance=result["variance"],
        isConsistent=result["isConsistent"],
        repaired=result["repaired"],
        postedJournalEntriesCount=result["postedJournalEntriesCount"],
    )



# =========================================================================
# 4. GLOBAL PLATFORM TRANSACTIONS
# =========================================================================

@router.get("/transactions", response_model=AdminTransactionsListResponse)
async def list_admin_transactions(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    transaction_type: Optional[str] = Query(None, description="Filter by type (DEPOSIT, WITHDRAWAL, SPOT_TRADE, etc.)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (PENDING, POSTED, SETTLED, VOIDED)"),
    asset: Optional[str] = Query(None, description="Filter by asset symbol"),
    search: Optional[str] = Query(None, description="Search by ref or description"),
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminTransactionsListResponse:
    """Paginated global platform transaction explorer for operations staff."""
    conditions = []
    if transaction_type and transaction_type.upper() != "ALL":
        conditions.append(FinancialTransactionModel.transaction_type == transaction_type.upper())
    if status_filter and status_filter.upper() != "ALL":
        conditions.append(FinancialTransactionModel.status == status_filter.upper())
    if search:
        search_term = f"%{search.strip()}%"
        conditions.append(or_(
            FinancialTransactionModel.transaction_ref.ilike(search_term),
            FinancialTransactionModel.description.ilike(search_term),
        ))

    base_filter = and_(*conditions) if conditions else True

    count_query = select(func.count(distinct(FinancialTransactionModel.id))).where(base_filter)
    if asset:
        count_query = count_query.join(
            JournalEntryModel, JournalEntryModel.transaction_id == FinancialTransactionModel.id
        ).join(
            AssetModel, AssetModel.id == JournalEntryModel.asset_id
        ).where(AssetModel.symbol == asset.upper())

    total = await db.scalar(count_query) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    if total == 0:
        return AdminTransactionsListResponse(
            items=[],
            total=0,
            page=page,
            pageSize=page_size,
            totalPages=0,
        )

    query = (
        select(FinancialTransactionModel, UserModel.email)
        .outerjoin(UserModel, UserModel.id == FinancialTransactionModel.initiator_user_id)
        .where(base_filter)
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
    rows = res.all()

    items: List[AdminTransactionItemSchema] = []
    for tx, user_email in rows:
        entry_stmt = (
            select(JournalEntryModel, AssetModel)
            .join(AssetModel, AssetModel.id == JournalEntryModel.asset_id)
            .where(JournalEntryModel.transaction_id == tx.id)
            .order_by(JournalEntryModel.entry_sequence.asc())
        )
        entry_res = await db.execute(entry_stmt)
        first_entry = entry_res.first()

        if first_entry:
            e, a = first_entry
            asset_sym = a.symbol
            amount_str = f"{e.native_amount:.{a.display_decimals}f}"
            amount_usd_str = f"{e.functional_amount_usd:.2f}"
            direction_str = e.direction
        else:
            asset_sym = "USD"
            amount_str = "0.00"
            amount_usd_str = "0.00"
            direction_str = "CREDIT"

        items.append(
            AdminTransactionItemSchema(
                id=tx.id,
                transactionRef=tx.transaction_ref,
                transactionType=tx.transaction_type,
                status=tx.status,
                initiatorUserId=tx.initiator_user_id,
                initiatorEmail=user_email,
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

    return AdminTransactionsListResponse(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=total_pages,
    )


# =========================================================================
# 5. DURABLE AUDIT LOG EXPLORER
# =========================================================================

@router.get("/audit-logs", response_model=AdminAuditLogsListResponse)
async def list_admin_audit_logs(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    action: Optional[str] = Query(None, description="Filter by action"),
    admin_user_id: Optional[str] = Query(None, description="Filter by admin actor ID"),
    target_id: Optional[str] = Query(None, description="Filter by target ID"),
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminAuditLogsListResponse:
    """Read-only inspection of durable administrative audit records."""
    conditions = []
    if action:
        conditions.append(AdminAuditLogModel.action == action.upper())
    if admin_user_id:
        conditions.append(AdminAuditLogModel.admin_user_id == admin_user_id)
    if target_id:
        conditions.append(AdminAuditLogModel.target_id == target_id)

    base_filter = and_(*conditions) if conditions else True

    count_stmt = select(func.count(AdminAuditLogModel.id)).where(base_filter)
    total = await db.scalar(count_stmt) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    stmt = (
        select(AdminAuditLogModel, UserModel.email)
        .outerjoin(UserModel, UserModel.id == AdminAuditLogModel.admin_user_id)
        .where(base_filter)
        .order_by(AdminAuditLogModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    res = await db.execute(stmt)
    rows = res.all()

    items = [
        AdminAuditLogSchema(
            id=log.id,
            adminUserId=log.admin_user_id,
            adminEmail=email,
            action=log.action,
            targetEntity=log.target_entity,
            targetId=log.target_id,
            ipAddress=log.ip_address,
            outcome=log.outcome,
            details=log.details,
            reason=log.reason,
            createdAt=log.created_at.isoformat(),
        )
        for log, email in rows
    ]

    return AdminAuditLogsListResponse(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=total_pages,
    )
