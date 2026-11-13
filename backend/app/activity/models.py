# Table `activity_log`: one row per thing a user did; only the activity repository reads and writes it.
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.clock import utc_now


# Never put passwords, tokens or hashes in any column. email is a snapshot, so the row stays readable if the user is deleted.
class ActivityLog(SQLModel, table=True):
    __tablename__ = "activity_log"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="app_user.id", index=True)
    email: str | None = Field(default=None, max_length=254)
    action: str = Field(max_length=40, index=True)
    entity_type: str | None = Field(default=None, max_length=20)
    entity_id: uuid.UUID | None = None
    detail: str | None = Field(default=None, max_length=200)
    ip_address: str | None = Field(default=None, max_length=45)
    user_agent: str | None = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=utc_now, index=True)
