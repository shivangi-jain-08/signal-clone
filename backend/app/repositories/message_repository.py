from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.base import utcnow
from app.models.message import Message
from app.models.reaction import Reaction
from app.repositories.base import BaseRepository


class MessageRepository(BaseRepository[Message]):
    model = Message

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    async def list_paginated(
        self,
        conv_id: str,
        limit: int,
        before_id: str | None = None,
        after_id: str | None = None,
    ) -> tuple[list[Message], bool]:
        """Cursor pagination — returns (messages DESC by created_at, has_more)."""
        stmt = (
            select(Message)
            .where(Message.conversation_id == conv_id)
            .options(
                selectinload(Message.sender),
                selectinload(Message.reactions),
                selectinload(Message.reply_to),
            )
            .order_by(Message.created_at.desc(), Message.id.desc())
        )

        if before_id:
            cursor = await self.get_by_id(before_id)
            if cursor:
                stmt = stmt.where(
                    or_(
                        Message.created_at < cursor.created_at,
                        and_(
                            Message.created_at == cursor.created_at,
                            Message.id < before_id,
                        ),
                    )
                )

        elif after_id:
            cursor = await self.get_by_id(after_id)
            if cursor:
                stmt = stmt.where(
                    or_(
                        Message.created_at > cursor.created_at,
                        and_(
                            Message.created_at == cursor.created_at,
                            Message.id > after_id,
                        ),
                    )
                )

        result = await self.db.execute(stmt.limit(limit + 1))
        messages = list(result.scalars().all())

        has_more = len(messages) > limit
        return messages[:limit], has_more

    async def get_with_relations(self, message_id: str) -> Message | None:
        result = await self.db.execute(
            select(Message)
            .where(Message.id == message_id)
            .options(
                selectinload(Message.sender),
                selectinload(Message.reactions),
                selectinload(Message.reply_to),
            )
        )
        return result.scalar_one_or_none()

    async def soft_delete(self, message: Message) -> None:
        message.deleted_at = utcnow()
        await self.db.flush()

    async def get_reaction(self, message_id: str, user_id: str) -> Reaction | None:
        result = await self.db.execute(
            select(Reaction).where(
                Reaction.message_id == message_id,
                Reaction.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()
