"""Deterministic seed script.

Creates all demo data exactly as specified in DATABASE_SCHEMA.md.
Safe to run multiple times — checks for Alice's user before inserting.

Run from backend/ directory:
    python -m app.seed.seed
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import async_session_maker, create_tables
from app.models.base import utcnow
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.group import Group
from app.models.message import Message
from app.models.message_status import MessageStatus
from app.models.participant import ConversationParticipant
from app.models.reaction import Reaction
from app.models.user import User


def _uid(key: str) -> str:
    """Deterministic UUID from a seed key — same key always produces same UUID."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"signal.seed.{key}"))


# All timestamps anchor to this fixed point so the seed is reproducible.
_NOW = datetime(2026, 6, 28, 12, 0, 0, tzinfo=timezone.utc)


def _ago(days: int = 0, hours: int = 0, minutes: int = 0) -> datetime:
    return _NOW - timedelta(days=days, hours=hours, minutes=minutes)


# ---------------------------------------------------------------------------
# Seed data constants
# ---------------------------------------------------------------------------

USERS: list[dict] = [
    {"id": _uid("u.alice"),  "username": "alice",  "display_name": "Alice",  "phone_number": "+919810000001", "bio": "Hey there! I'm using Signal."},
    {"id": _uid("u.bob"),    "username": "bob",    "display_name": "Bob",    "phone_number": "+919810000002", "bio": "Privacy matters."},
    {"id": _uid("u.carol"),  "username": "carol",  "display_name": "Carol",  "phone_number": "+919810000003", "bio": "Book lover 📚"},
    {"id": _uid("u.dave"),   "username": "dave",   "display_name": "Dave",   "phone_number": "+919810000004", "bio": "Always learning."},
    {"id": _uid("u.eve"),    "username": "eve",    "display_name": "Eve",    "phone_number": "+919810000005", "bio": "Security researcher."},
    {"id": _uid("u.frank"),  "username": "frank",  "display_name": "Frank",  "phone_number": "+919810000006", "bio": "Weekend hiker 🏔️"},
    {"id": _uid("u.grace"),  "username": "grace",  "display_name": "Grace",  "phone_number": "+919810000007", "bio": "Coffee ☕ & Code."},
    {"id": _uid("u.henry"),  "username": "henry",  "display_name": "Henry",  "phone_number": "+919810000008", "bio": "Foodie 🍕"},
]


