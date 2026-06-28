# Signal Clone

A full-stack real-time messaging application modelled after Signal, built as an intern assignment for Scaler AI Labs.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Local Setup](#local-setup)
- [Seeded Test Accounts](#seeded-test-accounts)
- [Assumptions & Design Decisions](#assumptions--design-decisions)

---

## Tech Stack

### Backend
| Layer | Choice |
|---|---|
| Framework | FastAPI 0.115 (async) |
| ORM | SQLAlchemy 2.0 (async) |
| Database | SQLite via `aiosqlite` |
| Migrations | Alembic |
| Real-time | python-socketio 5 (Socket.IO, ASGI) |
| Auth | JWT (python-jose) — phone + OTP, no passwords |
| Validation | Pydantic v2 |
| Server | Uvicorn |

### Frontend
| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 |
| Components | Radix UI + shadcn/ui |
| State | Zustand 5 (client), TanStack Query 5 (server) |
| Real-time | socket.io-client 4 |
| Forms | React Hook Form + Zod |
| HTTP | Axios |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│                                                     │
│  Next.js 15 (App Router)                            │
│  ┌──────────────┐  ┌─────────────┐                 │
│  │  React Query │  │   Zustand   │                 │
│  │ (server state│  │(client state│                 │
│  │  + caching)  │  │  + persist) │                 │
│  └──────┬───────┘  └─────────────┘                 │
│         │  REST (Axios)         WebSocket           │
└─────────┼─────────────────────────┼────────────────┘
          │  HTTP /api/v1           │  /socket.io
          ▼                         ▼
┌─────────────────────────────────────────────────────┐
│                FastAPI + Socket.IO (single process) │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │
│  │  Routers │  │  Services│  │  ConnectionMgr  │   │
│  │ (v1 API) │  │ (business│  │  (room routing  │   │
│  │          │  │  logic)  │  │  + presence)    │   │
│  └────┬─────┘  └────┬─────┘  └────────┬───────┘   │
│       └─────────────┴─────────────────┘            │
│                      │                             │
│              Repositories (async SQLAlchemy)        │
└──────────────────────┬──────────────────────────────┘
                       │
               ┌───────▼───────┐
               │  SQLite DB    │
               │  (signal.db)  │
               └───────────────┘
```

### Key Architectural Decisions

**Single-process real-time:** Socket.IO is mounted as an ASGI sub-application alongside FastAPI — no separate WebSocket server or message broker needed for single-instance deployment.

**Room-based broadcasting:** Two room namespaces keep events targeted:
- `conv:<conversation_id>` — chat events (messages, typing, reactions, presence)
- `user:<user_id>` — personal events (delivery receipts)

**Server state via React Query:** All API data lives in TanStack Query's cache. Socket.IO handlers write directly into that cache (via `queryClient.setQueryData`), so the UI stays in sync without a separate event bus or Redux-style reducer.

**No passwords:** Auth is phone number + OTP only. The OTP is always `123456` (mocked — no SMS provider integrated). JWT tokens are stored in Zustand (persisted to `localStorage`) and validated against a `sessions` table to support explicit logout/revocation.

**Soft deletes:** Messages are never physically deleted. `deleted_at` is set instead, and the content field is cleared. The "this message was deleted" UI is driven by the presence of `deleted_at`.

**Unread counts:** Derived at query time from `conversation_participants.last_read_at` vs `messages.created_at` — no denormalized counter that can drift.

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `phone_number` | TEXT (UNIQUE) | E.164 format, login identifier |
| `username` | TEXT (UNIQUE) | 3-30 chars, lowercase alphanumeric + underscore |
| `display_name` | TEXT | |
| `avatar_url` | TEXT | nullable |
| `bio` | TEXT | default `""` |
| `otp_code` | TEXT | nullable, cleared after verification |
| `otp_expires_at` | DATETIME | nullable, 10-min window |
| `is_online` | BOOLEAN | real-time presence flag |
| `last_seen` | DATETIME | nullable, set on disconnect |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `sessions`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | also the JWT `jti` claim |
| `user_id` | FK → users | CASCADE delete |
| `token` | TEXT (UNIQUE) | full JWT string |
| `expires_at` | DATETIME | issued_at + 7 days |
| `created_at` | DATETIME | |

### `contacts`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `owner_id` | FK → users | |
| `contact_user_id` | FK → users | |
| `nickname` | TEXT | nullable override for display_name |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |
| UNIQUE | `(owner_id, contact_user_id)` | asymmetric — adding Bob doesn't add Alice |

### `conversations`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `type` | TEXT | `'direct'` or `'group'` |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | bumped on every new message for list sort |

### `conversation_participants`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `conversation_id` | FK → conversations | |
| `user_id` | FK → users | |
| `joined_at` | DATETIME | |
| `last_read_at` | DATETIME | nullable, drives unread count |
| `is_admin` | BOOLEAN | group admin flag |
| `is_archived` | BOOLEAN | per-user archive |
| UNIQUE | `(conversation_id, user_id)` | |

### `groups`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `conversation_id` | FK → conversations (UNIQUE) | 1-to-1 with conversation |
| `name` | TEXT | |
| `description` | TEXT | default `""` |
| `avatar_url` | TEXT | nullable |
| `created_by` | FK → users | for authorization checks |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `messages`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `conversation_id` | FK → conversations | |
| `sender_id` | FK → users | |
| `content` | TEXT | cleared on soft delete |
| `message_type` | TEXT | `'text'`, `'image'`, `'file'`, `'system'` |
| `reply_to_id` | FK → messages | nullable, SET NULL if parent deleted |
| `deleted_at` | DATETIME | nullable, soft delete |
| `edited_at` | DATETIME | nullable |
| `disappears_at` | DATETIME | nullable, ephemeral messages |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `message_status`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `message_id` | FK → messages | |
| `user_id` | FK → users | |
| `status` | TEXT | `'delivered'` or `'read'` |
| `updated_at` | DATETIME | |
| UNIQUE | `(message_id, user_id)` | upserted, not inserted |

### `reactions`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `message_id` | FK → messages | |
| `user_id` | FK → users | |
| `emoji` | TEXT | single emoji character |
| `created_at` | DATETIME | |
| UNIQUE | `(message_id, user_id)` | one reaction per user per message |

---

## API Reference

Base URL: `http://localhost:8000/api/v1`

All endpoints except `/auth/register`, `/auth/send-otp`, and `/auth/verify-otp` require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account (phone, username, display_name) |
| POST | `/auth/send-otp` | Request OTP for phone number |
| POST | `/auth/verify-otp` | Verify OTP, receive JWT |
| POST | `/auth/logout` | Revoke current JWT session |
| GET | `/auth/me` | Authenticated user's full profile |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/search?q=&limit=20` | Search by username or display name |
| PATCH | `/users/me` | Update profile (display_name, bio, username, avatar_url) |
| GET | `/users/{id}` | Public profile (no phone) |

### Contacts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/contacts` | List my contacts |
| POST | `/contacts` | Add contact (idempotent) |
| PATCH | `/contacts/{id}` | Update nickname |
| DELETE | `/contacts/{id}` | Remove contact |

### Conversations
| Method | Endpoint | Description |
|---|---|---|
| GET | `/conversations` | List all conversations (sorted by last message) |
| GET | `/conversations/search?q=` | Search conversations |
| POST | `/conversations/direct` | Open or find a direct conversation (idempotent) |
| GET | `/conversations/{id}` | Conversation detail + participants |
| POST | `/conversations/{id}/read` | Mark as read |
| PATCH | `/conversations/{id}/archive` | Toggle archive |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/conversations/{id}/messages` | Paginated message history (cursor-based) |
| POST | `/conversations/{id}/messages` | Send a message |
| PATCH | `/messages/{id}` | Edit message (sender only) |
| DELETE | `/messages/{id}` | Soft-delete (sender or group admin) |
| PUT | `/messages/{id}/reactions` | Add / change / remove emoji reaction |

### Groups
| Method | Endpoint | Description |
|---|---|---|
| POST | `/groups` | Create group (caller becomes admin) |
| GET | `/groups/{id}` | Group detail + member list |
| PATCH | `/groups/{id}` | Update name / description / avatar (admin only) |
| DELETE | `/groups/{id}` | Delete group (admin only) |
| POST | `/groups/{id}/members` | Add members (admin only) |
| DELETE | `/groups/{id}/members/{user_id}` | Remove member (admin or self-leave) |

Interactive docs: `http://localhost:8000/docs`

---

## WebSocket Events

Connect to `http://localhost:8000/socket.io` with Socket.IO. Pass the JWT in the handshake auth object:

```js
io("http://localhost:8000", { auth: { token: "<jwt>" } })
```

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `typing` | `{ conversation_id }` | Broadcast typing indicator to conv room |
| `stop_typing` | `{ conversation_id }` | Clear typing indicator |
| `message_read` | `{ conversation_id }` | Mark conv read, emit receipts to senders |
| `join_conversation` | `{ conversation_id }` | Join room after creating a new conversation |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `connected` | `{ user_id }` | Handshake complete |
| `new_message` | Full `MessageResponse` | New message in a conversation |
| `message_edited` | `{ id, conversation_id, content, edited_at }` | Message was edited |
| `message_deleted` | `{ id, conversation_id, deleted_at }` | Message soft-deleted |
| `reaction_updated` | `{ message_id, conversation_id, reactions }` | Reactions changed |
| `typing` | `{ user_id, conversation_id, display_name }` | Someone is typing |
| `stop_typing` | `{ user_id, conversation_id }` | Someone stopped typing |
| `user_online` | `{ user_id, is_online: true }` | User came online |
| `user_offline` | `{ user_id, is_online: false, last_seen }` | User went offline |
| `conversation_read` | `{ conversation_id, user_id, last_read_at }` | Read receipt |
| `message_status_update` | `{ message_id, user_id, status }` | Delivered / read tick |
| `group_updated` | Full `GroupDetailResponse` | Group metadata changed |
| `group_deleted` | `{ group_id }` | Group was deleted |
| `member_added` | `{ user_id, conversation_id }` | Member joined group |
| `member_removed` | `{ user_id, conversation_id }` | Member left or was removed |

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1 — Clone

```bash
git clone https://github.com/shivangi-jain-08/signal-clone.git
cd signal-clone
```

### 2 — Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY to a 32+ char random string

# Run migrations
alembic upgrade head

# Seed test data
python -m app.seed.seed

# Start server
uvicorn app.main:app --reload --port 8000
```

The API is now available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 3 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app is now available at `http://localhost:3000`.

> **Note:** The frontend connects to `http://localhost:8000` by default. To point it at a different backend, update `API_BASE_URL` and `WS_URL` in `frontend/src/lib/constants.ts`.

---

## Seeded Test Accounts

After running the seed script, 8 accounts are available. All use OTP **`123456`**.

| Phone | Username | Display Name |
|---|---|---|
| +919810000001 | alice | Alice |
| +919810000002 | bob | Bob |
| +919810000003 | carol | Carol |
| +919810000004 | dave | Dave |
| +919810000005 | eve | Eve |
| +919810000006 | frank | Frank |
| +919810000007 | grace | Grace |
| +919810000008 | henry | Henry |

Pre-seeded conversations:
- **6 direct chats** (Alice↔Bob, Alice↔Carol, Bob↔Dave, Carol↔Eve, Dave↔Frank, Eve↔Grace) with 20–30 messages each
- **3 group chats** (Team Alpha, Weekend Plans, Book Club) with realistic multi-participant threads
- Emoji reactions and reply-to chains included

---

## Assumptions & Design Decisions

**OTP is always `123456`**  
No SMS provider is integrated. The OTP is hardcoded in the seed and the "send OTP" endpoint stores it directly. In production this would be replaced by Twilio/AWS SNS.

**SQLite instead of PostgreSQL**  
SQLite is used for portability and zero-config local setup. The SQLAlchemy async layer means switching to PostgreSQL requires only a connection string change — no query changes.

**No media upload pipeline**  
Messages support `message_type: 'image' | 'file'` at the schema level, but the frontend only sends text. The `MEDIA_DIR` env var is reserved for a future upload endpoint.

**Ephemeral messages are schema-only**  
`messages.disappears_at` exists in the database but no background job deletes expired messages. It is included as a forward-looking design choice.

**End-to-end encryption is simulated**  
The "Messages are end-to-end encrypted" notice in the UI is a UI mock. All messages are stored and transmitted in plaintext. Full Signal Protocol (X3DH key exchange, sealed sender, double ratchet) is not implemented.

**Contacts are asymmetric**  
Adding someone to your contacts does not add you to theirs, matching how most messaging apps handle contact lists (you can message anyone; contacts are a personal address book).

**Single Socket.IO server instance**  
The ConnectionManager uses in-process Python dicts. This works for a single server instance but would require a Redis adapter for horizontal scaling.

**Calls and Stories are placeholders**  
Voice/video calls and Stories render "Coming Soon" pages. The nav rail reserves space for them as intended future features.

**Theme flash prevention**  
A synchronous inline `<script>` in the root HTML reads `localStorage` and applies the `.dark` CSS class before React hydrates — preventing a flash of the wrong theme on hard refresh.
