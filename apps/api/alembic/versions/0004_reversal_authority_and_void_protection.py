"""Protect voided transactions and strengthen reversal authority

Revision ID: 0004_reversal_void_protect
Revises: 0003_financial_foundation
Create Date: 2026-11-24 21:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0004_reversal_void_protect'
down_revision: Union[str, Sequence[str], None] = '0003_financial_foundation'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add reversed_functional_usd to journal_entry_reversals
    op.add_column(
        "journal_entry_reversals",
        sa.Column("reversed_functional_usd", sa.Numeric(precision=20, scale=4), nullable=False, server_default="0"),
    )

    # 2. Drop scalar reversed_amount from financial_transactions to eliminate cross-asset scalar mixing
    op.drop_column("financial_transactions", "reversed_amount")

    # 3. Update lifecycle trigger to protect POSTED, SETTLED, and VOIDED from deletion
    op.execute("""
    CREATE OR REPLACE FUNCTION fn_guard_financial_transaction_lifecycle()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Block raw SQL DELETE on POSTED, SETTLED, and VOIDED transactions
        IF TG_OP = 'DELETE' THEN
            IF OLD.status IN ('POSTED', 'SETTLED', 'VOIDED') THEN
                RAISE EXCEPTION 'Security Violation: Cannot delete transaction % in status %',
                    OLD.id, OLD.status;
            END IF;
            RETURN OLD;
        END IF;

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

    op.execute("DROP TRIGGER IF EXISTS trg_guard_financial_transaction_lifecycle ON financial_transactions;")
    op.execute("""
    CREATE TRIGGER trg_guard_financial_transaction_lifecycle
    BEFORE UPDATE OR DELETE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION fn_guard_financial_transaction_lifecycle();
    """)

def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_guard_financial_transaction_lifecycle ON financial_transactions;")
    op.execute("""
    CREATE TRIGGER trg_guard_financial_transaction_lifecycle
    BEFORE UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION fn_guard_financial_transaction_lifecycle();
    """)

    op.add_column(
        "financial_transactions",
        sa.Column("reversed_amount", sa.Numeric(precision=38, scale=18), nullable=False, server_default="0"),
    )
    op.drop_column("journal_entry_reversals", "reversed_functional_usd")
