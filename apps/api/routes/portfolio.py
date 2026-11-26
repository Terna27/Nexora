from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from routes.auth import get_current_user
from models.user import UserModel
from models.financial import (
    AccountModel,
    AccountBalanceModel,
    AssetModel,
    FinancialTransactionModel,
    JournalEntryModel,
    InvestorUnitActivityModel,
)
from services.ledger import LedgerService
from schemas.finance import (
    UserPortfolioResponse,
    UserAccountBalanceSchema,
    PortfolioMetricsSchema,
)

router = APIRouter(tags=["Portfolio"])

@router.get("/portfolio/me", response_model=UserPortfolioResponse)
async def get_my_portfolio(
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPortfolioResponse:
    """
    Authoritative authenticated user portfolio endpoint.
    - User is strictly identified from the server-side session.
    - Client cannot submit a user ID to inspect another user's balance.
    - Balances are derived directly from authoritative double-entry account records.
    - Explicitly returns an unprovisioned/unavailable state when subledger accounts are not established.
    """
    stmt = (
        select(AccountModel, AssetModel, AccountBalanceModel)
        .join(AssetModel, AssetModel.id == AccountModel.asset_id)
        .outerjoin(AccountBalanceModel, AccountBalanceModel.account_id == AccountModel.id)
        .where(AccountModel.user_id == user.id, AccountModel.is_active.is_(True))
        .order_by(AssetModel.symbol.asc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    # Empty account handling: user has no subledger accounts provisioned yet
    if not rows:
        return UserPortfolioResponse(
            userId=user.id,
            hasAccounts=False,
            status="UNPROVISIONED",
            totalBalanceUsd=None,
            isAvailable=False,
            accounts=[],
            metrics=PortfolioMetricsSchema(
                totalEarningsUsd=None,
                activePrincipalUsd=None,
                accruedDailyYieldUsd=None,
                totalWithdrawnUsd=None,
            ),
            unsupportedMetrics=[
                "totalEarningsUsd",
                "activePrincipalUsd",
                "accruedDailyYieldUsd",
            ],
        )

    # User has provisioned accounts
    account_schemas: List[UserAccountBalanceSchema] = []
    total_balance_usd = Decimal("0.00")
    ledger_service = LedgerService(db)

    for account, asset, _ in rows:
        acct_bal = await ledger_service.get_account_balances(account.id)
        settled_native = acct_bal["settled"]
        reserved_native = acct_bal["reserved"]
        pending_native = acct_bal["pending"]
        available_native = acct_bal["available"]
        functional_usd = acct_bal["functional_usd"]
        total_balance_usd += functional_usd

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

    # Derive total withdrawn from settled WITHDRAWAL or REDEMPTION transactions
    stmt_withdrawn = (
        select(func.coalesce(func.sum(JournalEntryModel.functional_amount_usd), Decimal("0.0000")))
        .join(FinancialTransactionModel, FinancialTransactionModel.id == JournalEntryModel.transaction_id)
        .join(AccountModel, AccountModel.id == JournalEntryModel.account_id)
        .where(
            AccountModel.user_id == user.id,
            FinancialTransactionModel.status == "SETTLED",
            FinancialTransactionModel.transaction_type.in_(["WITHDRAWAL", "REDEMPTION"]),
        )
    )
    total_withdrawn_val = await db.scalar(stmt_withdrawn) or Decimal("0.00")
    total_withdrawn_str = f"{total_withdrawn_val:.2f}"

    # Active principal from settled unit activities (if vehicle unitization is present)
    stmt_principal = (
        select(func.coalesce(func.sum(InvestorUnitActivityModel.functional_usd_value), Decimal("0.0000")))
        .where(InvestorUnitActivityModel.investor_id == user.id)
    )
    principal_val = await db.scalar(stmt_principal)
    active_principal_str = f"{principal_val:.2f}" if principal_val and principal_val > 0 else None

    return UserPortfolioResponse(
        userId=user.id,
        hasAccounts=True,
        status="PROVISIONED",
        totalBalanceUsd=f"{total_balance_usd:.2f}",
        isAvailable=True,
        accounts=account_schemas,
        metrics=PortfolioMetricsSchema(
            totalEarningsUsd=None,  # Yield generation is not yet supported in this milestone
            activePrincipalUsd=active_principal_str,
            accruedDailyYieldUsd=None,  # Not fabricated; explicitly unsupported
            totalWithdrawnUsd=total_withdrawn_str,
        ),
        unsupportedMetrics=[
            "totalEarningsUsd",
            "accruedDailyYieldUsd",
        ],
    )
