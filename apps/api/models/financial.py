import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    BigInteger,
    Integer,
    Text,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class LegalEntityModel(Base):
    __tablename__ = "legal_entities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    entity_type = Column(String(32), nullable=False)
    functional_currency = Column(String(16), nullable=False, default="USD")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("entity_type IN ('OPERATING_COMPANY', 'INVESTMENT_VEHICLE')", name="chk_entity_type"),
    )

    accounts = relationship("AccountModel", back_populates="legal_entity")
    transactions = relationship("FinancialTransactionModel", back_populates="legal_entity")

class AssetModel(Base):
    __tablename__ = "assets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    symbol = Column(String(16), unique=True, nullable=False, index=True)
    name = Column(String(64), nullable=False)
    asset_class = Column(String(32), nullable=False)
    base_decimals = Column(Integer, nullable=False)
    display_decimals = Column(Integer, nullable=False, default=4)
    is_active = Column(Boolean, nullable=False, default=True)
    is_tradable = Column(Boolean, nullable=False, default=False)
    is_stakeable = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("asset_class IN ('CRYPTO_NATIVE', 'TOKEN', 'FIAT')", name="chk_asset_class"),
        CheckConstraint("base_decimals >= 0 AND base_decimals <= 38", name="chk_asset_decimals"),
    )

    networks = relationship("AssetNetworkModel", back_populates="asset")
    accounts = relationship("AccountModel", back_populates="asset")

class AssetNetworkModel(Base):
    __tablename__ = "asset_networks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    asset_id = Column(String(36), ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False, index=True)
    chain_identifier = Column(String(64), nullable=False)
    contract_address = Column(String(128), nullable=True)
    standard = Column(String(32), nullable=True)
    withdrawal_fee = Column(Numeric(38, 18), nullable=False, default=0)
    min_confirmations = Column(Integer, nullable=False, default=64)
    is_enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("asset_id", "chain_identifier", name="uq_asset_network"),
    )

    asset = relationship("AssetModel", back_populates="networks")

class AccountModel(Base):
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id", ondelete="RESTRICT"), nullable=False, index=True)
    account_number = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    account_type = Column(String(32), nullable=False)
    account_category = Column(String(64), nullable=False)
    normal_balance = Column(String(8), nullable=False)
    asset_id = Column(String(36), ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')", name="chk_account_type"),
        CheckConstraint("normal_balance IN ('DEBIT', 'CREDIT')", name="chk_account_normal_balance"),
        UniqueConstraint("id", "asset_id", "legal_entity_id", name="uq_account_asset_entity"),
    )

    legal_entity = relationship("LegalEntityModel", back_populates="accounts")
    asset = relationship("AssetModel", back_populates="accounts")
    balance = relationship("AccountBalanceModel", uselist=False, back_populates="account")
    journal_entries = relationship("JournalEntryModel", back_populates="account")

class AccountBalanceModel(Base):
    __tablename__ = "account_balances"

    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="RESTRICT"), primary_key=True)
    current_balance = Column(Numeric(38, 18), nullable=False, default=0)
    functional_usd_balance = Column(Numeric(20, 4), nullable=False, default=0)
    version = Column(BigInteger, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    account = relationship("AccountModel", back_populates="balance")

class FinancialTransactionModel(Base):
    __tablename__ = "financial_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id", ondelete="RESTRICT"), nullable=False, index=True)
    transaction_ref = Column(String(64), unique=True, nullable=False, index=True)
    idempotency_key = Column(String(128), nullable=False, index=True)
    payload_hash = Column(String(64), nullable=False)
    source_service = Column(String(64), nullable=False)
    transaction_type = Column(String(64), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="PENDING", index=True)
    initiator_user_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True, index=True)
    reversal_of_id = Column(String(36), ForeignKey("financial_transactions.id", ondelete="RESTRICT"), nullable=True, index=True)
    is_fully_reversed = Column(Boolean, nullable=False, default=False)
    description = Column(String(255), nullable=True)
    metadata_json = Column(Text, nullable=True)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    settled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("status IN ('PENDING', 'POSTED', 'SETTLED', 'VOIDED')", name="chk_tx_status"),
        UniqueConstraint("legal_entity_id", "source_service", "idempotency_key", name="uq_tx_source_idempotency"),
        UniqueConstraint("id", "legal_entity_id", name="uq_tx_id_entity"),
    )

    legal_entity = relationship("LegalEntityModel", back_populates="transactions")
    journal_entries = relationship(
        "JournalEntryModel",
        back_populates="transaction",
        primaryjoin="FinancialTransactionModel.id == JournalEntryModel.transaction_id",
        foreign_keys="[JournalEntryModel.transaction_id]",
        order_by="JournalEntryModel.entry_sequence",
    )
    original_transaction = relationship(
        "FinancialTransactionModel",
        remote_side=[id],
        foreign_keys=[reversal_of_id],
        backref="reversed_by",
    )

