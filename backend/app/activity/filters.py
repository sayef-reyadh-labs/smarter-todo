# Query filters of the activity list.
import uuid
from dataclasses import dataclass
from datetime import date
from typing import Annotated

from fastapi import Depends, Query

from app.activity.actions import ActivityAction


@dataclass(frozen=True)
class ActivityFilters:
    user_id: uuid.UUID | None = None
    action: str | None = None
    q: str | None = None  # part of the email or the detail
    date_from: date | None = None  # inclusive, UTC
    date_to: date | None = None  # inclusive, UTC


def activity_filters(
    user_id: uuid.UUID | None = None,
    action: ActivityAction | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> ActivityFilters:
    return ActivityFilters(user_id, action.value if action else None, (q or "").strip() or None, date_from, date_to)


ActivityFiltersDep = Annotated[ActivityFilters, Depends(activity_filters)]
