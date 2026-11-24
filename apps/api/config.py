from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Cryptiq Core API"
    PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "postgresql+asyncpg://cryptiq_user:cryptiq_secure_dev_password@localhost:5432/cryptiq_core"
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:19006",
        "http://localhost:8081",
        "https://nexora.onrender.com",
        "https://nexora-web.onrender.com",
        "https://nexora-frontend.onrender.com",
        "https://nexora-edz1.onrender.com",
    ]
    SECRET_KEY: str = "cryptiq_super_secret_development_key_change_in_production"

    # Authentication & Session Security
    SESSION_COOKIE_NAME: str = "cryptiq_session"
    SESSION_EXPIRE_HOURS: int = 72
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1
    SECURE_COOKIES: bool = False
    COOKIE_SAME_SITE: str = "lax"

    # Email Service Configuration
    EMAIL_PROVIDER: str = "console"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@cryptiq.internal"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        defaults = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://localhost:19006",
            "http://localhost:8081",
            "https://nexora.onrender.com",
            "https://nexora-web.onrender.com",
            "https://nexora-frontend.onrender.com",
            "https://nexora-edz1.onrender.com",
        ]
        origins = list(defaults)
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    import json
                    parsed = json.loads(v_str)
                    if isinstance(parsed, list):
                        for item in parsed:
                            s = str(item).strip()
                            if s and s not in origins:
                                origins.append(s)
                        return origins
                except Exception:
                    pass
            for i in v_str.split(","):
                s = i.strip()
                if s and s not in origins:
                    origins.append(s)
            return origins
        elif isinstance(v, list):
            for i in v:
                s = str(i).strip()
                if s and s not in origins:
                    origins.append(s)
            return origins
        return origins

settings = Settings()
