from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UpdateProfileRequest, UserMe, UserPublic


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._users = UserRepository(db)

    async def get_by_id(self, user_id: str) -> UserPublic:
        user = await self._users.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")
        return UserPublic.model_validate(user)

    async def search(
        self, query: str, caller_id: str, limit: int = 20
    ) -> list[UserPublic]:
        users = await self._users.search(query=query, exclude_id=caller_id, limit=limit)
        return [UserPublic.model_validate(u) for u in users]

    async def update_profile(
        self, user: User, data: UpdateProfileRequest
    ) -> UserMe:
        updates = data.model_dump(exclude_none=True)

        if "username" in updates and updates["username"] != user.username:
            existing = await self._users.get_by_username(updates["username"])
            if existing:
                raise ConflictException(
                    code="ALREADY_EXISTS", detail="Username already taken"
                )

        if updates:
            await self._users.update(user, **updates)
            await self.db.commit()
            await self.db.refresh(user)

        return UserMe.model_validate(user)
