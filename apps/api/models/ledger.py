from sqlalchemy import Column, String, Float, DateTime, Boolean, BigInteger
from datetime import datetime, timezone
from database import Base

class AuditLedgerModel(Base):
    __tablename__ = "audit_ledger"

    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    block_number = Column(BigInteger, nullable=False, index=True)
    tx_hash = Column(String(128), nullable=False, unique=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    asset = Column(String(16), nullable=False)
    amount = Column(Float, nullable=False)
    amount_usd = Column(Float, nullable=False)
    gas_price_gwei = Column(Float, nullable=False)
    status = Column(String(32), default="VERIFIED")
    audit_merkle_root = Column(String(128), nullable=False)
    is_illustrative = Column(Boolean, default=True)

class CustodyAssetModel(Base):
    __tablename__ = "custody_assets"

    symbol = Column(String(16), primary_key=True)
    name = Column(String(64), nullable=False)
    decimals = Column(BigInteger, default=18)
    unit_price_usd = Column(Float, nullable=False)
    day_change_percent = Column(Float, default=0.0)
    liquidity_tier = Column(String(32), default="TIER_1_INSTITUTIONAL")
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
