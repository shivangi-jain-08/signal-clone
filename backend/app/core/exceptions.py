from fastapi import status


class AppException(Exception):
    def __init__(self, status_code: int, code: str, detail: str) -> None:
        self.status_code = status_code
        self.code = code
        self.detail = detail
        super().__init__(detail)


class NotFoundException(AppException):
    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, "NOT_FOUND", detail)


class ConflictException(AppException):
    def __init__(
        self, code: str = "ALREADY_EXISTS", detail: str = "Resource already exists"
    ) -> None:
        super().__init__(status.HTTP_409_CONFLICT, code, detail)


class BadRequestException(AppException):
    def __init__(
        self, code: str = "BAD_REQUEST", detail: str = "Bad request"
    ) -> None:
        super().__init__(status.HTTP_400_BAD_REQUEST, code, detail)


class UnauthorizedException(AppException):
    def __init__(
        self, code: str = "TOKEN_INVALID", detail: str = "Authentication required"
    ) -> None:
        super().__init__(status.HTTP_401_UNAUTHORIZED, code, detail)


class ForbiddenException(AppException):
    def __init__(
        self, code: str = "FORBIDDEN", detail: str = "Forbidden"
    ) -> None:
        super().__init__(status.HTTP_403_FORBIDDEN, code, detail)
