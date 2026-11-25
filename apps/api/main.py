from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
import logging

from config import settings
from database import engine
import models # Ensure all SQLAlchemy models are registered
from routes.health import router as health_router
from routes.ledger import router as ledger_router
from routes.quotes import router as quotes_router
from routes.scenario import router as scenario_router
from routes.auth import router as auth_router
from routes.portfolio import router as portfolio_router
from routes.transactions import router as transactions_router
from routes.admin import router as admin_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cryptiq-api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Nexora API and verifying database connection...")

    if engine is None:
        raise RuntimeError("Database engine is not configured.")

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        logger.info("PostgreSQL database connection verified.")
    except Exception:
        logger.exception("Database connection verification failed.")
        raise

    yield

    await engine.dispose()
    logger.info("Nexora API shut down successfully.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Cryptiq Institutional Digital Asset Platform Backend Engine",
    lifespan=lifespan,
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$|https://.*(\.onrender\.com|\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(health_router)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(ledger_router, prefix=settings.API_V1_PREFIX)
app.include_router(quotes_router, prefix=settings.API_V1_PREFIX)
app.include_router(scenario_router, prefix=settings.API_V1_PREFIX)
app.include_router(portfolio_router, prefix=settings.API_V1_PREFIX)
app.include_router(transactions_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0-phase1",
        "description": "Cryptiq Algorithmic Engine & Digital Asset Core",
        "status": "ONLINE"
    }

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", getattr(settings, "PORT", 8000)))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=(settings.ENVIRONMENT == "development"))
