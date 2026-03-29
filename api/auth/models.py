"""
Codion Auth — SQLAlchemy User model.
OAuth2-only: no password column.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(256), unique=True, index=True, nullable=False)
    full_name = Column(String(256), nullable=False)
    username = Column(String(64), unique=True, index=True, nullable=False)
    auth_provider = Column(String(32), nullable=False)   # "google" | "github"
    role = Column(String(32), nullable=False, default="student")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r} role={self.role!r}>"
