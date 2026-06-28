"""Group endpoints.

All routes are prefixed with /api/v1/groups by the top-level router.
Every endpoint requires a valid Bearer JWT.

  POST   /groups                          — create a group conversation
  GET    /groups/{id}                     — get group detail + members
  PATCH  /groups/{id}                     — update name / description / avatar
  DELETE /groups/{id}                     — delete group (admin only)
  POST   /groups/{id}/members             — add members (admin only)
  DELETE /groups/{id}/members/{user_id}   — remove a member (admin or self)
"""
from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import APIResponse, ErrorResponse
from app.schemas.group import (
    AddMembersRequest,
    CreateGroupRequest,
    GroupDetailResponse,
    UpdateGroupRequest,
)
from app.services.group_service import GroupService

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /groups
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=APIResponse[GroupDetailResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a group",
    description="""
Create a new group conversation. The caller is automatically added as an **admin**.

`member_ids` lists additional members to invite (UUIDs). The creator does not
need to include their own ID — they are always added.

### Body
```json
{
  "name": "Team Alpha",
  "description": "Project discussion",
  "avatar_url": null,
  "member_ids": ["uuid-bob", "uuid-carol"]
}
```

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | One of the member_ids does not exist |
| `VALIDATION_ERROR` | 422 | Field constraint violated |
""",
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse, "description": "A listed member user not found"},
    },
)
async def create_group(
    body: CreateGroupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[GroupDetailResponse]:
    service = GroupService(db)
    group = await service.create_group(creator_id=current_user.id, body=body)
    return APIResponse(data=group)


# ---------------------------------------------------------------------------
# GET /groups/{id}
# ---------------------------------------------------------------------------

@router.get(
    "/{group_id}",
    response_model=APIResponse[GroupDetailResponse],
    summary="Get group detail",
    description="""
Fetch full group detail: metadata, participant list (with admin flags and read
cursors), last message preview, and the caller's unread count.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Group does not exist |
| `FORBIDDEN` | 403 | Caller is not a member |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Not a member"},
        404: {"model": ErrorResponse, "description": "Group not found"},
    },
)
async def get_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[GroupDetailResponse]:
    service = GroupService(db)
    group = await service.get_group(group_id=group_id, caller_id=current_user.id)
    return APIResponse(data=group)


# ---------------------------------------------------------------------------
# PATCH /groups/{id}
# ---------------------------------------------------------------------------

@router.patch(
    "/{group_id}",
    response_model=APIResponse[GroupDetailResponse],
    summary="Update group info",
    description="""
Partial update of group metadata. Only **admins** may update.

All fields are optional — only provided fields are changed. Send `avatar_url: null`
to clear the current avatar.

### Body
```json
{ "name": "New Name", "description": "Updated desc", "avatar_url": null }
```

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Group does not exist |
| `FORBIDDEN` | 403 | Caller is not an admin |
| `VALIDATION_ERROR` | 422 | Field constraint violated |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Not an admin"},
        404: {"model": ErrorResponse, "description": "Group not found"},
    },
)
async def update_group(
    group_id: str,
    body: UpdateGroupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[GroupDetailResponse]:
    service = GroupService(db)
    group = await service.update_group(
        group_id=group_id, caller_id=current_user.id, body=body
    )
    return APIResponse(data=group)


# ---------------------------------------------------------------------------
# DELETE /groups/{id}
# ---------------------------------------------------------------------------

@router.delete(
    "/{group_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete group",
    description="""
Permanently delete the group and all its messages. Only **admins** may delete.

A `group_deleted` WebSocket event is emitted to all participants before deletion.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Group does not exist |
| `FORBIDDEN` | 403 | Caller is not an admin |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Not an admin"},
        404: {"model": ErrorResponse, "description": "Group not found"},
    },
)
async def delete_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    service = GroupService(db)
    await service.delete_group(group_id=group_id, caller_id=current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# POST /groups/{id}/members
# ---------------------------------------------------------------------------

@router.post(
    "/{group_id}/members",
    response_model=APIResponse[GroupDetailResponse],
    summary="Add members",
    description="""
Add one or more users to the group. Only **admins** may add members.

Already-existing members are silently skipped (idempotent).

### Body
```json
{ "user_ids": ["uuid-dave", "uuid-eve"] }
```

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Group or a listed user not found |
| `FORBIDDEN` | 403 | Caller is not an admin |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Not an admin"},
        404: {"model": ErrorResponse, "description": "Group or user not found"},
    },
)
async def add_members(
    group_id: str,
    body: AddMembersRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[GroupDetailResponse]:
    service = GroupService(db)
    group = await service.add_members(
        group_id=group_id, caller_id=current_user.id, body=body
    )
    return APIResponse(data=group)


# ---------------------------------------------------------------------------
# DELETE /groups/{id}/members/{user_id}
# ---------------------------------------------------------------------------

@router.delete(
    "/{group_id}/members/{target_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a member",
    description="""
Remove a member from the group.

**Permissions:**
- A member may remove **themselves** (leave group).
- An admin may remove **any** member.
- The **last admin cannot be removed** — promote another member first.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Group not found, or target is not a member |
| `FORBIDDEN` | 403 | Caller lacks permission |
| `LAST_ADMIN` | 400 | Cannot remove the only admin |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Insufficient permission"},
        404: {"model": ErrorResponse, "description": "Group or member not found"},
        400: {"model": ErrorResponse, "description": "Cannot remove last admin"},
    },
)
async def remove_member(
    group_id: str,
    target_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    service = GroupService(db)
    await service.remove_member(
        group_id=group_id,
        caller_id=current_user.id,
        target_user_id=target_user_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
