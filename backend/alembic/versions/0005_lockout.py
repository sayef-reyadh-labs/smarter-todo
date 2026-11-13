"""login lockout columns on app_user

Revision ID: 0005_lockout
Revises: 0004_groups
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_lockout"
down_revision = "0004_groups"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("app_user", sa.Column("failed_login_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("app_user", sa.Column("locked_until", sa.DateTime()))


def downgrade() -> None:
    with op.batch_alter_table("app_user") as batch:
        batch.drop_column("locked_until")
        batch.drop_column("failed_login_count")
