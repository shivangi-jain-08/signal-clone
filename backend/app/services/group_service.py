"""Group service stub."""
from sqlalchemy.ext.asyncio import AsyncSession


class GroupService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
