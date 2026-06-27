"""Conversation and in-conversation message endpoints.

All routes are prefixed with /api/v1/conversations by the top-level router.
Every endpoint requires a valid Bearer JWT.

  GET   /conversations                    — paginated list
  GET   /conversations/search?q=          — search by name / group
  POST  /conversations/direct             — open or get direct conversation
  GET   /conversations/{id}               — conversation detail
  POST  /conversations/{id}/read          — mark conversation read
  PATCH /conversations/{id}/archive       — toggle archive

  GET   /conversations/{id}/messages      — cursor-paginated message history
  POST  /conversations/{id}/messages      — send a message
"""
import json

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import APIResponse, ErrorResponse
from app.schemas.conversation import (
    ArchiveConversationRequest,
    ConversationDetailResponse,
    ConversationResponse,
    ConversationsListResponse,
    ConversationSearchResult,
    CreateDirectConversationRequest,
    ReadResponse,
)
from app.schemas.message import MessageListResponse, MessageResponse, SendMessageRequest
from app.services.conversation_service import ConversationService
from app.services.message_service import MessageService

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /conversations/search  — MUST come before /{id}
# ---------------------------------------------------------------------------

@router.get(
    "/search",
    response_model=APIResponse[list[ConversationSearchResult]],
    summary="Search conversations",
    description="""
Search the caller's conversations by **participant name** (direct chats) or
**group name**.

Results are ordered by most recently active first.

### Query parameters
| Param | Default | Constraint |
|---|---|---|
| `q` | — | Required, minimum 2 characters |

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `VALIDATION_ERROR` | 422 | `q` shorter than 2 chars |
""",
    responses={401: {"model": ErrorResponse}},
)
async def search_conversations(
    q: str = Query(..., min_length=2, description="Search term (min 2 chars)."),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[list[ConversationSearchResult]]:
    service = ConversationService(db)
    results = await service.search(caller_id=current_user.id, query=q)
    return APIResponse(data=results)


# ---------------------------------------------------------------------------
# GET /conversations
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=APIResponse[ConversationsListResponse],
    summary="List conversations",
    description="""
Return the caller's conversations (both direct and group), ordered by
`updated_at` DESC (most recently active first).

Each item includes a `last_message` preview, `unread_count`, and the
`is_archived` flag specific to the caller.

### Query parameters
| Param | Default | Max |
|---|---|---|
| `limit` | `30` | `100` |
| `offset` | `0` | — |

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
""",
    responses={401: {"model": ErrorResponse}},
)
async def list_conversations(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ConversationsListResponse]:
    service = ConversationService(db)
    data = await service.list_conversations(
        user_id=current_user.id, limit=limit, offset=offset
    )
    return APIResponse(data=data)


# ---------------------------------------------------------------------------
# POST /conversations/direct  — MUST come before /{id}
# ---------------------------------------------------------------------------

@router.post(
    "/direct",
    summary="Open a direct conversation",
    description="""
Open a 1-to-1 conversation with another user. If one already exists the
existing record is returned with `200 OK`; a brand-new conversation returns
`201 Created`.

### Body
```json
{ "target_user_id": "uuid" }
```

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Target user does not exist |
""",
    responses={
        200: {
            "model": APIResponse[ConversationResponse],
            "description": "Conversation already existed",
        },
        201: {
            "model": APIResponse[ConversationResponse],
            "description": "Conversation created",
        },
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse, "description": "Target user not found"},
    },
)
async def open_direct_conversation(
    body: CreateDirectConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    service = ConversationService(db)
    conv, created = await service.open_direct(
        caller_id=current_user.id, target_user_id=body.target_user_id
    )
    payload = APIResponse(data=conv).model_dump(mode="json")
    http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return Response(
        content=json.dumps(payload),
        status_code=http_status,
        media_type="application/json",
    )


# ---------------------------------------------------------------------------
# GET /conversations/{id}
# ---------------------------------------------------------------------------

@router.get(
    "/{conversation_id}",
    response_model=APIResponse[ConversationDetailResponse],
    summary="Get conversation detail",
    description="""
Fetch a single conversation with the full participant list, including each
participant's `is_admin`, `joined_at`, and `last_read_at` cursor.

Also returns the `unread_count` and latest message preview for the caller.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Conversation does not exist |
| `FORBIDDEN` | 403 | Caller is not a participant |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Not a participant"},
        404: {"model": ErrorResponse, "description": "Conversation not found"},
    },
)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ConversationDetailResponse]:
    service = ConversationService(db)
    detail = await service.get_conversation(
        conv_id=conversation_id, caller_id=current_user.id
    )
    return APIResponse(data=detail)


# ---------------------------------------------------------------------------
# POST /conversations/{id}/read
# ---------------------------------------------------------------------------

@router.post(
    "/{conversation_id}/read",
    response_model=APIResponse[ReadResponse],
    summary="Mark conversation as read",
    description="""
Update the caller's `last_read_at` cursor to the current server time, which
resets the **unread count** for this conversation to zero.

The response contains the new `last_read_at` timestamp.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Conversation does not exist |
| `FORBIDDEN` | 403 | Caller is not a participant |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Not a participant"},
        404: {"model": ErrorResponse, "description": "Conversation not found"},
    },
)
async def mark_conversation_read(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ReadResponse]:
    service = ConversationService(db)
    result = await service.mark_read(
        conv_id=conversation_id, caller_id=current_user.id
    )
    return APIResponse(data=result)


