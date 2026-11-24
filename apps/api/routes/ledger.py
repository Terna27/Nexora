from fastapi import APIRouter
from typing import List
from datetime import datetime, timezone
from schemas.finance import LedgerEntrySchema

router = APIRouter(prefix="/ledger", tags=["Audit & Ledger"])

MOCK_LEDGER: List[dict] = [
    {
        "id": "tx_01HK98AXB7Y7Z01",
        "timestamp": "2026-11-24T10:15:22.104Z",
        "blockNumber": 21849102,
        "txHash": "0x8f934c...4a19b2",
        "eventType": "ALGORITHMIC_REBALANCE",
        "asset": "BTC",
        "amount": 14.52,
        "amountUsd": 1400025.66,
        "gasPriceGwei": 18.4,
        "status": "VERIFIED",
        "auditMerkleRoot": "0x7e3c...881f",
        "isIllustrative": True,
    },
    {
        "id": "tx_01HK98AXB7Y7Z02",
        "timestamp": "2026-11-24T10:14:48.330Z",
        "blockNumber": 21849098,
        "txHash": "0x3c21a4...8b40ef",
        "eventType": "LIQUIDITY_PROVISION",
        "asset": "ETH",
        "amount": 180.0,
        "amountUsd": 662427.0,
        "gasPriceGwei": 21.0,
        "status": "CONFIRMED",
        "auditMerkleRoot": "0x99a1...100d",
        "isIllustrative": True,
    },
    {
        "id": "tx_01HK98AXB7Y7Z03",
        "timestamp": "2026-11-24T10:13:12.721Z",
        "blockNumber": 21849091,
        "txHash": "0x55d91e...22cc14",
        "eventType": "FLASH_ARBITRAGE_SETTLEMENT",
        "asset": "SOL",
        "amount": 2500.0,
        "amountUsd": 546000.0,
        "gasPriceGwei": 15.2,
        "status": "SETTLED",
        "auditMerkleRoot": "0x22de...55fa",
        "isIllustrative": True,
    },
    {
        "id": "tx_01HK98AXB7Y7Z04",
        "timestamp": "2026-11-24T10:12:05.419Z",
        "blockNumber": 21849084,
        "txHash": "0x10aeff...9420aa",
        "eventType": "CUSTODY_SWEEP",
        "asset": "USDT",
        "amount": 1250000.0,
        "amountUsd": 1250000.0,
        "gasPriceGwei": 12.8,
        "status": "VERIFIED",
        "auditMerkleRoot": "0x55aa...33bc",
        "isIllustrative": True,
    },
    {
        "id": "tx_01HK98AXB7Y7Z05",
        "timestamp": "2026-11-24T10:10:41.884Z",
        "blockNumber": 21849077,
        "txHash": "0xbb4410...9977c0",
        "eventType": "AUDIT_MERKLE_PROOF",
        "asset": "SYSTEM",
        "amount": 0.0,
        "amountUsd": 0.0,
        "gasPriceGwei": 9.6,
        "status": "VERIFIED",
        "auditMerkleRoot": "0x00f1...beef",
        "isIllustrative": True,
    },
    {
        "id": "tx_01HK98AXB7Y7Z06",
        "timestamp": "2026-11-24T10:09:18.002Z",
        "blockNumber": 21849070,
        "txHash": "0x6e7889...5401dd",
        "eventType": "NETWORK_VALIDATION_EVENT",
        "asset": "BTC",
        "amount": 8.25,
        "amountUsd": 795469.12,
        "gasPriceGwei": 19.1,
        "status": "SETTLED",
        "auditMerkleRoot": "0x12fa...6789",
        "isIllustrative": True,
    },
]

@router.get("/recent", response_model=dict)
async def get_recent_ledger():
    return {
        "success": True,
        "data": MOCK_LEDGER,
        "disclaimer": "ILLUSTRATIVE DATA — NOT LIVE CUSTOMER TRANSACTIONS",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
