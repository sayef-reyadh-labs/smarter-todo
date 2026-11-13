"""groups: task_group and group_member tables, and group_id and assignee_id on task

Revision ID: 0004_groups
Revises: 0003_ban
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_groups"
down_revision = "0003_ban"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "task_group",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("app_user.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "group_member",
        sa.Column("group_id", sa.Uuid(), sa.ForeignKey("task_group.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role", sa.String(10), nullable=False),
        sa.Column("joined_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_group_member_user_id", "group_member", ["user_id"])

    # A group task is deleted with its group; a personal task has group_id null.
    with op.batch_alter_table("task") as batch:
        batch.add_column(sa.Column("group_id", sa.Uuid()))
        batch.add_column(sa.Column("assignee_id", sa.Uuid()))
        batch.create_foreign_key("fk_task_group_id_task_group", "task_group", ["group_id"], ["id"], ondelete="CASCADE")
        batch.create_foreign_key("fk_task_assignee_id_app_user", "app_user", ["assignee_id"], ["id"])
        batch.create_index("ix_task_group_id", ["group_id"])
        batch.create_index("ix_task_owner_id_group_id", ["owner_id", "group_id"])


def downgrade() -> None:
    with op.batch_alter_table("task") as batch:
        batch.drop_index("ix_task_owner_id_group_id")
        batch.drop_index("ix_task_group_id")
        batch.drop_constraint("fk_task_assignee_id_app_user", type_="foreignkey")
        batch.drop_constraint("fk_task_group_id_task_group", type_="foreignkey")
        batch.drop_column("assignee_id")
        batch.drop_column("group_id")
    op.drop_index("ix_group_member_user_id", table_name="group_member")
    op.drop_table("group_member")
    op.drop_table("task_group")
