"""User service stub."""
from sqlalchemy.ext.asyncio import AsyncSession


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
