from pydantic import BaseModel, Field
from typing import Optional, List
from schemas.finance import UserAccountBalanceSchema

class AdminUserSummarySchema(BaseModel):
    id: str
    fullName: str
    email: str
    role: str
    isActive: bool
    isVerified: bool
    mfaEnabled: bool
    createdAt: str
    updatedAt: str

class AdminUserDetailSchema(AdminUserSummarySchema):
    activeSessionsCount: int
    totalSessionsCount: int
    lastLoginAt: Optional[str] = None

class AdminUserListResponse(BaseModel):
    items: List[AdminUserSummarySchema]
    total: int
    page: int
    pageSize: int
    totalPages: int

class AdminUserAccountsResponse(BaseModel):
    userId: str
    hasAccounts: bool
    totalBalanceUsd: Optional[str] = None
    accounts: List[UserAccountBalanceSchema]

class AdminAuditLogSchema(BaseModel):
    id: str
    adminUserId: Optional[str] = None
    adminEmail: Optional[str] = None
    action: str
    targetEntity: Optional[str] = None
    targetId: Optional[str] = None
    ipAddress: Optional[str] = None
    outcome: str
    details: Optional[str] = None
    reason: Optional[str] = None
    createdAt: str

class AdminAuditLogsListResponse(BaseModel):
    items: List[AdminAuditLogSchema]
    total: int
    page: int
    pageSize: int
    totalPages: int

class AdminOverviewResponse(BaseModel):
    totalUsers: int
    activeUsers: int
    verifiedUsers: int
    investorUsers: int
    adminUsers: int
    totalAccounts: int
    totalTransactions: int
