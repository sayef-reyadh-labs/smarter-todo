"""task.id from integer to uuid

Revision ID: 0001_uuid_task_id
Revises:
Create Date: 2026-10-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_uuid_task_id"
down_revision = None
branch_labels = None
depends_on = None


def _id_type() -> str | None:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("task"):
        return None
    column = next(c for c in inspector.get_columns("task") if c["name"] == "id")
    return column["type"].__class__.__name__.upper()


def upgrade() -> None:
    # SQLite (local dev) is recreated by create_all; fresh databases already get a uuid id.
    if op.get_bind().dialect.name != "postgresql" or _id_type() not in {"INTEGER", "BIGINT", "SMALLINT"}:
        return
    op.execute("ALTER TABLE task ALTER COLUMN id DROP DEFAULT")
    # Integer ids map to a fixed uuid (id 7 -> 00000000-0000-0000-0000-000000000007) so no row is lost.
    op.execute("ALTER TABLE task ALTER COLUMN id TYPE uuid USING lpad(to_hex(id), 32, '0')::uuid")
    op.execute("DROP SEQUENCE IF EXISTS task_id_seq")


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql" or _id_type() != "UUID":
        return
    op.execute("ALTER TABLE task ADD COLUMN old_id SERIAL")
    op.execute("ALTER TABLE task DROP CONSTRAINT task_pkey")
    op.execute("ALTER TABLE task DROP COLUMN id")
    op.execute("ALTER TABLE task RENAME COLUMN old_id TO id")
    op.execute("ALTER TABLE task ADD PRIMARY KEY (id)")
