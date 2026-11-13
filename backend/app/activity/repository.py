# Data access for the activity log: write one entry, read filtered pages for the admin dashboard.
import uuid
from datetime import datetime, time, timedelta, timezone

from sqlmodel import Session, func, or_, select

from app.activity.filters import ActivityFilters
from app.activity.models import ActivityLog
from app.auth.models import AppUser


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
