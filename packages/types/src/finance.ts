export type SupportedAsset = 'BTC' | 'ETH' | 'USDT' | 'SOL';

export interface AssetInfo {
  symbol: SupportedAsset;
  name: string;
  decimals: number;
  iconUrl?: string;
  unitPriceUsd: number;
  dayChangePercent: number;
  liquidityTier: 'TIER_1_INSTITUTIONAL' | 'TIER_2_HIGH' | 'TIER_3_STANDARD';
}

export interface ReturnScenarioInput {
  asset: SupportedAsset;
  principalAmount: number;
  hypotheticalDailyRate?: number; // e.g. 0.03 for 3% illustrative scenario
}

export interface ReturnScenarioResult {
  asset: SupportedAsset;
  principalAmount: number;
  principalUsdValue: number;
  dailyScenarioRate: number; // e.g. 0.03
  dailyScenarioReturn: number; // principal * 0.03
  weeklyScenarioReturn: number; // principal * 0.03 * 7
  monthlyScenarioReturn: number; // principal * 0.03 * 30
  annualizedNonCompoundedRate: number; // 0.03 * 365
  isGuaranteed: false;
  disclaimer: string;
}

export type LedgerEventType =
  | 'ALGORITHMIC_REBALANCE'
  | 'CUSTODY_SWEEP'
  | 'LIQUIDITY_PROVISION'
  | 'FLASH_ARBITRAGE_SETTLEMENT'
  | 'AUDIT_MERKLE_PROOF'
  | 'NETWORK_VALIDATION_EVENT';

export type LedgerStatus = 'VERIFIED' | 'CONFIRMED' | 'SETTLED' | 'PENDING_ATTESTATION';

export interface LedgerEntry {
  id: string;
  timestamp: string; // ISO-8601
  blockNumber: number;
  txHash: string;
  eventType: LedgerEventType;
  asset: SupportedAsset | 'MULTICURRENCY' | 'SYSTEM';
  amount: number;
  amountUsd: number;
  gasPriceGwei: number;
  status: LedgerStatus;
  auditMerkleRoot: string;
  isIllustrative: true;
}

export interface UserAccountBalance {
  accountId: string;
  accountNumber: string;
  asset: string;
  assetName: string;
  accountType: string;
  accountCategory: string;
  settledBalance: string;
  availableBalance: string;
  pendingBalance: string;
  reservedBalance: string;
  functionalUsdBalance: string;
  decimals: number;
}

export interface PortfolioMetrics {
  totalEarningsUsd?: string | null;
  activePrincipalUsd?: string | null;
  accruedDailyYieldUsd?: string | null;
  totalWithdrawnUsd?: string | null;
}

export interface UserPortfolioResponse {
  userId: string;
  hasAccounts: boolean;
  status: 'PROVISIONED' | 'UNPROVISIONED' | 'AWAITING_SUBLEDGER_SYNC';
  totalBalanceUsd: string | null;
  isAvailable: boolean;
  accounts: UserAccountBalance[];
  metrics: PortfolioMetrics;
  unsupportedMetrics: string[];
}

export interface UserTransactionItem {
  id: string;
  transactionRef: string;
  transactionType: string;
  status: 'PENDING' | 'POSTED' | 'SETTLED' | 'VOIDED';
  asset: string;
  amount: string;
  amountUsd: string;
  direction: 'DEBIT' | 'CREDIT';
  description?: string | null;
  postedAt?: string | null;
  settledAt?: string | null;
  createdAt: string;
  isReversal: boolean;
  reversalOfId?: string | null;
}

export interface UserTransactionsListResponse {
  items: UserTransactionItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface UserWithdrawalRequest {
  asset: string;
  amount: number;
  destination: string;
  idempotencyKey: string;
  notes?: string;
}

export interface UserWithdrawalResponse {
  id: string;
  transactionRef: string;
  status: string;
  asset: string;
  amount: string;
  destinationMasked: string;
  reservedBalance: string;
  remainingAvailableBalance: string;
  message: string;
  createdAt: string;
}

export interface AccountReconciliationResponse {
  accountId: string;
  accountNumber: string;
  asset: string;
  materializedBalance: string;
  reconstructedBalance: string;
  variance: string;
  isConsistent: boolean;
  repaired: boolean;
  postedJournalEntriesCount: number;
}

export interface TransactionDoubleEntryAudit {
  transactionId: string;
  transactionRef: string;
  status: string;
  entryCount: number;
  debitEntries: number;
  creditEntries: number;
  totalUsdDebits: string;
  totalUsdCredits: string;
  isUsdBalanced: boolean;
  isNativeBalanced: boolean;
}

export interface UserInvestmentRecord {
  userId: string;
  hasRecord: boolean;
  amount: string | null;
  currency: string | null;
  updatedAt?: string | null;
  disclaimer: string;
}

export interface PlatformInvestmentTotal {
  isConfigured: boolean;
  isAvailable: boolean;
  baseCurrency: string;
  baseAmount: string | null;
  baseAmountUsd?: string | null;
  targetCurrency: string;
  convertedAmount: string | null;
  formattedDisplay: string | null;
  exchangeRate: string | null;
  rateSource: string;
  valuationTimestamp: string;
  updatedAt?: string | null;
  updatedByAdminEmail?: string | null;
  lastReason?: string | null;
  statusMessage: string;
  disclaimer: string;
  supportedCurrencies: string[];
}



