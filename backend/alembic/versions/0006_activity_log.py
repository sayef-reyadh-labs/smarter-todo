"""activity_log: what users did (logins, task and group actions) for the admin dashboard

Revision ID: 0006_activity_log
Revises: 0005_lockout
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_activity_log"
down_revision = "0005_lockout"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SET NULL keeps the history readable (the email snapshot stays) if a user is ever deleted.
    op.create_table(
        "activity_log",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("entity_type", sa.String(20), nullable=True),
        sa.Column("entity_id", sa.Uuid(), nullable=True),
        sa.Column("detail", sa.String(200), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_activity_log_user_id", "activity_log", ["user_id"])
    op.create_index("ix_activity_log_action", "activity_log", ["action"])
    op.create_index("ix_activity_log_created_at", "activity_log", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_activity_log_created_at", table_name="activity_log")
    op.drop_index("ix_activity_log_action", table_name="activity_log")
    op.drop_index("ix_activity_log_user_id", table_name="activity_log")
    op.drop_table("activity_log")
