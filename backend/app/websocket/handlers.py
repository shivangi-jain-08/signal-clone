"""Socket.io event handlers.

All handlers are registered against the shared `sio` instance from main.py.
Event handler implementations will be added in the WebSocket feature phase.
"""
import socketio

from app.websocket.manager import connection_manager


def register_handlers(sio: socketio.AsyncServer) -> None:
    """Attach all Socket.io lifecycle and event handlers to the server."""

    @sio.event
    async def connect(sid: str, environ: dict, auth: dict | None = None) -> bool:
        """Validate JWT on handshake. Returns False to reject the connection."""
        # Full JWT validation added in auth phase
        return True

    @sio.event
    async def disconnect(sid: str) -> None:
        user_id, is_offline = connection_manager.disconnect(sid)
        if user_id and is_offline:
            # Broadcast user_offline event — implemented in feature phase
            pass