# Each tuple: (sender_username, content, days_ago, hours, minutes, reply_to_idx_or_None)
# reply_to_idx refers to a 0-based index within this same conversation's message list.
_CONV_MESSAGES: dict[str, list[tuple]] = {
    "alice-bob": [
        ("alice", "Hey Bob! How's the new project going?",                          7,  9,  0, None),
        ("bob",   "Hey! Pretty intense, lots of late nights 😅",                   7,  9,  5, None),
        ("alice", "Worth it though?",                                               7,  9,  8, None),
        ("bob",   "Absolutely. Learned so much about async patterns",              7,  9, 12, None),
        ("alice", "We should catch up properly, it's been ages",                   7,  9, 20, None),
        ("bob",   "100% agree. Coffee this week?",                                  5, 14,  0, None),
        ("alice", "Yes! Saturday morning?",                                         5, 14, 10, None),
        ("bob",   "Works for me 👍",                                                5, 14, 20, None),
        ("alice", "Should we invite Carol too?",                                    5, 14, 30, None),
        ("bob",   "Definitely, the more the merrier",                              5, 14, 40, None),
        ("alice", "Quick question — struggling with SQLAlchemy async sessions",    3, 10,  0, None),
        ("bob",   "Oh I know this one! What's the specific issue?",               3, 10,  8, None),
        ("alice", "Session expiring mid-request sometimes",                        3, 10, 15, None),
        ("bob",   "Use 'async with session_maker()' per request, not a global",   3, 10, 22, None),
        ("bob",   "Each request must get its own fresh session scope",             3, 10, 24, None),
        ("alice", "That fixed it! Thank you 🙏",                                   3, 10, 35, 13),
        ("alice", "See you Saturday!",                                             1, 18,  0, None),
        ("bob",   "Can't wait! 👋",                                                1, 18, 12, None),
        ("alice", "MG Road cafe, 11am?",                                           1, 18, 25, None),
        ("bob",   "Perfect, noted!",                                               1, 18, 30, None),
    ],
    "alice-carol": [
        ("carol", "Alice! Have you started the new book yet?",                     6, 11,  0, None),
        ("alice", "Just finished chapter 3 actually!",                             6, 11, 15, None),
        ("carol", "What do you think so far?",                                     6, 11, 20, None),
        ("alice", "The world-building is incredible. A bit slow to start though", 6, 11, 30, None),
        ("carol", "It picks up after chapter 5, trust me",                        6, 11, 35, None),
        ("alice", "Good to know! I'll push through",                               6, 11, 40, None),
        ("carol", "For our next book club pick, I'm thinking something lighter",  4, 16,  0, None),
        ("alice", "Yes please! Suggestions?",                                      4, 16, 10, None),
        ("carol", "Project Hail Mary — it's a quick fun read",                    4, 16, 15, None),
        ("alice", "Oh I've heard great things about that one",                    4, 16, 22, None),
        ("carol", "Grace already read it and loved it",                            4, 16, 28, None),
        ("alice", "Sold! Let's propose it to the group",                          4, 16, 35, None),
        ("carol", "Perfect. Meeting next Sunday at the usual place?",             2, 20,  0, None),
        ("alice", "Works for me! I'll set up the Signal group reminder",          2, 20, 12, None),
        ("carol", "Great 😊 Bring snacks this time haha",                         2, 20, 20, None),
        ("alice", "Ha! Deal. My famous brownies?",                                 2, 20, 28, None),
        ("carol", "YES please 🙌",                                                 2, 20, 35, None),
        ("alice", "Just confirmed with Eve and Grace, we're all set!",            1, 10,  0, None),
        ("carol", "Amazing, looking forward to it",                               1, 10, 15, None),
        ("alice", "Same! See you Sunday 📚",                                       1, 10, 22, None),
    ],
    "bob-dave": [
        ("bob",  "Dave, did you see the new Python 3.13 features?",               7, 15,  0, None),
        ("dave", "Yeah! The free-threading stuff is wild",                         7, 15, 10, None),
        ("bob",  "Might actually matter for our use case",                        7, 15, 18, None),
        ("dave", "I benchmarked it — 2.3x speedup on CPU-bound tasks",            7, 15, 30, None),
        ("bob",  "Impressive. Worth the migration overhead?",                     7, 15, 38, None),
        ("dave", "Honestly yes if you're doing heavy computation",                7, 15, 45, None),
        ("bob",  "We should write up a proper comparison",                         5, 11,  0, None),
        ("dave", "I can pull together the benchmark data",                         5, 11, 12, None),
        ("bob",  "And I'll write the analysis section",                           5, 11, 20, None),
        ("dave", "Deal. Let's aim for end of week",                               5, 11, 28, None),
        ("bob",  "Quick thing — are you joining the deployment call tomorrow?",   3,  9,  0, None),
        ("dave", "Which one? 10am or 2pm?",                                       3,  9, 10, None),
        ("bob",  "The 2pm one for the staging release",                           3,  9, 15, None),
        ("dave", "Yes, I'll be there. Anything I need to prep?",                  3,  9, 22, None),
        ("bob",  "Just review the migration script from last week",               3,  9, 28, 12),
        ("dave", "On it, was already on my list",                                  3,  9, 35, None),
        ("bob",  "The deploy went smoothly btw",                                  1, 16,  0, None),
        ("dave", "Great! No rollbacks this time 🎉",                              1, 16, 10, None),
        ("bob",  "First clean deploy in months haha",                             1, 16, 18, None),
        ("dave", "We're getting better 💪",                                        1, 16, 25, None),
    ],
    "carol-eve": [
        ("eve",   "Carol! Saw your post about the privacy talk",                   6, 13,  0, None),
        ("carol", "Yes! Are you planning to attend?",                             6, 13, 12, None),
        ("eve",   "Definitely. End-to-end encryption discussion?",                6, 13, 20, None),
        ("carol", "That and metadata leakage in messaging apps",                  6, 13, 28, None),
        ("eve",   "Very relevant to my research actually",                        6, 13, 35, None),
        ("carol", "What are you working on currently?",                           6, 13, 42, None),
        ("eve",   "Analyzing traffic patterns in supposedly private systems",     5, 10,  0, None),
        ("carol", "Even Signal?",                                                  5, 10, 15, None),
        ("eve",   "Signal's sealed sender is impressive actually",               5, 10, 22, None),
        ("eve",   "The server never knows who's messaging whom",                  5, 10, 25, None),
        ("carol", "That's exactly why I use it",                                  5, 10, 35, 9),
        ("eve",   "Exactly! Most people don't realize how important that is",     5, 10, 45, None),
        ("carol", "I've been recommending it to everyone in my book club",        3, 17,  0, None),
        ("eve",   "Ha! Good. Signal for book clubs is a great use case",          3, 17, 15, None),
        ("carol", "We're picking Project Hail Mary next",                         3, 17, 22, None),
        ("eve",   "Oh I loved that book! You'll enjoy it",                        3, 17, 30, None),
        ("carol", "Have you read it?",                                            3, 17, 32, None),
        ("eve",   "Yes! Finished it in two days",                                 3, 17, 40, None),
        ("carol", "No spoilers!",                                                 1, 15,  0, None),
        ("eve",   "😂 My lips are sealed",                                        1, 15, 10, None),
    ],
    "dave-frank": [
        ("dave",  "Frank! Still up for the trek next month?",                     7, 10,  0, None),
        ("frank", "100%! Which trail are we thinking?",                           7, 10, 15, None),
        ("dave",  "Was looking at Hampta Pass",                                   7, 10, 22, None),
        ("frank", "That's a serious one. 4500m+ altitude",                        7, 10, 30, None),
        ("dave",  "You scared? 😄",                                                7, 10, 35, None),
        ("frank", "Never! I'm more fit than you are lol",                         7, 10, 40, None),
        ("dave",  "We'll see about that on day 3",                                7, 10, 50, None),
        ("frank", "Gear check — you have a proper sleeping bag?",                 5, 16,  0, None),
        ("dave",  "Yes, rated to -10°C",                                          5, 16, 12, None),
        ("frank", "Good. I'll bring the portable stove",                          5, 16, 18, None),
        ("dave",  "And I'll handle the first aid kit",                            5, 16, 25, None),
        ("frank", "Perfect. What about food?",                                    5, 16, 32, None),
        ("dave",  "Energy bars + freeze-dried meals",                             5, 16, 40, None),
        ("frank", "Boring but practical. I'll bring some homemade trail mix",     5, 16, 48, None),
        ("dave",  "You're a lifesaver",                                           5, 16, 55, 13),
        ("frank", "Booking confirmed! July 15th departure",                       2, 12,  0, None),
        ("dave",  "Yes!! Sending the calendar invite now",                        2, 12, 10, None),
        ("frank", "Who else is coming?",                                          2, 12, 20, None),
        ("dave",  "Just us two this time. Henry bailed 😅",                       2, 12, 28, None),
        ("frank", "His loss. This is going to be epic",                           2, 12, 35, None),
    ],
    "eve-grace": [
        ("grace", "Eve! How's the research going?",                               7, 14,  0, None),
        ("eve",   "Slow but steady. Found an interesting pattern in TLS handshakes", 7, 14, 12, None),
        ("grace", "That sounds complex. You doing okay?",                         7, 14, 22, None),
        ("eve",   "Better now that I have good coffee ☕",                        7, 14, 30, None),
        ("grace", "Ha! Speaking of which, new beans from Coorg just arrived",    7, 14, 38, None),
        ("eve",   "You need to share those",                                      7, 14, 45, None),
        ("grace", "Come over this weekend!",                                      7, 14, 50, None),
        ("eve",   "I'll be there with snacks",                                    5, 11,  0, None),
        ("grace", "Perfect. I'm working on a new side project btw",               5, 11, 15, None),
        ("eve",   "Oh? What kind?",                                               5, 11, 22, None),
        ("grace", "A tool for visualizing dependency graphs",                     5, 11, 30, None),
        ("eve",   "That's actually really useful. Are you open sourcing it?",    5, 11, 38, None),
        ("grace", "Planning to! Need to clean up the code first",                5, 11, 45, None),
        ("eve",   "Let me know when it's ready, I'll contribute",                5, 11, 52, None),
        ("grace", "Thank you 😊 Always good to have a security review",          5, 11, 58, 13),
        ("grace", "Coffee Saturday worked out perfectly!",                        1, 20,  0, None),
        ("eve",   "Yes! The Coorg beans were incredible",                         1, 20, 12, None),
        ("grace", "Right?! Ordering more this week",                              1, 20, 20, None),
        ("eve",   "Save me a bag please",                                         1, 20, 28, None),
        ("grace", "Already done 🎉",                                              1, 20, 35, None),
    ],
}

