"""Socket.io event handlers.

All handlers are registered against the shared `sio` instance from main.py.

Client → Server events handled here:
  connect            authenticate + join rooms + update presence
  disconnect         cleanup + update presence
  typing             forward to conv room (skip sender)
  stop_typing        forward to conv room (skip sender)
  message_read       update last_read_at + emit read receipts
  join_conversation  join room for a newly created conversation

Server → Client events emitted here and from services:
  connected               → sid: {user_id}
  new_message             → conv:<id>: full MessageResponse
  message_edited          → conv:<id>: {id, conversation_id, content, edited_at, sender_id}
  message_deleted         → conv:<id>: {id, conversation_id, deleted_at}
  reaction_updated        → conv:<id>: {message_id, conversation_id, reactions}
  typing                  → conv:<id> skip_sid: {user_id, conversation_id}
  stop_typing             → conv:<id> skip_sid: {user_id, conversation_id}
  user_online             → conv:<id> for all user convs: {user_id, is_online, last_seen}
  user_offline            → conv:<id> for all user convs: {user_id, is_online, last_seen}
  conversation_read       → conv:<id>: {conversation_id, user_id, last_read_at}
  message_status_update   → user:<sender_id>: {message_id, user_id, status}
"""
from datetime import timezone

import socketio
import structlog
from sqlalchemy import and_, select

from app.core.security import decode_access_token
from app.database.base import async_session_maker
from app.models.base import utcnow
from app.models.message import Message
from app.models.message_status import MessageStatus
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository
from app.websocket.events import (
    ClientEvents,
    ServerEvents,
    conversation_room,
    user_room,
)
from app.websocket.manager import connection_manager

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

def _extract_token(auth: dict | None, environ: dict) -> str | None:
    """Pull JWT from auth dict, query string, or HTTP Authorization header."""
    if auth:
        raw = auth.get("token") or auth.get("Authorization") or ""
        t = str(raw).removeprefix("Bearer ").strip()
        if t:
            return t
    for part in environ.get("QUERY_STRING", "").split("&"):
        if part.startswith("token="):
            return part[6:]
    for key in ("HTTP_AUTHORIZATION", "AUTHORIZATION"):
        val = environ.get(key, "")
        if val:
            return str(val).removeprefix("Bearer ").strip()
    return None


async def _authenticate(auth: dict | None, environ: dict) -> tuple[str | None, str, list[str]]:
    """Decode JWT, verify session, return (user_id, display_name, conv_ids) or (None, '', [])."""
    token = _extract_token(auth, environ)
    if not token:
        return None, "", []

    payload = decode_access_token(token)
    if not payload:
        return None, "", []

    jti: str | None = payload.get("jti")
    user_id: str | None = payload.get("sub")
    if not jti or not user_id:
        return None, "", []

    async with async_session_maker() as db:
        session = await SessionRepository(db).get_by_jti(jti)
        if not session:
            return None, "", []

        # Check expiry (SQLite stores naive UTC)
        expires = session.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        from datetime import datetime
        if expires < datetime.now(timezone.utc):
            return None, "", []

        user = await UserRepository(db).get_by_id(user_id)
        if not user:
            return None, "", []

        rows = await ConversationRepository(db).list_for_user(user_id, limit=500, offset=0)
        conv_ids = [conv.id for conv, _ in rows]

    return user_id, user.display_name or user.username or user_id, conv_ids


# ---------------------------------------------------------------------------
# Delivery helper — called on connect to catch up pending deliveries
# ---------------------------------------------------------------------------

