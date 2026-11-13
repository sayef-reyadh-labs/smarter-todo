# Business rules for signup, login, refresh and logout; no HTTP here, only errors from app/errors.py.
from datetime import datetime, timedelta, timezone

from app.auth.models import AppUser, RefreshToken
from app.auth.repository import RefreshTokenRepository, UserRepository
from app.auth.schemas import LoginRequest, SignupRequest
from app.clock import utc_now
from app.config import settings
from app.errors import ConflictError, UnauthorizedError
from app.security import (
    create_access_token,
    hash_password,
    hash_refresh_token,
    new_refresh_token,
    verify_against_dummy,
    verify_password,
)


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
    def login(self, data: LoginRequest) -> tuple[AppUser, str, str]:
        user = self.users.get_by_email(data.email)
        if user is None:
            verify_against_dummy(data.password)
            raise UnauthorizedError("Invalid email or password")
        if not verify_password(data.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")
        access_token, refresh_token = self._issue_tokens(user)
        return user, access_token, refresh_token

    # Each refresh token works once: it is revoked and replaced by a new one (rotation).
    def refresh(self, refresh_token: str | None) -> tuple[str, str]:
        if not refresh_token:
            raise UnauthorizedError("Not authenticated")
        stored = self.tokens.get_by_hash(hash_refresh_token(refresh_token))
        if stored is None:
            raise UnauthorizedError("Invalid refresh token")
        if stored.revoked_at is not None:
            self.tokens.revoke_all_for_user(stored.user_id)
            raise UnauthorizedError("Refresh token was already used")
        if _as_utc(stored.expires_at) <= utc_now():
            raise UnauthorizedError("Refresh token expired")
        user = self.users.get(stored.user_id)
        if user is None:
            raise UnauthorizedError("Invalid refresh token")
        self.tokens.revoke(stored)
        return self._issue_tokens(user)

    def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        stored = self.tokens.get_by_hash(hash_refresh_token(refresh_token))
        if stored is not None and stored.revoked_at is None:
            self.tokens.revoke(stored)

    def _issue_tokens(self, user: AppUser) -> tuple[str, str]:
        refresh_token = new_refresh_token()
        self.tokens.create(
            RefreshToken(
                user_id=user.id,
                token_hash=hash_refresh_token(refresh_token),
                expires_at=utc_now() + timedelta(days=settings.REFRESH_TOKEN_DAYS),
            )
        )
        return create_access_token(user.id, user.role), refresh_token
