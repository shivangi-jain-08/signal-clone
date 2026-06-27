from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid4_str

if TYPE_CHECKING:
    from app.models.conversation import Conversation
    from app.models.message_status import MessageStatus
    from app.models.reaction import Reaction
    from app.models.user import User


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(String, default="", nullable=False)
    message_type: Mapped[str] = mapped_column(String, default="text", nullable=False)
    reply_to_id: Mapped[str | None] = mapped_column(
        ForeignKey("messages.id", ondelete="SET NULL"), nullable=True
    )
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    edited_at: Mapped[datetime | None] = mapped_column(nullable=True)
    disappears_at: Mapped[datetime | None] = mapped_column(nullable=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship(foreign_keys=[sender_id])
    reply_to: Mapped["Message | None"] = relationship(
        foreign_keys=[reply_to_id], remote_side="Message.id"
    )
    statuses: Mapped[list["MessageStatus"]] = relationship(
        back_populates="message", cascade="all, delete-orphan"
    )
    reactions: Mapped[list["Reaction"]] = relationship(
        back_populates="message", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "message_type IN ('text', 'image', 'file', 'system')",
            name="ck_message_type",
        ),
        Index("idx_messages_conversation", "conversation_id", "created_at"),
        Index("idx_messages_sender", "sender_id"),
        # Partial indexes expressed as SQLAlchemy Index with sqlite_where
        Index(
            "idx_messages_reply",
            "reply_to_id",
            sqlite_where=text("reply_to_id IS NOT NULL"),
        ),
        Index(
            "idx_messages_disappears",
            "disappears_at",
            sqlite_where=text("disappears_at IS NOT NULL"),
        ),
    )
