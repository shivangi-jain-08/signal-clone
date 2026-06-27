"""FastAPI dependency providers.

All auth and database dependencies live here so routes stay thin.
Business logic dependencies (services) are injected directly per-route.
"""
from datetime import datetime, timezone

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedException
from app.core.security import decode_access_token
from app.database.session import get_db
from app.models.session import UserSession
from app.models.user import User

# auto_error=False so we can return our own 401 instead of FastAPI's 403.
bearer_scheme = HTTPBearer(auto_error=False)


async def _resolve_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, UserSession]:
    """Decode the Bearer token, verify the session has not been revoked, and
    return the authenticated (User, UserSession) pair.

    Raises UnauthorizedException for any of:
      - malformed / unsigned JWT
      - jti / sub missing from payload
      - session row not found (logged out)
      - session past its expires_at
      - user row not found (deleted account)
    """
    # Avoid circular imports — repos are lightweight, import is cheap here.
    from app.repositories.session_repository import SessionRepository
    from app.repositories.user_repository import UserRepository

    if credentials is None:
        raise UnauthorizedException(
            code="TOKEN_MISSING",
            detail="Authorization header is required",
        )

    token = credentials.credentials

    payload = decode_access_token(token)
    if payload is None:
        raise UnauthorizedException(
            code="TOKEN_INVALID",
            detail="Token is invalid or its signature could not be verified",
        )

    jti: str | None = payload.get("jti")
    user_id: str | None = payload.get("sub")
    if not jti or not user_id:
        raise UnauthorizedException(
            code="TOKEN_INVALID",
            detail="Token payload is missing required claims",
        )

    session = await SessionRepository(db).get_by_jti(jti)
    if session is None:
        raise UnauthorizedException(
            code="TOKEN_INVALID",
            detail="Session not found — token may have been revoked via logout",
        )

    # SQLite stores datetimes as naive UTC; normalise before comparing.
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise UnauthorizedException(
            code="TOKEN_EXPIRED",
            detail="Session has expired, please log in again",
        )

    user = await UserRepository(db).get_by_id(user_id)
    if user is None:
        raise UnauthorizedException(
            code="TOKEN_INVALID",
            detail="The user associated with this token no longer exists",
        )

    return user, session


async def get_current_user(
    resolved: tuple[User, UserSession] = Depends(_resolve_token),
) -> User:
    """Dependency that returns the authenticated User ORM object."""
    return resolved[0]


async def get_current_session(
    resolved: tuple[User, UserSession] = Depends(_resolve_token),
) -> UserSession:
    """Dependency that returns the active UserSession ORM object.

    Used by logout so the route can pass the exact session to delete.
    """
    return resolved[1]
