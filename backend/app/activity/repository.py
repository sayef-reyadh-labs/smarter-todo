# Data access for the activity log: write one entry, read pages for the admin dashboard.
import uuid

from sqlmodel import Session, func, select

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

    def list(self, offset: int, limit: int, user_id: uuid.UUID | None, action: str | None) -> list[ActivityLog]:
        statement = (
            select(ActivityLog)
            .where(*self._filters(user_id, action))
            .order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def count(self, user_id: uuid.UUID | None, action: str | None) -> int:
        statement = select(func.count()).select_from(ActivityLog).where(*self._filters(user_id, action))
        return self.session.exec(statement).one()

    @staticmethod
    def _filters(user_id: uuid.UUID | None, action: str | None) -> list:
        filters = []
        if user_id is not None:
            filters.append(ActivityLog.user_id == user_id)
        if action is not None:
            filters.append(ActivityLog.action == action)
        return filters
