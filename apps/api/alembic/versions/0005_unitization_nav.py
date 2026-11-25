"""Investor unitization subledger and vehicle NAV snapshots

Revision ID: 0005_unitization_nav
Revises: 0004_reversal_void_protect
Create Date: 2026-11-24 22:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0005_unitization_nav'
down_revision: Union[str, Sequence[str], None] = '0004_reversal_void_protect'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create investor_unit_activities table
    op.create_table(
        "investor_unit_activities",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("investor_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("legal_entity_id", sa.String(length=36), sa.ForeignKey("legal_entities.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("activity_type", sa.String(length=32), nullable=False),
        sa.Column("unit_quantity", sa.Numeric(precision=28, scale=10), nullable=False),
        sa.Column("nav_per_unit", sa.Numeric(precision=20, scale=6), nullable=False),
        sa.Column("functional_usd_value", sa.Numeric(precision=20, scale=4), nullable=False),
        sa.Column("financial_transaction_id", sa.String(length=36), sa.ForeignKey("financial_transactions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("journal_entry_id", sa.String(length=36), sa.ForeignKey("journal_entries.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("idempotency_key", sa.String(length=128), nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("reversal_of_id", sa.String(length=36), sa.ForeignKey("investor_unit_activities.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "activity_type IN ('ISSUANCE', 'REDEMPTION_BURN', 'REVERSAL', 'ADJUSTMENT')",
            name="chk_unit_act_type",
        ),
        sa.CheckConstraint("nav_per_unit > 0", name="chk_unit_nav_pos"),
        sa.CheckConstraint("functional_usd_value >= 0", name="chk_unit_usd_nonneg"),
        sa.CheckConstraint(
            "(activity_type != 'ISSUANCE') OR (unit_quantity > 0)",
            name="chk_unit_issuance_pos",
        ),
        sa.CheckConstraint(
            "(activity_type != 'REDEMPTION_BURN') OR (unit_quantity < 0)",
            name="chk_unit_burn_neg",
        ),
    )

    op.create_index(
        "idx_unit_act_investor",
        "investor_unit_activities",
        ["investor_id", "legal_entity_id"],
    )
    op.create_index(
        "idx_unit_act_entity",
        "investor_unit_activities",
        ["legal_entity_id", "created_at"],
    )

    # 2. Append-only immutability trigger for investor_unit_activities
    op.execute("""
    CREATE OR REPLACE FUNCTION fn_guard_investor_unit_activity_immutability()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'UPDATE' THEN
            RAISE EXCEPTION 'Security Violation: investor_unit_activities records are append-only and cannot be updated (id: %)', OLD.id;
        END IF;
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Security Violation: investor_unit_activities records cannot be deleted (id: %)', OLD.id;
        END IF;
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("""
    CREATE TRIGGER trg_guard_investor_unit_activity_immutability
    BEFORE UPDATE OR DELETE ON investor_unit_activities
    FOR EACH ROW
    EXECUTE FUNCTION fn_guard_investor_unit_activity_immutability();
    """)

    # 3. Create nav_snapshots table
    op.create_table(
        "nav_snapshots",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("legal_entity_id", sa.String(length=36), sa.ForeignKey("legal_entities.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("valuation_date", sa.Date(), nullable=False),
        sa.Column("valuation_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_asset_usd", sa.Numeric(precision=20, scale=4), nullable=False),
        sa.Column("total_liability_usd", sa.Numeric(precision=20, scale=4), nullable=False),
        sa.Column("net_asset_value", sa.Numeric(precision=20, scale=4), nullable=False),
        sa.Column("units_outstanding", sa.Numeric(precision=28, scale=10), nullable=False),
        sa.Column("nav_per_unit", sa.Numeric(precision=20, scale=6), nullable=True),
        sa.Column("valuation_inputs", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("calculation_metadata", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="DRAFT", nullable=False),
        sa.Column("created_by_user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("reviewed_by_user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("published_by_user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("restatement_of_id", sa.String(length=36), sa.ForeignKey("nav_snapshots.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('DRAFT', 'REVIEWED', 'PUBLISHED', 'SUPERSEDED')",
            name="chk_nav_status",
        ),
        sa.CheckConstraint(
            "net_asset_value = (total_asset_usd - total_liability_usd)",
            name="chk_nav_formula",
        ),
        sa.CheckConstraint("units_outstanding >= 0", name="chk_nav_units_nonneg"),
    )

    op.create_index(
        "idx_nav_snapshots_entity_date",
        "nav_snapshots",
        ["legal_entity_id", "valuation_date"],
    )
    op.create_index(
        "idx_nav_snapshots_status",
        "nav_snapshots",
        ["legal_entity_id", "status"],
    )

    # 4. Lifecycle and immutability trigger for nav_snapshots
    op.execute("""
    CREATE OR REPLACE FUNCTION fn_guard_nav_snapshot_lifecycle()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'DELETE' THEN
            IF OLD.status IN ('PUBLISHED', 'SUPERSEDED') THEN
                RAISE EXCEPTION 'Security Violation: Cannot delete published or superseded NAV snapshot %', OLD.id;
            END IF;
            RETURN OLD;
        END IF;

        IF TG_OP = 'UPDATE' THEN
            IF OLD.status = 'PUBLISHED' THEN
                IF NEW.status = 'SUPERSEDED' AND
                   NEW.legal_entity_id = OLD.legal_entity_id AND
                   NEW.valuation_date = OLD.valuation_date AND
                   NEW.valuation_timestamp = OLD.valuation_timestamp AND
                   NEW.total_asset_usd = OLD.total_asset_usd AND
                   NEW.total_liability_usd = OLD.total_liability_usd AND
                   NEW.net_asset_value = OLD.net_asset_value AND
                   NEW.units_outstanding = OLD.units_outstanding AND
                   NEW.nav_per_unit IS NOT DISTINCT FROM OLD.nav_per_unit THEN
                    RETURN NEW;
                END IF;
                RAISE EXCEPTION 'Security Violation: Published NAV snapshot % is immutable and cannot be modified', OLD.id;
            END IF;

            IF OLD.status = 'SUPERSEDED' THEN
                RAISE EXCEPTION 'Security Violation: Superseded NAV snapshot % is immutable and cannot be modified', OLD.id;
            END IF;

            IF OLD.status = 'DRAFT' AND NEW.status NOT IN ('DRAFT', 'REVIEWED') THEN
                RAISE EXCEPTION 'Invalid Status Transition: DRAFT can only transition to REVIEWED';
            END IF;

            IF OLD.status = 'REVIEWED' AND NEW.status NOT IN ('REVIEWED', 'PUBLISHED', 'DRAFT') THEN
                RAISE EXCEPTION 'Invalid Status Transition: REVIEWED can only transition to PUBLISHED or back to DRAFT';
            END IF;

            NEW.updated_at = NOW();
            RETURN NEW;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("""
    CREATE TRIGGER trg_guard_nav_snapshot_lifecycle
    BEFORE UPDATE OR DELETE ON nav_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION fn_guard_nav_snapshot_lifecycle();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_guard_nav_snapshot_lifecycle ON nav_snapshots;")
    op.execute("DROP FUNCTION IF EXISTS fn_guard_nav_snapshot_lifecycle();")
    op.drop_table("nav_snapshots")

    op.execute("DROP TRIGGER IF EXISTS trg_guard_investor_unit_activity_immutability ON investor_unit_activities;")
    op.execute("DROP FUNCTION IF EXISTS fn_guard_investor_unit_activity_immutability();")
    op.drop_table("investor_unit_activities")