# Group message data: list of (sender_username, content, days_ago, hours, minutes, reply_to_idx)
_GROUP_MESSAGES: dict[str, list[tuple]] = {
    "team-alpha": [
        ("alice", "Hey team! Standup in 10 minutes",                             7,  9, 50, None),
        ("bob",   "On it, joining now",                                           7,  9, 52, None),
        ("carol", "Be there in 2",                                                7,  9, 54, None),
        ("dave",  "👍",                                                            7,  9, 55, None),
        ("alice", "Call recap: shipping the auth module by Friday",              7, 10, 30, None),
        ("bob",   "I'll handle the JWT rotation logic",                           7, 10, 35, None),
        ("dave",  "I'll take the session cleanup cron job",                       7, 10, 38, None),
        ("carol", "I'll write the integration tests",                             7, 10, 42, None),
        ("alice", "Perfect split. Anything blocking anyone?",                    7, 10, 45, None),
        ("bob",   "Need the DB schema finalized first",                           7, 10, 50, 8),
        ("alice", "That's done! Check #db-schema in Notion",                     7, 10, 55, None),
        ("dave",  "DB schema looks great btw",                                    5, 14,  0, None),
        ("carol", "Agreed. The partial indexes on messages are smart",            5, 14, 10, None),
        ("bob",   "Alice, JWT module is done, ready for review",                  5, 14, 30, None),
        ("alice", "Will review by EOD 🙏",                                        5, 14, 35, None),
        ("carol", "Tests are at 87% coverage",                                   3, 10,  0, None),
        ("dave",  "Cron job is working, tested against staging",                  3, 10, 15, None),
        ("alice", "Excellent! We're on track 🎉",                                 3, 10, 20, None),
        ("bob",   "PR is merged. Auth module is live on staging",                3, 11,  0, None),
        ("carol", "Running smoke tests now",                                      3, 11, 10, None),
        ("carol", "All green ✅",                                                  3, 11, 25, None),
        ("dave",  "Ship it!",                                                     3, 11, 28, None),
        ("alice", "Deploying to prod at 3pm",                                    3, 11, 30, None),
        ("bob",   "Deploy successful 🚀",                                         2, 15, 10, None),
        ("alice", "Great work team! That was clean",                              2, 15, 20, None),
        ("dave",  "First zero-downtime deploy in a while",                       2, 15, 28, None),
        ("carol", "We should write a post-mortem about our process",             1,  9,  0, None),
        ("alice", "Good idea. Who wants to draft it?",                            1,  9, 12, None),
        ("bob",   "I can take a first pass",                                      1,  9, 20, None),
        ("alice", "Thank you Bob! Share in the group when ready",                1,  9, 28, None),
    ],
    "weekend-plans": [
        ("bob",   "Hey! Anyone free this Saturday?",                             6, 18,  0, None),
        ("frank", "I'm free! What's the plan?",                                   6, 18, 10, None),
        ("dave",  "Same, nothing planned yet",                                    6, 18, 20, None),
        ("henry", "Count me in 🙌",                                               6, 18, 30, None),
        ("bob",   "Thinking Cubbon Park morning walk then brunch?",              6, 18, 40, None),
        ("frank", "Love it. What time?",                                          6, 18, 48, None),
        ("bob",   "8am at the south gate?",                                       6, 18, 55, None),
        ("dave",  "That's early lol",                                             6, 19,  0, None),
        ("frank", "Dave it's a MORNING walk 😂",                                  6, 19,  5, 7),
        ("henry", "8am works for me!",                                            6, 19, 10, None),
        ("dave",  "Fine fine, 8am it is",                                         6, 19, 18, None),
        ("bob",   "After the walk, MTR for breakfast?",                           5, 10,  0, None),
        ("frank", "YES. The masala dosa there is legendary",                      5, 10, 12, None),
        ("henry", "I've never been! Excited",                                    5, 10, 20, None),
        ("dave",  "You'll love it Henry",                                         5, 10, 28, None),
        ("bob",   "Making reservations for 10am",                                 5, 10, 35, None),
        ("frank", "Morning run was amazing btw!",                                 4, 11,  0, None),
        ("dave",  "The weather was perfect",                                      4, 11, 10, None),
        ("henry", "MTR breakfast lived up to the hype 🤤",                        4, 11, 20, None),
        ("bob",   "We're doing this every month",                                 4, 11, 30, None),
        ("frank", "Same time next month?",                                        4, 11, 40, None),
        ("dave",  "Absolutely!",                                                   4, 11, 45, None),
        ("henry", "Already in my calendar",                                       4, 11, 50, None),
        ("bob",   "Anyone up for a movie this weekend?",                          2, 14,  0, None),
        ("frank", "Which one?",                                                    2, 14, 12, None),
        ("dave",  "The new sci-fi one, heard it's good",                          2, 14, 20, None),
        ("henry", "I'm in!",                                                      2, 14, 28, None),
        ("bob",   "Saturday 7pm show?",                                           2, 14, 35, None),
        ("frank", "Works! Booking 4 tickets",                                     2, 14, 42, None),
        ("dave",  "Thanks Frank 🙏",                                               2, 14, 50, None),
    ],
    "book-club": [
        ("alice", "Welcome to Book Club! Our first official group 📚",            7, 20,  0, None),
        ("carol", "So excited! What are we reading first?",                       7, 20, 10, None),
        ("eve",   "I have some suggestions ready",                                7, 20, 18, None),
        ("grace", "Bring them on!",                                               7, 20, 25, None),
        ("eve",   "Option 1: Project Hail Mary — fast-paced, fun sci-fi",        7, 20, 30, None),
        ("eve",   "Option 2: Klara and the Sun — thoughtful literary fiction",   7, 20, 33, None),
        ("alice", "I vote Project Hail Mary!",                                    7, 20, 40, None),
        ("carol", "Same, I've heard great things",                                7, 20, 48, None),
        ("grace", "Project Hail Mary it is! 🎉",                                  7, 20, 55, None),
        ("alice", "Quick thought — chapters 1-5 for next Sunday?",               6,  9,  0, None),
        ("carol", "That's very doable",                                           6,  9, 12, None),
        ("eve",   "Already on chapter 3 😅",                                      6,  9, 20, None),
        ("grace", "No spoilers Eve!",                                             6,  9, 28, 11),
        ("eve",   "Promise 🤐",                                                   6,  9, 35, None),
        ("alice", "Discussion questions: What's the most surprising plot point?", 4, 19,  0, None),
        ("carol", "The science actually checks out mostly. Impressive writing",   4, 19, 15, None),
        ("grace", "The relationship between Ryland and Rocky got me",            4, 19, 28, None),
        ("eve",   "Same! The communication arc is beautifully done",             4, 19, 40, 16),
        ("alice", "Spoiler-level discussion after everyone finishes ok?",        4, 19, 50, None),
        ("carol", "Fair point",                                                   4, 19, 55, None),
        ("grace", "Almost done! Last 50 pages",                                  2, 15,  0, None),
        ("eve",   "You're going to love the ending",                              2, 15, 12, None),
        ("alice", "No hints!",                                                    2, 15, 18, None),
        ("carol", "Finished! That ending though 😭",                              1, 11,  0, None),
        ("grace", "RIGHT?! Same reaction",                                        1, 11, 10, 23),
        ("eve",   "Now we can talk freely 😂",                                    1, 11, 18, None),
        ("alice", "Spoiler discussion Sunday!",                                   1, 11, 25, None),
        ("carol", "Cannot wait. Best book we've picked so far",                  1, 11, 35, None),
        ("grace", "100% agree. What's next?",                                    1, 11, 42, None),
        ("alice", "Let's vote at Sunday's meeting",                               1, 11, 50, None),
    ],
}

