from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.conversation import Conversation
from app.models.group import Group
from app.models.participant import ConversationParticipant
from app.repositories.base import BaseRepository


class GroupRepository(BaseRepository[Group]):
    model = Group

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    async def get_with_details(self, group_id: str) -> Group | None:
        """Load Group → conversation → participants → users."""
        result = await self.db.execute(
            select(Group)
            .where(Group.id == group_id)
            .options(
                joinedload(Group.conversation).selectinload(
                    Conversation.participants
                ).selectinload(ConversationParticipant.user),
            )
        )
        return result.unique().scalar_one_or_none()

    async def create_group_conversation(
        self,
        creator_id: str,
        name: str,
        description: str,
        avatar_url: str | None,
        member_ids: list[str],
    ) -> tuple[Conversation, "Group"]:
        """Create conversation + group row + participants atomically (single flush)."""
        conv = Conversation(type="group")
        self.db.add(conv)
        await self.db.flush()

        group = Group(
            conversation_id=conv.id,
            name=name,
            description=description,
            avatar_url=avatar_url,
            created_by=creator_id,
        )
        self.db.add(group)

        seen: set[str] = set()
        for uid in [creator_id] + member_ids:
            if uid in seen:
                continue
            seen.add(uid)
            self.db.add(ConversationParticipant(
                conversation_id=conv.id,
                user_id=uid,
                is_admin=(uid == creator_id),
            ))

        await self.db.flush()
        return conv, group
