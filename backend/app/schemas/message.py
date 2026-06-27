from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserPublic


class ReactionEntry(BaseModel):
    emoji: str
    user_id: str


class ReplyPreview(BaseModel):
    id: str
    content: str
    sender_id: str
    deleted_at: datetime | None = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender: UserPublic
    content: str
    message_type: str
    reply_to: ReplyPreview | None = None
    deleted_at: datetime | None = None
    edited_at: datetime | None = None
    reactions: list[ReactionEntry] = []
    client_id: str | None = None
    created_at: datetime
    updated_at: datetime


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    has_more: bool
    next_cursor: str | None = None


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4096)
    message_type: str = Field(default="text")
    reply_to_id: str | None = None
    client_id: str | None = None


class EditMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4096)


class DeleteMessageResponse(BaseModel):
    id: str
    deleted_at: datetime


class ReactRequest(BaseModel):
    emoji: str = Field(
        ...,
        max_length=8,
        description="Emoji to react with. Empty string removes the reaction.",
    )


class ReactionResponse(BaseModel):
    message_id: str
    reactions: list[ReactionEntry]
