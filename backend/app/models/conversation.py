from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid4_str

if TYPE_CHECKING:
    from app.models.group import Group
    from app.models.message import Message
    from app.models.participant import ConversationParticipant


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    type: Mapped[str] = mapped_column(String, nullable=False)

    participants: Mapped[list["ConversationParticipant"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )
    group: Mapped["Group | None"] = relationship(
        back_populates="conversation", uselist=False
    )

    __table_args__ = (
        CheckConstraint("type IN ('direct', 'group')", name="ck_conversation_type"),
        Index("idx_conversations_updated", "updated_at"),
    )
