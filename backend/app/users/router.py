# HTTP layer for /api/v1/users/me: the profile of whoever is logged in.
from fastapi import APIRouter

from app.auth.dependencies import CurrentUser
from app.auth.models import AppUser
from app.auth.schemas import UserRead
from app.users.dependencies import UserServiceDep
from app.users.schemas import PasswordChange, ProfileUpdate

router = APIRouter(prefix="/api/v1/users", tags=["users"])


# The logged-in user; the response schema leaves out the password hash.
@router.get("/me", response_model=UserRead)
def get_me(user: CurrentUser) -> AppUser:
    return user


@router.patch("/me", response_model=UserRead)
def update_me(user: CurrentUser, data: ProfileUpdate, service: UserServiceDep) -> AppUser:
    return service.update_profile(user, data)


# 204 on success; 400 if the current password is wrong. All sessions are logged out.
@router.post("/me/password", status_code=204)
def change_password(user: CurrentUser, data: PasswordChange, service: UserServiceDep) -> None:
    service.change_password(user, data)
