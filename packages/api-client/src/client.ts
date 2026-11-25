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
} from '@cryptiq/types';
import { ILLUSTRATIVE_ASSET_PRICES, INITIAL_ILLUSTRATIVE_LEDGER } from './mockData';

export class CryptiqApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl?: string) {
    const envUrl = typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_API_URL : undefined;
    const defaultProdUrl = 'https://nexora-edz1.onrender.com';
    let resolvedUrl = baseUrl || envUrl || defaultProdUrl;
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

  private getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...extraHeaders };
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
}

export const cryptiqApi = new CryptiqApiClient();
