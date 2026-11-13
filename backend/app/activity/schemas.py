# Response shapes for the admin activity list.
import uuid
from datetime import datetime, timezone

from pydantic import field_validator
from sqlmodel import SQLModel


class ActivityRead(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    email: str | None = None
    action: str
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None
    detail: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime

    # SQLite returns naive datetimes; they are stored as UTC.
    @field_validator("created_at")
    @classmethod
    def as_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class ActivityPage(SQLModel):
    items: list[ActivityRead]
    total: int
    offset: int
    limit: int


# Many failed logins from one address: a guessing attack, or one person who forgot a password.
class SuspiciousIp(SQLModel):
    ip_address: str
    failures: int
    distinct_accounts: int
    last_seen: datetime
    kinds: dict[str, int] = {}  # event type -> how many times
    emails: list[str] = []  # accounts this address tried (a few)
    user_agent: str | None = None  # browser of the latest event

    @field_validator("last_seen")
    @classmethod
    def as_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


# Many failed logins against one account.
class SuspiciousAccount(SQLModel):
    email: str
    user_id: uuid.UUID | None = None
    name: str | None = None
    is_banned: bool = False
    is_locked: bool = False
    failures: int
    distinct_ips: int
    ip_addresses: list[str] = []
    user_agent: str | None = None
    last_seen: datetime

    @field_validator("last_seen")
    @classmethod
    def as_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class SecurityReport(SQLModel):
    since: datetime
    ips: list[SuspiciousIp]
    accounts: list[SuspiciousAccount]
    events: list[ActivityRead] = []  # newest hostile events, whatever their address


class PurgeResult(SQLModel):
    deleted: int
    cutoff: datetime
