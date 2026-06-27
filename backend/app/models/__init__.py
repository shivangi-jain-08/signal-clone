# Re-export all ORM models so alembic/env.py can import the entire package
# and have every model registered with Base.metadata.
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.group import Group
from app.models.message import Message
from app.models.message_status import MessageStatus
from app.models.participant import ConversationParticipant
from app.models.reaction import Reaction
from app.models.session import UserSession
from app.models.user import User

__all__ = [
    "User",
    "UserSession",
    "Contact",
    "Conversation",
    "ConversationParticipant",
    "Message",
    "MessageStatus",
    "Group",
    "Reaction",
]
