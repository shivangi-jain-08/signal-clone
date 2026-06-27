from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, utcnow, uuid4_str

if TYPE_CHECKING:
    from app.models.message import Message
    from app.models.user import User


class Reaction(Base):
    __tablename__ = "reactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    message_id: Mapped[str] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    emoji: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow, nullable=False)

    message: Mapped["Message"] = relationship(back_populates="reactions")
    user: Mapped["User"] = relationship()

    __table_args__ = (
        UniqueConstraint("message_id", "user_id"),
        Index("idx_reactions_message", "message_id"),
    )
