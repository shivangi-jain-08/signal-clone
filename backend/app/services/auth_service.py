from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.core.security import create_access_token, generate_otp
from app.models.session import UserSession
from app.models.user import User
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthResponse, RegisterResponse, SendOTPResponse
from app.schemas.user import UserMe

_OTP_EXPIRY_MINUTES = 10


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._users = UserRepository(db)
        self._sessions = SessionRepository(db)

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    async def register(
        self,
        phone_number: str,
        username: str,
        display_name: str,
    ) -> RegisterResponse:
        """Create a new user account and store a mock OTP.

        Raises ConflictException if phone_number or username is already taken.
        Does NOT issue a JWT — the caller must follow up with verify-otp.
        """
        if await self._users.get_by_phone(phone_number):
            raise ConflictException(
                code="ALREADY_EXISTS",
                detail="Phone number already registered",
            )
        if await self._users.get_by_username(username):
            raise ConflictException(
                code="ALREADY_EXISTS",
                detail="Username already taken",
            )

        user = await self._users.create(
            phone_number=phone_number,
            username=username,
            display_name=display_name,
        )
        await self._store_otp(user)
        await self.db.commit()

        return RegisterResponse(
            message=f"OTP sent to {phone_number}",
            phone_number=phone_number,
        )

    async def send_otp(self, phone_number: str) -> SendOTPResponse:
        """(Re-)send a mock OTP to an existing user.

        Used for the login flow (returning users) and for OTP resend after
        registration. Raises NotFoundException if the phone number is not
        registered.
        """
        user = await self._users.get_by_phone(phone_number)
        if not user:
            raise NotFoundException("Phone number not registered")

        await self._store_otp(user)
        await self.db.commit()

        return SendOTPResponse(message=f"OTP sent to {phone_number}")

    async def verify_otp(self, phone_number: str, otp: str) -> AuthResponse:
        """Validate an OTP and issue a JWT.

        This is the single point where tokens are created for both the
        registration and login flows. On success:
          - OTP is cleared from the user row.
          - A new session row is inserted (enables logout / revocation).
          - A JWT is returned with { sub: user_id, jti: session_id, exp: +7d }.

        Raises:
          NotFoundException  — phone number not registered
          BadRequestException(WRONG_OTP)   — incorrect code
          BadRequestException(OTP_EXPIRED) — code older than 10 minutes
        """
        user = await self._users.get_by_phone(phone_number)
        if not user:
            raise NotFoundException("Phone number not registered")

        self._assert_otp_valid(user, otp)

        await self._users.clear_otp(user)

        token, session = await self._create_session(user)

        await self.db.commit()
        await self.db.refresh(user)

        return AuthResponse(
            token=token,
            user=UserMe.model_validate(user),
        )

    async def logout(self, session: UserSession) -> None:
        """Hard-delete the session row.

        After this call any JWT whose jti matches this session will be
        rejected by the auth middleware, even if the token has not expired.
        """
        await self._sessions.delete(session)
        await self.db.commit()

    async def get_me(self, user: User) -> UserMe:
        return UserMe.model_validate(user)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _store_otp(self, user: User) -> None:
        otp_code = generate_otp()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=_OTP_EXPIRY_MINUTES)
        await self._users.set_otp(user, otp_code, expires_at)

    def _assert_otp_valid(self, user: User, otp: str) -> None:
        if not user.otp_code or user.otp_code != otp:
            raise BadRequestException(code="WRONG_OTP", detail="Incorrect OTP")

        now = datetime.now(timezone.utc)
        expires = user.otp_expires_at
        if expires is not None:
            # SQLite stores datetimes as naive UTC; normalise before comparing.
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires < now:
                raise BadRequestException(
                    code="OTP_EXPIRED", detail="OTP has expired, request a new one"
                )

    async def _create_session(self, user: User) -> tuple[str, UserSession]:
        """Insert a session row, then generate a JWT that embeds the session id."""
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.ACCESS_TOKEN_EXPIRE_DAYS
        )
        # flush() inside create() gives us session.id before commit
        session = await self._sessions.create_session(
            user_id=user.id,
            token="pending",  # placeholder until we have the id
            expires_at=expires_at,
        )
        token = create_access_token(user_id=user.id, session_id=session.id)
        session.token = token
        return token, session