# Reactions: (conv_key, msg_index, reactor_username, emoji)
_REACTIONS: list[tuple[str, int, str, str]] = [
    ("alice-bob",   15, "bob",   "❤️"),
    ("alice-bob",   3,  "alice", "👍"),
    ("alice-carol", 16, "alice", "🎉"),
    ("alice-carol", 6,  "carol", "👍"),
    ("bob-dave",    3,  "bob",   "🔥"),
    ("bob-dave",    17, "dave",  "🎉"),
    ("bob-dave",    18, "dave",  "😂"),
    ("carol-eve",   9,  "carol", "👍"),
    ("carol-eve",   15, "eve",   "❤️"),
    ("dave-frank",  5,  "dave",  "😂"),
    ("dave-frank",  14, "frank", "❤️"),
    ("eve-grace",   3,  "grace", "😂"),
    ("eve-grace",   14, "eve",   "🙏"),
    ("eve-grace",   19, "eve",   "🎉"),
    ("team-alpha",  24, "bob",   "🎉"),
    ("team-alpha",  24, "carol", "🎉"),
    ("team-alpha",  24, "dave",  "🎉"),
    ("team-alpha",  20, "alice", "✅"),
    ("team-alpha",  20, "bob",   "👍"),
    ("weekend-plans", 12, "bob",  "🔥"),
    ("weekend-plans", 12, "dave", "🔥"),
    ("weekend-plans", 13, "bob",  "😂"),
    ("weekend-plans", 22, "bob",  "❤️"),
    ("weekend-plans", 29, "bob",  "🙏"),
    ("book-club",   8,  "alice", "🎉"),
    ("book-club",   8,  "carol", "🎉"),
    ("book-club",   23, "grace", "😭"),
    ("book-club",   23, "eve",   "😭"),
    ("book-club",   23, "alice", "😭"),
    ("book-club",   27, "alice", "❤️"),
]


