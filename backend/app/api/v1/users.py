"""User endpoints.

All routes are prefixed with /api/v1/users by the top-level router.
Every endpoint requires a valid Bearer JWT.

  GET  /users/search?q=&limit=
  GET  /users/me
  PATCH /users/me
  GET  /users/{user_id}
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import APIResponse, ErrorResponse
from app.schemas.user import UpdateProfileRequest, UserMe, UserPublic
from app.services.user_service import UserService

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /users/search
# Must be declared before /users/{user_id} so FastAPI doesn't treat
# the literal string "search" as a path parameter.
# ---------------------------------------------------------------------------

@router.get(
    "/search",
    response_model=APIResponse[list[UserPublic]],
    summary="Search users",
    description="""
Find users by **username prefix** or **display name substring**.
The caller is always excluded from results.

### Query parameters
| Param | Default | Constraint |
|---|---|---|
| `q` | — | Required, minimum 2 characters |
| `limit` | `20` | 1–50 |

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `VALIDATION_ERROR` | 422 | `q` shorter than 2 chars |
""",
    responses={401: {"model": ErrorResponse}},
)
async def search_users(
    q: str = Query(..., min_length=2, description="Search term (min 2 chars)."),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[list[UserPublic]]:
    service = UserService(db)
    results = await service.search(query=q, caller_id=current_user.id, limit=limit)
    return APIResponse(data=results)


# ---------------------------------------------------------------------------
# GET /users/me
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=APIResponse[UserMe],
    summary="Get own profile",
    description="""
Return the authenticated user's **full profile**, including private fields
(`phone_number`, `created_at`).

Equivalent to `GET /auth/me`. Provided here so the frontend's
`/services/api/users.ts` can use a single base URL without mixing auth routes.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
""",
    responses={401: {"model": ErrorResponse}},
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> APIResponse[UserMe]:
    return APIResponse(data=UserMe.model_validate(current_user))


# ---------------------------------------------------------------------------
# PATCH /users/me
# ---------------------------------------------------------------------------

@router.patch(
    "/me",
    response_model=APIResponse[UserMe],
    summary="Update own profile",
    description="""
Partial update of the authenticated user's profile.
All fields are optional — only provided fields are changed.

### Updatable fields
| Field | Constraint |
|---|---|
| `display_name` | 1–60 chars |
| `bio` | max 200 chars |
| `username` | 3–30 chars, lowercase alphanumeric + underscore; must be globally unique |
| `avatar_url` | max 500 chars; point to a URL returned by `POST /media/upload` |

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `ALREADY_EXISTS` | 409 | New username is already taken |
| `VALIDATION_ERROR` | 422 | Field constraint violated |
""",
    responses={
        401: {"model": ErrorResponse},
        409: {
            "model": ErrorResponse,
            "description": "Username already taken",
            "content": {
                "application/json": {
                    "example": {"detail": "Username already taken", "code": "ALREADY_EXISTS"}
                }
            },
        },
    },
)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[UserMe]:
    service = UserService(db)
    updated = await service.update_profile(user=current_user, data=body)
    return APIResponse(data=updated)


# ---------------------------------------------------------------------------
# GET /users/{user_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{user_id}",
    response_model=APIResponse[UserPublic],
    summary="Get a user's public profile",
    description="""
Fetch the **public profile** of any user by their UUID.

`phone_number` is intentionally omitted from this response.
To retrieve your own private profile (including phone), use `GET /users/me`.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Auth required |
| `NOT_FOUND` | 404 | User does not exist |
""",
    responses={
        401: {"model": ErrorResponse},
        404: {
            "model": ErrorResponse,
            "description": "User not found",
            "content": {
                "application/json": {
                    "example": {"detail": "User not found", "code": "NOT_FOUND"}
                }
            },
        },
    },
)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[UserPublic]:
    service = UserService(db)
    user = await service.get_by_id(user_id)
    return APIResponse(data=user)