class JournalEntryModel(Base):
    __tablename__ = "journal_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    transaction_id = Column(String(36), ForeignKey("financial_transactions.id", ondelete="RESTRICT"), nullable=False, index=True)
    account_id = Column(String(36), nullable=False, index=True)
    asset_id = Column(String(36), nullable=False, index=True)
    legal_entity_id = Column(String(36), nullable=False, index=True)
    direction = Column(String(8), nullable=False)
    native_amount = Column(Numeric(38, 18), nullable=False)
    historical_carrying_rate = Column(Numeric(24, 8), nullable=True)
    current_settlement_rate = Column(Numeric(24, 8), nullable=True)
    functional_amount_usd = Column(Numeric(20, 4), nullable=False)
    entry_sequence = Column(Integer, nullable=False)
    narrative = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("direction IN ('DEBIT', 'CREDIT')", name="chk_journal_direction"),
        CheckConstraint("native_amount > 0", name="chk_journal_native_amount_pos"),
        CheckConstraint("functional_amount_usd >= 0", name="chk_journal_functional_amount_pos"),
        UniqueConstraint("transaction_id", "entry_sequence", name="uq_tx_entry_sequence"),
        ForeignKeyConstraint(
            ["account_id", "asset_id", "legal_entity_id"],
            ["accounts.id", "accounts.asset_id", "accounts.legal_entity_id"],
            name="fk_journal_account_asset_entity",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["transaction_id", "legal_entity_id"],
            ["financial_transactions.id", "financial_transactions.legal_entity_id"],
            name="fk_journal_tx_entity",
            ondelete="RESTRICT",
        ),
    )

    transaction = relationship(
        "FinancialTransactionModel",
        back_populates="journal_entries",
        primaryjoin="JournalEntryModel.transaction_id == FinancialTransactionModel.id",
        foreign_keys=[transaction_id],
    )
    account = relationship(
        "AccountModel",
        back_populates="journal_entries",
        primaryjoin="JournalEntryModel.account_id == AccountModel.id",
        foreign_keys=[account_id],
    )

class JournalEntryReversalModel(Base):
    __tablename__ = "journal_entry_reversals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    original_entry_id = Column(String(36), ForeignKey("journal_entries.id", ondelete="RESTRICT"), nullable=False, index=True)
    reversal_entry_id = Column(String(36), ForeignKey("journal_entries.id", ondelete="RESTRICT"), nullable=False, index=True)
    reversed_amount = Column(Numeric(38, 18), nullable=False)
    reversed_functional_usd = Column(Numeric(20, 4), nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("reversed_amount > 0", name="chk_rev_amount_pos"),
        UniqueConstraint("reversal_entry_id", name="uq_reversal_entry_unique"),
    )

    original_entry = relationship("JournalEntryModel", foreign_keys=[original_entry_id])
    reversal_entry = relationship("JournalEntryModel", foreign_keys=[reversal_entry_id])

