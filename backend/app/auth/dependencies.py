# Per-request wiring for auth, and get_current_user: the Bearer token becomes the logged-in AppUser or a 401.
import uuid
from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.models import AppUser
from app.auth.repository import RefreshTokenRepository, UserRepository
from app.auth.service import AuthService
from app.database import SessionDep
from app.errors import UnauthorizedError
from app.security import decode_access_token

# auto_error=False so a missing header gives our own 401 instead of FastAPI's default.
_bearer = HTTPBearer(auto_error=False)


def get_auth_service(session: SessionDep) -> AuthService:
    return AuthService(UserRepository(session), RefreshTokenRepository(session))


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: SessionDep,
) -> AppUser:
    if credentials is None:
        raise UnauthorizedError("Not authenticated")
    try:
        user_id = uuid.UUID(decode_access_token(credentials.credentials)["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise UnauthorizedError("Invalid or expired token")
    user = UserRepository(session).get(user_id)
    if user is None:
        raise UnauthorizedError("Invalid or expired token")
    return user


CurrentUser = Annotated[AppUser, Depends(get_current_user)]
