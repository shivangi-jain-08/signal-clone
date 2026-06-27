from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, utcnow, uuid4_str

if TYPE_CHECKING:
    from app.models.conversation import Conversation
    from app.models.user import User


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    joined_at: Mapped[datetime] = mapped_column(default=utcnow, nullable=False)
    last_read_at: Mapped[datetime | None] = mapped_column(nullable=True)
    is_admin: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(default=False, nullable=False)

    conversation: Mapped["Conversation"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship(back_populates="participations")

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id"),
        Index("idx_cp_conversation", "conversation_id"),
        Index("idx_cp_user", "user_id"),
    )
