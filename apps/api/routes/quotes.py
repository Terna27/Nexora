from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(prefix="/market", tags=["Market Data"])

PRICES = {
    "BTC": {
        "symbol": "BTC",
        "name": "Bitcoin",
        "decimals": 8,
        "unitPriceUsd": 96420.50,
        "dayChangePercent": 3.42,
        "liquidityTier": "TIER_1_INSTITUTIONAL"
    },
    "ETH": {
        "symbol": "ETH",
        "name": "Ethereum",
        "decimals": 18,
        "unitPriceUsd": 3680.15,
        "dayChangePercent": 4.81,
        "liquidityTier": "TIER_1_INSTITUTIONAL"
    },
    "USDT": {
        "symbol": "USDT",
        "name": "Tether USD",
        "decimals": 6,
        "unitPriceUsd": 1.00,
        "dayChangePercent": 0.01,
        "liquidityTier": "TIER_1_INSTITUTIONAL"
    },
    "SOL": {
        "symbol": "SOL",
        "name": "Solana",
        "decimals": 9,
        "unitPriceUsd": 218.40,
        "dayChangePercent": 7.15,
        "liquidityTier": "TIER_2_HIGH"
    }
}

@router.get("/quotes", response_model=dict)
async def get_market_quotes():
    return {
        "success": True,
        "data": PRICES,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
