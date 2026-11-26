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

# ----------------- WITHDRAWAL & RECONCILIATION SCHEMAS -----------------

class UserWithdrawalRequestSchema(BaseModel):
    asset: str = Field(..., description="Asset symbol (e.g. BTC, ETH, USDT)")
    amount: float = Field(..., gt=0.0, description="Strictly positive withdrawal amount")
    destination: str = Field(..., min_length=4, max_length=255, description="Destination crypto address or custodial withdrawal target")
    idempotencyKey: str = Field(..., min_length=8, max_length=128, description="Unique client-supplied idempotency key")
    notes: Optional[str] = Field(None, max_length=500, description="Optional user notes")

class UserWithdrawalResponseSchema(BaseModel):
    id: str
    transactionRef: str
    status: str
    asset: str
    amount: str
    destinationMasked: str
    reservedBalance: str
    remainingAvailableBalance: str
    message: str
    createdAt: str

class AccountReconciliationResponseSchema(BaseModel):
    accountId: str
    accountNumber: str
    asset: str
    materializedBalance: str
    reconstructedBalance: str
    variance: str
    isConsistent: bool
    repaired: bool
    postedJournalEntriesCount: int

class TransactionDoubleEntryAuditSchema(BaseModel):
    transactionId: str
    transactionRef: str
    status: str
    entryCount: int
    debitEntries: int
    creditEntries: int
    totalUsdDebits: str
    totalUsdCredits: str
    isUsdBalanced: bool
    isNativeBalanced: bool


