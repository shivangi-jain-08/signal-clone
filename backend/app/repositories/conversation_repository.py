from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    model = Conversation

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    # Query methods will be implemented in the feature phase
