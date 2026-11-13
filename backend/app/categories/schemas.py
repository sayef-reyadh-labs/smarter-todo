# Request and response shapes for categories.
import uuid
from datetime import datetime, timezone
from typing import Annotated

from pydantic import StringConstraints, field_validator
from sqlmodel import SQLModel

CategoryName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class CategoryCreate(SQLModel):
    name: CategoryName


class CategoryUpdate(SQLModel):
    name: CategoryName


# task_count is how many of the owner's personal tasks use the category.
class CategoryRead(SQLModel):
    id: uuid.UUID
    name: str
    task_count: int = 0
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def as_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
