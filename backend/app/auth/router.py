# HTTP layer for /api/v1/auth: reads and writes the refresh token cookie and calls the auth service.
from typing import Annotated

from fastapi import APIRouter, Cookie, Response

from app.auth.dependencies import AuthServiceDep
from app.auth.models import AppUser
from app.auth.schemas import LoginRequest, SignupRequest, TokenResponse, UserRead
from app.config import settings

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


def _token_response(access_token: str) -> TokenResponse:
    return TokenResponse(access_token=access_token, expires_in=settings.ACCESS_TOKEN_MINUTES * 60)


# Create an account; it starts with the role "user". Logging in is a separate call.
@router.post("/signup", response_model=UserRead, status_code=201)
def signup(data: SignupRequest, service: AuthServiceDep) -> AppUser:
    return service.signup(data)


# Check the email and password; answer with an access token and set the refresh token cookie.
@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, response: Response, service: AuthServiceDep) -> TokenResponse:
    _, access_token, refresh_token = service.login(data)
    _set_refresh_cookie(response, refresh_token)
    return _token_response(access_token)


# Swap the refresh token cookie for a new access token and a new cookie.
@router.post("/refresh", response_model=TokenResponse)
def refresh(
    response: Response,
    service: AuthServiceDep,
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> TokenResponse:
    access_token, new_refresh_token = service.refresh(refresh_token)
    _set_refresh_cookie(response, new_refresh_token)
    return _token_response(access_token)


# Revoke the refresh token and clear the cookie; the access token simply expires.
@router.post("/logout", status_code=204)
def logout(
    response: Response,
    service: AuthServiceDep,
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> None:
    service.logout(refresh_token)
    response.delete_cookie(COOKIE_NAME, path=COOKIE_PATH, httponly=True, secure=True, samesite="strict")
