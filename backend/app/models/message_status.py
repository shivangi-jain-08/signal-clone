from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, uuid4_str

if TYPE_CHECKING:
    from app.models.message import Message
    from app.models.user import User


class MessageStatus(Base):
    __tablename__ = "message_status"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    message_id: Mapped[str] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)

    message: Mapped["Message"] = relationship(back_populates="statuses")
    user: Mapped["User"] = relationship()

    __table_args__ = (
        CheckConstraint("status IN ('delivered', 'read')", name="ck_message_status"),
        UniqueConstraint("message_id", "user_id"),
        Index("idx_ms_message", "message_id"),
        Index("idx_ms_user", "user_id"),
    )
