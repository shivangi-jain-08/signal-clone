from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserPublic


class GroupInfo(BaseModel):
    id: str
    name: str
    description: str
    avatar_url: str | None
    created_by: str

    model_config = {"from_attributes": True}


class MessagePreview(BaseModel):
    id: str
    content: str
    message_type: str
    sender_id: str
    created_at: datetime
    deleted_at: datetime | None = None


class ParticipantDetail(BaseModel):
    user: UserPublic
    is_admin: bool
    joined_at: datetime
    last_read_at: datetime | None


class ConversationResponse(BaseModel):
    """Used in the list and search responses."""

    id: str
    type: str
    last_message: MessagePreview | None = None
    unread_count: int = 0
    is_archived: bool = False
    participants: list[UserPublic] = []
    group: GroupInfo | None = None
    updated_at: datetime


class ConversationDetailResponse(BaseModel):
    """Used for GET /conversations/{id} — includes admin flag and read cursors."""

    id: str
    type: str
    last_message: MessagePreview | None = None
    unread_count: int = 0
    is_archived: bool = False
    participants: list[ParticipantDetail] = []
    group: GroupInfo | None = None
    updated_at: datetime


class ConversationsListResponse(BaseModel):
    conversations: list[ConversationResponse]
    total: int
    limit: int
    offset: int


class ConversationSearchResult(ConversationResponse):
    """Conversation list item with an optional message-match snippet."""

    match_context: str | None = None


class CreateDirectConversationRequest(BaseModel):
    target_user_id: str


class ArchiveConversationRequest(BaseModel):
    is_archived: bool


class ReadResponse(BaseModel):
    last_read_at: datetime
