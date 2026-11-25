export type UserRole = 'investor' | 'admin' | 'auditor';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ForgotPasswordCredentials {
  email: string;
}

export interface ResetPasswordCredentials {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailCredentials {
  token: string;
}

export interface SessionInfo {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface GenericAuthResponse {
  success: boolean;
  message: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
  token?: string;
}

export interface SessionsListResponse {
  success: boolean;
  sessions: SessionInfo[];
}

export interface AdminBootstrapStatusResponse {
  isAvailable: boolean;
  hasAdmin: boolean;
  message: string;
}

export interface AdminBootstrapRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  bootstrapToken: string;
}

