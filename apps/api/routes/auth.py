import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from database import get_db
from config import settings
from models.user import (
    UserModel,
    UserSessionModel,
    EmailVerificationTokenModel,
    PasswordResetTokenModel,
    AuthAuditEventModel,
    AdminAuditLogModel,
)
from schemas.auth import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    UserResponse,
    GenericAuthResponse,
    VerifyEmailRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SessionsListResponse,
    SessionInfo,
)
from security import (
    hash_password,
    verify_password,
    hash_token,
    generate_secure_token,
    normalize_and_validate_email,
    validate_password_strength,
)
from services.email import email_service

logger = logging.getLogger("cryptiq-auth")
router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])

# In-memory sliding window rate limiter for security endpoints
_rate_limit_cache: dict[str, list[datetime]] = {}

def check_rate_limit(key: str, max_attempts: int, window_seconds: int):
    now = datetime.now(timezone.utc)
    attempts = _rate_limit_cache.get(key, [])
    # Filter attempts within window
    cutoff = now - timedelta(seconds=window_seconds)
    valid_attempts = [t for t in attempts if t > cutoff]
    if len(valid_attempts) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please wait a few minutes before trying again."
        )
    valid_attempts.append(now)
    _rate_limit_cache[key] = valid_attempts

async def record_audit_event(
    db: AsyncSession,
    user_id: Optional[str],
    event_type: str,
    ip_address: Optional[str],
    details: Optional[str] = None
):
    try:
        event = AuthAuditEventModel(
            user_id=user_id,
            event_type=event_type,
            ip_address=ip_address,
            details=details,
        )
        db.add(event)
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to record auth audit event: {e}")

async def get_current_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
    cryptiq_session: Optional[str] = Cookie(None)
) -> UserSessionModel:
    raw_token = (
        request.cookies.get(settings.SESSION_COOKIE_NAME)
        or request.cookies.get("nexora_session")
        or request.cookies.get("cryptiq_session")
        or cryptiq_session
    )
    if not raw_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            raw_token = auth_header.split(" ", 1)[1]

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required."
        )

    token_hash = hash_token(raw_token)
    stmt = select(UserSessionModel).where(
        UserSessionModel.session_token_hash == token_hash,
        UserSessionModel.revoked_at.is_(None)
    )
    result = await db.execute(stmt)
    session = result.scalars().first()

    now = datetime.now(timezone.utc)
    if not session or session.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid."
        )
    return session

async def get_current_user(
    session: UserSessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db)
) -> UserModel:
    stmt = select(UserModel).where(UserModel.id == session.user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found."
        )
    return user

def require_role(allowed_roles: List[str]):
    async def role_checker(user: UserModel = Depends(get_current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this action."
            )
        return user
    return role_checker

async def record_admin_audit_event(
    db: AsyncSession,
    admin_user_id: Optional[str],
    action: str,
    target_entity: Optional[str] = None,
    target_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    outcome: str = "SUCCESS",
    details: Optional[str] = None,
    reason: Optional[str] = None,
):
    """Durable admin audit logger with strictly safe fields (no credentials/tokens)."""
    try:
        event = AdminAuditLogModel(
            admin_user_id=admin_user_id,
            action=action,
            target_entity=target_entity,
            target_id=target_id,
            ip_address=ip_address,
            outcome=outcome,
            details=details,
            reason=reason,
        )
        db.add(event)
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to record admin audit event: {e}")

async def require_admin(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(get_current_user),
) -> UserModel:
    """
    Server-side administrative authorization dependency.
    - Rejects unauthenticated requests with 401 via get_current_user.
    - Evaluates verified database user role; rejects non-admins with 403.
    - Logs unauthorized attempts to the durable admin audit log.
    - Role from client-side cookies, query parameters, or payload is strictly ignored.
    """
    if user.role != "admin":
        ip = request.client.host if request.client else "unknown"
        await record_admin_audit_event(
            db=db,
            admin_user_id=user.id,
            action="ADMIN_UNAUTHORIZED_ACCESS_ATTEMPT",
            target_entity="admin_portal",
            target_id=None,
            ip_address=ip,
            outcome="FORBIDDEN",
            details=f"User {user.email} with role '{user.role}' attempted unauthorized admin access",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required."
        )
    return user


# ----------------- ENDPOINTS -----------------

@router.post("/register", response_model=GenericAuthResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"reg_{ip}", max_attempts=10, window_seconds=300)

    if not req.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acceptance of terms and privacy policy is required."
        )

    if req.password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    is_strong, err_msg = validate_password_strength(req.password)
    if not is_strong:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    try:
        normalized_email = normalize_and_validate_email(req.email)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Account enumeration defense: Check existing email
    stmt = select(UserModel).where(UserModel.email == normalized_email)
    result = await db.execute(stmt)
    existing_user = result.scalars().first()

    if existing_user:
        # Generic response preventing enumeration
        await record_audit_event(db, existing_user.id, "REGISTRATION_DUPLICATE_ATTEMPT", ip)
        return GenericAuthResponse(
            success=True,
            message="Registration received. If the email is eligible, a verification email has been dispatched."
        )

    # Hash password with Argon2id
    pwd_hash = hash_password(req.password)

    # Public registration strictly assigns role='investor'
    new_user = UserModel(
        full_name=req.full_name.strip(),
        email=normalized_email,
        password_hash=pwd_hash,
        role="investor",
        is_active=True,
        is_verified=False,
    )
    db.add(new_user)
    await db.flush()

    # Create verification token
    raw_token, token_hash = generate_secure_token()
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS)

    verif_token = EmailVerificationTokenModel(
        user_id=new_user.id,
        token_hash=token_hash,
        expires_at=expires,
    )
    db.add(verif_token)
    await db.commit()

    # Dispatches email via configured service
    await email_service.send_verification_email(normalized_email, raw_token)
    await record_audit_event(db, new_user.id, "REGISTRATION_SUCCESS", ip)

    return GenericAuthResponse(
        success=True,
        message="Account created successfully. Please check your email to verify your address."
    )

