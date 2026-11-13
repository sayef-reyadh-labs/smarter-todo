# Keeps the activity log from growing forever: deletes entries older than ACTIVITY_RETENTION_DAYS, at most once an hour per process.
from datetime import datetime, timedelta

from app.activity.repository import ActivityRepository
from app.clock import utc_now
from app.config import settings

_last_run: datetime | None = None


def purge_if_due(repo: ActivityRepository) -> None:
    global _last_run
    days = settings.ACTIVITY_RETENTION_DAYS
    now = utc_now()
    if days <= 0 or (_last_run is not None and now - _last_run < timedelta(hours=1)):
        return
    _last_run = now
    repo.purge_before(now - timedelta(days=days))
