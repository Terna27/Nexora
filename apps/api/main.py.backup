from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config import settings
from database import engine, Base
import models # Ensure all SQLAlchemy models are registered
from routes.health import router as health_router
from routes.ledger import router as ledger_router
from routes.quotes import router as quotes_router
from routes.scenario import router as scenario_router
from routes.auth import router as auth_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cryptiq-api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Cryptiq Core API & Database...")
    if engine is not None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("PostgreSQL database tables verified/created successfully.")
    yield
    logger.info("Shutting down Cryptiq Core API gracefully.")

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

@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0-phase1",
        "description": "Cryptiq Algorithmic Engine & Digital Asset Core",
        "status": "ONLINE"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
