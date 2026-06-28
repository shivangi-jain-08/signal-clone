from sqlalchemy import delete as sql_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.conversation import Conversation
from app.models.group import Group
from app.models.message import Message
from app.models.participant import ConversationParticipant
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.group_repository import GroupRepository
from app.repositories.user_repository import UserRepository
from app.schemas.conversation import MessagePreview, ParticipantDetail
from app.schemas.group import (
    AddMembersRequest,
    CreateGroupRequest,
    GroupDetailResponse,
    UpdateGroupRequest,
)
from app.schemas.user import UserPublic
from app.websocket.events import ServerEvents, conversation_room, user_room
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


class GroupService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._groups = GroupRepository(db)
        self._convs = ConversationRepository(db)
        self._users = UserRepository(db)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _assert_participant(self, group: Group, caller_id: str) -> ConversationParticipant:
        cp = next((p for p in group.conversation.participants if p.user_id == caller_id), None)
        if not cp:
            raise ForbiddenException(
                detail="You are not a member of this group", code="FORBIDDEN"
            )
        return cp

    def _assert_admin(self, group: Group, caller_id: str) -> ConversationParticipant:
        cp = self._assert_participant(group, caller_id)
        if not cp.is_admin:
            raise ForbiddenException(
                detail="Only group admins can perform this action", code="FORBIDDEN"
            )
        return cp

    async def _build_response(
        self, group: Group, caller_id: str
    ) -> GroupDetailResponse:
        conv = group.conversation
        caller_cp = next((p for p in conv.participants if p.user_id == caller_id), None)

        last_msgs = await self._convs.get_last_messages([conv.id])
        last_msg = last_msgs.get(conv.id)
        unread = await self._convs.get_unread_count(
            conv.id, caller_id, caller_cp.last_read_at if caller_cp else None
        )

        return GroupDetailResponse(
            id=group.id,
            conversation_id=conv.id,
            name=group.name,
            description=group.description,
            avatar_url=group.avatar_url,
            created_by=group.created_by,
            participants=[
                ParticipantDetail(
                    user=UserPublic.model_validate(p.user),
                    is_admin=p.is_admin,
                    joined_at=p.joined_at,
                    last_read_at=p.last_read_at,
                )
                for p in conv.participants
            ],
            last_message=_msg_preview(last_msg) if last_msg else None,
            unread_count=unread,
            is_archived=caller_cp.is_archived if caller_cp else False,
            updated_at=conv.updated_at,
            created_at=group.created_at,
        )

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    async def create_group(
        self, creator_id: str, body: CreateGroupRequest
    ) -> GroupDetailResponse:
        # Validate all requested member IDs exist
        for uid in body.member_ids:
            if uid == creator_id:
                continue
            if not await self._users.get_by_id(uid):
                raise NotFoundException(detail=f"User {uid} not found")

        conv, group = await self._groups.create_group_conversation(
            creator_id=creator_id,
            name=body.name,
            description=body.description,
            avatar_url=body.avatar_url,
            member_ids=body.member_ids,
        )
        await self.db.commit()

        group = await self._groups.get_with_details(group.id)
        response = await self._build_response(group, creator_id)

        # Notify each initial member (other than creator) on their personal room
        # so their client knows to join the new conversation room.
        for uid in body.member_ids:
            if uid != creator_id:
                await sio.emit(
                    ServerEvents.MEMBER_ADDED,
                    {
                        "group_id": group.id,
                        "conversation_id": conv.id,
                        "group_name": group.name,
                        "user_id": uid,
                        "added_by": creator_id,
                    },
                    room=user_room(uid),
                )

        return response

    # ------------------------------------------------------------------
    # Get
    # ------------------------------------------------------------------

    async def get_group(self, group_id: str, caller_id: str) -> GroupDetailResponse:
        group = await self._groups.get_with_details(group_id)
        if group is None:
            raise NotFoundException(detail="Group not found")
        self._assert_participant(group, caller_id)
        return await self._build_response(group, caller_id)

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    async def update_group(
        self, group_id: str, caller_id: str, body: UpdateGroupRequest
    ) -> GroupDetailResponse:
        group = await self._groups.get_with_details(group_id)
        if group is None:
            raise NotFoundException(detail="Group not found")
        self._assert_admin(group, caller_id)

        updates = body.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(group, field, value)
        if updates:
            await self.db.flush()
            await self.db.commit()

        group = await self._groups.get_with_details(group_id)
        response = await self._build_response(group, caller_id)

        await sio.emit(
            ServerEvents.GROUP_UPDATED,
            {
                "group_id": group_id,
                "conversation_id": group.conversation_id,
                "name": group.name,
                "description": group.description,
                "avatar_url": group.avatar_url,
            },
            room=conversation_room(group.conversation_id),
        )
        return response

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    async def delete_group(self, group_id: str, caller_id: str) -> None:
        group = await self._groups.get_with_details(group_id)
        if group is None:
            raise NotFoundException(detail="Group not found")
        self._assert_admin(group, caller_id)

        conv_id = group.conversation_id

        await sio.emit(
            ServerEvents.GROUP_DELETED,
            {"group_id": group_id, "conversation_id": conv_id},
            room=conversation_room(conv_id),
        )

        # Use Core DELETE so the DB ondelete=CASCADE removes the group row,
        # participants, and messages without SQLAlchemy trying to NULL the
        # NOT NULL group.conversation_id back-reference first.
        await self.db.execute(
            sql_delete(Conversation).where(Conversation.id == conv_id)
        )
        await self.db.commit()

    # ------------------------------------------------------------------
    # Add members
    # ------------------------------------------------------------------

    async def add_members(
        self, group_id: str, caller_id: str, body: AddMembersRequest
    ) -> GroupDetailResponse:
        group = await self._groups.get_with_details(group_id)
        if group is None:
            raise NotFoundException(detail="Group not found")
        self._assert_admin(group, caller_id)

        conv = group.conversation
        existing_ids = {p.user_id for p in conv.participants}
        added: list[str] = []

        for uid in body.user_ids:
            if uid in existing_ids:
                continue
            if not await self._users.get_by_id(uid):
                raise NotFoundException(detail=f"User {uid} not found")
            self.db.add(ConversationParticipant(
                conversation_id=conv.id,
                user_id=uid,
                is_admin=False,
            ))
            added.append(uid)

        if added:
            await self.db.flush()
            await self.db.commit()
            # Expire conv so SQLAlchemy re-fetches participants on the next query
            # instead of returning the pre-commit identity-map snapshot.
            self.db.expire(conv)

        group = await self._groups.get_with_details(group_id)
        response = await self._build_response(group, caller_id)

        for uid in added:
            payload = {
                "group_id": group_id,
                "conversation_id": conv.id,
                "group_name": group.name,
                "user_id": uid,
                "added_by": caller_id,
            }
            # Notify existing room members
            await sio.emit(ServerEvents.MEMBER_ADDED, payload, room=conversation_room(conv.id))
            # Notify the new member so their client can join the room
            await sio.emit(ServerEvents.MEMBER_ADDED, payload, room=user_room(uid))

        return response

    # ------------------------------------------------------------------
    # Remove member
    # ------------------------------------------------------------------

    async def remove_member(
        self, group_id: str, caller_id: str, target_user_id: str
    ) -> None:
        group = await self._groups.get_with_details(group_id)
        if group is None:
            raise NotFoundException(detail="Group not found")

        conv = group.conversation
        caller_cp = next((p for p in conv.participants if p.user_id == caller_id), None)
        if caller_cp is None:
            raise ForbiddenException(
                detail="You are not a member of this group", code="FORBIDDEN"
            )

        target_cp = next((p for p in conv.participants if p.user_id == target_user_id), None)
        if target_cp is None:
            raise NotFoundException(detail="User is not a member of this group")

        is_self = caller_id == target_user_id
        if not caller_cp.is_admin and not is_self:
            raise ForbiddenException(
                detail="Only admins can remove other members", code="FORBIDDEN"
            )

        # Prevent removing the last admin
        if target_cp.is_admin:
            admin_count = sum(1 for p in conv.participants if p.is_admin)
            if admin_count == 1:
                raise BadRequestException(
                    detail="Cannot remove the only group admin", code="LAST_ADMIN"
                )

        conv_id = conv.id
        await self.db.delete(target_cp)
        await self.db.commit()

        payload = {
            "group_id": group_id,
            "conversation_id": conv_id,
            "user_id": target_user_id,
            "removed_by": caller_id,
        }
        await sio.emit(ServerEvents.MEMBER_REMOVED, payload, room=conversation_room(conv_id))
        await sio.emit(ServerEvents.MEMBER_REMOVED, payload, room=user_room(target_user_id))
