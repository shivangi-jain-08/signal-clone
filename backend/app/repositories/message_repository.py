from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message
from app.repositories.base import BaseRepository


class MessageRepository(BaseRepository[Message]):
    model = Message

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    # Query methods will be implemented in the feature phase
