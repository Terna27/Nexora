import pytest
import asyncio
import uuid
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from database import AsyncSessionLocal
from config import settings
from routes.auth import _rate_limit_cache
from models.user import UserModel, UserSessionModel, AuthAuditEventModel, AdminAuditLogModel

TEST_BOOTSTRAP_TOKEN = "test_super_secret_bootstrap_token_2026_xyz"

def unique_email(prefix: str = "admin") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}@nexora.test"

@pytest.fixture(autouse=True)
async def setup_and_teardown_bootstrap():
    # Clear rate limit cache for testing
    _rate_limit_cache.clear()

    # Configure bootstrap token for tests
    original_token = settings.ADMIN_BOOTSTRAP_TOKEN
    settings.ADMIN_BOOTSTRAP_TOKEN = TEST_BOOTSTRAP_TOKEN

    # Decommission any existing admin users so count(role == 'admin') == 0
    # Note: admin_audit_logs has an immutability trigger preventing deletions of referenced users.
    # Updating role to decommissioned_admin removes admin access without deleting immutable audit records.
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(UserModel)
            .where(UserModel.role == "admin")
            .values(role="decommissioned_admin")
        )
        await session.commit()

    yield

    # Teardown: decommission any admins created during the test and clear rate limit cache
    _rate_limit_cache.clear()
    settings.ADMIN_BOOTSTRAP_TOKEN = original_token
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(UserModel)
            .where(UserModel.role == "admin")
            .values(role="decommissioned_admin")
        )
        await session.commit()


@pytest.mark.asyncio
async def test_bootstrap_available_when_no_admin():
    """1. Status endpoint returns is_available=True and has_admin=False when token is set and no admin exists."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/auth/bootstrap/status")
        assert res.status_code == 200
        data = res.json()
        assert data["isAvailable"] is True
        assert data["hasAdmin"] is False
        assert "available" in data["message"].lower()


@pytest.mark.asyncio
async def test_bootstrap_disabled_when_token_not_configured():
    """2. If ADMIN_BOOTSTRAP_TOKEN is not configured, status is unavailable and bootstrap returns 403."""
    settings.ADMIN_BOOTSTRAP_TOKEN = None

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/auth/bootstrap/status")
        assert res.status_code == 200
        data = res.json()
        assert data["isAvailable"] is False

        # Attempt bootstrap when token is not configured
        payload = {
            "fullName": "First Admin",
            "email": unique_email("disabled_token"),
            "password": "StrongAdminPassword!2026",
            "confirmPassword": "StrongAdminPassword!2026",
            "bootstrapToken": "any_token",
        }
        res_post = await client.post("/api/v1/auth/bootstrap", json=payload)
        assert res_post.status_code == 403
        assert "disabled" in res_post.json()["detail"].lower()


@pytest.mark.asyncio
async def test_bootstrap_invalid_credential_fails():
    """3. Invalid bootstrap token returns 401 Unauthorized and does not create an admin."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "fullName": "Intruder Admin",
            "email": unique_email("intruder"),
            "password": "StrongAdminPassword!2026",
            "confirmPassword": "StrongAdminPassword!2026",
            "bootstrapToken": "wrong_invalid_secret_token",
        }
        res = await client.post("/api/v1/auth/bootstrap", json=payload)
        assert res.status_code == 401
        assert "invalid" in res.json()["detail"].lower()

        # Verify no admin was created in database
        async with AsyncSessionLocal() as session:
            stmt = select(UserModel).where(UserModel.role == "admin")
            result = await session.execute(stmt)
            assert result.scalars().first() is None


