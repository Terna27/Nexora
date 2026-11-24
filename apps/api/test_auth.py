import pytest
from httpx import ASGITransport, AsyncClient
from main import app
from database import AsyncSessionLocal
from sqlalchemy import select, delete
from models.user import UserModel, EmailVerificationTokenModel, PasswordResetTokenModel, UserSessionModel
from security import generate_secure_token, hash_token
from datetime import datetime, timezone, timedelta

@pytest.fixture(autouse=True)
async def cleanup_test_data():
    yield
    # Cleanup after each test
    async with AsyncSessionLocal() as session:
        await session.execute(delete(UserModel).where(UserModel.email.like("%@cryptiq.test")))
        await session.commit()

@pytest.mark.asyncio
async def test_register_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "fullName": "Alice Nakamoto",
            "email": "alice@cryptiq.test",
            "password": "StrongPassword!2026",
            "confirmPassword": "StrongPassword!2026",
            "acceptTerms": True
        }
        res = await client.post("/api/v1/auth/register", json=payload)
        assert res.status_code in (200, 201)
        data = res.json()
        assert data["success"] is True
        assert "account created" in data["message"].lower() or "verification" in data["message"].lower()

@pytest.mark.asyncio
async def test_register_duplicate_email_enumeration_protection():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First registration
        payload = {
            "fullName": "Alice Nakamoto",
            "email": "alice@cryptiq.test",
            "password": "StrongPassword!2026",
            "confirmPassword": "StrongPassword!2026",
            "acceptTerms": True
        }
        res1 = await client.post("/api/v1/auth/register", json=payload)
        assert res1.status_code in (200, 201)

        # Duplicate registration with same email
        dup_payload = {
            "fullName": "Alice Impostor",
            "email": "alice@cryptiq.test",
            "password": "AnotherStrongPassword!2026",
            "confirmPassword": "AnotherStrongPassword!2026",
            "acceptTerms": True
        }
        res2 = await client.post("/api/v1/auth/register", json=dup_payload)
        # Should return 200 or 201 with identical generic message to prevent account enumeration
        assert res2.status_code in (200, 201)
        data = res2.json()
        assert data["success"] is True

@pytest.mark.asyncio
async def test_register_weak_password():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "fullName": "Bob Weak",
            "email": "bob@cryptiq.test",
            "password": "weak",
            "confirmPassword": "weak",
            "acceptTerms": True
        }
        res = await client.post("/api/v1/auth/register", json=payload)
        assert res.status_code in (400, 422)
        assert "at least 10 characters" in str(res.json()).lower()

@pytest.mark.asyncio
async def test_register_terms_required():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "fullName": "Carol Disagree",
            "email": "carol@cryptiq.test",
            "password": "StrongPassword!2026",
            "confirmPassword": "StrongPassword!2026",
            "acceptTerms": False
        }
        res = await client.post("/api/v1/auth/register", json=payload)
        assert res.status_code in (400, 422)

@pytest.mark.asyncio
async def test_login_invalid_credentials():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First register valid user
        await client.post("/api/v1/auth/register", json={
            "fullName": "Alice Nakamoto",
            "email": "alice@cryptiq.test",
            "password": "StrongPassword!2026",
            "confirmPassword": "StrongPassword!2026",
            "acceptTerms": True
        })

        # Wrong password
        res = await client.post("/api/v1/auth/login", json={
            "email": "alice@cryptiq.test",
            "password": "WrongPassword!2026"
        })
        assert res.status_code == 401
        assert "invalid email or password" in res.json()["detail"].lower()

        # Nonexistent user
        res_none = await client.post("/api/v1/auth/login", json={
            "email": "nonexistent@cryptiq.test",
            "password": "SomePassword!2026"
        })
        assert res_none.status_code == 401
        assert "invalid email or password" in res_none.json()["detail"].lower()

