from datetime import datetime

from pydantic import BaseModel, Field


class UserPublic(BaseModel):
    """Public-facing user profile. Omits phone_number."""

    id: str
    username: str
    display_name: str
    avatar_url: str | None
    bio: str
    is_online: bool
    last_seen: datetime | None

    model_config = {"from_attributes": True}


class UserMe(UserPublic):
    """Full profile for the authenticated user. Includes private fields."""

    phone_number: str
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=60)
    bio: str | None = Field(None, max_length=200)
    username: str | None = Field(
        None, min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$"
    )
    avatar_url: str | None = Field(None, max_length=500)
