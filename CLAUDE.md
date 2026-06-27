# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Signal-clone is a full-stack real-time messaging app. The repo has two independent services:

- `backend/` — Python FastAPI + SQLAlchemy 2.0 async + SQLite, Socket.io for WebSocket
- `frontend/` — Next.js 15 App Router, TypeScript, TailwindCSS, TanStack Query, Zustand, Socket.io-client

## Commands

### Backend

```bash
# From backend/
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS/Linux

pip install -r requirements.txt

# Copy and edit env before running
cp .env.example .env

# Run migrations (always before starting server)
alembic upgrade head

# Seed database with test data (idempotent)
python -m app.seed.seed

# Start development server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest
pytest tests/path/to/test_file.py::test_name   # single test
pytest -x                                       # stop on first failure

# Create a new Alembic migration after changing ORM models
alembic revision --autogenerate -m "describe change"
```

### Frontend

```bash
# From frontend/
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Architecture

### Backend Layering

```
Router (app/api/v1/) → Service (app/services/) → Repository (app/repositories/) → SQLAlchemy Model (app/models/)
                               ↑
                    Pydantic Schema (app/schemas/)
```

- **Routers** handle HTTP: parse request body, call one service method, return response. No business logic.
- **Services** own business rules and authorization checks (e.g., "is caller a participant?"). Cross-entity operations live here. Services also emit WebSocket events after DB writes.
- **Repositories** own all SQL: queries, filters, joins. Never called from routers directly.
- **Models** are pure ORM — no business logic, no Pydantic imports.
- **Schemas** are pure Pydantic — no ORM imports.

### FastAPI Dependency Injection

```python
@router.post("/messages")
async def send_message(
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    message_service: MessageService = Depends(get_message_service),
) -> MessageResponse:
```

`get_db` and `get_current_user` live in `app/core/deps.py`. Services are injected as dependencies.

### WebSocket (Socket.io)

The Socket.io ASGI app is mounted alongside FastAPI in `app/main.py`. Handlers live in `app/websocket/handlers.py`. Room naming:
- `user:<user_id>` — personal events: `message_status_update`, `user_online`
- `conv:<conversation_id>` — conversation events: `new_message`, `typing`, `message_deleted`, etc.

At connect time, a user joins their personal room AND all their conversation rooms. The `ConnectionManager` in `app/websocket/manager.py` tracks `sid → user_id` and `user_id → [sids]` (multi-tab support). Online status only goes `false` when the last sid disconnects.

Every Socket.io handler that touches a conversation must call `_assert_participant()` before processing to prevent unauthorized events.

### Authentication

Phone number + OTP only (no passwords). OTP is always `123456` (mocked, see `app/core/security.py::MOCK_OTP`). JWT payload: `{ sub: user_id, jti: session_id, exp: +7d }`. The `jti` claim maps to a `sessions` table row — logout hard-deletes the row, immediately revoking the token.

Public endpoints (no JWT required): `POST /auth/register`, `POST /auth/send-otp`, `POST /auth/verify-otp`.

### API Conventions

- Base URL: `/api/v1`
- Response envelope: `{ "data": <payload> }`
- Error envelope: `{ "detail": "human message", "code": "MACHINE_CODE" }`
- IDs: UUID v4 strings
- Timestamps: ISO-8601 UTC
- Messages use cursor-based pagination (`?before=<message_id>`); conversations/contacts use offset pagination
- OpenAPI docs at `/docs` (enabled when `SHOW_DOCS=true`)

### Frontend State Model

```
Zustand (synchronous, client-only)
  authStore           → user, token, setAuth/clearAuth; persisted to localStorage
  conversationStore   → activeConversationId, draft map
  uiStore             → sidebar/panel visibility, theme

TanStack Query (async, server-mirrored)
  conversations, messages (infinite), contacts, groups, users

Socket.io handlers → mutate TanStack Query cache directly
```

Socket handlers (`frontend/src/services/socket/handlers.ts`) are the single place that bridges WebSocket events into the query cache. They use `queryClient.setQueryData` to upsert — never blindly append — to handle multi-tab deduplication.

### Optimistic Updates (Message Send)

1. Generate `client_id` (UUID) on client before sending.
2. Append a `sending`-status message to the cache immediately.
3. On server ack: replace optimistic entry by matching `client_id`.
4. On error: roll back and show retry affordance.

The `client_id` is sent in both the Socket.io payload and the REST body; the server echoes it back in the response.

### Frontend Folder Structure

```
frontend/src/
  app/          # Next.js App Router pages (auth, main, settings)
  features/     # Feature-scoped components + hooks (auth, conversations, messages, groups, contacts, settings)
  components/   # Shared UI (ui/ for shadcn, common/ for Avatar, Badge, Timestamp, etc.)
  services/     # API client (axios + interceptors) and Socket.io client singleton
  store/        # Zustand stores
  hooks/        # Cross-feature hooks (useSocket, useOnlineStatus, useIntersectionObserver)
  lib/          # utils.ts (cn()), constants.ts (API_URL, WS_URL), queryClient.ts
  types/        # TypeScript types: models.ts, api.ts, socket.ts
```

### Database Key Design Decisions

- All PKs are UUID v4 strings (not auto-increment integers)
- Soft deletes on messages use `deleted_at` timestamp (not a boolean) — null = alive
- `conversation_participants.last_read_at` drives unread count (query excludes sender's own messages)
- `is_archived` is per-participant row, not per-conversation
- OTP stored on `users` row (not a separate table) — cleared to NULL after `verify-otp`
- Sessions table enables JWT revocation; `jti` claim is the session PK

### Environment Setup

Backend reads `.env` from the `backend/` directory via pydantic-settings. Key vars:

```
DATABASE_URL=sqlite+aiosqlite:///./signal.db
SECRET_KEY=<32+ random chars>
CORS_ORIGINS=["http://localhost:3000"]
SHOW_DOCS=true
```

Frontend expects the backend at `http://localhost:8000` by default (configured in `frontend/src/lib/constants.ts`).

### Seeded Test Users

All seeded users log in with their phone number + OTP `123456`:

| User | Phone |
|------|-------|
| Alice | +91-98100-00001 |
| Bob | +91-98100-00002 |
| Carol | +91-98100-00003 |
| Dave | +91-98100-00004 |
| Eve | +91-98100-00005 |
| Frank | +91-98100-00006 |
| Grace | +91-98100-00007 |
| Henry | +91-98100-00008 |
