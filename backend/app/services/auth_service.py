"""Auth service stub.

Business logic implemented in the auth feature phase.
"""
from sqlalchemy.ext.asyncio import AsyncSession


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
