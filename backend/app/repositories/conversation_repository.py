from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.models.base import utcnow
from app.models.conversation import Conversation
from app.models.group import Group
from app.models.message import Message
from app.models.participant import ConversationParticipant
from app.models.user import User
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    model = Conversation

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    # ------------------------------------------------------------------
    # List / count
    # ------------------------------------------------------------------

    async def list_for_user(
        self, user_id: str, limit: int, offset: int
    ) -> list[tuple[Conversation, ConversationParticipant]]:
        """Return (Conversation, caller_participant) tuples, DESC by updated_at."""
        cp = aliased(ConversationParticipant, name="caller_cp")
        result = await self.db.execute(
            select(Conversation, cp)
            .join(cp, and_(
                cp.conversation_id == Conversation.id,
                cp.user_id == user_id,
            ))
            .options(
                selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
                selectinload(Conversation.group),
            )
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.all())

    async def count_for_user(self, user_id: str) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Conversation)
            .join(ConversationParticipant, and_(
                ConversationParticipant.conversation_id == Conversation.id,
                ConversationParticipant.user_id == user_id,
            ))
        )
        return result.scalar_one()

    # ------------------------------------------------------------------
    # Last messages (batch — avoids N+1)
    # ------------------------------------------------------------------

    async def get_last_messages(self, conv_ids: list[str]) -> dict[str, Message]:
        """Return {conv_id: most_recent_message} for the given IDs."""
        if not conv_ids:
            return {}

        # Step 1: max created_at per conversation
        latest_ts = (
            select(
                Message.conversation_id,
                func.max(Message.created_at).label("ts"),
            )
            .where(Message.conversation_id.in_(conv_ids))
            .group_by(Message.conversation_id)
            .subquery()
        )

        # Step 2: one message id per conversation at that timestamp (min id for determinism)
        latest_ids = (
            select(
                Message.conversation_id,
                func.min(Message.id).label("msg_id"),
            )
            .join(latest_ts, and_(
                Message.conversation_id == latest_ts.c.conversation_id,
                Message.created_at == latest_ts.c.ts,
            ))
            .group_by(Message.conversation_id)
            .subquery()
        )

        result = await self.db.execute(
            select(Message)
            .join(latest_ids, Message.id == latest_ids.c.msg_id)
            .options(selectinload(Message.sender))
        )
        return {m.conversation_id: m for m in result.scalars().all()}

    # ------------------------------------------------------------------
    # Unread count
    # ------------------------------------------------------------------

    async def get_unread_count(
        self,
        conv_id: str,
        user_id: str,
        last_read_at: datetime | None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Message)
            .where(
                Message.conversation_id == conv_id,
                Message.sender_id != user_id,
                Message.deleted_at.is_(None),
            )
        )
        if last_read_at is not None:
            # SQLite stores naive UTC; normalise before comparing.
            ts = last_read_at.replace(tzinfo=None) if last_read_at.tzinfo else last_read_at
            stmt = stmt.where(Message.created_at > ts)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    # ------------------------------------------------------------------
    # Direct conversation
    # ------------------------------------------------------------------

    async def find_direct(self, user1_id: str, user2_id: str) -> Conversation | None:
        cp1 = aliased(ConversationParticipant, name="cp1")
        cp2 = aliased(ConversationParticipant, name="cp2")
        result = await self.db.execute(
            select(Conversation)
            .join(cp1, and_(cp1.conversation_id == Conversation.id, cp1.user_id == user1_id))
            .join(cp2, and_(cp2.conversation_id == Conversation.id, cp2.user_id == user2_id))
            .where(Conversation.type == "direct")
            .options(
                selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
                selectinload(Conversation.group),
            )
        )
        return result.scalar_one_or_none()

    async def create_direct(self, user1_id: str, user2_id: str) -> Conversation:
        conv = Conversation(type="direct")
        self.db.add(conv)
        await self.db.flush()
        for uid in (user1_id, user2_id):
            self.db.add(ConversationParticipant(conversation_id=conv.id, user_id=uid))
        await self.db.flush()
        return conv

    # ------------------------------------------------------------------
    # Single conversation
    # ------------------------------------------------------------------

    async def get_with_participants(self, conv_id: str) -> Conversation | None:
        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.id == conv_id)
            .options(
                selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
                selectinload(Conversation.group),
            )
        )
        return result.scalar_one_or_none()

    async def get_participant(
        self, conv_id: str, user_id: str
    ) -> ConversationParticipant | None:
        result = await self.db.execute(
            select(ConversationParticipant).where(
                ConversationParticipant.conversation_id == conv_id,
                ConversationParticipant.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    async def search(
        self, user_id: str, query: str, limit: int = 20
    ) -> list[Conversation]:
        """Match by other participant's name (direct) or group name."""
        pattern = f"%{query}%"
        other_cp = aliased(ConversationParticipant, name="other_cp")
        other_user = aliased(User, name="other_user")

        result = await self.db.execute(
            select(Conversation)
            .join(ConversationParticipant, and_(
                ConversationParticipant.conversation_id == Conversation.id,
                ConversationParticipant.user_id == user_id,
            ))
            .outerjoin(other_cp, and_(
                other_cp.conversation_id == Conversation.id,
                other_cp.user_id != user_id,
            ))
            .outerjoin(other_user, other_user.id == other_cp.user_id)
            .outerjoin(Group, Group.conversation_id == Conversation.id)
            .where(or_(
                other_user.display_name.ilike(pattern),
                other_user.username.ilike(pattern),
                Group.name.ilike(pattern),
            ))
            .options(
                selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
                selectinload(Conversation.group),
            )
            .distinct()
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------

    async def update_last_read(
        self, conv_id: str, user_id: str, ts: datetime
    ) -> None:
        cp = await self.get_participant(conv_id, user_id)
        if cp:
            cp.last_read_at = ts
            await self.db.flush()

    async def set_archived(
        self, conv_id: str, user_id: str, is_archived: bool
    ) -> None:
        cp = await self.get_participant(conv_id, user_id)
        if cp:
            cp.is_archived = is_archived
            await self.db.flush()

    async def bump_updated_at(self, conv_id: str) -> None:
        conv = await self.get_by_id(conv_id)
        if conv:
            conv.updated_at = utcnow()
            await self.db.flush()