# ---------------------------------------------------------------------------
# PATCH /conversations/{id}/archive
# ---------------------------------------------------------------------------

@router.patch(
    "/{conversation_id}/archive",
    response_model=APIResponse[ConversationResponse],
    summary="Archive or unarchive a conversation",
    description="""
Toggle the **is_archived** flag for this conversation **for the caller only**.
Other participants are not affected.

### Body
```json
{ "is_archived": true }
```

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Conversation does not exist |
| `FORBIDDEN` | 403 | Caller is not a participant |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Not a participant"},
        404: {"model": ErrorResponse, "description": "Conversation not found"},
    },
)
async def toggle_archive(
    conversation_id: str,
    body: ArchiveConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ConversationResponse]:
    service = ConversationService(db)
    result = await service.toggle_archive(
        conv_id=conversation_id, caller_id=current_user.id, body=body
    )
    return APIResponse(data=result)


# ===========================================================================
# Message sub-resources (nested under /conversations/{id}/messages)
# ===========================================================================

# ---------------------------------------------------------------------------
# GET /conversations/{id}/messages
# ---------------------------------------------------------------------------

@router.get(
    "/{conversation_id}/messages",
    response_model=APIResponse[MessageListResponse],
    summary="List messages",
    description="""
Return messages in a conversation, newest first (cursor-based pagination).

### Cursor pagination
| Param | Behaviour |
|---|---|
| *(none)* | Most recent `limit` messages |
| `before=<msg_id>` | Messages older than the given message (load more history) |
| `after=<msg_id>` | Messages newer than the given message (reconnect catch-up) |

The client should **reverse** the page before display so the oldest message
appears at the top.

`has_more: true` means there are additional messages in the chosen direction.
`next_cursor` is the ID of the last message in the current page.

### Query parameters
| Param | Default | Max |
|---|---|---|
| `limit` | `50` | `100` |
| `before` | — | — |
| `after` | — | — |

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Conversation not found |
| `FORBIDDEN` | 403 | Caller is not a participant |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Not a participant"},
        404: {"model": ErrorResponse, "description": "Conversation not found"},
    },
)
async def list_messages(
    conversation_id: str,
    limit: int = Query(50, ge=1, le=100),
    before: str | None = Query(None, description="Cursor — get messages older than this ID."),
    after: str | None = Query(None, description="Cursor — get messages newer than this ID."),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[MessageListResponse]:
    service = MessageService(db)
    data = await service.list_messages(
        conv_id=conversation_id,
        caller_id=current_user.id,
        limit=limit,
        before_id=before,
        after_id=after,
    )
    return APIResponse(data=data)


# ---------------------------------------------------------------------------
# POST /conversations/{id}/messages
# ---------------------------------------------------------------------------

@router.post(
    "/{conversation_id}/messages",
    response_model=APIResponse[MessageResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Send a message",
    description="""
Send a message in a conversation.

`client_id` is a UUID the client generates before sending; the server echoes it
back so the client can replace the optimistic entry in its local state.

### Body
```json
{
  "content": "Hello!",
  "message_type": "text",
  "reply_to_id": null,
  "client_id": "client-uuid"
}
```

### `message_type` values
| Value | Meaning |
|---|---|
| `text` | Plain-text message (default) |
| `image` | Image URL stored in `content` |
| `file` | File URL stored in `content` |
| `system` | System-generated event (e.g. "Alice joined") |

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Conversation or reply target not found |
| `FORBIDDEN` | 403 | Caller is not a participant |
| `INVALID_MESSAGE_TYPE` | 400 | Unknown message_type value |
""",
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse, "description": "Not a participant"},
        404: {"model": ErrorResponse, "description": "Conversation not found"},
        400: {"model": ErrorResponse, "description": "Invalid message_type"},
    },
)
async def send_message(
    conversation_id: str,
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[MessageResponse]:
    service = MessageService(db)
    msg = await service.send_message(
        conv_id=conversation_id, sender_id=current_user.id, body=body
    )
    return APIResponse(data=msg)
