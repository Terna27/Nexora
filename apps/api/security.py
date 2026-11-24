import re
import secrets
import hashlib
from typing import Tuple
from argon2 import PasswordHasher, exceptions as argon_exceptions
from email_validator import validate_email, EmailNotValidError

# Configure Argon2id hasher following OWASP recommendations
hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MiB
    parallelism=4,
    hash_len=32,
)

def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return hasher.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash."""
    try:
        return hasher.verify(hashed, password)
    except (argon_exceptions.VerifyMismatchError, argon_exceptions.VerificationError, argon_exceptions.InvalidHashError):
        return False

def hash_token(token: str) -> str:
    """Generates a SHA-256 hex digest of a token for safe database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def generate_secure_token() -> Tuple[str, str]:
    """
    Generates a cryptographically random token and its SHA-256 hash.
    Returns: (raw_token, token_hash)
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    return raw_token, token_hash

def normalize_and_validate_email(email_str: str) -> str:
    """
    Normalizes email to lowercase, strips whitespace, and verifies RFC compliance.
    Raises ValueError on invalid email format.
    """
    try:
        valid = validate_email(email_str.strip(), check_deliverability=False, test_environment=True)
        return valid.normalized.lower()
    except EmailNotValidError as e:
        raise ValueError(f"Invalid email address: {str(e)}")

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Enforces production password strength:
    - Minimum 10 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character
    """
    if len(password) < 10:
        return False, "Password must be at least 10 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character (!@#$%^&*...)."
    return True, ""
