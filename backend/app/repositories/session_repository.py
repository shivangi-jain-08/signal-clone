from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import UserSession
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository[UserSession]):
    model = UserSession

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    async def get_by_jti(self, jti: str) -> UserSession | None:
        """Look up a session by its ID, which is the JWT `jti` claim."""
        return await self.get_by_id(jti)

    async def get_by_token(self, token: str) -> UserSession | None:
        result = await self.db.execute(
            select(UserSession).where(UserSession.token == token)
        )
        return result.scalar_one_or_none()

    async def create_session(
        self,
        user_id: str,
        token: str,
        expires_at: datetime,
    ) -> UserSession:
        """Create a new session row and flush so the auto-generated id is available."""
        return await self.create(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
        )
