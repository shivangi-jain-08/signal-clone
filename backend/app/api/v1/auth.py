"""Authentication endpoints.

All routes here are prefixed with /api/v1/auth by the top-level router.

Public endpoints (no JWT required):
  POST /auth/register
  POST /auth/send-otp
  POST /auth/verify-otp

Protected endpoints (Bearer JWT required):
  POST /auth/logout
  GET  /auth/me

OTP is always "123456" in this mock system.
JWT payload: { sub: user_id, jti: session_id, exp: issued_at + 7 days }
"""
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_session, get_current_user
from app.database.session import get_db
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    RegisterRequest,
    RegisterResponse,
    SendOTPRequest,
    SendOTPResponse,
    VerifyOTPRequest,
)
from app.schemas.common import APIResponse, ErrorResponse
from app.schemas.user import UserMe
from app.services.auth_service import AuthService

router = APIRouter()

# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=APIResponse[RegisterResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="""
Create a new user account with a phone number, username, and display name.

On success the server stores a **mock OTP** (`123456`) against the phone number
and returns a prompt to proceed with OTP verification.
**No JWT is issued at this step.** The caller must follow up with
`POST /auth/verify-otp` to receive a token.

### Field rules
| Field | Constraint |
|---|---|
| `phone_number` | E.164 Indian mobile (`+91` + 10 digits, first digit 6–9) |
| `username` | 3–30 chars, lowercase alphanumeric + underscore only |
| `display_name` | 1–60 chars |

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `ALREADY_EXISTS` | 409 | Phone number **or** username already registered |
| `VALIDATION_ERROR` | 400 | Field constraint violated |
""",
    responses={
        409: {
            "model": ErrorResponse,
            "description": "Phone number or username already registered",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Phone number already registered",
                        "code": "ALREADY_EXISTS",
                    }
                }
            },
        },
    },
)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[RegisterResponse]:
    service = AuthService(db)
    data = await service.register(
        phone_number=body.phone_number,
        username=body.username,
        display_name=body.display_name,
    )
    return APIResponse(data=data)


# ---------------------------------------------------------------------------
# POST /auth/send-otp
# ---------------------------------------------------------------------------

@router.post(
    "/send-otp",
    response_model=APIResponse[SendOTPResponse],
    summary="Request an OTP (login flow)",
    description="""
Request a mock OTP for a **returning user**.

Use this endpoint when a user wants to log in to an existing account.
For new accounts, registration (`POST /auth/register`) automatically stores
the OTP — you do **not** need to call this endpoint after registration.

The OTP is always `123456` in this mock system.
After calling this endpoint the caller should proceed with `POST /auth/verify-otp`.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `NOT_FOUND` | 404 | Phone number not registered |
""",
    responses={
        404: {
            "model": ErrorResponse,
            "description": "Phone number not registered",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Phone number not registered",
                        "code": "NOT_FOUND",
                    }
                }
            },
        },
    },
)
async def send_otp(
    body: SendOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[SendOTPResponse]:
    service = AuthService(db)
    data = await service.send_otp(phone_number=body.phone_number)
    return APIResponse(data=data)


# ---------------------------------------------------------------------------
# POST /auth/verify-otp
# ---------------------------------------------------------------------------

@router.post(
    "/verify-otp",
    response_model=APIResponse[AuthResponse],
    summary="Verify OTP and issue a JWT",
    description="""
Validate the OTP and **issue a Bearer JWT**. This is the single point where
tokens are created for both the registration and login flows.

On success:
- The OTP is cleared from the user record (one-time use).
- A new **session row** is inserted in the `sessions` table. The session id
  becomes the JWT `jti` claim, enabling explicit revocation via logout.
- The response contains the token and the caller's full profile.

### Token format
```
Header:  { "alg": "HS256", "typ": "JWT" }
Payload: { "sub": "<user_id>", "jti": "<session_id>", "exp": <unix_ts> }
```
Token lifetime is **7 days** from issue time.

### Using the token
Include it in every subsequent request:
```
Authorization: Bearer <token>
```

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `NOT_FOUND` | 404 | Phone number not registered |
| `WRONG_OTP` | 400 | OTP does not match the stored code |
| `OTP_EXPIRED` | 400 | OTP is older than 10 minutes |
""",
    responses={
        400: {
            "model": ErrorResponse,
            "description": "Incorrect or expired OTP",
            "content": {
                "application/json": {
                    "examples": {
                        "wrong": {
                            "summary": "Wrong OTP",
                            "value": {"detail": "Incorrect OTP", "code": "WRONG_OTP"},
                        },
                        "expired": {
                            "summary": "OTP expired",
                            "value": {
                                "detail": "OTP has expired, request a new one",
                                "code": "OTP_EXPIRED",
                            },
                        },
                    }
                }
            },
        },
        404: {
            "model": ErrorResponse,
            "description": "Phone number not registered",
        },
    },
)
async def verify_otp(
    body: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[AuthResponse]:
    service = AuthService(db)
    data = await service.verify_otp(
        phone_number=body.phone_number,
        otp=body.otp,
    )
    return APIResponse(data=data)


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------

@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Invalidate the current session",
    description="""
Hard-delete the session row associated with the current Bearer token.

After this call:
- Any subsequent request that presents the same token will receive `401`.
- Other active sessions for the same user (different tabs / devices) are
  **not** affected.

### Response
`204 No Content` — no body on success.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` | 401 | No `Authorization` header |
| `TOKEN_INVALID` | 401 | Malformed / unverifiable token |
| `TOKEN_EXPIRED` | 401 | Session has expired |
""",
    responses={
        401: {
            "model": ErrorResponse,
            "description": "Missing, invalid, or expired token",
        },
    },
)
async def logout(
    db: AsyncSession = Depends(get_db),
    session: UserSession = Depends(get_current_session),
) -> Response:
    service = AuthService(db)
    await service.logout(session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=APIResponse[UserMe],
    summary="Get the authenticated user's profile",
    description="""
Return the **full profile** of the currently authenticated user.

Unlike `GET /users/{id}` (which returns the public schema), this endpoint
includes private fields:
- `phone_number` — the registered E.164 number
- `created_at` — account creation timestamp

The response is derived from the JWT's `sub` claim; no query parameter is
needed.

### Errors
| Code | HTTP | Meaning |
|---|---|---|
| `TOKEN_MISSING` | 401 | No `Authorization` header |
| `TOKEN_INVALID` | 401 | Malformed / unverifiable token, or session revoked |
| `TOKEN_EXPIRED` | 401 | Session has expired |
""",
    responses={
        401: {
            "model": ErrorResponse,
            "description": "Missing, invalid, or expired token",
        },
    },
)
async def me(
    current_user: User = Depends(get_current_user),
) -> APIResponse[UserMe]:
    return APIResponse(data=UserMe.model_validate(current_user))
