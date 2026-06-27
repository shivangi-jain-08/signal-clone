"""Socket.io event name constants.

Both server-side handlers and client-side code reference these strings.
Centralising them here prevents typos and makes renaming safe.
"""


class ServerEvents:
    """Events the server emits to clients."""

    NEW_MESSAGE = "new_message"
    MESSAGE_STATUS = "message_status"
    MESSAGE_DELETED = "message_deleted"
    MESSAGE_EDITED = "message_edited"
    REACTION_UPDATED = "reaction_updated"
    TYPING_START = "typing_start"
    TYPING_STOP = "typing_stop"
    USER_ONLINE = "user_online"
    USER_OFFLINE = "user_offline"
    ERROR = "error"


class ClientEvents:
    """Events the client emits to the server."""

    SEND_MESSAGE = "send_message"
    TYPING_START = "typing_start"
    TYPING_STOP = "typing_stop"
    MESSAGE_READ = "message_read"
    JOIN_CONVERSATION = "join_conversation"
    LEAVE_CONVERSATION = "leave_conversation"


# Room naming conventions
def conversation_room(conversation_id: str) -> str:
    return f"conv:{conversation_id}"


def user_room(user_id: str) -> str:
    return f"user:{user_id}"
