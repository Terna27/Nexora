import { LedgerEntry, ReturnScenarioResult, SupportedAsset, AssetInfo } from './finance';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  message?: string;
}

export interface SystemHealth {
  status: 'ONLINE' | 'DEGRADED' | 'MAINTENANCE';
  version: string;
  cluster: string;
  blockLatencyMs: number;
  activeNodes: number;
  databaseStatus: 'HEALTHY' | 'DISCONNECTED';
  timestamp: string;
}

export interface MarketQuotesResponse {
  assets: Record<SupportedAsset, AssetInfo>;
  systemTimestamp: string;
}

export interface LedgerStreamResponse {
  entries: LedgerEntry[];
  totalRecords: number;
  disclaimer: string;
}
