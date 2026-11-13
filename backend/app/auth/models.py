# Tables for accounts (`app_user`) and login sessions (`refresh_token`); only the auth repository reads and writes them.
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.clock import utc_now


class AppUser(SQLModel, table=True):
    # `user` is a reserved word in PostgreSQL, so the table is called app_user.
    __tablename__ = "app_user"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(max_length=254, unique=True)  # always stored lowercase
    name: str = Field(max_length=100)
    password_hash: str  # Argon2 hash; never sent to the client
    role: str = Field(default="user", max_length=10)
    is_banned: bool = False
    banned_at: datetime | None = None
    ban_reason: str | None = Field(default=None, max_length=500)
    failed_login_count: int = 0  # wrong passwords in a row; reset on a successful login
    locked_until: datetime | None = None  # logins are refused until this moment
    last_login_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


# One row per refresh token; a login session is a chain of rotated tokens that share a session_id.
class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_token"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id", index=True)
    session_id: uuid.UUID = Field(default_factory=uuid.uuid4, index=True)
    token_hash: str = Field(max_length=64, unique=True)  # SHA-256 of the cookie value, never the value itself
    user_agent: str | None = Field(default=None, max_length=200)
    ip_address: str | None = Field(default=None, max_length=45)
    expires_at: datetime
    revoked_at: datetime | None = None
    started_at: datetime = Field(default_factory=utc_now)  # when the person logged in
    last_used_at: datetime = Field(default_factory=utc_now)  # last token rotation
    created_at: datetime = Field(default_factory=utc_now)
