from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, timezone

from database import get_db
from models.user import UserModel
from models.financial import (
    InvestorUnitActivityModel,
    FinancialTransactionModel,
)
from routes.auth import get_current_user
from services.market_rates import (
    SUPPORTED_CURRENCIES,
    get_exchange_rate_info,
    convert_and_format_amount,
)

router = APIRouter(prefix="/platform", tags=["Platform Metrics"])


class PlatformInvestmentTotalResponse(BaseModel):
    isAvailable: bool
    baseCurrency: str = "USD"
    baseAmountUsd: Optional[str] = None
    targetCurrency: str
    convertedAmount: Optional[str] = None
    formattedDisplay: Optional[str] = None
    exchangeRate: Optional[str] = None
    rateSource: str
    valuationTimestamp: str
    statusMessage: str
    disclaimer: str
    supportedCurrencies: List[str]


@router.get("/investment-total", response_model=PlatformInvestmentTotalResponse)
async def get_platform_investment_total(
    currency: str = Query("USD", description="Target display currency (USD, EUR, GBP, NGN, USDT, BTC, ETH, SOL)"),
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(get_current_user),
) -> PlatformInvestmentTotalResponse:
    """
    Authoritative global platform investment total for all verified users.
    - Derived strictly from settled, un-reversed investor unit allocations in the authoritative ledger.
    - Platform-wide aggregate; not filtered by user ID and exposes zero personal financial records.
    - Supports user-selected conversion to USD, EUR, GBP, NGN, USDT, BTC, ETH, SOL.
    - Returns an honest unavailable state if no settled platform investment units exist.
    """
    currency_clean = currency.upper().strip()
    if currency_clean not in SUPPORTED_CURRENCIES:
        supported_list = ", ".join(SUPPORTED_CURRENCIES.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported currency '{currency}'. Supported currencies are: {supported_list}",
        )

    # Rate resolution
    rate_info = await get_exchange_rate_info(currency_clean)
    now_iso = datetime.now(timezone.utc).isoformat()
    supported_currency_keys = list(SUPPORTED_CURRENCIES.keys())

    # Aggregate settled, unreversed investor unit issuance activities
    subq_reversed_issuances = select(InvestorUnitActivityModel.reversal_of_id).where(
        InvestorUnitActivityModel.reversal_of_id.is_not(None)
    )

    stmt_issuance = (
        select(func.coalesce(func.sum(InvestorUnitActivityModel.functional_usd_value), Decimal("0.0000")))
        .outerjoin(
            FinancialTransactionModel,
            FinancialTransactionModel.id == InvestorUnitActivityModel.financial_transaction_id,
        )
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

    # Also account for settled redemption burns if any
    stmt_redemptions = (
        select(func.coalesce(func.sum(InvestorUnitActivityModel.functional_usd_value), Decimal("0.0000")))
        .outerjoin(
            FinancialTransactionModel,
            FinancialTransactionModel.id == InvestorUnitActivityModel.financial_transaction_id,
        )
        .where(
            InvestorUnitActivityModel.activity_type == "REDEMPTION_BURN",
            InvestorUnitActivityModel.reversal_of_id.is_(None),
            or_(
                InvestorUnitActivityModel.financial_transaction_id.is_(None),
                and_(
                    FinancialTransactionModel.status == "SETTLED",
                    FinancialTransactionModel.is_fully_reversed.is_(False),
                ),
            ),
        )
    )

    gross_issuance = await db.scalar(stmt_issuance) or Decimal("0.0000")
    redemptions = await db.scalar(stmt_redemptions) or Decimal("0.0000")
    net_invested = gross_issuance - redemptions

    if net_invested > Decimal("0.0000"):
        converted = convert_and_format_amount(net_invested, rate_info)
        return PlatformInvestmentTotalResponse(
            isAvailable=True,
            baseCurrency="USD",
            baseAmountUsd=f"{net_invested:.2f}",
            targetCurrency=currency_clean,
            convertedAmount=converted["converted_amount"],
            formattedDisplay=converted["formatted_display"],
            exchangeRate=converted["exchange_rate_str"],
            rateSource=rate_info["source"],
            valuationTimestamp=now_iso,
            statusMessage="Derived from settled unit issuance records across all platform accounts",
            disclaimer="Platform-wide verified investment total across all eligible accounts. Converted using institutional exchange rates.",
            supportedCurrencies=supported_currency_keys,
        )
    elif gross_issuance > Decimal("0.0000"):
        converted = convert_and_format_amount(gross_issuance, rate_info)
        return PlatformInvestmentTotalResponse(
            isAvailable=True,
            baseCurrency="USD",
            baseAmountUsd=f"{gross_issuance:.2f}",
            targetCurrency=currency_clean,
            convertedAmount=converted["converted_amount"],
            formattedDisplay=converted["formatted_display"],
            exchangeRate=converted["exchange_rate_str"],
            rateSource=rate_info["source"],
            valuationTimestamp=now_iso,
            statusMessage="Derived from settled unit issuance records across all platform accounts",
            disclaimer="Platform-wide verified investment total across all eligible accounts. Converted using institutional exchange rates.",
            supportedCurrencies=supported_currency_keys,
        )
    else:
        # Honest unavailable state when no settled unit issuances exist on the platform
        return PlatformInvestmentTotalResponse(
            isAvailable=False,
            baseCurrency="USD",
            baseAmountUsd=None,
            targetCurrency=currency_clean,
            convertedAmount=None,
            formattedDisplay=None,
            exchangeRate=rate_info.get("exchange_rate_str"),
            rateSource=rate_info["source"],
            valuationTimestamp=now_iso,
            statusMessage="Investment reporting is not yet available. No settled investment unit allocations have been recorded across the platform.",
            disclaimer="Platform-wide verified investment total derived strictly from settled investment ledger records.",
            supportedCurrencies=supported_currency_keys,
        )
