from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserPublic


class ConversationResponse(BaseModel):
    id: str
    type: str
    last_message: "MessagePreview | None" = None
    unread_count: int = 0
    is_archived: bool = False
    participants: list[UserPublic] = []
    group_name: str | None = None
    group_avatar_url: str | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessagePreview(BaseModel):
    id: str
    content: str
    message_type: str
    sender_id: str
    created_at: datetime
    deleted_at: datetime | None = None


class CreateDirectConversationRequest(BaseModel):
    user_id: str


class ArchiveConversationRequest(BaseModel):
    is_archived: bool


# Resolve forward reference
ConversationResponse.model_rebuild()
