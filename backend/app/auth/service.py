# Business rules for signup, login, refresh, logout and login sessions; no HTTP here, only errors from app/errors.py.
import uuid
from datetime import datetime, timedelta, timezone

from app.auth.models import AppUser, RefreshToken
from app.auth.repository import RefreshTokenRepository, UserRepository
from app.auth.schemas import LoginRequest, SessionRead, SignupRequest
from app.clock import utc_now
from app.config import settings
from app.errors import ConflictError, ForbiddenError, NotFoundError, TokenReuseError, TooManyRequestsError, UnauthorizedError
from app.request_info import ClientInfo
from app.security import (
    create_access_token,
    hash_password,
    hash_refresh_token,
    new_refresh_token,
    password_needs_upgrade,
    verify_against_dummy,
    verify_password,
)


# After this many wrong passwords in a row an account is locked for LOCK_MINUTES.
MAX_FAILED_LOGINS = 5
LOCK_MINUTES = 15


# The database returns naive datetimes; they are stored as UTC.
def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class AuthService:
    def __init__(self, users: UserRepository, tokens: RefreshTokenRepository) -> None:
        self.users = users
        self.tokens = tokens

    def signup(self, data: SignupRequest) -> AppUser:
        if self.users.get_by_email(data.email):
            raise ConflictError("Email already registered")
        user = AppUser(email=data.email, name=data.name, password_hash=hash_password(data.password))
        return self.users.create(user)

    # Returns (user, access token, refresh token); the refresh token goes into a cookie, never the body.
    def login(self, data: LoginRequest, client: ClientInfo) -> tuple[AppUser, str, str]:
        user = self.users.get_by_email(data.email)
        if user is None:
            verify_against_dummy(data.password)
            raise UnauthorizedError("Invalid email or password")
        # Stored in the database, not in memory, because serverless functions do not share memory.
        if user.locked_until is not None and _as_utc(user.locked_until) > utc_now():
            raise TooManyRequestsError("Too many failed logins. Try again in 15 minutes.")
        if not verify_password(data.password, user.password_hash):
            self._count_failed_login(user)
            raise UnauthorizedError("Invalid email or password")
        if user.is_banned:
            raise ForbiddenError("Account banned")
        changes: dict = {"last_login_at": utc_now()}
        if user.failed_login_count or user.locked_until is not None:
            changes.update(failed_login_count=0, locked_until=None)
        if password_needs_upgrade(user.password_hash):
            changes["password_hash"] = hash_password(data.password)
        self.users.update(user, changes)
        access_token, refresh_token = self._issue_tokens(user, client)
        return user, access_token, refresh_token

    # Each refresh token works once: it is revoked and replaced by a new one (rotation); the session stays the same.
    def refresh(self, refresh_token: str | None, client: ClientInfo) -> tuple[str, str]:
        if not refresh_token:
            raise UnauthorizedError("Not authenticated")
        stored = self.tokens.get_by_hash(hash_refresh_token(refresh_token))
        if stored is None:
            raise UnauthorizedError("Invalid refresh token", code="invalid_refresh_token")
        if stored.revoked_at is not None:
            # A token that was replaced by rotation is back while its session is still alive: it was probably
            # copied, so every session of the user ends. A token of a session that was ended on purpose is just refused.
            if self.tokens.session_is_active(stored.session_id):
                self.tokens.revoke_all_for_user(stored.user_id)
                raise TokenReuseError("Refresh token was already used", user_id=stored.user_id)
            raise UnauthorizedError("Invalid refresh token", code="session_ended")
        if _as_utc(stored.expires_at) <= utc_now():
            raise UnauthorizedError("Refresh token expired", code="expired_token")
        user = self.users.get(stored.user_id)
        if user is None:
            raise UnauthorizedError("Invalid refresh token", code="invalid_refresh_token")
        if user.is_banned:
            raise ForbiddenError("Account banned")
        self.tokens.revoke(stored)
        return self._issue_tokens(user, client, previous=stored)

    def logout(self, refresh_token: str | None) -> AppUser | None:
        if not refresh_token:
            return None
        stored = self.tokens.get_by_hash(hash_refresh_token(refresh_token))
        if stored is None:
            return None
        if stored.revoked_at is None:
            self.tokens.revoke(stored)
        return self.users.get(stored.user_id)

    def list_sessions(self, user: AppUser, refresh_token: str | None) -> list[SessionRead]:
        current = self._current_session_id(user, refresh_token)
        return [
            SessionRead(
                id=t.session_id,
                user_agent=t.user_agent,
                ip_address=t.ip_address,
                started_at=t.started_at,
                last_used_at=t.last_used_at,
                current=t.session_id == current,
            )
            for t in self.tokens.list_active(user.id)
        ]

    # Returns True when the revoked session is the one making this request, so the router can clear its cookie.
    def revoke_session(self, user: AppUser, session_id: uuid.UUID, refresh_token: str | None) -> bool:
        if self.tokens.revoke_session(user.id, session_id) == 0:
            raise NotFoundError("Session not found")
        return session_id == self._current_session_id(user, refresh_token)

    # Every session except the one making this request; returns how many were ended.
    def revoke_other_sessions(self, user: AppUser, refresh_token: str | None) -> int:
        return self.tokens.revoke_others(user.id, self._current_session_id(user, refresh_token))

    def revoke_all_sessions(self, user: AppUser) -> int:
        return self.tokens.revoke_others(user.id, None)

    def _current_session_id(self, user: AppUser, refresh_token: str | None) -> uuid.UUID | None:
        if not refresh_token:
            return None
        stored = self.tokens.get_by_hash(hash_refresh_token(refresh_token))
        return stored.session_id if stored is not None and stored.user_id == user.id else None

    def _count_failed_login(self, user: AppUser) -> None:
        count = user.failed_login_count + 1
        if count >= MAX_FAILED_LOGINS:
            self.users.update(user, {"failed_login_count": 0, "locked_until": utc_now() + timedelta(minutes=LOCK_MINUTES)})
        else:
            self.users.update(user, {"failed_login_count": count})

    def _issue_tokens(self, user: AppUser, client: ClientInfo, previous: RefreshToken | None = None) -> tuple[str, str]:
        now = utc_now()
        refresh_token = new_refresh_token()
        self.tokens.create(
            RefreshToken(
                user_id=user.id,
                session_id=previous.session_id if previous else uuid.uuid4(),
                token_hash=hash_refresh_token(refresh_token),
                user_agent=client.user_agent or (previous.user_agent if previous else None),
                ip_address=client.ip_address or (previous.ip_address if previous else None),
                expires_at=now + timedelta(days=settings.REFRESH_TOKEN_DAYS),
                started_at=previous.started_at if previous else now,
                last_used_at=now,
            )
        )
        return create_access_token(user.id, user.role), refresh_token