# ---------------------------------------------------------------------------
# Seeding functions
# ---------------------------------------------------------------------------

async def _seed_users(db: AsyncSession) -> dict[str, User]:
    users: dict[str, User] = {}
    for u in USERS:
        obj = User(
            id=u["id"],
            phone_number=u["phone_number"],
            username=u["username"],
            display_name=u["display_name"],
            bio=u["bio"],
            is_online=False,
            created_at=_ago(days=30),
            updated_at=_ago(days=30),
        )
        db.add(obj)
        users[u["username"]] = obj
    await db.flush()
    return users


async def _seed_contacts(db: AsyncSession, users: dict[str, User]) -> None:
    user_list = list(users.values())
    for i, a in enumerate(user_list):
        for b in user_list[i + 1:]:
            db.add(Contact(
                id=_uid(f"contact.{a.username}.{b.username}"),
                owner_id=a.id,
                contact_user_id=b.id,
                created_at=_ago(days=29),
                updated_at=_ago(days=29),
            ))
            db.add(Contact(
                id=_uid(f"contact.{b.username}.{a.username}"),
                owner_id=b.id,
                contact_user_id=a.id,
                created_at=_ago(days=29),
                updated_at=_ago(days=29),
            ))
    await db.flush()


async def _seed_direct_conv(
    db: AsyncSession,
    users: dict[str, User],
    username_a: str,
    username_b: str,
    conv_key: str,
) -> tuple[Conversation, list[Message]]:
    conv_id = _uid(f"conv.{conv_key}")
    msg_specs = _CONV_MESSAGES[conv_key]
    last_msg_time = _ago(days=msg_specs[-1][2], hours=msg_specs[-1][3], minutes=msg_specs[-1][4])

    conv = Conversation(
        id=conv_id,
        type="direct",
        created_at=_ago(days=7),
        updated_at=last_msg_time,
    )
    db.add(conv)
    await db.flush()

    for username in (username_a, username_b):
        db.add(ConversationParticipant(
            id=_uid(f"cp.{conv_key}.{username}"),
            conversation_id=conv_id,
            user_id=users[username].id,
            joined_at=_ago(days=7),
        ))
    await db.flush()

    messages: list[Message] = []
    for i, (sender_un, content, days, hrs, mins, reply_idx) in enumerate(msg_specs):
        msg = Message(
            id=_uid(f"msg.{conv_key}.{i}"),
            conversation_id=conv_id,
            sender_id=users[sender_un].id,
            content=content,
            message_type="text",
            reply_to_id=_uid(f"msg.{conv_key}.{reply_idx}") if reply_idx is not None else None,
            created_at=_ago(days=days, hours=hrs, minutes=mins),
            updated_at=_ago(days=days, hours=hrs, minutes=mins),
        )
        db.add(msg)
        messages.append(msg)
    await db.flush()
    return conv, messages


