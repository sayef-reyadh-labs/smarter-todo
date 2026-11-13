# Errors raised by services; main.py turns each one into an HTTP response, so services never import HTTP classes.
from http import HTTPStatus


class AppError(Exception):
    status_code = HTTPStatus.INTERNAL_SERVER_ERROR

    # code is a short machine-readable reason (for example "bad_signature"); it is only logged, never sent to the client.
    def __init__(self, message: str, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class BadRequestError(AppError):
    status_code = HTTPStatus.BAD_REQUEST


class UnauthorizedError(AppError):
    status_code = HTTPStatus.UNAUTHORIZED


# A refresh token that was already used came back: whoever holds it may have stolen it.
class TokenReuseError(UnauthorizedError):
    def __init__(self, message: str, user_id=None) -> None:
        super().__init__(message, code="token_reuse")
        self.user_id = user_id


class ForbiddenError(AppError):
    status_code = HTTPStatus.FORBIDDEN


class NotFoundError(AppError):
    status_code = HTTPStatus.NOT_FOUND


class UnprocessableError(AppError):
    status_code = HTTPStatus.UNPROCESSABLE_ENTITY


class TooManyRequestsError(AppError):
    status_code = HTTPStatus.TOO_MANY_REQUESTS


class ConflictError(AppError):
    status_code = HTTPStatus.CONFLICT
