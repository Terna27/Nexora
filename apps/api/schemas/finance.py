from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict
from datetime import datetime

SupportedAsset = Literal["BTC", "ETH", "USDT", "SOL"]

class AssetInfoSchema(BaseModel):
    symbol: SupportedAsset
    name: str = Field(..., alias="name")
    decimals: int
    unitPriceUsd: float
    dayChangePercent: float
    liquidityTier: str

class ReturnScenarioRequest(BaseModel):
    asset: SupportedAsset
    principalAmount: float = Field(..., ge=0.0, description="Principal cryptocurrency amount")
    hypotheticalDailyRate: Optional[float] = Field(default=0.03, description="Illustrative scenario parameter (3% default)")

class ReturnScenarioResponse(BaseModel):
    asset: SupportedAsset
    principalAmount: float
    principalUsdValue: float
    dailyScenarioRate: float
    dailyScenarioReturn: float
    weeklyScenarioReturn: float
    monthlyScenarioReturn: float
    annualizedNonCompoundedRate: float
    isGuaranteed: bool = False
    disclaimer: str

class LedgerEntrySchema(BaseModel):
    id: str
    timestamp: str
    blockNumber: int
    txHash: str
    eventType: str
    asset: str
    amount: float
    amountUsd: float
    gasPriceGwei: float
    status: str
    auditMerkleRoot: str
    isIllustrative: bool = True

class HealthResponse(BaseModel):
    status: str
    version: str
    cluster: str
    blockLatencyMs: float
    activeNodes: int
    databaseStatus: str
    timestamp: str

# ----------------- USER PORTFOLIO & TRANSACTIONS SCHEMAS -----------------

class UserAccountBalanceSchema(BaseModel):
    accountId: str
    accountNumber: str
    asset: str
    assetName: str
    accountType: str
    accountCategory: str
    settledBalance: str
    availableBalance: str
    pendingBalance: str
    reservedBalance: str
    functionalUsdBalance: str
    decimals: int

class PortfolioMetricsSchema(BaseModel):
    totalEarningsUsd: Optional[str] = None
    activePrincipalUsd: Optional[str] = None
    accruedDailyYieldUsd: Optional[str] = None
    totalWithdrawnUsd: Optional[str] = None

class UserPortfolioResponse(BaseModel):
    userId: str
    hasAccounts: bool
    status: str  # "PROVISIONED", "UNPROVISIONED", "AWAITING_SUBLEDGER_SYNC"
    totalBalanceUsd: Optional[str] = None
    isAvailable: bool
    accounts: List[UserAccountBalanceSchema]
    metrics: PortfolioMetricsSchema
    unsupportedMetrics: List[str]

class UserTransactionItemSchema(BaseModel):
    id: str
    transactionRef: str
    transactionType: str
    status: str
    asset: str
    amount: str
    amountUsd: str
    direction: str
    description: Optional[str] = None
    postedAt: Optional[str] = None
    settledAt: Optional[str] = None
    createdAt: str
    isReversal: bool = False
    reversalOfId: Optional[str] = None

class UserTransactionsListResponse(BaseModel):
    items: List[UserTransactionItemSchema]
    total: int
    page: int
    pageSize: int
    pages: int

