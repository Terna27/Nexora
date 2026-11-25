"""Auth bootstrap with table validation

Revision ID: 0001_auth_bootstrap
Revises: 
Create Date: 2026-11-24 21:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_auth_bootstrap'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = ('auth_bootstrap',)
depends_on: Union[str, Sequence[str], None] = None

REQUIRED_AUTH_TABLES = {
    "users": {
        "columns": {
            "id", "full_name", "email", "password_hash", "role",
            "is_active", "is_verified", "mfa_enabled", "mfa_secret",
            "created_at", "updated_at"
        },
        "pk": "id",
    },
    "user_sessions": {
        "columns": {
            "id", "user_id", "session_token_hash", "ip_address",
            "user_agent", "expires_at", "revoked_at", "created_at"
        },
        "pk": "id",
        "fks": {"user_id": ("users", "id")},
    },
    "email_verification_tokens": {
        "columns": {"id", "user_id", "token_hash", "expires_at", "used_at", "created_at"},
        "pk": "id",
        "fks": {"user_id": ("users", "id")},
    },
    "password_reset_tokens": {
        "columns": {"id", "user_id", "token_hash", "expires_at", "used_at", "created_at"},
        "pk": "id",
        "fks": {"user_id": ("users", "id")},
    },
    "auth_audit_events": {
        "columns": {"id", "user_id", "event_type", "ip_address", "details", "created_at"},
        "pk": "id",
        "fks": {"user_id": ("users", "id")},
    },
}

def validate_existing_table(inspector: sa.Inspector, table_name: str, spec: dict):
    existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
    missing_cols = spec["columns"] - existing_cols
    if missing_cols:
        raise RuntimeError(
            f"Existing table '{table_name}' is structurally incompatible: missing columns {missing_cols}"
        )
    pk_cols = inspector.get_pk_constraint(table_name).get("constrained_columns", [])
    if spec["pk"] not in pk_cols:
        raise RuntimeError(
            f"Existing table '{table_name}' is missing expected primary key on '{spec['pk']}'"
        )
    if "fks" in spec:
        existing_fks = {
            tuple(fk["constrained_columns"]): (fk["referred_table"], fk["referred_columns"])
            for fk in inspector.get_foreign_keys(table_name)
        }
        for col_name, (ref_table, ref_col) in spec["fks"].items():
            found = False
            for c_cols, (r_table, r_cols) in existing_fks.items():
                if col_name in c_cols and r_table == ref_table and ref_col in r_cols:
                    found = True
                    break
            if not found:
                raise RuntimeError(
                    f"Existing table '{table_name}' is missing expected foreign key constraint from '{col_name}' to '{ref_table}.{ref_col}'"
                )

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "users" in existing_tables:
        for table_name, spec in REQUIRED_AUTH_TABLES.items():
            if table_name not in existing_tables:
                raise RuntimeError(
                    f"Incomplete authentication schema: table '{table_name}' is missing while 'users' exists."
                )
            validate_existing_table(inspector, table_name, spec)
        return

    # Fresh database: explicitly create authentication schema
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="investor"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("mfa_secret", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_token_hash", sa.String(length=64), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])
    op.create_index("ix_user_sessions_session_token_hash", "user_sessions", ["session_token_hash"], unique=True)
    op.create_index("ix_user_sessions_expires_at", "user_sessions", ["expires_at"])

    op.create_table(
        "email_verification_tokens",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_email_verification_tokens_user_id", "email_verification_tokens", ["user_id"])
    op.create_index("ix_email_verification_tokens_token_hash", "email_verification_tokens", ["token_hash"], unique=True)

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=True)

    op.create_table(
        "auth_audit_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("details", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_auth_audit_events_user_id", "auth_audit_events", ["user_id"])
    op.create_index("ix_auth_audit_events_created_at", "auth_audit_events", ["created_at"])

def downgrade() -> None:
    op.drop_table("auth_audit_events")
    op.drop_table("password_reset_tokens")
    op.drop_table("email_verification_tokens")
    op.drop_table("user_sessions")
    op.drop_table("users")
