from pydantic import BaseModel

from app.schemas.user import UserPublic


class ContactResponse(BaseModel):
    id: str
    contact_user: UserPublic
    nickname: str | None

    model_config = {"from_attributes": True}


class AddContactRequest(BaseModel):
    phone_number: str


class UpdateContactRequest(BaseModel):
    nickname: str | None = None
