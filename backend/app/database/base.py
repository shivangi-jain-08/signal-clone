from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def create_tables() -> None:
    """Create all tables based on SQLAlchemy metadata.

    Used only in development / testing. Production uses Alembic migrations.
    """
    from app.models.base import Base  # avoid circular import at module level

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