@router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    try:
        normalized_email = normalize_and_validate_email(req.email)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    check_rate_limit(f"login_{ip}", max_attempts=15, window_seconds=300)
    check_rate_limit(f"login_email_{normalized_email}", max_attempts=8, window_seconds=300)

    stmt = select(UserModel).where(UserModel.email == normalized_email)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not verify_password(req.password, user.password_hash):
        await record_audit_event(db, user.id if user else None, "LOGIN_FAILURE", ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended or deactivated."
        )

    # Session creation
    raw_session_token, token_hash = generate_secure_token()
    now = datetime.now(timezone.utc)
    duration_hours = settings.SESSION_EXPIRE_HOURS if req.remember_me else 24
    expires_at = now + timedelta(hours=duration_hours)

    user_agent = request.headers.get("User-Agent", "Unknown")[:255]
    session = UserSessionModel(
        user_id=user.id,
        session_token_hash=token_hash,
        ip_address=ip,
        user_agent=user_agent,
        expires_at=expires_at,
    )
    db.add(session)
    await db.commit()

    # Set secure HttpOnly cookie
    max_age = int(timedelta(hours=duration_hours).total_seconds())
    is_prod = settings.ENVIRONMENT == "production" or settings.SECURE_COOKIES
    cookie_samesite = "none" if is_prod else settings.COOKIE_SAME_SITE
    cookie_secure = True if is_prod else settings.SECURE_COOKIES

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_session_token,
        max_age=max_age,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        path="/",
    )
    if settings.SESSION_COOKIE_NAME != "nexora_session":
        response.set_cookie(
            key="nexora_session",
            value=raw_session_token,
            max_age=max_age,
            httponly=True,
            secure=cookie_secure,
            samesite=cookie_samesite,
            path="/",
        )

    await record_audit_event(db, user.id, "LOGIN_SUCCESS", ip)

    return LoginResponse(
        success=True,
        message="Login successful.",
        user=UserResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            is_verified=user.is_verified,
            created_at=user.created_at,
        ),
        token=raw_session_token,
    )

@router.post("/logout", response_model=GenericAuthResponse)
async def logout(
    response: Response,
    session: UserSessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db)
):
    session.revoked_at = datetime.now(timezone.utc)
    await db.commit()

    is_prod = settings.ENVIRONMENT == "production" or settings.SECURE_COOKIES
    cookie_samesite = "none" if is_prod else settings.COOKIE_SAME_SITE
    cookie_secure = True if is_prod else settings.SECURE_COOKIES

    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite=cookie_samesite,
        secure=cookie_secure,
    )
    if settings.SESSION_COOKIE_NAME != "nexora_session":
        response.delete_cookie(
            key="nexora_session",
            path="/",
            httponly=True,
            samesite=cookie_samesite,
            secure=cookie_secure,
        )

    return GenericAuthResponse(success=True, message="Logged out successfully.")

@router.get("/me", response_model=UserResponse)
async def get_me(user: UserModel = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_verified=user.is_verified,
        created_at=user.created_at,
    )

