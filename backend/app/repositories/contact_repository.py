from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.contact import Contact
from app.repositories.base import BaseRepository


class ContactRepository(BaseRepository[Contact]):
    model = Contact

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    async def list_by_owner(
        self, owner_id: str, limit: int = 50, offset: int = 0
    ) -> list[Contact]:
        result = await self.db.execute(
            select(Contact)
            .where(Contact.owner_id == owner_id)
            .options(selectinload(Contact.contact_user))
            .order_by(Contact.created_at)
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def count_by_owner(self, owner_id: str) -> int:
        result = await self.db.execute(
            select(func.count()).where(Contact.owner_id == owner_id)
        )
        return result.scalar_one()

    async def find(self, owner_id: str, contact_user_id: str) -> Contact | None:
        result = await self.db.execute(
            select(Contact)
            .where(Contact.owner_id == owner_id, Contact.contact_user_id == contact_user_id)
            .options(selectinload(Contact.contact_user))
        )
        return result.scalar_one_or_none()

    async def get_by_id_for_owner(
        self, contact_id: str, owner_id: str
    ) -> Contact | None:
        result = await self.db.execute(
            select(Contact)
            .where(Contact.id == contact_id, Contact.owner_id == owner_id)
            .options(selectinload(Contact.contact_user))
        )
        return result.scalar_one_or_none()