@pytest.mark.asyncio
async def test_bootstrap_invalid_input_validation():
    """4. Password mismatch, weak password, or invalid email format returns 400 Bad Request."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Password mismatch
        res_mismatch = await client.post("/api/v1/auth/bootstrap", json={
            "fullName": "Admin One",
            "email": unique_email("mismatch"),
            "password": "StrongPassword!2026",
            "confirmPassword": "DifferentPassword!2026",
            "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
        })
        assert res_mismatch.status_code == 400
        assert "match" in res_mismatch.json()["detail"].lower()

        # Weak password (length validation fails at schema or service level)
        res_weak = await client.post("/api/v1/auth/bootstrap", json={
            "fullName": "Admin One",
            "email": unique_email("weak"),
            "password": "weak",
            "confirmPassword": "weak",
            "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
        })
        assert res_weak.status_code in (400, 422)

        # Long enough password but missing complexity
        res_no_sym = await client.post("/api/v1/auth/bootstrap", json={
            "fullName": "Admin One",
            "email": unique_email("no_sym"),
            "password": "PasswordWithNoSymbols123",
            "confirmPassword": "PasswordWithNoSymbols123",
            "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
        })
        assert res_no_sym.status_code == 400

        # Invalid email
        res_email = await client.post("/api/v1/auth/bootstrap", json={
            "fullName": "Admin One",
            "email": "not-an-email",
            "password": "StrongPassword!2026",
            "confirmPassword": "StrongPassword!2026",
            "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
        })
        assert res_email.status_code in (400, 422)


@pytest.mark.asyncio
async def test_bootstrap_success_creates_single_admin():
    """5. Successful bootstrap creates exactly 1 admin with role='admin', active session, and sets cookies."""
    admin_email = unique_email("primary_admin")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "fullName": "Nexora Primary Admin",
            "email": admin_email,
            "password": "StrongAdminPassword!2026#",
            "confirmPassword": "StrongAdminPassword!2026#",
            "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
        }
        res = await client.post("/api/v1/auth/bootstrap", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == admin_email
        assert data["user"]["fullName"] == "Nexora Primary Admin"
        assert data["user"]["isVerified"] is True
        assert data.get("token") is not None

        # Check cookies
        cookies = res.cookies
        assert "cryptiq_session" in cookies or "nexora_session" in cookies

        # Check authoritative DB state
        async with AsyncSessionLocal() as session:
            stmt = select(UserModel).where(UserModel.role == "admin")
            admins = (await session.execute(stmt)).scalars().all()
            assert len(admins) == 1
            admin = admins[0]
            assert admin.email == admin_email
            assert admin.is_active is True
            assert admin.is_verified is True


@pytest.mark.asyncio
async def test_bootstrapped_admin_can_login_via_standard_login():
    """6. Administrator created via bootstrap can log in via standard /login endpoint."""
    admin_email = unique_email("std_admin")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Bootstrap
        b_res = await client.post("/api/v1/auth/bootstrap", json={
            "fullName": "Standard Login Admin",
            "email": admin_email,
            "password": "StrongAdminPassword!2026#",
            "confirmPassword": "StrongAdminPassword!2026#",
            "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
        })
        assert b_res.status_code == 201

        # Now authenticate via normal /login
        login_res = await client.post("/api/v1/auth/login", json={
            "email": admin_email,
            "password": "StrongAdminPassword!2026#",
        })
        assert login_res.status_code == 200
        data = login_res.json()
        assert data["success"] is True
        assert data["user"]["role"] == "admin"


@pytest.mark.asyncio
async def test_bootstrap_status_unavailable_after_bootstrap():
    """7. After bootstrap, /bootstrap/status immediately returns is_available=False and has_admin=True."""
    admin_email = unique_email("status_admin")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Pre-check: available
        status_before = (await client.get("/api/v1/auth/bootstrap/status")).json()
        assert status_before["isAvailable"] is True

        # Complete bootstrap
        await client.post("/api/v1/auth/bootstrap", json={
            "fullName": "Bootstrap Status Admin",
            "email": admin_email,
            "password": "StrongAdminPassword!2026#",
            "confirmPassword": "StrongAdminPassword!2026#",
            "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
        })

        # Post-check: permanently unavailable
        status_after = (await client.get("/api/v1/auth/bootstrap/status")).json()
        assert status_after["isAvailable"] is False
        assert status_after["hasAdmin"] is True


@pytest.mark.asyncio
async def test_second_bootstrap_attempt_returns_409():
    """8. Once an admin exists, subsequent bootstrap attempts return 409 Conflict."""
    email_alpha = unique_email("alpha")
    email_beta = unique_email("beta")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First attempt: succeeds
        res1 = await client.post("/api/v1/auth/bootstrap", json={
            "fullName": "Admin Alpha",
            "email": email_alpha,
            "password": "StrongAdminPassword!2026#",
            "confirmPassword": "StrongAdminPassword!2026#",
            "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
        })
        assert res1.status_code == 201

        # Second attempt: fails with 409 Conflict
        res2 = await client.post("/api/v1/auth/bootstrap", json={
            "fullName": "Admin Beta",
            "email": email_beta,
            "password": "StrongAdminPassword!2026#",
            "confirmPassword": "StrongAdminPassword!2026#",
            "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
        })
        assert res2.status_code == 409
        assert "already exists" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_public_registration_cannot_assign_admin_role():
    """9. Public /register endpoint strictly assigns role='investor' even if role='admin' is sent in payload."""
    sneaky_email = unique_email("sneaky")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "fullName": "Sneaky User",
            "email": sneaky_email,
            "password": "StrongPassword!2026",
            "confirmPassword": "StrongPassword!2026",
            "acceptTerms": True,
            "role": "admin",  # Attacker attempts to pass admin role
        }
        res = await client.post("/api/v1/auth/register", json=payload)
        assert res.status_code in (200, 201)

        # Authoritative DB inspection: user MUST be investor, never admin
        async with AsyncSessionLocal() as session:
            stmt = select(UserModel).where(UserModel.email == sneaky_email)
            user = (await session.execute(stmt)).scalars().first()
            assert user is not None
            assert user.role == "investor"


@pytest.mark.asyncio
async def test_concurrent_bootstrap_requests_atomicity():
    """10. Concurrent bootstrap requests result in exactly 1 winner and all others 409 Conflict."""
    async def attempt_bootstrap(email_suffix: str):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            return await client.post("/api/v1/auth/bootstrap", json={
                "fullName": f"Concurrent Admin {email_suffix}",
                "email": unique_email(f"concurrent_{email_suffix}"),
                "password": "StrongAdminPassword!2026#",
                "confirmPassword": "StrongAdminPassword!2026#",
                "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
            })

    # Execute 5 simultaneous bootstrap attempts
    results = await asyncio.gather(
        attempt_bootstrap("1"),
        attempt_bootstrap("2"),
        attempt_bootstrap("3"),
        attempt_bootstrap("4"),
        attempt_bootstrap("5"),
    )

    statuses = [r.status_code for r in results]
    # Exactly one request must succeed with 201; the other 4 must receive 409 Conflict
    assert statuses.count(201) == 1, f"Expected exactly 1 success (201), got: {statuses}"
    assert statuses.count(409) == 4, f"Expected 4 conflict responses (409), got: {statuses}"

    # Verify authoritative database has strictly 1 administrator
    async with AsyncSessionLocal() as session:
        stmt = select(UserModel).where(UserModel.role == "admin")
        admins = (await session.execute(stmt)).scalars().all()
        assert len(admins) == 1


@pytest.mark.asyncio
async def test_bootstrap_remains_closed_after_fresh_session():
    """11. Verify bootstrap closure persists across brand new database and HTTP client sessions."""
    admin_email = unique_email("perm_admin")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client1:
        res = await client1.post("/api/v1/auth/bootstrap", json={
            "fullName": "Permanent Admin",
            "email": admin_email,
            "password": "StrongAdminPassword!2026#",
            "confirmPassword": "StrongAdminPassword!2026#",
            "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
        })
        assert res.status_code == 201

    # Completely fresh client instance
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client2:
        status_res = await client2.get("/api/v1/auth/bootstrap/status")
        assert status_res.status_code == 200
        data = status_res.json()
        assert data["isAvailable"] is False
        assert data["hasAdmin"] is True


@pytest.mark.asyncio
async def test_bootstrapped_admin_can_access_admin_portal():
    """12. Bootstrapped admin can access admin portal endpoints; ordinary user gets 403."""
    admin_email = unique_email("portal_admin")
    investor_email = unique_email("portal_investor")

    # 1. Bootstrap admin using admin_client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as admin_client:
        b_res = await admin_client.post("/api/v1/auth/bootstrap", json={
            "fullName": "Portal Admin",
            "email": admin_email,
            "password": "StrongAdminPassword!2026#",
            "confirmPassword": "StrongAdminPassword!2026#",
            "bootstrapToken": TEST_BOOTSTRAP_TOKEN,
        })
        assert b_res.status_code == 201
        admin_token = b_res.json()["token"]

        # Bootstrapped Admin access to admin overview -> 200 OK
        admin_check = await admin_client.get("/api/v1/admin/overview")
        assert admin_check.status_code == 200
        assert "totalUsers" in admin_check.json()

    # 2. Register & login ordinary investor using a separate investor_client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as inv_client:
        await inv_client.post("/api/v1/auth/register", json={
            "fullName": "Investor User",
            "email": investor_email,
            "password": "StrongPassword!2026#",
            "confirmPassword": "StrongPassword!2026#",
            "acceptTerms": True,
        })
        # Activate investor in DB for test
        async with AsyncSessionLocal() as session:
            stmt = select(UserModel).where(UserModel.email == investor_email)
            investor = (await session.execute(stmt)).scalars().first()
            investor.is_verified = True
            await session.commit()

        # Login investor
        l_res = await inv_client.post("/api/v1/auth/login", json={
            "email": investor_email,
            "password": "StrongPassword!2026#",
        })
        assert l_res.status_code == 200

        # Investor access to admin overview -> 403 Forbidden
        inv_check = await inv_client.get("/api/v1/admin/overview")
        assert inv_check.status_code == 403
