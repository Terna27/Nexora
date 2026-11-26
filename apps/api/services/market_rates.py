"""
Market Rates and Currency Conversion Service for Nexora.
Supports high-precision decimal conversions for fiat (USD, EUR, GBP, NGN)
and institutional crypto assets (USDT, BTC, ETH, SOL).
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone, timedelta
import logging
import urllib.request
import json
from typing import Dict, Any, Optional

logger = logging.getLogger("cryptiq-api.market-rates")

SUPPORTED_CURRENCIES = {
    "USD": {
        "name": "US Dollar",
        "category": "fiat",
        "symbol": "$",
        "decimals": 2,
        "default_rate_to_target": Decimal("1.00000000"),
        "default_unit_price_usd": Decimal("1.00000000"),
    },
    "EUR": {
        "name": "Euro",
        "category": "fiat",
        "symbol": "€",
        "decimals": 2,
        "default_rate_to_target": Decimal("0.91210000"),
        "default_unit_price_usd": Decimal("1.09637101"),
    },
    "GBP": {
        "name": "British Pound",
        "category": "fiat",
        "symbol": "£",
        "decimals": 2,
        "default_rate_to_target": Decimal("0.76340000"),
        "default_unit_price_usd": Decimal("1.30992926"),
    },
    "NGN": {
        "name": "Nigerian Naira",
        "category": "fiat",
        "symbol": "₦",
        "decimals": 2,
        "default_rate_to_target": Decimal("1367.78000000"),
        "default_unit_price_usd": Decimal("0.00073111"),
    },
    "USDT": {
        "name": "Tether USD",
        "category": "stablecoin",
        "symbol": "USDT",
        "decimals": 2,
        "default_rate_to_target": Decimal("1.00000000"),
        "default_unit_price_usd": Decimal("1.00000000"),
    },
    "BTC": {
        "name": "Bitcoin",
        "category": "crypto",
        "symbol": "BTC",
        "decimals": 8,
        "default_rate_to_target": Decimal("1.00000000") / Decimal("96420.50"),
        "default_unit_price_usd": Decimal("96420.50000000"),
    },
    "ETH": {
        "name": "Ethereum",
        "category": "crypto",
        "symbol": "ETH",
        "decimals": 6,
        "default_rate_to_target": Decimal("1.00000000") / Decimal("3680.15"),
        "default_unit_price_usd": Decimal("3680.15000000"),
    },
    "SOL": {
        "name": "Solana",
        "category": "crypto",
        "symbol": "SOL",
        "decimals": 4,
        "default_rate_to_target": Decimal("1.00000000") / Decimal("218.40"),
        "default_unit_price_usd": Decimal("218.40000000"),
    },
}

# In-memory cache for live exchange rates
_rate_cache: Dict[str, Any] = {
    "fiat_rates": {},
    "fiat_fetched_at": None,
}
_CACHE_TTL_SECONDS = 300  # 5 minutes


async def fetch_live_fiat_rates() -> Dict[str, Decimal]:
    """
    Fetch institutional FX rates for USD base currency from live open rate API.
    Falls back gracefully to verified defaults if unreachable.
    """
    now = datetime.now(timezone.utc)
    cached_at = _rate_cache.get("fiat_fetched_at")

    if (
        cached_at
        and (now - cached_at).total_seconds() < _CACHE_TTL_SECONDS
        and _rate_cache.get("fiat_rates")
    ):
        return _rate_cache["fiat_rates"]

    try:
        req = urllib.request.Request(
            "https://open.er-api.com/v6/latest/USD",
            headers={"User-Agent": "Nexora-Institutional-Platform/1.0"},
        )
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            if resp.status == 200:
                body = json.loads(resp.read().decode())
                rates = body.get("rates", {})
                new_rates = {}
                for curr in ["EUR", "GBP", "NGN", "USD"]:
                    if curr in rates:
                        new_rates[curr] = Decimal(str(rates[curr]))
                if new_rates:
                    _rate_cache["fiat_rates"] = new_rates
                    _rate_cache["fiat_fetched_at"] = now
                    logger.info("Successfully refreshed live fiat exchange rates from open.er-api.com")
                    return new_rates
    except Exception as e:
        logger.warning(f"Could not refresh live FX rates, using verified baseline: {e}")

    # Fallback to existing cache or baseline
    if _rate_cache.get("fiat_rates"):
        return _rate_cache["fiat_rates"]

    return {
        "USD": SUPPORTED_CURRENCIES["USD"]["default_rate_to_target"],
        "EUR": SUPPORTED_CURRENCIES["EUR"]["default_rate_to_target"],
        "GBP": SUPPORTED_CURRENCIES["GBP"]["default_rate_to_target"],
        "NGN": SUPPORTED_CURRENCIES["NGN"]["default_rate_to_target"],
    }


async def get_exchange_rate_info(target_currency: str) -> Dict[str, Any]:
    """
    Get conversion parameters and rates for target currency against USD base.
    """
    target = target_currency.upper().strip()
    if target not in SUPPORTED_CURRENCIES:
        raise ValueError(
            f"Unsupported currency '{target}'. Supported currencies are: {', '.join(SUPPORTED_CURRENCIES.keys())}"
        )

    meta = SUPPORTED_CURRENCIES[target]
    category = meta["category"]
    timestamp = datetime.now(timezone.utc).isoformat()

    if category == "fiat":
        fiat_rates = await fetch_live_fiat_rates()
        rate_to_target = fiat_rates.get(target, meta["default_rate_to_target"])
        unit_price_usd = Decimal("1.00000000") / rate_to_target if rate_to_target != Decimal("0") else Decimal("0")
        source = "open.er-api.com (ECB/Central Bank Institutional FX)"
    elif category == "stablecoin":
        rate_to_target = Decimal("1.00000000")
        unit_price_usd = Decimal("1.00000000")
        source = "Nexora Parity Anchor (USDT/USD 1:1 Peg)"
    else:  # crypto
        from routes.quotes import PRICES

        price_data = PRICES.get(target)
        if price_data and "unitPriceUsd" in price_data:
            unit_price_usd = Decimal(str(price_data["unitPriceUsd"]))
        else:
            unit_price_usd = meta["default_unit_price_usd"]

        rate_to_target = Decimal("1.00000000") / unit_price_usd if unit_price_usd != Decimal("0") else Decimal("0")
        source = "Nexora Institutional Market Quotes"

    return {
        "target_currency": target,
        "category": category,
        "name": meta["name"],
        "symbol": meta["symbol"],
        "decimals": meta["decimals"],
        "rate_to_target": rate_to_target,
        "unit_price_usd": unit_price_usd,
        "source": source,
        "timestamp": timestamp,
    }


def convert_and_format_amount(base_amount_usd: Decimal, rate_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converts a USD Decimal amount into the target currency with strict decimal safety and formatting.
    """
    target = rate_info["target_currency"]
    category = rate_info["category"]
    decimals = rate_info["decimals"]
    symbol = rate_info["symbol"]
    rate_to_target = rate_info["rate_to_target"]

    # Calculate converted amount using Decimal arithmetic
    converted_raw = base_amount_usd * rate_to_target

    # Quantize to required precision
    exponent = Decimal("10") ** (-decimals)
    converted_amount = converted_raw.quantize(exponent, rounding=ROUND_HALF_UP)

    # Human-readable formatted string
    if category == "fiat":
        # Formatted with commas and currency symbol prefix
        formatted_num = f"{converted_amount:,.{decimals}f}"
        formatted_display = f"{symbol}{formatted_num} {target}"
    elif category == "stablecoin":
        formatted_num = f"{converted_amount:,.{decimals}f}"
        formatted_display = f"{formatted_num} {target}"
    else:  # crypto
        formatted_num = f"{converted_amount:,.{decimals}f}"
        formatted_display = f"{formatted_num} {target}"

    # Human-readable rate representation
    if category == "crypto":
        exchange_rate_str = f"1 {target} = ${rate_info['unit_price_usd']:,.2f} USD"
    elif target == "USD":
        exchange_rate_str = "1.0000 USD / USD"
    else:
        exchange_rate_str = f"1 USD = {rate_to_target:.4f} {target}"

    return {
        "converted_amount": str(converted_amount),
        "formatted_display": formatted_display,
        "exchange_rate_str": exchange_rate_str,
    }
