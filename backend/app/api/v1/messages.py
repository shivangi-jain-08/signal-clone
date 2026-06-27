"""Message CRUD endpoints (message-level operations).

All routes are prefixed with /api/v1/messages by the top-level router.
Every endpoint requires a valid Bearer JWT.

  PATCH  /messages/{id}            — edit message content
  DELETE /messages/{id}            — soft-delete a message
  PUT    /messages/{id}/reactions  — add / update / remove a reaction
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import APIResponse, ErrorResponse
from app.schemas.message import (
    DeleteMessageResponse,
    EditMessageRequest,
    MessageResponse,
    ReactionResponse,
    ReactRequest,
)
from app.services.message_service import MessageService

router = APIRouter()


# ---------------------------------------------------------------------------
# PATCH /messages/{id}
# ---------------------------------------------------------------------------

@router.patch(
    "/{message_id}",
    response_model=APIResponse[MessageResponse],
    summary="Edit a message",
    description="""
Replace the `content` of an existing message. Only the **original sender**
can edit their message.

`edited_at` is set to the current server time and is surfaced in the response
so clients can show an "edited" indicator.

### Body
```json
{ "content": "Updated text" }
```

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Message not found |
| `FORBIDDEN` | 403 | Caller is not the sender |
| `MESSAGE_DELETED` | 400 | Message has already been deleted |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Caller is not the sender"},
        404: {"model": ErrorResponse, "description": "Message not found"},
        400: {"model": ErrorResponse, "description": "Message already deleted"},
    },
)
async def edit_message(
    message_id: str,
    body: EditMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[MessageResponse]:
    service = MessageService(db)
    msg = await service.edit_message(
        message_id=message_id, caller_id=current_user.id, body=body
    )
    return APIResponse(data=msg)


# ---------------------------------------------------------------------------
# DELETE /messages/{id}
# ---------------------------------------------------------------------------

@router.delete(
    "/{message_id}",
    response_model=APIResponse[DeleteMessageResponse],
    summary="Delete a message",
    description="""
Soft-delete a message. Sets `deleted_at` to the current server time.

**Permissions:** the original sender *or* a group admin can delete.

API responses replace `content` with `""` and signal deletion via
`deleted_at != null`. The actual content is preserved in the database for
audit purposes.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Message not found |
| `FORBIDDEN` | 403 | Caller lacks permission to delete |
| `MESSAGE_DELETED` | 400 | Message is already deleted |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Caller lacks delete permission"},
        404: {"model": ErrorResponse, "description": "Message not found"},
        400: {"model": ErrorResponse, "description": "Already deleted"},
    },
)
async def delete_message(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[DeleteMessageResponse]:
    service = MessageService(db)
    result = await service.delete_message(
        message_id=message_id, caller_id=current_user.id
    )
    return APIResponse(data=result)


# ---------------------------------------------------------------------------
# PUT /messages/{id}/reactions
# ---------------------------------------------------------------------------

@router.put(
    "/{message_id}/reactions",
    response_model=APIResponse[ReactionResponse],
    summary="Add, update, or remove a reaction",
    description="""
One reaction per user per message.

- **Add or update**: send a non-empty `emoji` string.
- **Remove**: send `emoji: ""` (empty string).

Returns the full updated reactions list for this message (flat pairs of
`{ emoji, user_id }`), so the client can replace its local state in one shot.

### Body
```json
{ "emoji": "👍" }
```

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Message not found |
| `FORBIDDEN` | 403 | Caller is not a participant in the conversation |
| `MESSAGE_DELETED` | 400 | Cannot react to a deleted message |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Not a conversation participant"},
        404: {"model": ErrorResponse, "description": "Message not found"},
        400: {"model": ErrorResponse, "description": "Message deleted"},
    },
)
async def react_to_message(
    message_id: str,
    body: ReactRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ReactionResponse]:
    service = MessageService(db)
    result = await service.react(
        message_id=message_id, caller_id=current_user.id, body=body
    )
    return APIResponse(data=result)
