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
  verifiedUsers: number;
  investorUsers: number;
  adminUsers: number;
  totalAccounts: number;
  totalTransactions: number;
}
