import {
  ApiResponse,
  AssetInfo,
  LedgerEntry,
  ReturnScenarioInput,
  ReturnScenarioResult,
  SupportedAsset,
  SystemHealth,
  User,
  RegisterCredentials,
  LoginCredentials,
  ResetPasswordCredentials,
  SessionInfo,
  GenericAuthResponse,
  LoginResponse,
  SessionsListResponse,
  UserPortfolioResponse,
  UserTransactionsListResponse,
  AdminUserSummary,
  AdminUserDetail,
  AdminUserListResponse,
  AdminUserAccountsResponse,
  AdminAuditLog,
  AdminAuditLogsListResponse,
  AdminOverviewMetrics,
  AdminBootstrapStatusResponse,
  AdminBootstrapRequest,
  AdminActionResponse,
  AdminWithdrawalSummary,
  AdminWithdrawalsListResponse,
  AdminTransactionItem,
  AdminTransactionsListResponse,
  AdminWithdrawalSettleRequest,
  AdminAccountReconcileRequest,
  UserWithdrawalRequest,
  UserWithdrawalResponse,
  AccountReconciliationResponse,
  TransactionDoubleEntryAudit,
  AdminInvestmentRecord,
  AdminInvestmentRecordUpdateRequest,
  UserInvestmentRecord,
} from '@cryptiq/types';
import { ILLUSTRATIVE_ASSET_PRICES, INITIAL_ILLUSTRATIVE_LEDGER } from './mockData';

export class CryptiqApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl?: string) {
    const envUrl = typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_API_URL : undefined;
    const defaultProdUrl = 'https://nexora-edz1.onrender.com';
    let resolvedUrl = baseUrl || envUrl || defaultProdUrl;
    if (typeof window !== 'undefined') {
      try {
        const override = localStorage.getItem('nexora_api_url');
        if (override) {
          resolvedUrl = override;
        }
      } catch {}
    }
    if (resolvedUrl.endsWith('/')) {
      resolvedUrl = resolvedUrl.slice(0, -1);
    }
    this.baseUrl = resolvedUrl;