async def _seed_group_conv(
    db: AsyncSession,
    users: dict[str, User],
    group_name: str,
    description: str,
    creator_username: str,
    member_usernames: list[str],
    conv_key: str,
) -> tuple[Conversation, list[Message]]:
    conv_id = _uid(f"conv.{conv_key}")
    group_id = _uid(f"group.{conv_key}")
    msg_specs = _GROUP_MESSAGES[conv_key]
    last_msg_time = _ago(days=msg_specs[-1][2], hours=msg_specs[-1][3], minutes=msg_specs[-1][4])

    conv = Conversation(
        id=conv_id,
        type="group",
        created_at=_ago(days=8),
        updated_at=last_msg_time,
    )
    db.add(conv)
    await db.flush()

    db.add(Group(
        id=group_id,
        conversation_id=conv_id,
        name=group_name,
        description=description,
        created_by=users[creator_username].id,
        created_at=_ago(days=8),
        updated_at=last_msg_time,
    ))

    for i, username in enumerate(member_usernames):
        db.add(ConversationParticipant(
            id=_uid(f"cp.{conv_key}.{username}"),
            conversation_id=conv_id,
            user_id=users[username].id,
            joined_at=_ago(days=8),
            is_admin=(username == creator_username),
        ))
    await db.flush()

    messages: list[Message] = []
    for i, (sender_un, content, days, hrs, mins, reply_idx) in enumerate(msg_specs):
        msg = Message(
            id=_uid(f"msg.{conv_key}.{i}"),
            conversation_id=conv_id,
            sender_id=users[sender_un].id,
            content=content,
            message_type="text",
            reply_to_id=_uid(f"msg.{conv_key}.{reply_idx}") if reply_idx is not None else None,
            created_at=_ago(days=days, hours=hrs, minutes=mins),
            updated_at=_ago(days=days, hours=hrs, minutes=mins),
        )
        db.add(msg)
        messages.append(msg)
    await db.flush()
    return conv, messages


