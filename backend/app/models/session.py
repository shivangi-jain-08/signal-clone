from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, utcnow, uuid4_str

if TYPE_CHECKING:
    from app.models.user import User


class UserSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="sessions")

    __table_args__ = (
        Index("idx_sessions_user", "user_id"),
        Index("idx_sessions_token", "token"),
        Index("idx_sessions_expires_at", "expires_at"),
    )
