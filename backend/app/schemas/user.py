from datetime import datetime

from pydantic import BaseModel, Field


class UserPublic(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: str | None
    bio: str
    is_online: bool
    last_seen: datetime | None

    model_config = {"from_attributes": True}


class UserMe(UserPublic):
    phone_number: str


class UpdateProfileRequest(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=60)
    bio: str | None = Field(None, max_length=200)
    username: str | None = Field(None, min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$")
