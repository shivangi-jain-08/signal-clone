from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.base import utcnow
from app.models.message import Message
from app.models.message_status import MessageStatus
from app.models.reaction import Reaction
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.schemas.message import (
    DeleteMessageResponse,
    EditMessageRequest,
    MessageListResponse,
    MessageResponse,
    ReactionEntry,
    ReactionResponse,
    ReactRequest,
    ReplyPreview,
    SendMessageRequest,
)
from app.schemas.user import UserPublic
from app.websocket.events import ServerEvents, conversation_room, user_room
from app.websocket.manager import connection_manager
from app.websocket.sio import sio

_VALID_TYPES = {"text", "image", "file", "system"}


def _build_message_response(
    msg: Message, client_id: str | None = None
) -> MessageResponse:
    reply_to = None
    if msg.reply_to:
        reply_to = ReplyPreview(
            id=msg.reply_to.id,
            content="" if msg.reply_to.deleted_at else msg.reply_to.content,
            sender_id=msg.reply_to.sender_id,
            deleted_at=msg.reply_to.deleted_at,
        )
    reactions = [
        ReactionEntry(emoji=r.emoji, user_id=r.user_id)
        for r in (msg.reactions or [])
    ]
    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender=UserPublic.model_validate(msg.sender),
        content="" if msg.deleted_at else msg.content,
        message_type=msg.message_type,
        reply_to=reply_to,
        deleted_at=msg.deleted_at,
        edited_at=msg.edited_at,
        reactions=reactions,
        client_id=client_id,
        created_at=msg.created_at,
        updated_at=msg.updated_at,
    )


