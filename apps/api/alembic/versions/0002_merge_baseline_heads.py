"""Merge baseline heads

Revision ID: 0002_merge_baseline_heads
Revises: 8c4d48483f84, 0001_auth_bootstrap
Create Date: 2026-11-24 21:05:00.000000
"""
from typing import Sequence, Union

revision: str = '0002_merge_baseline_heads'
down_revision: Union[str, Sequence[str], None] = ('8c4d48483f84', '0001_auth_bootstrap')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    pass

def downgrade() -> None:
    pass
