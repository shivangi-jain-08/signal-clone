from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid4_str

if TYPE_CHECKING:
    from app.models.contact import Contact
    from app.models.participant import ConversationParticipant
    from app.models.session import UserSession


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    phone_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    otp_code: Mapped[str | None] = mapped_column(String, nullable=True)
    otp_expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    bio: Mapped[str] = mapped_column(String, default="", nullable=False)
    is_online: Mapped[bool] = mapped_column(default=False, nullable=False)
    last_seen: Mapped[datetime | None] = mapped_column(nullable=True)

    sessions: Mapped[list["UserSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    contacts: Mapped[list["Contact"]] = relationship(
        foreign_keys="Contact.owner_id", back_populates="owner"
    )
    participations: Mapped[list["ConversationParticipant"]] = relationship(
        back_populates="user"
    )

    __table_args__ = (
        Index("idx_users_phone", "phone_number"),
        Index("idx_users_username", "username"),
    )
