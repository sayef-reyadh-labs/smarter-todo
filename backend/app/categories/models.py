# Table `category`: a user's own labels for their personal tasks; only the category repository reads and writes it.
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.clock import utc_now


# Deleting a category leaves its tasks in place with category_id set to null (the default "none").
class Category(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="app_user.id", index=True)
    name: str = Field(max_length=50)
    created_at: datetime = Field(default_factory=utc_now)
