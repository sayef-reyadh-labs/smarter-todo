# Writes activity entries for one request, adding the caller's IP address and browser. Never breaks the request.
import logging
import uuid

from fastapi import Request

from app.activity.actions import ActivityAction
from app.activity.models import ActivityLog
from app.activity.repository import ActivityRepository
from app.activity.retention import purge_if_due
from app.auth.models import AppUser
from app.request_info import client_ip

logger = logging.getLogger("smarter_todo")


def _clip(value: str | None, length: int) -> str | None:
    return value[:length] if value else None


class ActivityRecorder:
    def __init__(self, repo: ActivityRepository, request: Request, user: AppUser | None = None) -> None:
        self.repo = repo
        self.request = request
        self.user = user

    # user defaults to the logged-in caller; for a failed login pass only the email that was typed.
    def log(
        self,
        action: ActivityAction,
        *,
        user: AppUser | None = None,
        email: str | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        detail: str | None = None,
    ) -> None:
        actor = user or self.user
        try:
            email = actor.email if actor else _clip(email.strip().lower() if email else None, 254)
            entry = ActivityLog(
                user_id=actor.id if actor else (self.repo.find_user_id(email) if email else None),
                email=email,
                action=action.value,
                entity_type=entity_type,
                entity_id=entity_id,
                detail=_clip(detail, 200),
                ip_address=_clip(client_ip(self.request), 45),
                user_agent=_clip(self.request.headers.get("user-agent"), 200),
            )
            self.repo.add(entry)
            if action == ActivityAction.LOGIN:
                purge_if_due(self.repo)
        except Exception:
            self.repo.session.rollback()
            logger.warning("Could not write the activity log", exc_info=True)
