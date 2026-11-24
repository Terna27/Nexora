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