@pytest.mark.asyncio
async def test_login_and_me_and_logout_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register
        reg_res = await client.post("/api/v1/auth/register", json={
            "fullName": "Alice Nakamoto",
            "email": "alice@cryptiq.test",
            "password": "StrongPassword!2026",
            "confirmPassword": "StrongPassword!2026",
            "acceptTerms": True
        })
        assert reg_res.status_code in (200, 201)

        # Login
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "alice@cryptiq.test",
            "password": "StrongPassword!2026"
        })
        assert login_res.status_code == 200
        body = login_res.json()
        assert body["success"] is True
        assert body["user"]["email"] == "alice@cryptiq.test"
        assert body["user"]["fullName"] == "Alice Nakamoto"
        assert body["user"]["role"] == "investor"

        # Verify HttpOnly session cookie was set
        assert "cryptiq_session" in client.cookies

        # Query /me with the session cookie
        me_res = await client.get("/api/v1/auth/me")
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["email"] == "alice@cryptiq.test"
        assert me_data["fullName"] == "Alice Nakamoto"

        # List active sessions
        sessions_res = await client.get("/api/v1/auth/sessions")
        assert sessions_res.status_code == 200
        sessions_data = sessions_res.json()
        assert len(sessions_data["sessions"]) >= 1

        # Logout
        logout_res = await client.post("/api/v1/auth/logout")
        assert logout_res.status_code == 200
        assert logout_res.json()["success"] is True

        # Query /me again - should now be unauthorized
        me_after = await client.get("/api/v1/auth/me")
        assert me_after.status_code == 401

@pytest.mark.asyncio
async def test_email_verification_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Register user
        reg_res = await client.post("/api/v1/auth/register", json={
            "fullName": "Alice Nakamoto",
            "email": "alice@cryptiq.test",
            "password": "StrongPassword!2026",
            "confirmPassword": "StrongPassword!2026",
            "acceptTerms": True
        })
        assert reg_res.status_code in (200, 201)

    # 2. Add an explicit verification token to DB
    raw_token, token_h = generate_secure_token()
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(UserModel).where(UserModel.email == "alice@cryptiq.test"))
        user = result.scalar_one_or_none()
        assert user is not None

        v_token = EmailVerificationTokenModel(
            user_id=user.id,
            token_hash=token_h,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
        )
        session.add(v_token)
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Invalid token
        res_bad = await client.post("/api/v1/auth/verify-email", json={"token": "invalid_token_12345"})
        assert res_bad.status_code == 400

        # Valid token
        res_good = await client.post("/api/v1/auth/verify-email", json={"token": raw_token})
        assert res_good.status_code == 200
        assert res_good.json()["success"] is True

        # Token cannot be reused
        res_reuse = await client.post("/api/v1/auth/verify-email", json={"token": raw_token})
        assert res_reuse.status_code == 400

@pytest.mark.asyncio
async def test_password_reset_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register user
        reg_res = await client.post("/api/v1/auth/register", json={
            "fullName": "Alice Nakamoto",
            "email": "alice@cryptiq.test",
            "password": "StrongPassword!2026",
            "confirmPassword": "StrongPassword!2026",
            "acceptTerms": True
        })
        assert reg_res.status_code in (200, 201)

        # 1. Request password reset (enumeration protection check)
        res = await client.post("/api/v1/auth/forgot-password", json={"email": "alice@cryptiq.test"})
        assert res.status_code == 200
        assert "password reset" in res.json()["message"].lower()

        # Nonexistent user also returns identical message
        res_nonexistent = await client.post("/api/v1/auth/forgot-password", json={"email": "nobody@cryptiq.test"})
        assert res_nonexistent.status_code == 200
        assert "password reset" in res_nonexistent.json()["message"].lower()

    # 2. Add an explicit reset token to DB
    raw_reset_token, token_h = generate_secure_token()
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(UserModel).where(UserModel.email == "alice@cryptiq.test"))
        user = result.scalar_one_or_none()
        assert user is not None

        r_token = PasswordResetTokenModel(
            user_id=user.id,
            token_hash=token_h,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
        )
        session.add(r_token)
        await session.commit()

    # 3. Reset password
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        reset_payload = {
            "token": raw_reset_token,
            "newPassword": "NewStrongPassword!2026",
            "confirmPassword": "NewStrongPassword!2026"
        }
        res_reset = await client.post("/api/v1/auth/reset-password", json=reset_payload)
        assert res_reset.status_code == 200
        assert res_reset.json()["success"] is True

        # Old password must now fail
        res_old = await client.post("/api/v1/auth/login", json={
            "email": "alice@cryptiq.test",
            "password": "StrongPassword!2026"
        })
        assert res_old.status_code == 401

        # New password must succeed
        res_new = await client.post("/api/v1/auth/login", json={
            "email": "alice@cryptiq.test",
            "password": "NewStrongPassword!2026"
        })
        assert res_new.status_code == 200
        assert res_new.json()["success"] is True
