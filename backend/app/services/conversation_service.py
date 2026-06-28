from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.base import utcnow
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.participant import ConversationParticipant
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.conversation import (
    ArchiveConversationRequest,
    ConversationDetailResponse,
    ConversationResponse,
    ConversationsListResponse,
    ConversationSearchResult,
    GroupInfo,
    MessagePreview,
    ParticipantDetail,
    ReadResponse,
)
from app.schemas.user import UserPublic
from app.websocket.events import ServerEvents, conversation_room
from app.websocket.sio import sio


def _msg_preview(msg: Message) -> MessagePreview:
    return MessagePreview(
        id=msg.id,
        content="" if msg.deleted_at else msg.content,
        message_type=msg.message_type,
        sender_id=msg.sender_id,
        created_at=msg.created_at,
        deleted_at=msg.deleted_at,
    )


def _group_info(group) -> GroupInfo | None:
    if group is None:
        return None
    return GroupInfo(
        id=group.id,
        name=group.name,
        description=group.description,
        avatar_url=group.avatar_url,
        created_by=group.created_by,
    )


def _build_response(
    conv: Conversation,
    caller_cp: ConversationParticipant,
    last_msg: Message | None,
    unread: int,
) -> ConversationResponse:
    return ConversationResponse(
        id=conv.id,
        type=conv.type,
        last_message=_msg_preview(last_msg) if last_msg else None,
        unread_count=unread,
        is_archived=caller_cp.is_archived,
        participants=[UserPublic.model_validate(p.user) for p in conv.participants],
        group=_group_info(conv.group),
        updated_at=conv.updated_at,
    )


def _build_detail(
    conv: Conversation,
    caller_cp: ConversationParticipant,
    last_msg: Message | None,
    unread: int,
) -> ConversationDetailResponse:
    participant_details = [
        ParticipantDetail(
            user=UserPublic.model_validate(p.user),
            is_admin=p.is_admin,
            joined_at=p.joined_at,
            last_read_at=p.last_read_at,
        )
        for p in conv.participants
    ]
    return ConversationDetailResponse(
        id=conv.id,
        type=conv.type,
        last_message=_msg_preview(last_msg) if last_msg else None,
        unread_count=unread,
        is_archived=caller_cp.is_archived,
        participants=participant_details,
        group=_group_info(conv.group),
        updated_at=conv.updated_at,
    )


class ConversationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._convs = ConversationRepository(db)
        self._users = UserRepository(db)

    # ------------------------------------------------------------------
    # List
    # ------------------------------------------------------------------

    async def list_conversations(
        self, user_id: str, limit: int, offset: int
    ) -> ConversationsListResponse:
        rows = await self._convs.list_for_user(user_id, limit, offset)
        total = await self._convs.count_for_user(user_id)

        conv_ids = [conv.id for conv, _ in rows]
        last_messages = await self._convs.get_last_messages(conv_ids)

        results: list[ConversationResponse] = []
        for conv, caller_cp in rows:
            last_msg = last_messages.get(conv.id)
            unread = await self._convs.get_unread_count(
                conv.id, user_id, caller_cp.last_read_at
            )
            results.append(_build_response(conv, caller_cp, last_msg, unread))

        return ConversationsListResponse(
            conversations=results,
            total=total,
            limit=limit,
            offset=offset,
        )

    # ------------------------------------------------------------------
    # Open / get direct
    # ------------------------------------------------------------------

    async def open_direct(
        self, caller_id: str, target_user_id: str
    ) -> tuple[ConversationResponse, bool]:
        """Return (ConversationResponse, created). Idempotent."""
        target = await self._users.get_by_id(target_user_id)
        if target is None:
            raise NotFoundException(detail="Target user not found")

        existing = await self._convs.find_direct(caller_id, target_user_id)
        if existing:
            caller_cp = next(
                (p for p in existing.participants if p.user_id == caller_id), None
            )
            last_msgs = await self._convs.get_last_messages([existing.id])
            last_msg = last_msgs.get(existing.id)
            unread = await self._convs.get_unread_count(
                existing.id, caller_id, caller_cp.last_read_at if caller_cp else None
            )
            return _build_response(existing, caller_cp, last_msg, unread), False

        conv = await self._convs.create_direct(caller_id, target_user_id)
        await self.db.commit()
        conv_loaded = await self._convs.get_with_participants(conv.id)
        caller_cp = next(
            (p for p in conv_loaded.participants if p.user_id == caller_id), None
        )
        return _build_response(conv_loaded, caller_cp, None, 0), True

    # ------------------------------------------------------------------
    # Get single
    # ------------------------------------------------------------------

    async def get_conversation(
        self, conv_id: str, caller_id: str
    ) -> ConversationDetailResponse:
        conv = await self._convs.get_with_participants(conv_id)
        if conv is None:
            raise NotFoundException(detail="Conversation not found")

        caller_cp = next(
            (p for p in conv.participants if p.user_id == caller_id), None
        )
        if caller_cp is None:
            raise ForbiddenException(
                detail="You are not a participant in this conversation",
                code="FORBIDDEN",
            )

        last_msgs = await self._convs.get_last_messages([conv_id])
        last_msg = last_msgs.get(conv_id)
        unread = await self._convs.get_unread_count(
            conv_id, caller_id, caller_cp.last_read_at
        )
        return _build_detail(conv, caller_cp, last_msg, unread)

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    async def search(
        self, caller_id: str, query: str
    ) -> list[ConversationSearchResult]:
        convs = await self._convs.search(caller_id, query)
        conv_ids = [c.id for c in convs]
        last_messages = await self._convs.get_last_messages(conv_ids)

        results: list[ConversationSearchResult] = []
        for conv in convs:
            caller_cp = next(
                (p for p in conv.participants if p.user_id == caller_id), None
            )
            last_msg = last_messages.get(conv.id)
            unread = await self._convs.get_unread_count(
                conv.id, caller_id, caller_cp.last_read_at if caller_cp else None
            )
            results.append(
                ConversationSearchResult(
                    id=conv.id,
                    type=conv.type,
                    last_message=_msg_preview(last_msg) if last_msg else None,
                    unread_count=unread,
                    is_archived=caller_cp.is_archived if caller_cp else False,
                    participants=[
                        UserPublic.model_validate(p.user) for p in conv.participants
                    ],
                    group=_group_info(conv.group),
                    updated_at=conv.updated_at,
                    match_context=None,
                )
            )
        return results

    # ------------------------------------------------------------------
    # Mark read
    # ------------------------------------------------------------------

    async def mark_read(self, conv_id: str, caller_id: str) -> ReadResponse:
        conv = await self._convs.get_with_participants(conv_id)
        if conv is None:
            raise NotFoundException(detail="Conversation not found")

        if not any(p.user_id == caller_id for p in conv.participants):
            raise ForbiddenException(
                detail="You are not a participant in this conversation",
                code="FORBIDDEN",
            )

        now = utcnow()
        await self._convs.update_last_read(conv_id, caller_id, now)
        await self.db.commit()

        await sio.emit(
            ServerEvents.CONVERSATION_READ,
            {
                "conversation_id": conv_id,
                "user_id": caller_id,
                "last_read_at": now.isoformat(),
            },
            room=conversation_room(conv_id),
        )
        return ReadResponse(last_read_at=now)

    # ------------------------------------------------------------------
    # Archive
    # ------------------------------------------------------------------

    async def toggle_archive(
        self, conv_id: str, caller_id: str, body: ArchiveConversationRequest
    ) -> ConversationResponse:
        conv = await self._convs.get_with_participants(conv_id)
        if conv is None:
            raise NotFoundException(detail="Conversation not found")

        caller_cp = next(
            (p for p in conv.participants if p.user_id == caller_id), None
        )
        if caller_cp is None:
            raise ForbiddenException(
                detail="You are not a participant in this conversation",
                code="FORBIDDEN",
            )

        await self._convs.set_archived(conv_id, caller_id, body.is_archived)
        await self.db.commit()

        # Re-fetch caller_cp after mutation
        caller_cp = await self._convs.get_participant(conv_id, caller_id)
        last_msgs = await self._convs.get_last_messages([conv_id])
        last_msg = last_msgs.get(conv_id)
        unread = await self._convs.get_unread_count(
            conv_id, caller_id, caller_cp.last_read_at
        )
        return _build_response(conv, caller_cp, last_msg, unread)