async def _mark_delivered_on_connect(
    user_id: str, conv_ids: list[str], sio: socketio.AsyncServer
) -> None:
    """Create 'delivered' status records for messages the user missed while offline."""
    if not conv_ids:
        return

    async with async_session_maker() as db:
        stmt = (
            select(Message)
            .outerjoin(
                MessageStatus,
                and_(
                    MessageStatus.message_id == Message.id,
                    MessageStatus.user_id == user_id,
                ),
            )
            .where(
                Message.conversation_id.in_(conv_ids),
                Message.sender_id != user_id,
                Message.deleted_at.is_(None),
                MessageStatus.id.is_(None),
            )
            .order_by(Message.created_at.asc())
            .limit(100)
        )
        result = await db.execute(stmt)
        pending = list(result.scalars().all())

        for msg in pending:
            db.add(MessageStatus(
                message_id=msg.id,
                user_id=user_id,
                status="delivered",
            ))
        if pending:
            await db.commit()

    # Notify each sender (outside the session so the commit is done)
    for msg in pending:
        await sio.emit(
            ServerEvents.MESSAGE_STATUS_UPDATE,
            {"message_id": msg.id, "user_id": user_id, "status": "delivered"},
            room=user_room(msg.sender_id),
        )


# ---------------------------------------------------------------------------
# Handler registration
# ---------------------------------------------------------------------------

