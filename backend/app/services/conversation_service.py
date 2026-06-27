"""Conversation service stub."""
from sqlalchemy.ext.asyncio import AsyncSession


class ConversationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
