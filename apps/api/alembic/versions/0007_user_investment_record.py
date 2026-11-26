"""User investment record table for administrative investment tracking

Revision ID: 0007_user_investment_record
Revises: 0006_admin_audit_log
Create Date: 2026-11-26 22:25:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0007_user_investment_record'
down_revision: Union[str, Sequence[str], None] = '0006_admin_audit_log'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_investment_records",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(precision=38, scale=18), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column("updated_by_admin_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("last_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_index("ix_user_investment_records_user_id", "user_investment_records", ["user_id"], unique=True)
    op.create_index("ix_user_investment_records_updated_by_admin_id", "user_investment_records", ["updated_by_admin_id"])


def downgrade() -> None:
    op.drop_index("ix_user_investment_records_updated_by_admin_id", table_name="user_investment_records")
    op.drop_index("ix_user_investment_records_user_id", table_name="user_investment_records")
    op.drop_table("user_investment_records")
