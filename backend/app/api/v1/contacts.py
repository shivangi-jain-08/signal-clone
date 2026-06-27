"""Contact endpoints.

All routes are prefixed with /api/v1/contacts by the top-level router.
Every endpoint requires a valid Bearer JWT.

  GET    /contacts
  POST   /contacts
  DELETE /contacts/{id}
  PATCH  /contacts/{id}

Contacts are asymmetric: Alice adding Bob does not add Alice to Bob's list.
"""
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import APIResponse, ErrorResponse
from app.schemas.contact import (
    AddContactRequest,
    ContactResponse,
    ContactsListResponse,
    UpdateContactRequest,
)
from app.services.contact_service import ContactService

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /contacts
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=APIResponse[ContactsListResponse],
    summary="List contacts",
    description="""
Return the caller's contact list, ordered by the time the contact was added
(oldest first).

### Query parameters
| Param | Default | Max |
|---|---|---|
| `limit` | `50` | `100` |
| `offset` | `0` | — |

### Response
```json
{
  "data": {
    "contacts": [
      {
        "id": "uuid",
        "contact_user": { ...UserPublic },
        "nickname": null,
        "created_at": "2024-01-15T10:00:00Z"
      }
    ],
    "total": 12,
    "limit": 50,
    "offset": 0
  }
}
```

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
""",
    responses={401: {"model": ErrorResponse}},
)
async def list_contacts(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ContactsListResponse]:
    service = ContactService(db)
    data = await service.list_contacts(
        owner_id=current_user.id, limit=limit, offset=offset
    )
    return APIResponse(data=data)


# ---------------------------------------------------------------------------
# POST /contacts
# ---------------------------------------------------------------------------

@router.post(
    "",
    summary="Add a contact",
    description="""
Add a user to the caller's contact list.

**Idempotent** — if the contact already exists, the existing record is returned
with `200 OK` rather than creating a duplicate. A newly created contact returns
`201 Created`.

### Body
```json
{ "contact_user_id": "uuid", "nickname": null }
```

`contact_user_id` is the UUID of the user to add (from `GET /users/search`).
`nickname` overrides `display_name` in the caller's contact list only.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `SELF_CONTACT` | 400 | Attempting to add yourself |
| `NOT_FOUND` | 404 | Target user does not exist |
""",
    responses={
        200: {"model": APIResponse[ContactResponse], "description": "Contact already existed"},
        201: {"model": APIResponse[ContactResponse], "description": "Contact created"},
        400: {
            "model": ErrorResponse,
            "description": "Attempting to add yourself",
            "content": {
                "application/json": {
                    "example": {"detail": "Cannot add yourself as a contact", "code": "SELF_CONTACT"}
                }
            },
        },
        401: {"model": ErrorResponse},
        404: {
            "model": ErrorResponse,
            "description": "Target user not found",
        },
    },
)
async def add_contact(
    body: AddContactRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    service = ContactService(db)
    contact, created = await service.add_contact(
        owner_id=current_user.id,
        contact_user_id=body.contact_user_id,
        nickname=body.nickname,
    )
    payload = APIResponse(data=contact).model_dump(mode="json")
    http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    import json
    return Response(
        content=json.dumps(payload),
        status_code=http_status,
        media_type="application/json",
    )


# ---------------------------------------------------------------------------
# PATCH /contacts/{contact_id}
# ---------------------------------------------------------------------------

@router.patch(
    "/{contact_id}",
    response_model=APIResponse[ContactResponse],
    summary="Update a contact's nickname",
    description="""
Set or clear the **nickname** for a contact. The nickname overrides the
contact's `display_name` in this caller's view only.

Pass `null` to clear a previously set nickname.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Contact not found or does not belong to the caller |
""",
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse, "description": "Contact not found"},
    },
)
async def update_contact(
    contact_id: str,
    body: UpdateContactRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ContactResponse]:
    service = ContactService(db)
    updated = await service.update_nickname(
        owner_id=current_user.id,
        contact_id=contact_id,
        nickname=body.nickname,
    )
    return APIResponse(data=updated)


# ---------------------------------------------------------------------------
# DELETE /contacts/{contact_id}
# ---------------------------------------------------------------------------

@router.delete(
    "/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a contact",
    description="""
Remove a contact from the caller's list. This does **not** delete conversation
history or affect the other user's contact list.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | Contact not found or does not belong to the caller |
""",
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse, "description": "Contact not found"},
    },
)
async def remove_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    service = ContactService(db)
    await service.remove_contact(
        owner_id=current_user.id, contact_id=contact_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
