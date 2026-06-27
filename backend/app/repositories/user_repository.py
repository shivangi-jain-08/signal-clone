from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    async def get_by_phone(self, phone_number: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.phone_number == phone_number)
        )
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    async def set_otp(
        self, user: User, otp_code: str, expires_at: datetime
    ) -> None:
        user.otp_code = otp_code
        user.otp_expires_at = expires_at
        await self.db.flush()

    async def clear_otp(self, user: User) -> None:
        user.otp_code = None
        user.otp_expires_at = None
        await self.db.flush()

    async def update(self, user: User, **kwargs: Any) -> User:
        for key, value in kwargs.items():
            setattr(user, key, value)
        await self.db.flush()
        return user
