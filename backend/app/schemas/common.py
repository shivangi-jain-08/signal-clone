from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard success envelope: { "data": <payload> }."""

    data: T


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    next_cursor: str | None = None
    has_more: bool = False


class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    """Standard error envelope: { "detail": "...", "code": "..." }."""

    detail: str
    code: str
