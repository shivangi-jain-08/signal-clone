"""Application factory and ASGI entry point.

Run locally:
    cd backend/
    uvicorn app.main:app --reload --port 8000

The `app` export is a Socket.io ASGIApp that wraps the FastAPI instance,
so both HTTP and WebSocket traffic are served from the same process / port.
"""
import logging
from contextlib import asynccontextmanager

import socketio
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.websocket.handlers import register_handlers

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer()
        if settings.LOG_LEVEL == "DEBUG"
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(logging, settings.LOG_LEVEL, logging.INFO)
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Socket.io server
# ---------------------------------------------------------------------------

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS,
    logger=False,
    engineio_logger=False,
)

register_handlers(sio)


# ---------------------------------------------------------------------------
# FastAPI application factory
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(application: FastAPI):
    logger.info("signal_api_starting", version="1.0.0")
    yield
    logger.info("signal_api_stopping")


def create_fastapi_app() -> FastAPI:
    application = FastAPI(
        title="Signal Clone API",
        version="1.0.0",
        description="Backend for Signal Desktop clone assignment.",
        docs_url="/docs" if settings.SHOW_DOCS else None,
        redoc_url="/redoc" if settings.SHOW_DOCS else None,
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(api_router, prefix="/api/v1")

    @application.get("/health", tags=["meta"])
    async def health_check() -> dict:
        return {"status": "ok", "version": "1.0.0"}

    return application


fastapi_app = create_fastapi_app()

# ---------------------------------------------------------------------------
# Mount Socket.io over FastAPI — this is the ASGI app uvicorn serves
# ---------------------------------------------------------------------------

app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=fastapi_app,
    socketio_path="/socket.io",
)
