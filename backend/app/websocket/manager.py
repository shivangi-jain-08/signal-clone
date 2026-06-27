"""ConnectionManager tracks all active Socket.io sessions per user.

A user can be connected from multiple tabs / devices simultaneously.
A user is considered online if they have at least one active sid.
"""
import socketio


class ConnectionManager:
    def __init__(self) -> None:
        # Maps user_id → set of Socket.io sids
        self._user_sids: dict[str, set[str]] = {}
        # Maps sid → user_id (reverse lookup for disconnect)
        self._sid_user: dict[str, str] = {}

    def connect(self, sid: str, user_id: str) -> bool:
        """Register a new connection. Returns True if this is the user's first session."""
        self._sid_user[sid] = user_id
        if user_id not in self._user_sids:
            self._user_sids[user_id] = set()
        was_offline = len(self._user_sids[user_id]) == 0
        self._user_sids[user_id].add(sid)
        return was_offline

    def disconnect(self, sid: str) -> tuple[str | None, bool]:
        """Remove a session. Returns (user_id, is_now_offline)."""
        user_id = self._sid_user.pop(sid, None)
        if user_id is None:
            return None, False
        self._user_sids.get(user_id, set()).discard(sid)
        is_offline = len(self._user_sids.get(user_id, set())) == 0
        if is_offline:
            self._user_sids.pop(user_id, None)
        return user_id, is_offline

    def is_online(self, user_id: str) -> bool:
        return bool(self._user_sids.get(user_id))

    def get_user_id(self, sid: str) -> str | None:
        return self._sid_user.get(sid)

    def get_sids(self, user_id: str) -> set[str]:
        return self._user_sids.get(user_id, set())


connection_manager = ConnectionManager()
