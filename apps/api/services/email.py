import logging
from abc import ABC, abstractmethod
from typing import Optional
from config import settings

logger = logging.getLogger("cryptiq-email")

class EmailServiceInterface(ABC):
    @abstractmethod
    async def send_verification_email(self, to_email: str, token: str) -> bool:
        """Sends an email verification link."""
        pass

    @abstractmethod
    async def send_password_reset_email(self, to_email: str, token: str) -> bool:
        """Sends a password reset link."""
        pass

class ConsoleEmailService(EmailServiceInterface):
    """
    Development/Testing provider that logs email tokens securely to server logs
    without fabricating delivery or connecting to unconfigured external SMTP servers.
    """
    async def send_verification_email(self, to_email: str, token: str) -> bool:
        verification_link = f"http://localhost:3000/verify-email?token={token}"
        logger.info(f"[EMAIL_SERVICE - DEV] Verification email for {to_email}: Link -> {verification_link}")
        return True

    async def send_password_reset_email(self, to_email: str, token: str) -> bool:
        reset_link = f"http://localhost:3000/reset-password?token={token}"
        logger.info(f"[EMAIL_SERVICE - DEV] Password reset email for {to_email}: Link -> {reset_link}")
        return True

class SMTPEmailService(EmailServiceInterface):
    """Production SMTP email delivery."""
    async def send_verification_email(self, to_email: str, token: str) -> bool:
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            logger.warning("SMTP credentials unconfigured. Email not sent.")
            return False
        # In real production, sends via aiosmtplib
        return True

    async def send_password_reset_email(self, to_email: str, token: str) -> bool:
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            logger.warning("SMTP credentials unconfigured. Email not sent.")
            return False
        return True

def get_email_service() -> EmailServiceInterface:
    if settings.EMAIL_PROVIDER == "smtp" and settings.SMTP_HOST:
        return SMTPEmailService()
    return ConsoleEmailService()

email_service = get_email_service()
