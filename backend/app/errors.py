# Errors raised by services; main.py turns each one into an HTTP response, so services never import HTTP classes.
class AppError(Exception):
    status_code = 500

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class BadRequestError(AppError):
    status_code = 400


class UnauthorizedError(AppError):
    status_code = 401


class ConflictError(AppError):
    status_code = 409
