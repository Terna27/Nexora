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
    suspendedUsers: int
    verifiedUsers: int
    investorUsers: int
    adminUsers: int
    totalAccounts: int
    totalTransactions: int
    totalInvestedCapitalUsd: Optional[str] = None
    investedCapitalStatusMessage: str
    totalWithdrawnCapitalUsd: Optional[str] = None
    pendingWithdrawalsCount: int
    completedWithdrawalsCount: int
    failedWithdrawalsCount: int

class AdminUserActionRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)

class AdminUserDeleteRequest(BaseModel):
    confirmEmail: str = Field(..., max_length=255)
    reason: str = Field(..., min_length=5, max_length=500)

class AdminActionResponse(BaseModel):
    success: bool
    message: str
    targetId: str

class AdminWithdrawalSummarySchema(BaseModel):
    id: str
    transactionRef: str
    userId: Optional[str] = None
    userEmail: Optional[str] = None
    userFullName: Optional[str] = None
    accountId: Optional[str] = None
    accountNumber: Optional[str] = None
    asset: str
    amount: str
    amountUsd: str
    status: str
    destinationMasked: Optional[str] = None
    createdAt: str
    settledAt: Optional[str] = None
    rejectionReason: Optional[str] = None
    approvalNotes: Optional[str] = None
    payoutReference: Optional[str] = None
    payoutStatus: str

class AdminWithdrawalsListResponse(BaseModel):
    items: List[AdminWithdrawalSummarySchema]
    total: int
    page: int
    pageSize: int
    totalPages: int

class AdminWithdrawalActionRequest(BaseModel):
    reason: Optional[str] = None
    notes: Optional[str] = None

class AdminWithdrawalSettleRequest(BaseModel):
    payoutReference: str = Field(..., min_length=4, max_length=255, description="Authoritative external payout confirmation (tx hash or wire ref)")
    notes: Optional[str] = Field(None, max_length=500, description="Optional administrative notes")

class AdminAccountReconcileRequest(BaseModel):
    autoRepair: bool = Field(default=False, description="Whether to resynchronize materialized balance if drift is detected")


class AdminTransactionItemSchema(BaseModel):
    id: str
    transactionRef: str
    transactionType: str
    status: str
    initiatorUserId: Optional[str] = None
    initiatorEmail: Optional[str] = None
    asset: str
    amount: str
    amountUsd: str
    direction: str
    description: Optional[str] = None
    postedAt: Optional[str] = None
    settledAt: Optional[str] = None
    createdAt: str
    isReversal: bool
    reversalOfId: Optional[str] = None

class AdminTransactionsListResponse(BaseModel):
    items: List[AdminTransactionItemSchema]
    total: int
    page: int
    pageSize: int
    totalPages: int
