"""Platform investment configuration table for admin-managed platform total

Revision ID: 0008_platform_inv_config
Revises: 0007_user_investment_record
Create Date: 2026-11-26 23:35:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0008_platform_inv_config'
down_revision: Union[str, Sequence[str], None] = '0007_user_investment_record'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "platform_investment_configurations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("amount", sa.Numeric(precision=38, scale=18), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column("updated_by_admin_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("last_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_index("ix_platform_investment_configurations_updated_by_admin_id", "platform_investment_configurations", ["updated_by_admin_id"])


def downgrade() -> None:
    op.drop_index("ix_platform_investment_configurations_updated_by_admin_id", table_name="platform_investment_configurations")
    op.drop_table("platform_investment_configurations")
