# HTTP layer for /api/v1/auth: reads and writes the refresh token cookie and calls the auth service.
import uuid
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Cookie, Response

from app.activity.actions import ActivityAction
from app.activity.dependencies import ActivityDep, UserActivityDep
from app.auth.dependencies import AuthServiceDep, CurrentUser
from app.auth.models import AppUser
from app.auth.schemas import LoginRequest, SessionRead, SignupRequest, TokenResponse, UserRead
from app.config import settings
from app.errors import AppError, ForbiddenError, TooManyRequestsError
from app.request_info import ClientDep

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

COOKIE_NAME = "refresh_token"
COOKIE_PATH = "/api/v1/auth"  # the browser sends the cookie only to these endpoints


# HttpOnly: JavaScript cannot read it. Secure: HTTPS only. SameSite=Strict: never sent from other sites.
def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=settings.REFRESH_TOKEN_DAYS * 24 * 3600,
        path=COOKIE_PATH,
        httponly=True,
        secure=True,
        samesite="strict",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path=COOKIE_PATH, httponly=True, secure=True, samesite="strict")


def _token_response(access_token: str) -> TokenResponse:
    return TokenResponse(access_token=access_token, expires_in=settings.ACCESS_TOKEN_MINUTES * 60)


# Create an account; it starts with the role "user". Logging in is a separate call.
@router.post("/signup", response_model=UserRead, status_code=HTTPStatus.CREATED)
def signup(data: SignupRequest, service: AuthServiceDep, activity: ActivityDep) -> AppUser:
    user = service.signup(data)
    activity.log(ActivityAction.SIGNUP, user=user)
    return user


def _failed_login_action(exc: AppError) -> ActivityAction:
    if isinstance(exc, TooManyRequestsError):
        return ActivityAction.LOGIN_LOCKED
    if isinstance(exc, ForbiddenError):
        return ActivityAction.LOGIN_BLOCKED
    return ActivityAction.LOGIN_FAILED


# Check the email and password; answer with an access token and set the refresh token cookie.
@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, response: Response, service: AuthServiceDep, activity: ActivityDep, client: ClientDep) -> TokenResponse:
    try:
        user, access_token, refresh_token = service.login(data, client)
    except AppError as exc:
        activity.log(_failed_login_action(exc), email=data.email, detail=exc.message)
        raise
    activity.log(ActivityAction.LOGIN, user=user)
    _set_refresh_cookie(response, refresh_token)
    return _token_response(access_token)


# Swap the refresh token cookie for a new access token and a new cookie.
@router.post("/refresh", response_model=TokenResponse)
def refresh(
    response: Response,
    service: AuthServiceDep,
    client: ClientDep,
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> TokenResponse:
    access_token, new_refresh_token = service.refresh(refresh_token, client)
    _set_refresh_cookie(response, new_refresh_token)
    return _token_response(access_token)


# Revoke the refresh token and clear the cookie; the access token simply expires.
@router.post("/logout", status_code=HTTPStatus.NO_CONTENT)
def logout(
    response: Response,
    service: AuthServiceDep,
    activity: ActivityDep,
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> None:
    user = service.logout(refresh_token)
    if user is not None:
        activity.log(ActivityAction.LOGOUT, user=user)
    _clear_refresh_cookie(response)


# The cookie is only sent under /api/v1/auth, which is why the session routes live here and not under /users.
# My login sessions: one per browser or device, newest activity first.
@router.get("/sessions", response_model=list[SessionRead])
def list_sessions(
    user: CurrentUser, service: AuthServiceDep, refresh_token: Annotated[str | None, Cookie()] = None
) -> list[SessionRead]:
    return service.list_sessions(user, refresh_token)


# End every session except this one.
@router.post("/sessions/revoke-others", status_code=HTTPStatus.NO_CONTENT)
def revoke_other_sessions(
    user: CurrentUser, service: AuthServiceDep, activity: UserActivityDep, refresh_token: Annotated[str | None, Cookie()] = None
) -> None:
    ended = service.revoke_other_sessions(user, refresh_token)
    activity.log(ActivityAction.SESSIONS_REVOKED, detail=f"{ended} other session(s)")


# Log out everywhere, including this browser.
@router.post("/sessions/revoke-all", status_code=HTTPStatus.NO_CONTENT)
def revoke_all_sessions(response: Response, user: CurrentUser, service: AuthServiceDep, activity: UserActivityDep) -> None:
    ended = service.revoke_all_sessions(user)
    activity.log(ActivityAction.SESSIONS_REVOKED, detail=f"all {ended} session(s)")
    _clear_refresh_cookie(response)


# 404 for a session that is not yours or is already over.
@router.delete("/sessions/{session_id}", status_code=HTTPStatus.NO_CONTENT)
def revoke_session(
    session_id: uuid.UUID,
    response: Response,
    user: CurrentUser,
    service: AuthServiceDep,
    activity: UserActivityDep,
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> None:
    was_current = service.revoke_session(user, session_id, refresh_token)
    activity.log(ActivityAction.SESSION_REVOKED, entity_type="session", entity_id=session_id)
    if was_current:
        _clear_refresh_cookie(response)
