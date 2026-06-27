from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.repositories.contact_repository import ContactRepository
from app.repositories.user_repository import UserRepository
from app.schemas.contact import ContactResponse, ContactsListResponse


class ContactService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._contacts = ContactRepository(db)
        self._users = UserRepository(db)

    async def list_contacts(
        self, owner_id: str, limit: int, offset: int
    ) -> ContactsListResponse:
        contacts = await self._contacts.list_by_owner(
            owner_id, limit=limit, offset=offset
        )
        total = await self._contacts.count_by_owner(owner_id)
        return ContactsListResponse(
            contacts=[ContactResponse.model_validate(c) for c in contacts],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def add_contact(
        self,
        owner_id: str,
        contact_user_id: str,
        nickname: str | None,
    ) -> tuple[ContactResponse, bool]:
        """Return (contact, created). `created` is False when the contact already existed."""
        if contact_user_id == owner_id:
            raise BadRequestException(
                code="SELF_CONTACT", detail="Cannot add yourself as a contact"
            )

        target = await self._users.get_by_id(contact_user_id)
        if not target:
            raise NotFoundException("User not found")

        existing = await self._contacts.find(owner_id, contact_user_id)
        if existing:
            return ContactResponse.model_validate(existing), False

        await self._contacts.create(
            owner_id=owner_id,
            contact_user_id=contact_user_id,
            nickname=nickname,
        )
        await self.db.commit()

        # Re-fetch with the relationship loaded.
        contact = await self._contacts.find(owner_id, contact_user_id)
        return ContactResponse.model_validate(contact), True

    async def remove_contact(self, owner_id: str, contact_id: str) -> None:
        contact = await self._contacts.get_by_id_for_owner(contact_id, owner_id)
        if not contact:
            raise NotFoundException("Contact not found")
        await self._contacts.delete(contact)
        await self.db.commit()

    async def update_nickname(
        self, owner_id: str, contact_id: str, nickname: str | None
    ) -> ContactResponse:
        contact = await self._contacts.get_by_id_for_owner(contact_id, owner_id)
        if not contact:
            raise NotFoundException("Contact not found")
        contact.nickname = nickname
        await self.db.commit()
        contact = await self._contacts.get_by_id_for_owner(contact_id, owner_id)
        return ContactResponse.model_validate(contact)
