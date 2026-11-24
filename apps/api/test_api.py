import pytest
from httpx import ASGITransport, AsyncClient
from main import app

@pytest.mark.asyncio
async def test_root():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ONLINE"
        assert "Cryptiq" in data["name"]

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["status"] == "ONLINE"
        assert body["data"]["activeNodes"] > 0

@pytest.mark.asyncio
async def test_ledger_recent():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/ledger/recent")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        # Ensure illustrative notice is explicit
        assert "ILLUSTRATIVE DATA" in body["disclaimer"]
        entries = body["data"]
        assert len(entries) > 0
        for entry in entries:
            assert entry["isIllustrative"] is True
            assert "txHash" in entry
            assert "blockNumber" in entry

@pytest.mark.asyncio
async def test_market_quotes():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/market/quotes")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        quotes = body["data"]
        for symbol in ["BTC", "ETH", "USDT", "SOL"]:
            assert symbol in quotes
            assert quotes[symbol]["unitPriceUsd"] > 0

@pytest.mark.asyncio
async def test_scenario_calculation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "asset": "BTC",
            "principalAmount": 2.0,
            "hypotheticalDailyRate": 0.03
        }
        res = await client.post("/api/v1/scenarios/calculate", json=payload)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        data = body["data"]

        # Verify mathematical non-compounded scenario formulas:
        # daily = 2.0 * 0.03 = 0.06
        # weekly = 2.0 * 0.03 * 7 = 0.42
        # monthly = 2.0 * 0.03 * 30 = 1.80
        assert data["dailyScenarioReturn"] == pytest.approx(0.06, rel=1e-5)
        assert data["weeklyScenarioReturn"] == pytest.approx(0.42, rel=1e-5)
        assert data["monthlyScenarioReturn"] == pytest.approx(1.80, rel=1e-5)
        assert data["isGuaranteed"] is False
        assert "ILLUSTRATIVE SCENARIO ONLY" in data["disclaimer"]

@pytest.mark.asyncio
async def test_scenario_validation_error():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Invalid asset
        res = await client.post("/api/v1/scenarios/calculate", json={"asset": "INVALID", "principalAmount": 1.0})
        assert res.status_code == 422