class MessageService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._msgs = MessageRepository(db)
        self._convs = ConversationRepository(db)

    def _assert_participant(self, conv, caller_id: str):
        if not any(p.user_id == caller_id for p in conv.participants):
            raise ForbiddenException(
                detail="You are not a participant in this conversation",
                code="FORBIDDEN",
            )

    # ------------------------------------------------------------------
    # List
    # ------------------------------------------------------------------

    async def list_messages(
        self,
        conv_id: str,
        caller_id: str,
        limit: int,
        before_id: str | None,
        after_id: str | None,
    ) -> MessageListResponse:
        conv = await self._convs.get_with_participants(conv_id)
        if conv is None:
            raise NotFoundException(detail="Conversation not found")
        self._assert_participant(conv, caller_id)

        messages, has_more = await self._msgs.list_paginated(
            conv_id, limit, before_id, after_id
        )
        next_cursor = messages[-1].id if has_more and messages else None
        return MessageListResponse(
            messages=[_build_message_response(m) for m in messages],
            has_more=has_more,
            next_cursor=next_cursor,
        )

    # ------------------------------------------------------------------
    # Send
    # ------------------------------------------------------------------

    async def send_message(
        self, conv_id: str, sender_id: str, body: SendMessageRequest
    ) -> MessageResponse:
        conv = await self._convs.get_with_participants(conv_id)
        if conv is None:
            raise NotFoundException(detail="Conversation not found")
        self._assert_participant(conv, sender_id)

        if body.message_type not in _VALID_TYPES:
            raise BadRequestException(
                detail=f"Invalid message_type. Must be one of: {', '.join(_VALID_TYPES)}",
                code="INVALID_MESSAGE_TYPE",
            )

        if body.reply_to_id:
            reply_msg = await self._msgs.get_by_id(body.reply_to_id)
            if reply_msg is None or reply_msg.conversation_id != conv_id:
                raise NotFoundException(
                    detail="Reply target not found in this conversation"
                )

        msg = await self._msgs.create(
            conversation_id=conv_id,
            sender_id=sender_id,
            content=body.content,
            message_type=body.message_type,
            reply_to_id=body.reply_to_id,
        )
        await self._convs.bump_updated_at(conv_id)

        # Mark 'delivered' for recipients who are currently online
        delivered_to: list[str] = []
        for p in conv.participants:
            if p.user_id != sender_id and connection_manager.is_online(p.user_id):
                self.db.add(MessageStatus(
                    message_id=msg.id,
                    user_id=p.user_id,
                    status="delivered",
                ))
                delivered_to.append(p.user_id)

        await self.db.commit()

        msg_loaded = await self._msgs.get_with_relations(msg.id)
        msg_response = _build_message_response(msg_loaded, client_id=body.client_id)

        await sio.emit(
            ServerEvents.NEW_MESSAGE,
            msg_response.model_dump(mode="json"),
            room=conversation_room(conv_id),
        )
        for uid in delivered_to:
            await sio.emit(
                ServerEvents.MESSAGE_STATUS_UPDATE,
                {"message_id": msg.id, "user_id": uid, "status": "delivered"},
                room=user_room(sender_id),
            )

        return msg_response

    # ------------------------------------------------------------------
    # Edit
    # ------------------------------------------------------------------

    async def edit_message(
        self, message_id: str, caller_id: str, body: EditMessageRequest
    ) -> MessageResponse:
        msg = await self._msgs.get_with_relations(message_id)
        if msg is None:
            raise NotFoundException(detail="Message not found")
        if msg.deleted_at is not None:
            raise BadRequestException(
                detail="Cannot edit a deleted message", code="MESSAGE_DELETED"
            )
        if msg.sender_id != caller_id:
            raise ForbiddenException(
                detail="Only the sender can edit this message", code="FORBIDDEN"
            )

        conv_id = msg.conversation_id
        msg.content = body.content
        msg.edited_at = utcnow()
        await self.db.flush()
        await self.db.commit()

        msg_loaded = await self._msgs.get_with_relations(message_id)

        await sio.emit(
            ServerEvents.MESSAGE_EDITED,
            {
                "id": message_id,
                "conversation_id": conv_id,
                "content": msg.content,
                "edited_at": msg.edited_at.isoformat(),
                "sender_id": msg.sender_id,
            },
            room=conversation_room(conv_id),
        )
        return _build_message_response(msg_loaded)

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    async def delete_message(
        self, message_id: str, caller_id: str
    ) -> DeleteMessageResponse:
        msg = await self._msgs.get_with_relations(message_id)
        if msg is None:
            raise NotFoundException(detail="Message not found")
        if msg.deleted_at is not None:
            raise BadRequestException(
                detail="Message is already deleted", code="MESSAGE_DELETED"
            )

        conv = await self._convs.get_with_participants(msg.conversation_id)
        caller_cp = next(
            (p for p in conv.participants if p.user_id == caller_id), None
        )
        is_sender = msg.sender_id == caller_id
        is_admin = caller_cp is not None and caller_cp.is_admin

        if not is_sender and not is_admin:
            raise ForbiddenException(
                detail="Only the sender or a group admin can delete this message",
                code="FORBIDDEN",
            )

        conv_id = msg.conversation_id
        await self._msgs.soft_delete(msg)
        await self.db.commit()

        await sio.emit(
            ServerEvents.MESSAGE_DELETED,
            {
                "id": message_id,
                "conversation_id": conv_id,
                "deleted_at": msg.deleted_at.isoformat(),
            },
            room=conversation_room(conv_id),
        )
        return DeleteMessageResponse(id=msg.id, deleted_at=msg.deleted_at)

    # ------------------------------------------------------------------
    # React
    # ------------------------------------------------------------------

    async def react(
        self, message_id: str, caller_id: str, body: ReactRequest
    ) -> ReactionResponse:
        msg = await self._msgs.get_with_relations(message_id)
        if msg is None:
            raise NotFoundException(detail="Message not found")
        if msg.deleted_at is not None:
            raise BadRequestException(
                detail="Cannot react to a deleted message", code="MESSAGE_DELETED"
            )

        conv = await self._convs.get_with_participants(msg.conversation_id)
        self._assert_participant(conv, caller_id)

        existing = await self._msgs.get_reaction(message_id, caller_id)

        if body.emoji == "":
            if existing:
                await self.db.delete(existing)
                await self.db.flush()
        elif existing:
            existing.emoji = body.emoji
            await self.db.flush()
        else:
            self.db.add(
                Reaction(
                    message_id=message_id,
                    user_id=caller_id,
                    emoji=body.emoji,
                )
            )
            await self.db.flush()

        await self.db.commit()
        # Query Reaction rows directly — avoids the stale Message.reactions
        # collection that expire_on_commit=False keeps cached in this session.
        result = await self.db.execute(
            select(Reaction).where(Reaction.message_id == message_id)
        )
        fresh_reactions = [
            ReactionEntry(emoji=r.emoji, user_id=r.user_id)
            for r in result.scalars().all()
        ]

        await sio.emit(
            ServerEvents.REACTION_UPDATED,
            {
                "message_id": message_id,
                "conversation_id": msg.conversation_id,
                "reactions": [r.model_dump() for r in fresh_reactions],
            },
            room=conversation_room(msg.conversation_id),
        )
        return ReactionResponse(message_id=message_id, reactions=fresh_reactions)
