from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserPublic


class ReactionSummary(BaseModel):
    emoji: str
    count: int
    user_ids: list[str]


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender: UserPublic
    content: str
    message_type: str
    reply_to_id: str | None = None
    deleted_at: datetime | None = None
    edited_at: datetime | None = None
    reactions: list[ReactionSummary] = []
    status: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str = Field(..., max_length=4096)
    message_type: str = Field(default="text")
    reply_to_id: str | None = None
    client_id: str | None = None


class EditMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4096)


class ReactRequest(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=8)