@router.post("/verify-email", response_model=GenericAuthResponse)
async def verify_email(req: VerifyEmailRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    token_hash = hash_token(req.token.strip())

    stmt = select(EmailVerificationTokenModel).where(
        EmailVerificationTokenModel.token_hash == token_hash
    )
    result = await db.execute(stmt)
    token_model = result.scalars().first()

    now = datetime.now(timezone.utc)
    if not token_model or token_model.used_at is not None or token_model.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link is invalid or has expired."
        )

    token_model.used_at = now

    user_stmt = select(UserModel).where(UserModel.id == token_model.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalars().first()

    if user:
        user.is_verified = True
        await record_audit_event(db, user.id, "EMAIL_VERIFICATION_SUCCESS", ip)

    await db.commit()
    return GenericAuthResponse(success=True, message="Email address verified successfully.")

@router.post("/resend-verification", response_model=GenericAuthResponse)
async def resend_verification(req: ResendVerificationRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    try:
        normalized_email = normalize_and_validate_email(req.email)
    except ValueError:
        return GenericAuthResponse(
            success=True,
            message="If an unverified account exists, a new verification link has been sent."
        )

    check_rate_limit(f"resend_{normalized_email}", max_attempts=5, window_seconds=600)

    stmt = select(UserModel).where(UserModel.email == normalized_email)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if user and not user.is_verified:
        raw_token, token_hash = generate_secure_token()
        now = datetime.now(timezone.utc)
        expires = now + timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS)

        verif_token = EmailVerificationTokenModel(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires,
        )
        db.add(verif_token)
        await db.commit()
        await email_service.send_verification_email(user.email, raw_token)

    return GenericAuthResponse(
        success=True,
        message="If an unverified account exists, a new verification link has been sent."
    )

@router.post("/forgot-password", response_model=GenericAuthResponse)
async def forgot_password(req: ForgotPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    try:
        normalized_email = normalize_and_validate_email(req.email)
    except ValueError:
        return GenericAuthResponse(
            success=True,
            message="If an account matches that email, a password reset link has been dispatched."
        )

    check_rate_limit(f"pwd_reset_{ip}", max_attempts=10, window_seconds=300)
    check_rate_limit(f"pwd_reset_email_{normalized_email}", max_attempts=5, window_seconds=300)

    stmt = select(UserModel).where(UserModel.email == normalized_email)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if user and user.is_active:
        raw_token, token_hash = generate_secure_token()
        now = datetime.now(timezone.utc)
        expires = now + timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS)

        reset_token = PasswordResetTokenModel(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires,
        )
        db.add(reset_token)
        await db.commit()
        await email_service.send_password_reset_email(user.email, raw_token)
        await record_audit_event(db, user.id, "PASSWORD_RESET_REQUESTED", ip)

    # Generic response prevents account enumeration
    return GenericAuthResponse(
        success=True,
        message="If an account matches that email, a password reset link has been dispatched."
    )

@router.post("/reset-password", response_model=GenericAuthResponse)
async def reset_password(req: ResetPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    if req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    is_strong, err_msg = validate_password_strength(req.new_password)
    if not is_strong:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    token_hash = hash_token(req.token.strip())
    stmt = select(PasswordResetTokenModel).where(
        PasswordResetTokenModel.token_hash == token_hash
    )
    result = await db.execute(stmt)
    token_model = result.scalars().first()

    now = datetime.now(timezone.utc)
    if not token_model or token_model.used_at is not None or token_model.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link is invalid or has expired."
        )

    token_model.used_at = now

    user_stmt = select(UserModel).where(UserModel.id == token_model.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalars().first()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid account.")

    # Update password with Argon2id hash
    user.password_hash = hash_password(req.new_password)

    # Security requirement: Revoke all existing sessions upon password reset!
    revoke_stmt = (
        update(UserSessionModel)
        .where(UserSessionModel.user_id == user.id, UserSessionModel.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    await db.execute(revoke_stmt)
    await record_audit_event(db, user.id, "PASSWORD_RESET_COMPLETED", ip)
    await db.commit()

    return GenericAuthResponse(
        success=True,
        message="Password has been reset successfully. Please log in with your new credentials."
    )

@router.get("/sessions", response_model=SessionsListResponse)
async def list_sessions(
    current_session: UserSessionModel = Depends(get_current_session),
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    stmt = select(UserSessionModel).where(
        UserSessionModel.user_id == user.id,
        UserSessionModel.revoked_at.is_(None),
        UserSessionModel.expires_at > now
    ).order_by(UserSessionModel.created_at.desc())
    result = await db.execute(stmt)
    sessions = result.scalars().all()

    session_list = [
        SessionInfo(
            id=s.id,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            created_at=s.created_at,
            expires_at=s.expires_at,
            is_current=(s.id == current_session.id)
        )
        for s in sessions
    ]

    return SessionsListResponse(success=True, sessions=session_list)

@router.delete("/sessions/{session_id}", response_model=GenericAuthResponse)
async def revoke_session(
    session_id: str,
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(UserSessionModel).where(
        UserSessionModel.id == session_id,
        UserSessionModel.user_id == user.id
    )
    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    session.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    return GenericAuthResponse(success=True, message="Session revoked successfully.")
