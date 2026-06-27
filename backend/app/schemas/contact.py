from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserPublic


class ContactResponse(BaseModel):
    id: str
    contact_user: UserPublic
    nickname: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactsListResponse(BaseModel):
    contacts: list[ContactResponse]
    total: int
    limit: int
    offset: int


class AddContactRequest(BaseModel):
    contact_user_id: str = Field(..., description="UUID of the user to add.")
    nickname: str | None = Field(None, max_length=60)


class UpdateContactRequest(BaseModel):
    nickname: str | None = Field(None, max_length=60)
