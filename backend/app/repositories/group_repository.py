from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import Group
from app.repositories.base import BaseRepository


class GroupRepository(BaseRepository[Group]):
    model = Group

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    # Query methods will be implemented in the feature phase
