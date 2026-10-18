# Per-request wiring for the profile endpoints: session -> repositories -> service.
from typing import Annotated

from fastapi import Depends

from app.auth.repository import RefreshTokenRepository, UserRepository
from app.database import SessionDep
from app.users.service import UserService


def get_user_service(session: SessionDep) -> UserService:
    return UserService(UserRepository(session), RefreshTokenRepository(session))


UserServiceDep = Annotated[UserService, Depends(get_user_service)]
