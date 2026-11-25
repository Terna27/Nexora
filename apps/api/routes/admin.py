from decimal import Decimal
from typing import Optional, List
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, distinct

from database import get_db
from routes.auth import require_admin, record_admin_audit_event
from models.user import UserModel, UserSessionModel, AdminAuditLogModel
from models.financial import (
    AccountModel,
    AccountBalanceModel,
    AssetModel,
    FinancialTransactionModel,
    JournalEntryModel,
)
from schemas.admin import (
    AdminOverviewResponse,
    AdminUserSummarySchema,
    AdminUserDetailSchema,
    AdminUserListResponse,
    AdminUserAccountsResponse,
    AdminAuditLogSchema,
    AdminAuditLogsListResponse,
)
from schemas.finance import (
    UserAccountBalanceSchema,
    UserTransactionsListResponse,
    UserTransactionItemSchema,
)

router = APIRouter(prefix="/admin", tags=["Administrative Portal"])


@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    request: Request,
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminOverviewResponse:
    """
    Authoritative administrative overview metrics.
    - Protected by server-enforced admin authorization.
    - All operational figures are derived from real database records.
    - Unsupported or non-authoritative metrics are omitted.
    """
    total_users = await db.scalar(select(func.count(UserModel.id))) or 0
    active_users = await db.scalar(select(func.count(UserModel.id)).where(UserModel.is_active.is_(True))) or 0
    verified_users = await db.scalar(select(func.count(UserModel.id)).where(UserModel.is_verified.is_(True))) or 0
    investor_users = await db.scalar(select(func.count(UserModel.id)).where(UserModel.role == "investor")) or 0
    admin_users = await db.scalar(select(func.count(UserModel.id)).where(UserModel.role == "admin")) or 0

    total_accounts = await db.scalar(select(func.count(AccountModel.id))) or 0
    total_transactions = await db.scalar(select(func.count(FinancialTransactionModel.id))) or 0

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_OVERVIEW_VIEW",
        target_entity="admin_portal",
        target_id=None,
        ip_address=ip,
        outcome="SUCCESS",
        details="Accessed administrative system overview metrics",
    )

    return AdminOverviewResponse(
        totalUsers=total_users,
        activeUsers=active_users,
        verifiedUsers=verified_users,
        investorUsers=investor_users,
        adminUsers=admin_users,
        totalAccounts=total_accounts,
        totalTransactions=total_transactions,
    )


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
    """
    Paginated administrative user directory with search and status filtering.
    - Sensitive fields (password hashes, tokens, MFA secrets) are never returned.
    """
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
        details=f"Listed users (page={page}, size={page_size}, search='{search or ''}')",
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
    """
    Detailed user profile inspection for administrative staff.
    - Excludes password hashes and sensitive secrets.
    - Includes session lifecycle summary.
    """
    user_stmt = select(UserModel).where(UserModel.id == user_id)
    target_user = await db.scalar(user_stmt)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found."
        )

    now = datetime.now(timezone.utc)

    # Count active sessions (unrevoked and not expired)
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
        details=f"Viewed profile details of user '{target_user.email}'",
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
    """
    Read-only inspection of a target user's financial subledger accounts and authoritative balances.
    - Derived directly from authoritative double-entry accounting records.
    - Cannot modify balances.
    """
    # Verify user exists
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

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_USER_ACCOUNTS_VIEW",
        target_entity="user_accounts",
        target_id=user_id,
        ip_address=ip,
        outcome="SUCCESS",
        details=f"Inspected financial accounts for user ID '{user_id}'",
    )

    if not rows:
        return AdminUserAccountsResponse(
            userId=user_id,
            hasAccounts=False,
            totalBalanceUsd=None,
            accounts=[],
        )

    account_schemas: List[UserAccountBalanceSchema] = []
    total_usd = Decimal("0.00")

    for account, asset, balance in rows:
        settled_native = balance.current_balance if balance else Decimal("0")
        functional_usd = balance.functional_usd_balance if balance else Decimal("0.00")
        total_usd += functional_usd

        stmt_pending = (
            select(func.coalesce(func.sum(JournalEntryModel.native_amount), Decimal("0")))
            .join(FinancialTransactionModel, FinancialTransactionModel.id == JournalEntryModel.transaction_id)
            .where(
                JournalEntryModel.account_id == account.id,
                FinancialTransactionModel.status == "PENDING",
            )
        )
        pending_native = await db.scalar(stmt_pending) or Decimal("0")
        reserved_native = Decimal("0")
        available_native = settled_native - reserved_native

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
    status: Optional[str] = Query(None, description="Filter by status (PENDING, POSTED, SETTLED, VOIDED)"),
    asset: Optional[str] = Query(None, description="Filter by asset symbol"),
    admin_user: UserModel = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserTransactionsListResponse:
    """
    Read-only inspection of target user's financial transactions.
    - Strictly scoped to transactions belonging to or affecting the target user's accounts.
    - Displays immutable lifecycle states (PENDING, POSTED, SETTLED, VOIDED).
    """
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

    ip = request.client.host if request.client else "unknown"
    await record_admin_audit_event(
        db=db,
        admin_user_id=admin_user.id,
        action="ADMIN_USER_TRANSACTIONS_VIEW",
        target_entity="user_transactions",
        target_id=user_id,
        ip_address=ip,
        outcome="SUCCESS",
        details=f"Inspected transactions for user ID '{user_id}' (page={page}, size={page_size})",
    )

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

    return UserTransactionsListResponse(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        pages=pages,
    )


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
    """
    Read-only inspection of durable administrative audit records.
    - PostgreSQL immutability trigger protects these logs from modification or deletion.
    - Captures actor identity, action, target entity, timestamp, outcome, and details.
    """
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
