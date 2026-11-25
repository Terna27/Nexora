"""Financial foundation schema and integrity triggers

Revision ID: 0003_financial_foundation
Revises: 0002_merge_baseline_heads
Create Date: 2026-11-24 21:10:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import uuid
from datetime import datetime, timezone

revision: str = '0003_financial_foundation'
down_revision: Union[str, Sequence[str], None] = '0002_merge_baseline_heads'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Verify and drop prototype tables safely
    for table_name in ["audit_ledger", "custody_assets"]:
        if inspector.has_table(table_name):
            count = conn.execute(sa.text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
            if count > 0:
                raise RuntimeError(
                    f"Safety Violation: Table '{table_name}' contains {count} records and cannot be dropped."
                )
            op.drop_table(table_name)

    # 2. Master Data: legal_entities
    op.create_table(
        "legal_entities",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("entity_type", sa.String(length=32), nullable=False),
        sa.Column("functional_currency", sa.String(length=16), nullable=False, server_default="USD"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("entity_type IN ('OPERATING_COMPANY', 'INVESTMENT_VEHICLE')", name="chk_entity_type"),
    )
    op.create_index("ix_legal_entities_code", "legal_entities", ["code"], unique=True)

    # 3. Master Data: assets
    op.create_table(
        "assets",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("symbol", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("asset_class", sa.String(length=32), nullable=False),
        sa.Column("base_decimals", sa.Integer(), nullable=False),
        sa.Column("display_decimals", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_tradable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_stakeable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("asset_class IN ('CRYPTO_NATIVE', 'TOKEN', 'FIAT')", name="chk_asset_class"),
        sa.CheckConstraint("base_decimals >= 0 AND base_decimals <= 38", name="chk_asset_decimals"),
    )
    op.create_index("ix_assets_symbol", "assets", ["symbol"], unique=True)

    # 4. Master Data: asset_networks
    op.create_table(
        "asset_networks",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("asset_id", sa.String(length=36), sa.ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("chain_identifier", sa.String(length=64), nullable=False),
        sa.Column("contract_address", sa.String(length=128), nullable=True),
        sa.Column("standard", sa.String(length=32), nullable=True),
        sa.Column("withdrawal_fee", sa.Numeric(precision=38, scale=18), nullable=False, server_default="0"),
        sa.Column("min_confirmations", sa.Integer(), nullable=False, server_default="64"),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("asset_id", "chain_identifier", name="uq_asset_network"),
    )
    op.create_index("ix_asset_networks_asset_id", "asset_networks", ["asset_id"])

    # 5. Chart of Accounts: accounts
    op.create_table(
        "accounts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("legal_entity_id", sa.String(length=36), sa.ForeignKey("legal_entities.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("account_number", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("account_type", sa.String(length=32), nullable=False),
        sa.Column("account_category", sa.String(length=64), nullable=False),
        sa.Column("normal_balance", sa.String(length=8), nullable=False),
        sa.Column("asset_id", sa.String(length=36), sa.ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')", name="chk_account_type"),
        sa.CheckConstraint("normal_balance IN ('DEBIT', 'CREDIT')", name="chk_account_normal_balance"),
        sa.UniqueConstraint("id", "asset_id", "legal_entity_id", name="uq_account_asset_entity"),
    )
    op.create_index("ix_accounts_account_number", "accounts", ["account_number"], unique=True)
    op.create_index("ix_accounts_legal_entity_id", "accounts", ["legal_entity_id"])
    op.create_index("ix_accounts_asset_id", "accounts", ["asset_id"])
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"])

    # 6. Account Balances cache
    op.create_table(
        "account_balances",
        sa.Column("account_id", sa.String(length=36), sa.ForeignKey("accounts.id", ondelete="RESTRICT"), primary_key=True),
        sa.Column("current_balance", sa.Numeric(precision=38, scale=18), nullable=False, server_default="0"),
        sa.Column("functional_usd_balance", sa.Numeric(precision=20, scale=4), nullable=False, server_default="0"),
        sa.Column("version", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 7. Financial Transactions (Headers)
    op.create_table(
        "financial_transactions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("legal_entity_id", sa.String(length=36), sa.ForeignKey("legal_entities.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("transaction_ref", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("payload_hash", sa.String(length=64), nullable=False),
        sa.Column("source_service", sa.String(length=64), nullable=False),
        sa.Column("transaction_type", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="PENDING"),
        sa.Column("initiator_user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("reversal_of_id", sa.String(length=36), sa.ForeignKey("financial_transactions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("reversed_amount", sa.Numeric(precision=38, scale=18), nullable=False, server_default="0"),
        sa.Column("is_fully_reversed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("settled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('PENDING', 'POSTED', 'SETTLED', 'VOIDED')", name="chk_tx_status"),
        sa.UniqueConstraint("legal_entity_id", "source_service", "idempotency_key", name="uq_tx_source_idempotency"),
        sa.UniqueConstraint("id", "legal_entity_id", name="uq_tx_id_entity"),
    )
    op.create_index("ix_financial_transactions_transaction_ref", "financial_transactions", ["transaction_ref"], unique=True)
    op.create_index("ix_financial_transactions_status", "financial_transactions", ["status"])
    op.create_index("ix_financial_transactions_reversal_of_id", "financial_transactions", ["reversal_of_id"])

    # 8. Journal Entries (Atomic Double-Entry legs)
    op.create_table(
        "journal_entries",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("transaction_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=False),
        sa.Column("asset_id", sa.String(length=36), nullable=False),
        sa.Column("legal_entity_id", sa.String(length=36), nullable=False),
        sa.Column("direction", sa.String(length=8), nullable=False),
        sa.Column("native_amount", sa.Numeric(precision=38, scale=18), nullable=False),
        sa.Column("historical_carrying_rate", sa.Numeric(precision=24, scale=8), nullable=True),
        sa.Column("current_settlement_rate", sa.Numeric(precision=24, scale=8), nullable=True),
        sa.Column("functional_amount_usd", sa.Numeric(precision=20, scale=4), nullable=False),
        sa.Column("entry_sequence", sa.Integer(), nullable=False),
        sa.Column("narrative", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("direction IN ('DEBIT', 'CREDIT')", name="chk_journal_direction"),
        sa.CheckConstraint("native_amount > 0", name="chk_journal_native_amount_pos"),
        sa.CheckConstraint("functional_amount_usd >= 0", name="chk_journal_functional_amount_pos"),
        sa.UniqueConstraint("transaction_id", "entry_sequence", name="uq_tx_entry_sequence"),
        sa.ForeignKeyConstraint(
            ["account_id", "asset_id", "legal_entity_id"],
            ["accounts.id", "accounts.asset_id", "accounts.legal_entity_id"],
            name="fk_journal_account_asset_entity",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["transaction_id", "legal_entity_id"],
            ["financial_transactions.id", "financial_transactions.legal_entity_id"],
            name="fk_journal_tx_entity",
            ondelete="RESTRICT",
        ),
    )
    op.create_index("ix_journal_entries_transaction_id", "journal_entries", ["transaction_id"])
    op.create_index("ix_journal_entries_account_id", "journal_entries", ["account_id"])

    # 9. Journal Entry Reversals
    op.create_table(
        "journal_entry_reversals",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("original_entry_id", sa.String(length=36), sa.ForeignKey("journal_entries.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("reversal_entry_id", sa.String(length=36), sa.ForeignKey("journal_entries.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("reversed_amount", sa.Numeric(precision=38, scale=18), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("reversed_amount > 0", name="chk_rev_amount_pos"),
        sa.UniqueConstraint("reversal_entry_id", name="uq_reversal_entry_unique"),
    )
    op.create_index("ix_journal_entry_reversals_original", "journal_entry_reversals", ["original_entry_id"])

    # 10. Idempotency Records
    op.create_table(
        "idempotency_records",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("legal_entity_id", sa.String(length=36), sa.ForeignKey("legal_entities.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("source_service", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("payload_hash", sa.String(length=64), nullable=False),
        sa.Column("financial_tx_id", sa.String(length=36), sa.ForeignKey("financial_transactions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("response_json", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("legal_entity_id", "source_service", "idempotency_key", name="uq_idempotency_scope"),
    )
    op.create_index("ix_idempotency_records_key", "idempotency_records", ["idempotency_key"])

    # 11. PostgreSQL Integrity Functions and Triggers

    # Trigger A1: Function
    op.execute("""
    CREATE OR REPLACE FUNCTION fn_guard_financial_transaction_lifecycle()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Core field immutability on POSTED, SETTLED, VOIDED
        IF OLD.status IN ('POSTED', 'SETTLED', 'VOIDED') THEN
            IF NEW.transaction_type != OLD.transaction_type OR
               NEW.legal_entity_id != OLD.legal_entity_id OR
               NEW.idempotency_key != OLD.idempotency_key OR
               NEW.payload_hash != OLD.payload_hash OR
               NEW.reversal_of_id IS DISTINCT FROM OLD.reversal_of_id THEN
                RAISE EXCEPTION 'Security Violation: Immutable fields of transaction % (status: %) cannot be altered',
                    OLD.id, OLD.status;
            END IF;
        END IF;

        -- State transition enforcement
        IF NEW.status != OLD.status THEN
            IF OLD.status = 'PENDING' AND NEW.status NOT IN ('POSTED', 'VOIDED') THEN
                RAISE EXCEPTION 'Invalid State Transition: PENDING can only transition to POSTED or VOIDED (got %)', NEW.status;
            ELSIF OLD.status = 'POSTED' AND NEW.status != 'SETTLED' THEN
                RAISE EXCEPTION 'Invalid State Transition: POSTED can only transition to SETTLED (got %)', NEW.status;
            ELSIF OLD.status IN ('SETTLED', 'VOIDED') THEN
                RAISE EXCEPTION 'Invalid State Transition: Terminal state % cannot be transitioned', OLD.status;
            END IF;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    # Trigger A2: Trigger
    op.execute("""
    CREATE TRIGGER trg_guard_financial_transaction_lifecycle
    BEFORE UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION fn_guard_financial_transaction_lifecycle();
    """)

    # Trigger B1: Function
    op.execute("""
    CREATE OR REPLACE FUNCTION fn_guard_journal_entries()
    RETURNS TRIGGER AS $$
    DECLARE
        v_old_status VARCHAR(32);
        v_new_status VARCHAR(32);
    BEGIN
        -- On UPDATE or DELETE, inspect old parent
        IF TG_OP IN ('UPDATE', 'DELETE') THEN
            SELECT status INTO v_old_status FROM financial_transactions WHERE id = OLD.transaction_id;
            IF v_old_status IN ('POSTED', 'SETTLED', 'VOIDED') THEN
                RAISE EXCEPTION 'Immutability Violation: Cannot modify or delete journal entries from transaction % in status %',
                    OLD.transaction_id, v_old_status;
            END IF;
        END IF;

        -- On INSERT or UPDATE, inspect new parent
        IF TG_OP IN ('INSERT', 'UPDATE') THEN
            SELECT status INTO v_new_status FROM financial_transactions WHERE id = NEW.transaction_id;
            IF v_new_status IN ('POSTED', 'SETTLED', 'VOIDED') THEN
                RAISE EXCEPTION 'Immutability Violation: Cannot insert or move journal entries into transaction % in status %',
                    NEW.transaction_id, v_new_status;
            END IF;
        END IF;

        RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
    """)

    # Trigger B2: Trigger
    op.execute("""
    CREATE TRIGGER trg_guard_journal_entries
    BEFORE INSERT OR UPDATE OR DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION fn_guard_journal_entries();
    """)

    # Trigger C1: Function
    op.execute("""
    CREATE OR REPLACE FUNCTION fn_verify_transaction_lifecycle()
    RETURNS TRIGGER AS $$
    DECLARE
        v_entry_count INTEGER;
        v_debit_count INTEGER;
        v_credit_count INTEGER;
        v_net_usd_diff NUMERIC(20, 4);
    BEGIN
        IF NEW.status IN ('POSTED', 'SETTLED') THEN
            SELECT COUNT(*),
                   COUNT(*) FILTER (WHERE direction = 'DEBIT'),
                   COUNT(*) FILTER (WHERE direction = 'CREDIT'),
                   COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN functional_amount_usd ELSE -functional_amount_usd END), 0)
            INTO v_entry_count, v_debit_count, v_credit_count, v_net_usd_diff
            FROM journal_entries WHERE transaction_id = NEW.id;

            IF v_entry_count < 2 THEN
                RAISE EXCEPTION 'Accounting Violation: Transaction % must contain at least 2 entries (found %)',
                    NEW.id, v_entry_count;
            END IF;

            IF v_debit_count = 0 OR v_credit_count = 0 THEN
                RAISE EXCEPTION 'Accounting Violation: Transaction % must contain both DEBIT and CREDIT entries', NEW.id;
            END IF;

            IF v_net_usd_diff != 0 THEN
                RAISE EXCEPTION 'Accounting Violation: Transaction % is unbalanced in functional USD. Net variance: %',
                    NEW.id, v_net_usd_diff;
            END IF;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    # Trigger C2: Trigger
    op.execute("""
    CREATE CONSTRAINT TRIGGER trg_verify_transaction_lifecycle
    AFTER INSERT OR UPDATE ON financial_transactions
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_verify_transaction_lifecycle();
    """)

    # 12. Seed Master Legal Entities and Core Assets
    op.execute("""
    INSERT INTO legal_entities (id, code, name, entity_type, functional_currency, is_active, created_at)
    VALUES 
        ('le_01_opco', 'NEXORA_OPCO', 'Nexora Technologies Ltd', 'OPERATING_COMPANY', 'USD', true, NOW()),
        ('le_02_vehicle', 'NEXORA_VEHICLE', 'Nexora Master Fund SPV', 'INVESTMENT_VEHICLE', 'USD', true, NOW())
    ON CONFLICT (code) DO NOTHING
    """)

    op.execute("""
    INSERT INTO assets (id, symbol, name, asset_class, base_decimals, display_decimals, is_active, is_tradable, is_stakeable, created_at)
    VALUES
        ('ast_usd', 'USD', 'US Dollar', 'FIAT', 2, 2, true, false, false, NOW()),
        ('ast_usdt', 'USDT', 'Tether USD', 'TOKEN', 6, 2, true, true, false, NOW()),
        ('ast_btc', 'BTC', 'Bitcoin', 'CRYPTO_NATIVE', 8, 8, true, true, false, NOW()),
        ('ast_eth', 'ETH', 'Ethereum', 'CRYPTO_NATIVE', 18, 6, true, true, true, NOW()),
        ('ast_sol', 'SOL', 'Solana', 'CRYPTO_NATIVE', 9, 4, true, true, true, NOW())
    ON CONFLICT (symbol) DO NOTHING
    """)

def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_verify_transaction_lifecycle ON financial_transactions;")
    op.execute("DROP FUNCTION IF EXISTS fn_verify_transaction_lifecycle();")
    op.execute("DROP TRIGGER IF EXISTS trg_guard_journal_entries ON journal_entries;")
    op.execute("DROP FUNCTION IF EXISTS fn_guard_journal_entries();")
    op.execute("DROP TRIGGER IF EXISTS trg_guard_financial_transaction_lifecycle ON financial_transactions;")
    op.execute("DROP FUNCTION IF EXISTS fn_guard_financial_transaction_lifecycle();")

    op.drop_table("idempotency_records")
    op.drop_table("journal_entry_reversals")
    op.drop_table("journal_entries")
    op.drop_table("financial_transactions")
    op.drop_table("account_balances")
    op.drop_table("accounts")
    op.drop_table("asset_networks")
    op.drop_table("assets")
    op.drop_table("legal_entities")
