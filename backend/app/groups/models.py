# Tables for groups (`task_group`) and who is in them (`group_member`); only the group repository reads and writes them.
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.clock import utc_now
from app.rbac import DELEGABLE_GROUP_PERMISSIONS

# What a new member may do besides reading: the owner can take any of it away (or give it back) per member.
DEFAULT_GRANTS = ",".join(p.value for p in DELEGABLE_GROUP_PERMISSIONS)


class TaskGroup(SQLModel, table=True):
    # `group` is a reserved word in PostgreSQL, so the table is called task_group.
    __tablename__ = "task_group"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=100)
    created_by: uuid.UUID = Field(foreign_key="app_user.id")
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


# One row per member; the group creator is the only "owner", everyone else is a "member".
class GroupMember(SQLModel, table=True):
    __tablename__ = "group_member"

    group_id: uuid.UUID = Field(foreign_key="task_group.id", primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id", primary_key=True, index=True)
    role: str = Field(max_length=10)
    # Comma-separated Permission values the owner gave this member (see app/groups/grants.py); the owner row ignores it.
    granted_permissions: str = Field(default=DEFAULT_GRANTS, max_length=300)
    joined_at: datetime = Field(default_factory=utc_now)
