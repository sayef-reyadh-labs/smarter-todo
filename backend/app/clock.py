# One place for "now", so every table stores timestamps in UTC.
from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
