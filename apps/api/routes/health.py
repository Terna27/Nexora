from fastapi import APIRouter
from datetime import datetime, timezone
from schemas.finance import HealthResponse
from config import settings

router = APIRouter(tags=["Health & Status"])

@router.get("/health", response_model=dict)
async def get_health():
    return {
        "success": True,
        "data": {
            "status": "ONLINE",
            "version": "1.0.0-phase1",
            "cluster": "node-us-east.cryptiq.internal",
            "blockLatencyMs": 38.4,
            "activeNodes": 128,
            "databaseStatus": "HEALTHY",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": "Cryptiq Algorithmic Engine Operational"
    }
