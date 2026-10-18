# Request and response shapes for signup, login and the user; the password hash is never in a response schema.
import uuid
from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator, EmailStr, StringConstraints, field_validator
from sqlmodel import SQLModel

# Emails are compared in lowercase, so "A@x.com" and "a@x.com" are the same account.
Email = Annotated[EmailStr, AfterValidator(lambda value: value.lower())]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
NewPassword = Annotated[str, StringConstraints(min_length=8, max_length=128)]


class SignupRequest(SQLModel):
    email: Email
    name: Name
    password: NewPassword


class LoginRequest(SQLModel):
    email: Email
    password: Annotated[str, StringConstraints(min_length=1, max_length=128)]


class TokenResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until the access token expires


class UserRead(SQLModel):
    id: uuid.UUID
    email: str
    name: str
    role: str
    created_at: datetime

    # SQLite returns naive datetimes; they are stored as UTC.
    @field_validator("created_at")
    @classmethod
    def as_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
