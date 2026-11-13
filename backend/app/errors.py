# Errors raised by services; main.py turns each one into an HTTP response, so services never import HTTP classes.
from http import HTTPStatus


class AppError(Exception):
    status_code = HTTPStatus.INTERNAL_SERVER_ERROR

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class BadRequestError(AppError):
    status_code = HTTPStatus.BAD_REQUEST


class UnauthorizedError(AppError):
    status_code = HTTPStatus.UNAUTHORIZED


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
