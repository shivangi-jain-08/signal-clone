"""ConnectionManager tracks active Socket.io sessions per user.

A user can be connected from multiple tabs / devices simultaneously.
is_online is True while at least one sid is connected.
is_last_tab is True when the final sid disconnects.
"""


class ConnectionManager:
    def __init__(self) -> None:
        self._sid_user: dict[str, str] = {}           # sid  → user_id
        self._user_sids: dict[str, set[str]] = {}     # user_id → {sid, …}
        self._user_convs: dict[str, set[str]] = {}    # user_id → {conv_id, …}
        self._user_name: dict[str, str] = {}           # user_id → display_name

    def connect(self, sid: str, user_id: str, conv_ids: list[str], display_name: str = "") -> bool:
        """Register a new connection. Returns True if this is the user's first tab."""
        self._sid_user[sid] = user_id
        sids = self._user_sids.setdefault(user_id, set())
        first = len(sids) == 0
        sids.add(sid)
        self._user_convs[user_id] = set(conv_ids)
        self._user_name[user_id] = display_name
        return first

    def disconnect(self, sid: str) -> tuple[str | None, bool, set[str]]:
        """Unregister a disconnection. Returns (user_id, is_last_tab, conv_ids)."""
        user_id = self._sid_user.pop(sid, None)
        if not user_id:
            return None, False, set()
        sids = self._user_sids.get(user_id, set())
        sids.discard(sid)
        is_last = len(sids) == 0
        conv_ids = frozenset(self._user_convs.get(user_id, set()))
        if is_last:
            self._user_sids.pop(user_id, None)
            self._user_convs.pop(user_id, None)
        return user_id, is_last, conv_ids

    def add_conv(self, user_id: str, conv_id: str) -> None:
        """Add a conversation room when the user joins a new conversation."""
        self._user_convs.setdefault(user_id, set()).add(conv_id)

    def is_online(self, user_id: str) -> bool:
        return bool(self._user_sids.get(user_id))

    def get_user_id(self, sid: str) -> str | None:
        return self._sid_user.get(sid)

    def get_display_name(self, user_id: str) -> str:
        return self._user_name.get(user_id, "")

    def get_conv_ids(self, user_id: str) -> frozenset[str]:
        return frozenset(self._user_convs.get(user_id, set()))

    def get_sids(self, user_id: str) -> set[str]:
        return self._user_sids.get(user_id, set())


connection_manager = ConnectionManager()
