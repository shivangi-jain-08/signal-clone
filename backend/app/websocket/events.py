"""Socket.io event name constants.

Both server-side handlers and client-side code reference these strings.
Centralising them here prevents typos and makes renaming safe.
"""


class ServerEvents:
    """Events the server emits to clients."""

    # Message lifecycle — emitted to conv:<conversation_id>
    NEW_MESSAGE = "new_message"
    MESSAGE_EDITED = "message_edited"
    MESSAGE_DELETED = "message_deleted"
    REACTION_UPDATED = "reaction_updated"

    # Typing indicators — emitted to conv:<conversation_id>
    TYPING = "typing"
    STOP_TYPING = "stop_typing"

    # Presence — emitted to conv:<conversation_id> for all convs the user is in
    USER_ONLINE = "user_online"
    USER_OFFLINE = "user_offline"

    # Delivery / read receipts — emitted to user:<sender_id>
    MESSAGE_STATUS_UPDATE = "message_status_update"

    # Read cursor — emitted to conv:<conversation_id>
    CONVERSATION_READ = "conversation_read"

    # Handshake ack — emitted to the connecting sid
    CONNECTED = "connected"


class ClientEvents:
    """Events the client emits to the server."""

    TYPING = "typing"
    STOP_TYPING = "stop_typing"
    MESSAGE_READ = "message_read"
    JOIN_CONVERSATION = "join_conversation"


# Room naming helpers
def conversation_room(conversation_id: str) -> str:
    return f"conv:{conversation_id}"


def user_room(user_id: str) -> str:
    return f"user:{user_id}"
