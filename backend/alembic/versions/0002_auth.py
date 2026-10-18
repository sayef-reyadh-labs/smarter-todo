"""accounts: app_user and refresh_token tables, and task.owner_id

Revision ID: 0002_auth
Revises: 0001_uuid_task_id
Create Date: 2026-10-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_auth"
down_revision = "0001_uuid_task_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "app_user",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", sa.String(10), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("email", name="uq_app_user_email"),
    )
    op.create_table(
        "refresh_token",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("token_hash", name="uq_refresh_token_token_hash"),
    )
    op.create_index("ix_refresh_token_user_id", "refresh_token", ["user_id"])

    # Tasks made before accounts existed have no owner, so the demo data is removed.
    op.execute("DELETE FROM task")
    # batch mode rebuilds the table on SQLite, which cannot add a NOT NULL foreign key column in place.
    with op.batch_alter_table("task") as batch:
        batch.add_column(sa.Column("owner_id", sa.Uuid(), nullable=False))
        batch.create_foreign_key("fk_task_owner_id_app_user", "app_user", ["owner_id"], ["id"])
        batch.create_index("ix_task_owner_id", ["owner_id"])


def downgrade() -> None:
    with op.batch_alter_table("task") as batch:
        batch.drop_index("ix_task_owner_id")
        batch.drop_constraint("fk_task_owner_id_app_user", type_="foreignkey")
        batch.drop_column("owner_id")
    op.drop_index("ix_refresh_token_user_id", table_name="refresh_token")
    op.drop_table("refresh_token")
    op.drop_table("app_user")