def register_handlers(sio: socketio.AsyncServer) -> None:
    """Attach all Socket.io lifecycle and event handlers to the server."""

    # -----------------------------------------------------------------------
    # connect
    # -----------------------------------------------------------------------

    @sio.event
    async def connect(sid: str, environ: dict, auth: dict | None = None) -> bool:
        user_id, display_name, conv_ids = await _authenticate(auth, environ)
        if not user_id:
            logger.warning("ws_auth_rejected", sid=sid)
            return False  # reject; client gets a connect_error

        is_first = connection_manager.connect(sid, user_id, conv_ids, display_name)

        # Join personal room and all conversation rooms
        await sio.enter_room(sid, user_room(user_id))
        for cid in conv_ids:
            await sio.enter_room(sid, conversation_room(cid))

        logger.info("ws_connected", sid=sid[:8], user_id=user_id[:8], first_tab=is_first)

        if is_first:
            async with async_session_maker() as db:
                user = await UserRepository(db).get_by_id(user_id)
                if user:
                    user.is_online = True
                    await db.commit()

            presence = {"user_id": user_id, "is_online": True, "last_seen": None}
            for cid in conv_ids:
                await sio.emit(
                    ServerEvents.USER_ONLINE,
                    presence,
                    room=conversation_room(cid),
                    skip_sid=sid,
                )

        # Ack to the connecting client
        await sio.emit(ServerEvents.CONNECTED, {"user_id": user_id}, to=sid)

        # Back-fill delivery receipts for missed messages
        await _mark_delivered_on_connect(user_id, conv_ids, sio)

    # -----------------------------------------------------------------------
    # disconnect
    # -----------------------------------------------------------------------

    @sio.event
    async def disconnect(sid: str) -> None:
        user_id, is_last, conv_ids = connection_manager.disconnect(sid)
        if not user_id:
            return

        logger.info("ws_disconnected", sid=sid[:8], user_id=user_id[:8], last_tab=is_last)

        if is_last:
            now = utcnow()
            async with async_session_maker() as db:
                user = await UserRepository(db).get_by_id(user_id)
                if user:
                    user.is_online = False
                    user.last_seen = now
                    await db.commit()

            presence = {
                "user_id": user_id,
                "is_online": False,
                "last_seen": now.isoformat(),
            }
            for cid in conv_ids:
                await sio.emit(ServerEvents.USER_OFFLINE, presence, room=conversation_room(cid))

    # -----------------------------------------------------------------------
    # typing / stop_typing
    # -----------------------------------------------------------------------

    @sio.on(ClientEvents.TYPING)
    async def on_typing(sid: str, data: dict) -> None:
        user_id = connection_manager.get_user_id(sid)
        if not user_id or not isinstance(data, dict):
            return
        conv_id = data.get("conversation_id")
        if not conv_id:
            return
        await sio.emit(
            ServerEvents.TYPING,
            {
                "user_id": user_id,
                "conversation_id": conv_id,
                "display_name": connection_manager.get_display_name(user_id),
            },
            room=conversation_room(conv_id),
            skip_sid=sid,
        )

    @sio.on(ClientEvents.STOP_TYPING)
    async def on_stop_typing(sid: str, data: dict) -> None:
        user_id = connection_manager.get_user_id(sid)
        if not user_id or not isinstance(data, dict):
            return
        conv_id = data.get("conversation_id")
        if not conv_id:
            return
        await sio.emit(
            ServerEvents.STOP_TYPING,
            {"user_id": user_id, "conversation_id": conv_id},
            room=conversation_room(conv_id),
            skip_sid=sid,
        )

    # -----------------------------------------------------------------------
    # message_read
    # -----------------------------------------------------------------------

    @sio.on(ClientEvents.MESSAGE_READ)
    async def on_message_read(sid: str, data: dict) -> None:
        user_id = connection_manager.get_user_id(sid)
        if not user_id or not isinstance(data, dict):
            return
        conv_id = data.get("conversation_id")
        if not conv_id:
            return

        newly_read: list[Message] = []
        now = utcnow()

        async with async_session_maker() as db:
            conv_repo = ConversationRepository(db)
            cp = await conv_repo.get_participant(conv_id, user_id)
            if not cp:
                return  # not a participant

            old_last_read = cp.last_read_at
            await conv_repo.update_last_read(conv_id, user_id, now)

            # Find messages that are now read (sent by others, after old cursor)
            stmt = select(Message).where(
                Message.conversation_id == conv_id,
                Message.sender_id != user_id,
                Message.deleted_at.is_(None),
            )
            if old_last_read is not None:
                ts = old_last_read.replace(tzinfo=None) if old_last_read.tzinfo else old_last_read
                stmt = stmt.where(Message.created_at > ts)

            result = await db.execute(stmt)
            msgs = list(result.scalars().all())

            # Upsert MessageStatus → 'read'
            for msg in msgs:
                existing = await db.execute(
                    select(MessageStatus).where(
                        MessageStatus.message_id == msg.id,
                        MessageStatus.user_id == user_id,
                    )
                )
                row = existing.scalar_one_or_none()
                if row:
                    row.status = "read"
                else:
                    db.add(MessageStatus(
                        message_id=msg.id,
                        user_id=user_id,
                        status="read",
                    ))

            await db.commit()
            newly_read = msgs  # safe to use after commit (expire_on_commit=False)

        # Per-message receipts to each sender's personal room
        for msg in newly_read:
            await sio.emit(
                ServerEvents.MESSAGE_STATUS_UPDATE,
                {"message_id": msg.id, "user_id": user_id, "status": "read"},
                room=user_room(msg.sender_id),
            )

        # Broadcast read cursor so all participants can update unread counts
        await sio.emit(
            ServerEvents.CONVERSATION_READ,
            {
                "conversation_id": conv_id,
                "user_id": user_id,
                "last_read_at": now.isoformat(),
            },
            room=conversation_room(conv_id),
        )

    # -----------------------------------------------------------------------
    # join_conversation  (client calls this after a new conv is created via REST)
    # -----------------------------------------------------------------------

    @sio.on(ClientEvents.JOIN_CONVERSATION)
    async def on_join_conversation(sid: str, data: dict) -> None:
        user_id = connection_manager.get_user_id(sid)
        if not user_id or not isinstance(data, dict):
            return
        conv_id = data.get("conversation_id")
        if not conv_id:
            return

        async with async_session_maker() as db:
            cp = await ConversationRepository(db).get_participant(conv_id, user_id)
            if not cp:
                return  # not a participant — refuse silently

        await sio.enter_room(sid, conversation_room(conv_id))
        connection_manager.add_conv(user_id, conv_id)
        logger.info("ws_join_conv", user_id=user_id[:8], conv_id=conv_id[:8])
