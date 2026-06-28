"""Shared Socket.io AsyncServer singleton.

Imported by both app.main (which mounts it as ASGI) and the service layer
(which emits events after DB writes). Keeping it here rather than in main.py
breaks the circular import that would arise if services imported from main.
"""
import socketio

from app.core.config import settings

sio: socketio.AsyncServer = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS,
    logger=False,
    engineio_logger=False,
)
