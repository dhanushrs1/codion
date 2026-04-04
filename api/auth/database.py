"""
Codion Auth — Database engine, session factory, and table init.
Reads DATABASE_URL strictly from environment.
"""

from __future__ import annotations

import os

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from auth.models import Base

DATABASE_URL: str = os.environ["DATABASE_URL"]  # Hard-fail if not set

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_db() -> None:
    """Create all tables on startup if they don't already exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            # Lightweight startup migration for existing deployments.
            await conn.execute(
                text("ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1")
            )
        except Exception:
            # Column already exists or backend does not support this ALTER variant.
            pass
            
        try:
            # Lightweight startup migration for the new avatar column.
            await conn.execute(
                text("ALTER TABLE users ADD COLUMN avatar VARCHAR(512) DEFAULT NULL")
            )
        except Exception:
            pass


async def get_db():  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        yield session
