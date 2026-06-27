"""Message service stub."""
from sqlalchemy.ext.asyncio import AsyncSession


class MessageService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
