"""ban columns on app_user

Revision ID: 0003_ban
Revises: 0002_auth
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_ban"
down_revision = "0002_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("app_user", sa.Column("is_banned", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("app_user", sa.Column("banned_at", sa.DateTime()))
    op.add_column("app_user", sa.Column("ban_reason", sa.String(500)))


def downgrade() -> None:
    with op.batch_alter_table("app_user") as batch:
        batch.drop_column("ban_reason")
        batch.drop_column("banned_at")
        batch.drop_column("is_banned")
