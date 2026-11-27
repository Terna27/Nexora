from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, timezone

from database import get_db
from models.user import UserModel, PlatformInvestmentConfigurationModel
from routes.auth import get_current_user
from services.market_rates import (
    SUPPORTED_CURRENCIES,
    get_exchange_rate_info,
    convert_and_format_amount,
)

router = APIRouter(prefix="/platform", tags=["Platform Metrics"])


class PlatformInvestmentTotalResponse(BaseModel):
    isConfigured: bool
    isAvailable: bool
    baseCurrency: str = "USD"
    baseAmount: Optional[str] = None
    targetCurrency: str
    convertedAmount: Optional[str] = None
    formattedDisplay: Optional[str] = None
    exchangeRate: Optional[str] = None
    rateSource: str
    valuationTimestamp: str
    updatedAt: Optional[str] = None
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
    Authoritative global platform investment total configured by administration for all investors.
    - Global platform-wide figure configured by authorized administrators.
    - Identical underlying global amount returned to every investor.
    - Never uses individual user investment records or wallet balances.
    - Converted into the investor's selected display currency (USD, EUR, GBP, NGN, USDT, BTC, ETH, SOL).
    - Protects administrative privacy: does not expose internal admin emails or audit notes to investors.
    - Returns an honest unconfigured state if no amount has been configured yet.
    """
    currency_clean = currency.upper().strip()
    if currency_clean not in SUPPORTED_CURRENCIES:
        supported_list = ", ".join(SUPPORTED_CURRENCIES.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported currency '{currency}'. Supported currencies are: {supported_list}",
        )

    rate_info = await get_exchange_rate_info(currency_clean)
    now_iso = datetime.now(timezone.utc).isoformat()
    supported_keys = list(SUPPORTED_CURRENCIES.keys())

    # Query latest platform investment configuration
    stmt = (
        select(PlatformInvestmentConfigurationModel)
        .order_by(PlatformInvestmentConfigurationModel.updated_at.desc())
        .limit(1)
    )
    config = (await db.execute(stmt)).scalars().first()

    if not config:
        # Honest unconfigured state
        return PlatformInvestmentTotalResponse(
            isConfigured=False,
            isAvailable=False,
            baseCurrency="USD",
            baseAmount=None,
            targetCurrency=currency_clean,
            convertedAmount=None,
            formattedDisplay=None,
            exchangeRate=rate_info.get("exchange_rate_str"),
            rateSource=rate_info["source"],
            valuationTimestamp=now_iso,
            updatedAt=None,
            statusMessage="Global platform investment amount has not been configured yet.",
            disclaimer="Platform-wide reported investment figure managed administratively for institutional reporting. Does not alter double-entry ledger balances.",
            supportedCurrencies=supported_keys,
        )

    base_curr = config.currency.upper()
    amount_dec = Decimal(str(config.amount))

    # Convert to USD first if base currency is not USD
    if base_curr == "USD":
        amount_usd = amount_dec
    else:
        base_rate_info = await get_exchange_rate_info(base_curr)
        amount_usd = amount_dec * base_rate_info["unit_price_usd"]

    # Convert from USD to target currency
    if currency_clean == base_curr:
        # If target currency matches configured base currency, display exact amount without conversion drift
        meta = SUPPORTED_CURRENCIES[currency_clean]
        decimals = meta["decimals"]
        symbol = meta["symbol"]
        formatted_num = f"{amount_dec:,.{decimals}f}"
        if meta["category"] == "fiat":
            formatted_display = f"{symbol}{formatted_num} {currency_clean}"
        else:
            formatted_display = f"{formatted_num} {currency_clean}"

        converted_amount = str(amount_dec)
        exchange_rate_str = rate_info.get("exchange_rate_str")
    else:
        converted = convert_and_format_amount(amount_usd, rate_info)
        converted_amount = converted["converted_amount"]
        formatted_display = converted["formatted_display"]
        exchange_rate_str = converted["exchange_rate_str"]

    return PlatformInvestmentTotalResponse(
        isConfigured=True,
        isAvailable=True,
        baseCurrency=base_curr,
        baseAmount=str(amount_dec),
        targetCurrency=currency_clean,
        convertedAmount=converted_amount,
        formattedDisplay=formatted_display,
        exchangeRate=exchange_rate_str,
        rateSource=rate_info["source"],
        valuationTimestamp=now_iso,
        updatedAt=config.updated_at.isoformat() if config.updated_at else None,
        statusMessage="Administrator-managed global platform investment reporting",
        disclaimer="Platform-wide reported investment figure managed administratively for institutional reporting. Does not alter double-entry ledger balances.",
        supportedCurrencies=supported_keys,
    )
