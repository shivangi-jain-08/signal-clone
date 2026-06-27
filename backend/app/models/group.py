from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid4_str

if TYPE_CHECKING:
    from app.models.conversation import Conversation
    from app.models.user import User


class Group(Base, TimestampMixin):
    __tablename__ = "groups"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, default="", nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)

    conversation: Mapped["Conversation"] = relationship(back_populates="group")
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])
