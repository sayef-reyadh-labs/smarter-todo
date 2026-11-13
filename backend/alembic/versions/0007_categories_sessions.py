"""categories and sessions: task categories, device info on login sessions, last login time, ip index

Revision ID: 0007_categories_sessions
Revises: 0006_activity_log
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_categories_sessions"
down_revision = "0006_activity_log"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "category",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("owner_id", "name", name="uq_category_owner_name"),
    )
    op.create_index("ix_category_owner_id", "category", ["owner_id"])

    # A deleted category leaves its tasks in place, uncategorized.
    with op.batch_alter_table("task") as batch:
        batch.add_column(sa.Column("category_id", sa.Uuid()))
        batch.create_foreign_key("fk_task_category_id_category", "category", ["category_id"], ["id"], ondelete="SET NULL")
        batch.create_index("ix_task_category_id", ["category_id"])

    with op.batch_alter_table("app_user") as batch:
        batch.add_column(sa.Column("last_login_at", sa.DateTime()))

    # Existing login sessions become one-token sessions: their own id is the session id.
    with op.batch_alter_table("refresh_token") as batch:
        batch.add_column(sa.Column("session_id", sa.Uuid()))
        batch.add_column(sa.Column("user_agent", sa.String(200)))
        batch.add_column(sa.Column("ip_address", sa.String(45)))
        batch.add_column(sa.Column("started_at", sa.DateTime()))
        batch.add_column(sa.Column("last_used_at", sa.DateTime()))
    op.execute("UPDATE refresh_token SET session_id = id, started_at = created_at, last_used_at = created_at")
    with op.batch_alter_table("refresh_token") as batch:
        batch.alter_column("session_id", existing_type=sa.Uuid(), nullable=False)
        batch.alter_column("started_at", existing_type=sa.DateTime(), nullable=False)
        batch.alter_column("last_used_at", existing_type=sa.DateTime(), nullable=False)
        batch.create_index("ix_refresh_token_session_id", ["session_id"])

    op.create_index("ix_activity_log_ip_address", "activity_log", ["ip_address"])

    # Existing members keep what they could do before: create, edit and assign tasks.
    with op.batch_alter_table("group_member") as batch:
        batch.add_column(
            sa.Column(
                "granted_permissions",
                sa.String(300),
                nullable=False,
                server_default="group:tasks:create,group:tasks:update,group:tasks:assign",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("group_member") as batch:
        batch.drop_column("granted_permissions")
    op.drop_index("ix_activity_log_ip_address", table_name="activity_log")
    with op.batch_alter_table("refresh_token") as batch:
        batch.drop_index("ix_refresh_token_session_id")
        batch.drop_column("last_used_at")
        batch.drop_column("started_at")
        batch.drop_column("ip_address")
        batch.drop_column("user_agent")
        batch.drop_column("session_id")
    with op.batch_alter_table("app_user") as batch:
        batch.drop_column("last_login_at")
    with op.batch_alter_table("task") as batch:
        batch.drop_index("ix_task_category_id")
        batch.drop_constraint("fk_task_category_id_category", type_="foreignkey")
        batch.drop_column("category_id")
    op.drop_index("ix_category_owner_id", table_name="category")
    op.drop_table("category")
