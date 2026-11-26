import { UserAccountBalance } from './finance';

export interface AdminUserSummary {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  activeSessionsCount: number;
  totalSessionsCount: number;
  lastLoginAt: string | null;
}

export interface AdminUserListResponse {
  items: AdminUserSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminUserAccountsResponse {
  userId: string;
  hasAccounts: boolean;
  totalBalanceUsd: string | null;
  accounts: UserAccountBalance[];
}

export interface AdminAuditLog {
  id: string;
  adminUserId?: string | null;
  adminEmail?: string | null;
  action: string;
  targetEntity?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  outcome: string;
  details?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface AdminAuditLogsListResponse {
  items: AdminAuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminOverviewMetrics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  verifiedUsers: number;
  investorUsers: number;
  adminUsers: number;
  totalAccounts: number;
  totalTransactions: number;
  totalInvestedCapitalUsd: string | null;
  investedCapitalStatusMessage: string;
  totalWithdrawnCapitalUsd: string | null;
  pendingWithdrawalsCount: number;
  completedWithdrawalsCount: number;
  failedWithdrawalsCount: number;
}

export interface AdminUserActionRequest {
  reason: string;
}

export interface AdminUserDeleteRequest {
  confirmEmail: string;
  reason: string;
}

export interface AdminActionResponse {
  success: boolean;
  message: string;
  targetId: string;
}

export interface AdminWithdrawalSummary {
  id: string;
  transactionRef: string;
  userId?: string | null;
  userEmail?: string | null;
  userFullName?: string | null;
  accountId?: string | null;
  accountNumber?: string | null;
  asset: string;
  amount: string;
  amountUsd: string;
  status: string;
  destinationMasked?: string | null;
  createdAt: string;
  settledAt?: string | null;
  rejectionReason?: string | null;
  approvalNotes?: string | null;
  payoutReference?: string | null;
  payoutStatus: string;
}

export interface AdminWithdrawalsListResponse {
  items: AdminWithdrawalSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminWithdrawalActionRequest {
  reason?: string;
  notes?: string;
}

export interface AdminWithdrawalSettleRequest {
  payoutReference: string;
  notes?: string;
}

export interface AdminAccountReconcileRequest {
  autoRepair?: boolean;
}

export interface AdminTransactionItem {
  id: string;
  transactionRef: string;
  transactionType: string;
  status: string;
  initiatorUserId?: string | null;
  initiatorEmail?: string | null;
  asset: string;
  amount: string;
  amountUsd: string;
  direction: string;
  description?: string | null;
  postedAt?: string | null;
  settledAt?: string | null;
  createdAt: string;
  isReversal: boolean;
  reversalOfId?: string | null;
}

export interface AdminTransactionsListResponse {
  items: AdminTransactionItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminInvestmentRecord {
  id?: string | null;
  userId: string;
  hasRecord: boolean;
  amount: string | null;
  currency: string | null;
  updatedByAdminId?: string | null;
  updatedByAdminEmail?: string | null;
  lastReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminInvestmentRecordUpdateRequest {
  amount: number | string;
  currency?: string;
  reason: string;
}

export interface AdminPlatformInvestmentConfig {
  id?: string | null;
  isConfigured: boolean;
  amount: string | null;
  currency: string;
  updatedByAdminId?: string | null;
  updatedByAdminEmail?: string | null;
  lastReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  supportedCurrencies: string[];
}

export interface AdminPlatformInvestmentUpdateRequest {
  amount: number | string;
  currency: string;
  reason: string;
}


