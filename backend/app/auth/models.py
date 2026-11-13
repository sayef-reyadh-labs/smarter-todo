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
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_token"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id", index=True)
    token_hash: str = Field(max_length=64, unique=True)  # SHA-256 of the cookie value, never the value itself
    expires_at: datetime
    revoked_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now)
