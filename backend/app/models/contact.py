from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid4_str

if TYPE_CHECKING:
    from app.models.user import User


class Contact(Base, TimestampMixin):
    __tablename__ = "contacts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    owner_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    contact_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    nickname: Mapped[str | None] = mapped_column(String, nullable=True)

    owner: Mapped["User"] = relationship(foreign_keys=[owner_id], back_populates="contacts")
    contact_user: Mapped["User"] = relationship(foreign_keys=[contact_user_id])

    __table_args__ = (
        UniqueConstraint("owner_id", "contact_user_id"),
        Index("idx_contacts_owner", "owner_id"),
    )