class IdempotencyRecordModel(Base):
    __tablename__ = "idempotency_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id", ondelete="RESTRICT"), nullable=False, index=True)
    source_service = Column(String(64), nullable=False)
    idempotency_key = Column(String(128), nullable=False, index=True)
    payload_hash = Column(String(64), nullable=False)
    financial_tx_id = Column(String(36), ForeignKey("financial_transactions.id", ondelete="RESTRICT"), nullable=True)
    response_json = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("legal_entity_id", "source_service", "idempotency_key", name="uq_idempotency_scope"),
    )

class InvestorUnitActivityModel(Base):
    __tablename__ = "investor_unit_activities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    investor_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id", ondelete="RESTRICT"), nullable=False, index=True)
    activity_type = Column(String(32), nullable=False)
    unit_quantity = Column(Numeric(28, 10), nullable=False)
    nav_per_unit = Column(Numeric(20, 6), nullable=False)
    functional_usd_value = Column(Numeric(20, 4), nullable=False)
    financial_transaction_id = Column(String(36), ForeignKey("financial_transactions.id", ondelete="RESTRICT"), nullable=True)
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id", ondelete="RESTRICT"), nullable=True)
    idempotency_key = Column(String(128), unique=True, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    reversal_of_id = Column(String(36), ForeignKey("investor_unit_activities.id", ondelete="RESTRICT"), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("activity_type IN ('ISSUANCE', 'REDEMPTION_BURN', 'REVERSAL', 'ADJUSTMENT')", name="chk_unit_act_type"),
        CheckConstraint("nav_per_unit > 0", name="chk_unit_nav_pos"),
        CheckConstraint("functional_usd_value >= 0", name="chk_unit_usd_nonneg"),
        CheckConstraint("(activity_type != 'ISSUANCE') OR (unit_quantity > 0)", name="chk_unit_issuance_pos"),
        CheckConstraint("(activity_type != 'REDEMPTION_BURN') OR (unit_quantity < 0)", name="chk_unit_burn_neg"),
        Index("idx_unit_act_investor", "investor_id", "legal_entity_id"),
        Index("idx_unit_act_entity", "legal_entity_id", "created_at"),
    )

    investor = relationship("UserModel")
    legal_entity = relationship("LegalEntityModel")
    financial_transaction = relationship("FinancialTransactionModel")
    journal_entry = relationship("JournalEntryModel")
    reversal_of = relationship("InvestorUnitActivityModel", remote_side=[id])

class NAVSnapshotModel(Base):
    __tablename__ = "nav_snapshots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id", ondelete="RESTRICT"), nullable=False, index=True)
    valuation_date = Column(Date, nullable=False)
    valuation_timestamp = Column(DateTime(timezone=True), nullable=False)
    total_asset_usd = Column(Numeric(20, 4), nullable=False)
    total_liability_usd = Column(Numeric(20, 4), nullable=False)
    net_asset_value = Column(Numeric(20, 4), nullable=False)
    units_outstanding = Column(Numeric(28, 10), nullable=False)
    nav_per_unit = Column(Numeric(20, 6), nullable=True)
    valuation_inputs = Column(JSONB, nullable=False, default=dict)
    calculation_metadata = Column(JSONB, nullable=False, default=dict)
    status = Column(String(32), nullable=False, default="DRAFT")
    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    reviewed_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    published_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    restatement_of_id = Column(String(36), ForeignKey("nav_snapshots.id", ondelete="RESTRICT"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'REVIEWED', 'PUBLISHED', 'SUPERSEDED')", name="chk_nav_status"),
        CheckConstraint("net_asset_value = (total_asset_usd - total_liability_usd)", name="chk_nav_formula"),
        CheckConstraint("units_outstanding >= 0", name="chk_nav_units_nonneg"),
        Index("idx_nav_snapshots_entity_date", "legal_entity_id", "valuation_date"),
        Index("idx_nav_snapshots_status", "legal_entity_id", "status"),
    )

    legal_entity = relationship("LegalEntityModel")
    created_by = relationship("UserModel", foreign_keys=[created_by_user_id])
    reviewed_by = relationship("UserModel", foreign_keys=[reviewed_by_user_id])
    published_by = relationship("UserModel", foreign_keys=[published_by_user_id])
    restatement_of = relationship("NAVSnapshotModel", remote_side=[id])

