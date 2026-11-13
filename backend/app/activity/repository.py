# Data access for the activity log: write one entry, read filtered pages for the admin dashboard.
from __future__ import annotations

import uuid
from datetime import datetime, time, timedelta, timezone

from sqlmodel import Session, delete, func, or_, select

from app.activity.actions import ActivityAction
from app.activity.filters import ActivityFilters
from app.activity.models import ActivityLog
from app.auth.models import AppUser

# Logins that did not get in: a wrong password, or an attempt while the account was locked.
FAILED_LOGINS = (ActivityAction.LOGIN_FAILED.value, ActivityAction.LOGIN_LOCKED.value)

# Everything that looks like an attack from one address: failed logins, forged tokens, denied access, token reuse.
HOSTILE = FAILED_LOGINS + (
    ActivityAction.AUTH_REJECTED.value,
    ActivityAction.ACCESS_DENIED.value,
    ActivityAction.TOKEN_REUSE_DETECTED.value,
)


class ActivityRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, entry: ActivityLog) -> None:
        self.session.add(entry)
        self.session.commit()

    # For a failed login: the person may exist even though the password was wrong.
    def find_user_id(self, email: str) -> uuid.UUID | None:
        return self.session.exec(select(AppUser.id).where(AppUser.email == email)).first()

    def list(self, offset: int, limit: int, filters: ActivityFilters) -> list[ActivityLog]:
        statement = (
            select(ActivityLog)
            .where(*self._clauses(filters))
            .order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def count(self, filters: ActivityFilters) -> int:
        statement = select(func.count()).select_from(ActivityLog).where(*self._clauses(filters))
        return self.session.exec(statement).one()

    # Returns how many rows were deleted.
    def purge_before(self, cutoff: datetime) -> int:
        result = self.session.exec(delete(ActivityLog).where(ActivityLog.created_at < cutoff))
        self.session.commit()
        return result.rowcount or 0

    def failed_login_counts(self, user_ids: list[uuid.UUID], since: datetime) -> dict[uuid.UUID, int]:
        if not user_ids:
            return {}
        statement = (
            select(ActivityLog.user_id, func.count())
            .where(ActivityLog.user_id.in_(user_ids), ActivityLog.action.in_(FAILED_LOGINS), ActivityLog.created_at >= since)
            .group_by(ActivityLog.user_id)
        )
        return {user_id: n for user_id, n in self.session.exec(statement).all()}

    # Rows are (ip address, hostile events, distinct accounts involved, last event), worst first.
    def hostile_by_ip(self, since: datetime, min_failures: int) -> list[tuple[str, int, int, datetime]]:
        failures = func.count()
        statement = (
            select(ActivityLog.ip_address, failures, func.count(func.distinct(ActivityLog.email)), func.max(ActivityLog.created_at))
            .where(ActivityLog.action.in_(HOSTILE), ActivityLog.created_at >= since, ActivityLog.ip_address.is_not(None))
            .group_by(ActivityLog.ip_address)
            .having(failures >= min_failures)
            .order_by(failures.desc())
            .limit(50)
        )
        return [tuple(row) for row in self.session.exec(statement).all()]

    # Rows are (email, user or None, failures, distinct IPs, last attempt), worst first.
    def failed_logins_by_account(self, since: datetime, min_failures: int) -> list[tuple[str, AppUser | None, int, int, datetime]]:
        failures = func.count()
        statement = (
            select(ActivityLog.email, failures, func.count(func.distinct(ActivityLog.ip_address)), func.max(ActivityLog.created_at))
            .where(ActivityLog.action.in_(FAILED_LOGINS), ActivityLog.created_at >= since, ActivityLog.email.is_not(None))
            .group_by(ActivityLog.email)
            .having(failures >= min_failures)
            .order_by(failures.desc())
            .limit(50)
        )
        return [(email, self.find_user(email), n, ips, last) for email, n, ips, last in self.session.exec(statement).all()]

    def find_user(self, email: str) -> AppUser | None:
        return self.session.exec(select(AppUser).where(AppUser.email == email)).first()

    # The newest hostile events from any address, for the security view.
    def recent_hostile(self, since: datetime, limit: int) -> list[ActivityLog]:
        statement = select(ActivityLog).where(ActivityLog.action.in_(HOSTILE), ActivityLog.created_at >= since).order_by(ActivityLog.created_at.desc()).limit(limit)
        return list(self.session.exec(statement).all())

    # Newest first; used to describe the addresses listed in the report (which emails they tried, which browser).
    def hostile_for_ips(self, since: datetime, ips: list[str]) -> list[ActivityLog]:
        if not ips:
            return []
        statement = (
            select(ActivityLog)
            .where(ActivityLog.action.in_(HOSTILE), ActivityLog.created_at >= since, ActivityLog.ip_address.in_(ips))
            .order_by(ActivityLog.created_at.desc())
            .limit(2000)
        )
        return list(self.session.exec(statement).all())

    def failed_logins_for_emails(self, since: datetime, emails: list[str]) -> list[ActivityLog]:
        if not emails:
            return []
        statement = (
            select(ActivityLog)
            .where(ActivityLog.action.in_(FAILED_LOGINS), ActivityLog.created_at >= since, ActivityLog.email.in_(emails))
            .order_by(ActivityLog.created_at.desc())
            .limit(2000)
        )
        return list(self.session.exec(statement).all())

    # SQLModel needs timezone-aware datetimes; a day starts at 00:00 UTC.
    @staticmethod
    def _start_of_day(day) -> datetime:
        return datetime.combine(day, time.min, tzinfo=timezone.utc)

    @classmethod
    def _clauses(cls, f: ActivityFilters) -> list:
        clauses = []
        if f.user_id is not None:
            clauses.append(ActivityLog.user_id == f.user_id)
        if f.action is not None:
            clauses.append(ActivityLog.action == f.action)
        if f.q:
            clauses.append(or_(ActivityLog.email.icontains(f.q, autoescape=True), ActivityLog.detail.icontains(f.q, autoescape=True)))
        if f.date_from is not None:
            clauses.append(ActivityLog.created_at >= cls._start_of_day(f.date_from))
        if f.date_to is not None:
            clauses.append(ActivityLog.created_at < cls._start_of_day(f.date_to + timedelta(days=1)))
        return clauses