async def _seed_reactions(
    db: AsyncSession,
    users: dict[str, User],
    all_messages: dict[str, list[Message]],
) -> None:
    for conv_key, msg_idx, reactor_un, emoji in _REACTIONS:
        msgs = all_messages.get(conv_key, [])
        if msg_idx >= len(msgs):
            continue
        db.add(Reaction(
            id=_uid(f"reaction.{conv_key}.{msg_idx}.{reactor_un}"),
            message_id=msgs[msg_idx].id,
            user_id=users[reactor_un].id,
            emoji=emoji,
            created_at=msgs[msg_idx].created_at,
        ))
    await db.flush()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def run_seed() -> None:
    await create_tables()

    async with async_session_maker() as db:
        # Idempotency check: if alice already exists, skip everything.
        result = await db.execute(select(User).where(User.username == "alice"))
        if result.scalar_one_or_none() is not None:
            print("Seed data already present. Skipping.")
            return

        print("Seeding users...")
        users = await _seed_users(db)

        print("Seeding contacts...")
        await _seed_contacts(db, users)

        all_messages: dict[str, list[Message]] = {}

        print("Seeding direct conversations...")
        for un_a, un_b, key in [
            ("alice", "bob",   "alice-bob"),
            ("alice", "carol", "alice-carol"),
            ("bob",   "dave",  "bob-dave"),
            ("carol", "eve",   "carol-eve"),
            ("dave",  "frank", "dave-frank"),
            ("eve",   "grace", "eve-grace"),
        ]:
            _, msgs = await _seed_direct_conv(db, users, un_a, un_b, key)
            all_messages[key] = msgs

        print("Seeding group conversations...")
        for name, desc, creator, members, key in [
            ("Team Alpha",     "Work stuff and updates",  "alice", ["alice", "bob", "carol", "dave"],  "team-alpha"),
            ("Weekend Plans",  "Let's make plans!",       "bob",   ["bob", "dave", "frank", "henry"], "weekend-plans"),
            ("Book Club",      "Reading together",        "alice", ["alice", "carol", "eve", "grace"], "book-club"),
        ]:
            _, msgs = await _seed_group_conv(db, users, name, desc, creator, members, key)
            all_messages[key] = msgs

        print("Seeding reactions...")
        await _seed_reactions(db, users, all_messages)

        await db.commit()

    total_msgs = sum(len(v) for v in all_messages.values())
    print(f"\nSeed complete:")
    print(f"  {len(USERS)} users")
    print(f"  {len(list(users.values())) * (len(list(users.values())) - 1)} contacts (bidirectional)")
    print(f"  6 direct conversations, 3 group conversations")
    print(f"  {total_msgs} messages")
    print(f"  {len(_REACTIONS)} reactions")
    print(f"\nAll users log in with OTP: 123456")


if __name__ == "__main__":
    asyncio.run(run_seed())
