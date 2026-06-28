from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.conversation import MessagePreview, ParticipantDetail


class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    description: str = Field(default="", max_length=500)
    avatar_url: str | None = Field(default=None, max_length=500)
    member_ids: list[str] = Field(default_factory=list)


class UpdateGroupRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    description: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = None


class AddMembersRequest(BaseModel):
    user_ids: list[str] = Field(..., min_length=1)


class GroupDetailResponse(BaseModel):
    id: str
    conversation_id: str
    name: str
    description: str
    avatar_url: str | None
    created_by: str
    participants: list[ParticipantDetail]
    last_message: MessagePreview | None = None
    unread_count: int = 0
    is_archived: bool = False
    updated_at: datetime
    created_at: datetime
