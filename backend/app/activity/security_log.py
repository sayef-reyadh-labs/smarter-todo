# Writes hostile or suspicious requests to the activity log: forged or malformed tokens, reused refresh tokens, denied access.
import logging
import re
import time
import uuid

from fastapi import Request
from sqlmodel import Session

from app.activity.actions import ActivityAction
from app.activity.recorder import ActivityRecorder
from app.activity.repository import ActivityRepository
from app.auth.models import AppUser
from app.database import engine
from app.errors import AppError, TokenReuseError
from app.request_info import client_ip
from app.security import decode_access_token

logger = logging.getLogger("smarter_todo")

# 401 reasons that point at tampering. A missing token and an ordinary expired one are everyday traffic and are not logged.
SUSPICIOUS_CODES = {"malformed_token", "bad_signature", "bad_algorithm", "invalid_token", "unknown_user", "invalid_refresh_token"}

# One address cannot write more than this many entries a minute, so an attacker cannot fill the table.
_WINDOW_SECONDS = 60
_MAX_PER_WINDOW = 30
_windows: dict[str, tuple[float, int]] = {}


def _allowed(ip: str) -> bool:
    now = time.monotonic()
    if len(_windows) > 10_000:
        _windows.clear()
    start, count = _windows.get(ip, (now, 0))
    if now - start > _WINDOW_SECONDS:
        start, count = now, 0
    _windows[ip] = (start, count + 1)
    return count < _MAX_PER_WINDOW


# Printable ASCII only, so a crafted path cannot smuggle control characters into the log.
def _clean(text: str) -> str:
    return re.sub(r"[^\x20-\x7e]", "?", text)[:150]


def _classify(request: Request, exc: AppError) -> tuple[ActivityAction, str] | None:
    where = _clean(f"{request.method} {request.url.path}")
    if request.url.path.endswith("/auth/login"):
        return None  # failed logins are logged by the login route itself
    if exc.status_code == 401:
        if isinstance(exc, TokenReuseError):
            return ActivityAction.TOKEN_REUSE_DETECTED, where
        if exc.code in SUSPICIOUS_CODES:
            return ActivityAction.AUTH_REJECTED, f"{exc.code}: {where}"
        return None
    if exc.status_code == 403:
        return ActivityAction.ACCESS_DENIED, _clean(f"{where}: {exc.message}")
    return None


# For a denied request the token was valid, so the person can be named; for a forged token nobody is named.
def _user_of(session: Session, request: Request, exc: AppError) -> AppUser | None:
    if isinstance(exc, TokenReuseError) and exc.user_id is not None:
        return session.get(AppUser, exc.user_id)
    if exc.status_code == 403:
        header = request.headers.get("authorization", "")
        if header.lower().startswith("bearer "):
            try:
                return session.get(AppUser, uuid.UUID(decode_access_token(header[7:])["sub"]))
            except Exception:
                return None
    return None


def log_security_event(request: Request, exc: AppError) -> None:
    event = _classify(request, exc)
    if event is None or not _allowed(client_ip(request) or "-"):
        return
    action, detail = event
    try:
        with Session(engine) as session:
            ActivityRecorder(ActivityRepository(session), request, _user_of(session, request, exc)).log(action, detail=detail)
    except Exception:
        logger.warning("Could not write a security event", exc_info=True)
