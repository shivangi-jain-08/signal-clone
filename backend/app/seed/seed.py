"""Deterministic seed script.

Creates 8 users (Alice–Henry) with Indian phone numbers.
All users authenticate with OTP 123456.
Run from the backend/ directory:

    python -m app.seed.seed

Seed data from DATABASE_SCHEMA.md:
    Alice   +91-98100-00001
    Bob     +91-98100-00002
    Charlie +91-98100-00003
    Diana   +91-98100-00004
    Eve     +91-98100-00005
    Frank   +91-98100-00006
    Grace   +91-98100-00007
    Henry   +91-98100-00008
"""

import asyncio

SEED_USERS = [
    {"display_name": "Alice",   "username": "alice",   "phone_number": "+919810000001"},
    {"display_name": "Bob",     "username": "bob",     "phone_number": "+919810000002"},
    {"display_name": "Charlie", "username": "charlie", "phone_number": "+919810000003"},
    {"display_name": "Diana",   "username": "diana",   "phone_number": "+919810000004"},
    {"display_name": "Eve",     "username": "eve",     "phone_number": "+919810000005"},
    {"display_name": "Frank",   "username": "frank",   "phone_number": "+919810000006"},
    {"display_name": "Grace",   "username": "grace",   "phone_number": "+919810000007"},
    {"display_name": "Henry",   "username": "henry",   "phone_number": "+919810000008"},
]


async def run_seed() -> None:
    """Seed logic implemented in the database feature phase."""
    print("Seed script scaffold — implementation added in database phase.")
    print("Users to seed:")
    for u in SEED_USERS:
        print(f"  {u['display_name']:8} {u['phone_number']}  @{u['username']}")


if __name__ == "__main__":
    asyncio.run(run_seed())
