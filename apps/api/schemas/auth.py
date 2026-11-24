from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel
from typing import Optional, List, Any
from datetime import datetime

class CryptiqAuthBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        serialize_by_alias=True
    )

class RegisterRequest(CryptiqAuthBase):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=10, max_length=128)
    confirm_password: str = Field(..., min_length=10, max_length=128)
    terms_accepted: bool = Field(..., alias="termsAccepted")

    @field_validator("terms_accepted", mode="before")
    @classmethod
    def validate_terms(cls, v: Any, info) -> bool:
        return bool(v)

    def __init__(self, **data):
        # Allow acceptTerms as alternative alias
        if "acceptTerms" in data and "termsAccepted" not in data:
            data["termsAccepted"] = data["acceptTerms"]
        elif "accept_terms" in data and "terms_accepted" not in data:
            data["terms_accepted"] = data["accept_terms"]
        super().__init__(**data)

class LoginRequest(CryptiqAuthBase):
    email: str = Field(..., max_length=255)
    password: str = Field(..., max_length=128)
    remember_me: bool = Field(default=False)

class UserResponse(CryptiqAuthBase):
    id: str
    full_name: str
    email: str
    role: str
    is_verified: bool
    created_at: datetime

class GenericAuthResponse(CryptiqAuthBase):
    success: bool
    message: str

class LoginResponse(CryptiqAuthBase):
    success: bool
    message: str
    user: UserResponse

class VerifyEmailRequest(CryptiqAuthBase):
    token: str = Field(..., min_length=16, max_length=128)

class ResendVerificationRequest(CryptiqAuthBase):
    email: str = Field(..., max_length=255)

class ForgotPasswordRequest(CryptiqAuthBase):
    email: str = Field(..., max_length=255)

class ResetPasswordRequest(CryptiqAuthBase):
    token: str = Field(..., min_length=16, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

class SessionInfo(CryptiqAuthBase):
    id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_current: bool = False

class SessionsListResponse(CryptiqAuthBase):
    success: bool
    sessions: List[SessionInfo]