    if (typeof window !== 'undefined') {
      try {
        this.token = localStorage.getItem('nexora_token');
      } catch {
        this.token = null;
      }
    }
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nexora_api_url', this.baseUrl);
      } catch {}
    }
  }

  private getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...extraHeaders };
    if (!this.token && typeof window !== 'undefined') {
      try {
        this.token = localStorage.getItem('nexora_token');
      } catch {}
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Health check with graceful local fallback
   */
  async getHealth(): Promise<ApiResponse<SystemHealth>> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return {
        success: true,
        data: {
          status: 'ONLINE',
          version: '1.0.0-phase1',
          cluster: 'node-us-east.cryptiq.internal',
          blockLatencyMs: 42,
          activeNodes: 128,
          databaseStatus: 'HEALTHY',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        message: 'Operating in client-orchestrated mode with fallback metrics.',
      };
    }
  }

  /**
   * Return scenario calculations following strict compliance:
   * Non-compounded, hypothetical daily rate = 3% (0.03)
   * Daily = P * 0.03
   * Weekly = P * 0.03 * 7
   * Monthly = P * 0.03 * 30
   */
  calculateScenario(input: ReturnScenarioInput): ReturnScenarioResult {
    const rate = input.hypotheticalDailyRate ?? 0.03;
    const principal = Math.max(0, input.principalAmount);
    const assetMeta = ILLUSTRATIVE_ASSET_PRICES[input.asset];
    const unitPrice = assetMeta?.unitPriceUsd ?? 1.0;
    const principalUsdValue = principal * unitPrice;

    const dailyScenarioReturn = principal * rate;
    const weeklyScenarioReturn = principal * rate * 7;
    const monthlyScenarioReturn = principal * rate * 30;

    return {
      asset: input.asset,
      principalAmount: principal,
      principalUsdValue,
      dailyScenarioRate: rate,
      dailyScenarioReturn,
      weeklyScenarioReturn,
      monthlyScenarioReturn,
      annualizedNonCompoundedRate: rate * 365,
      isGuaranteed: false,
      disclaimer:
        'ILLUSTRATIVE SCENARIO ONLY. Daily 3% return is a hypothetical modeling parameter and is not guaranteed, expected, or representative of actual performance. Cryptocurrency trading entails substantial risk of loss, including loss of principal.',
    };
  }

  /**
   * Fetch live ledger records (Illustrative sample stream)
   */
  async getLedgerEntries(): Promise<LedgerEntry[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/ledger/recent`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      return body.data;
    } catch {
      return INITIAL_ILLUSTRATIVE_LEDGER;
    }
  }

  /**
   * Fetch current asset quotes
   */
  async getAssetQuotes(): Promise<Record<SupportedAsset, AssetInfo>> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/market/quotes`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      return body.data;
    } catch {
      return ILLUSTRATIVE_ASSET_PRICES;
    }
  }

  // ==========================================
  // AUTHENTICATION & IDENTITY CLIENT METHODS
  // ==========================================

  /**
   * Register a new user account (public role: investor)
   */
  async register(credentials: RegisterCredentials): Promise<GenericAuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail) ? data.detail[0]?.msg : 'Registration failed';
      throw new Error(err || 'Registration failed');
    }
    return data;
  }

  /**
   * Login with email and password, establishing server HttpOnly cookie session
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });
    const data: LoginResponse = await res.json();
    if (!res.ok) {
      const err = typeof (data as any).detail === 'string' ? (data as any).detail : 'Invalid email or password';
      throw new Error(err || 'Invalid email or password');
    }
    if (data.token) {
      this.token = data.token;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('nexora_token', data.token);
        } catch {}
      }
    }
    return data;
  }

  /**
   * Terminate active server session and clear HttpOnly cookie
   */
  async logout(): Promise<GenericAuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    this.token = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nexora_token');
      } catch {}
    }
    const data = await res.json();
    return data;
  }

  /**
   * Check whether initial administrator bootstrap is available
   */
  async getBootstrapStatus(): Promise<AdminBootstrapStatusResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/bootstrap/status`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        return { isAvailable: false, hasAdmin: true, message: 'Status check returned an error' };
      }
      return await res.json();
    } catch {
      return { isAvailable: false, hasAdmin: true, message: 'Status check failed' };
    }
  }

  /**
   * One-time first administrator setup
   */
  async bootstrapAdmin(data: AdminBootstrapRequest): Promise<LoginResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const result: LoginResponse = await res.json();
    if (!res.ok) {
      const err = typeof (result as any).detail === 'string' ? (result as any).detail : 'Bootstrap failed';
      throw new Error(err || 'Bootstrap failed');
    }
    if (result.token) {
      this.token = result.token;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('nexora_token', result.token);
        } catch {}
      }
    }
    return result;
  }

  /**
   * Fetch currently authenticated user profile
   */
  async getMe(): Promise<User | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/me`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Verify email address using one-time token
   */
  async verifyEmail(token: string): Promise<GenericAuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Email verification failed or token expired');
    }
    return data;
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<GenericAuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return data;
  }

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<GenericAuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return data;
  }

  /**
   * Complete password reset with token
   */
  async resetPassword(data: ResetPasswordCredentials): Promise<GenericAuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.detail || 'Password reset failed or token expired');
    }
    return body;
  }

  /**
   * List all active sessions for current user
   */
  async getSessions(): Promise<SessionInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/sessions`, {
      cache: 'no-store',
      credentials: 'include',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) return [];
    const data: SessionsListResponse = await res.json();
    return data.sessions || [];
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<GenericAuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to revoke session');
    }
    return data;
  }

  /**
   * Fetch authoritative personal portfolio for the authenticated user
   */
  async getUserPortfolio(): Promise<UserPortfolioResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/portfolio/me`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Fetch authoritative personal transaction history for the authenticated user
   */
  async getUserTransactions(params?: {
    page?: number;
    pageSize?: number;
    transactionType?: string;
    status?: string;
    asset?: string;
  }): Promise<UserTransactionsListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('page_size', params.pageSize.toString());
    if (params?.transactionType) query.set('transaction_type', params.transactionType);
    if (params?.status) query.set('status', params.status);
    if (params?.asset) query.set('asset', params.asset);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/transactions/me${queryString}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return { items: [], total: 0, page: 1, pageSize: 20, pages: 0 };
      return await res.json();
    } catch {
      return { items: [], total: 0, page: 1, pageSize: 20, pages: 0 };
    }
  }

  /**
   * Admin: Get authoritative platform overview counts
   */
  async getAdminOverview(): Promise<AdminOverviewMetrics | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/overview`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Admin: List users with search, status filtering, and pagination
   */
  async getAdminUsers(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
    isVerified?: boolean;
    role?: string;
  }): Promise<AdminUserListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('page_size', params.pageSize.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.isActive !== undefined) query.set('is_active', params.isActive.toString());
    if (params?.isVerified !== undefined) query.set('is_verified', params.isVerified.toString());
    if (params?.role) query.set('role', params.role);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/users${queryString}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      return await res.json();
    } catch {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }
  }

  /**
   * Admin: Get detailed user profile and session summary
   */
  async getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/users/${userId}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Admin: Read-only inspection of target user's financial accounts & authoritative balances
   */
  async getAdminUserAccounts(userId: string): Promise<AdminUserAccountsResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/users/${userId}/accounts`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Admin: Read-only inspection of target user's financial transaction history
   */
  async getAdminUserTransactions(
    userId: string,
    params?: {
      page?: number;
      pageSize?: number;
      transactionType?: string;
      status?: string;
      asset?: string;
    }
  ): Promise<UserTransactionsListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('page_size', params.pageSize.toString());
    if (params?.transactionType) query.set('transaction_type', params.transactionType);
    if (params?.status) query.set('status', params.status);
    if (params?.asset) query.set('asset', params.asset);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/users/${userId}/transactions${queryString}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return { items: [], total: 0, page: 1, pageSize: 20, pages: 0 };
      return await res.json();
    } catch {
      return { items: [], total: 0, page: 1, pageSize: 20, pages: 0 };
    }
  }

  /**
   * Admin: Inspect durable administrative audit logs
   */
  async getAdminAuditLogs(params?: {
    page?: number;
    pageSize?: number;
    action?: string;
    adminUserId?: string;
    targetId?: string;
  }): Promise<AdminAuditLogsListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('page_size', params.pageSize.toString());
    if (params?.action) query.set('action', params.action);
    if (params?.adminUserId) query.set('admin_user_id', params.adminUserId);
    if (params?.targetId) query.set('target_id', params.targetId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/audit-logs${queryString}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      return await res.json();
    } catch {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }
  }

  /**
   * Admin: Suspend user account and invalidate active sessions
   */
  async suspendUser(userId: string, reason: string): Promise<AdminActionResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to suspend user account');
    }
    return data;
  }

  /**
   * Admin: Reactivate a previously suspended user account
   */
  async reactivateUser(userId: string, reason: string): Promise<AdminActionResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/admin/users/${userId}/reactivate`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to reactivate user account');
    }
    return data;
  }

  /**
   * Admin: Safely remove account via deactivation and PII anonymization
   */
  async anonymizeDeleteUser(userId: string, confirmEmail: string, reason: string): Promise<AdminActionResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/admin/users/${userId}/anonymize-delete`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ confirmEmail, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to remove and anonymize user account');
    }
    return data;
  }

  /**
   * Admin: List platform withdrawal requests
   */
  async getAdminWithdrawals(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }): Promise<AdminWithdrawalsListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('page_size', params.pageSize.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/withdrawals${queryString}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      return await res.json();
    } catch {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }
  }

  /**
   * Admin: Inspect a specific withdrawal request
   */
  async getAdminWithdrawalDetail(withdrawalId: string): Promise<AdminWithdrawalSummary | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/withdrawals/${withdrawalId}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Admin: Review and approve a pending withdrawal request
   */
  async approveWithdrawal(withdrawalId: string, notes?: string): Promise<AdminActionResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/admin/withdrawals/${withdrawalId}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to approve withdrawal request');
    }
    return data;
  }

  /**
   * Admin: Review and reject a pending withdrawal request with required reason
   */
  async rejectWithdrawal(withdrawalId: string, reason: string): Promise<AdminActionResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/admin/withdrawals/${withdrawalId}/reject`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to reject withdrawal request');
    }
    return data;
  }

  /**
   * Admin: List platform financial transactions across all accounts
   */
  async getAdminTransactions(params?: {
    page?: number;
    pageSize?: number;
    transactionType?: string;
    status?: string;
    asset?: string;
    search?: string;
  }): Promise<AdminTransactionsListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('page_size', params.pageSize.toString());
    if (params?.transactionType) query.set('transaction_type', params.transactionType);
    if (params?.status) query.set('status', params.status);
    if (params?.asset) query.set('asset', params.asset);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/transactions${queryString}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      return await res.json();
    } catch {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }
  }

  /**
   * User: Submit a withdrawal request
   */
  async requestWithdrawal(data: UserWithdrawalRequest): Promise<UserWithdrawalResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/transactions/withdraw`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.detail || 'Withdrawal request failed');
    }
    return result;
  }

  /**
   * Audit double-entry integrity for a financial transaction
   */
  async auditTransactionDoubleEntry(transactionId: string): Promise<TransactionDoubleEntryAudit> {
    const res = await fetch(`${this.baseUrl}/api/v1/transactions/${transactionId}/audit-double-entry`, {
      cache: 'no-store',
      credentials: 'include',
      headers: this.getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.detail || 'Transaction audit failed');
    }
    return result;
  }

  /**
   * Admin: Authoritatively settle an approved withdrawal upon confirmed external payout
   */
  async settleWithdrawal(withdrawalId: string, data: AdminWithdrawalSettleRequest): Promise<AdminActionResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/admin/withdrawals/${withdrawalId}/settle`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.detail || 'Failed to settle withdrawal');
    }
    return result;
  }

  /**
   * Admin: Reconcile account balance against ledger reconstruction
   */
  async reconcileAccount(accountId: string, autoRepair: boolean = false): Promise<AccountReconciliationResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/admin/accounts/${accountId}/reconcile`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ autoRepair }),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.detail || 'Account reconciliation failed');
    }
    return result;
  }

  /**
   * Admin: Get user investment record
   */
  async getAdminUserInvestmentRecord(userId: string): Promise<AdminInvestmentRecord | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/users/${userId}/investment-record`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Admin: Create or update user investment record
   */
  async updateAdminUserInvestmentRecord(
    userId: string,
    data: AdminInvestmentRecordUpdateRequest
  ): Promise<AdminInvestmentRecord> {
    const res = await fetch(`${this.baseUrl}/api/v1/admin/users/${userId}/investment-record`, {
      method: 'PUT',
      credentials: 'include',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Failed to update investment record.' }));
      const msg = typeof errorData.detail === 'string'
        ? errorData.detail
        : (Array.isArray(errorData.detail) ? errorData.detail.map((d: any) => d.msg).join(', ') : 'Failed to update investment record.');
      throw new Error(msg);
    }
    return await res.json();
  }

  /**
   * Investor: Get authenticated investor's own investment record
   */
  async getUserInvestmentRecord(): Promise<UserInvestmentRecord | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/users/me/investment-record`, {
        cache: 'no-store',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  }
}

export const cryptiqApi = new CryptiqApiClient();
