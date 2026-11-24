from fastapi import APIRouter
from datetime import datetime, timezone
from schemas.finance import ReturnScenarioRequest, ReturnScenarioResponse
from routes.quotes import PRICES

router = APIRouter(prefix="/scenarios", tags=["Scenario Models"])

@router.post("/calculate", response_model=dict)
async def calculate_return_scenario(req: ReturnScenarioRequest):
    rate = req.hypotheticalDailyRate if req.hypotheticalDailyRate is not None else 0.03
    principal = max(0.0, req.principalAmount)
    asset_meta = PRICES.get(req.asset, {"unitPriceUsd": 1.0})
    unit_price = asset_meta["unitPriceUsd"]
    principal_usd = principal * unit_price

    # Simple non-compounded illustrative calculations
    daily = principal * rate
    weekly = principal * rate * 7.0
    monthly = principal * rate * 30.0

    return {
        "success": True,
        "data": {
            "asset": req.asset,
            "principalAmount": principal,
            "principalUsdValue": principal_usd,
            "dailyScenarioRate": rate,
            "dailyScenarioReturn": daily,
            "weeklyScenarioReturn": weekly,
            "monthlyScenarioReturn": monthly,
            "annualizedNonCompoundedRate": rate * 365.0,
            "isGuaranteed": False,
            "disclaimer": "ILLUSTRATIVE SCENARIO ONLY. Daily 3% return is a hypothetical modeling parameter and is not guaranteed, expected, or representative of actual performance. Cryptocurrency trading entails substantial risk of loss, including loss of principal."
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
