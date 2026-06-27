from pydantic import BaseModel, Field

from app.schemas.user import UserPublic


class GroupMember(UserPublic):
    is_admin: bool = False


class GroupResponse(BaseModel):
    id: str
    conversation_id: str
    name: str
    description: str
    avatar_url: str | None
    created_by: str
    members: list[GroupMember] = []

    model_config = {"from_attributes": True}


class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    description: str = Field(default="", max_length=200)
    member_ids: list[str] = Field(..., min_length=1)


class UpdateGroupRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=60)
    description: str | None = Field(None, max_length=200)


class AddMemberRequest(BaseModel):
    user_id: str
