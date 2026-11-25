"""Admin durable audit log schema with PostgreSQL immutability trigger

Revision ID: 0006_admin_audit_log
Revises: 0005_unitization_nav
Create Date: 2026-11-25 08:50:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0006_admin_audit_log'
down_revision: Union[str, Sequence[str], None] = '0005_unitization_nav'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create admin_audit_logs table
    op.create_table(
        "admin_audit_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("admin_user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("target_entity", sa.String(length=64), nullable=True),
        sa.Column("target_id", sa.String(length=64), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("outcome", sa.String(length=32), nullable=False, server_default="SUCCESS"),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_index("ix_admin_audit_logs_admin_user_id", "admin_audit_logs", ["admin_user_id"])
    op.create_index("ix_admin_audit_logs_action", "admin_audit_logs", ["action"])
    op.create_index("ix_admin_audit_logs_target_entity", "admin_audit_logs", ["target_entity"])
    op.create_index("ix_admin_audit_logs_target_id", "admin_audit_logs", ["target_id"])
    op.create_index("ix_admin_audit_logs_created_at", "admin_audit_logs", ["created_at"])

    # 2. Database-enforced immutability trigger for audit log entries
    op.execute("""
    CREATE OR REPLACE FUNCTION fn_guard_admin_audit_logs_immutability()
    RETURNS TRIGGER AS $$
    BEGIN
        RAISE EXCEPTION 'Immutability Violation: Admin audit logs cannot be updated or deleted.';
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("""
    CREATE TRIGGER trg_guard_admin_audit_logs_immutability
    BEFORE UPDATE OR DELETE ON admin_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION fn_guard_admin_audit_logs_immutability();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_guard_admin_audit_logs_immutability ON admin_audit_logs;")
    op.execute("DROP FUNCTION IF EXISTS fn_guard_admin_audit_logs_immutability();")
    op.drop_index("ix_admin_audit_logs_created_at", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_target_id", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_target_entity", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_action", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_admin_user_id", table_name="admin_audit_logs")
    op.drop_table("admin_audit_logs")
