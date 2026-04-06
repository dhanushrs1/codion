from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from auth.models import Base


class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # VARCHAR(255) for filename keeps the index within MySQL's 3072-byte limit
    # (utf8mb4: 255 * 4 = 1020 bytes — safely under the limit).
    filename = Column(String(255), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)

    # Store the full path in a TEXT column (no length limit).
    # The unique constraint uses a prefix index (767 chars) which is 3068 bytes
    # with utf8mb4 — just under the 3072-byte MySQL limit.
    relative_path = Column(Text, nullable=False)

    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(128), nullable=False)
    category = Column(String(32), nullable=False)   # image, video, audio, document, file

    # URL is also text to avoid key-too-long issues.
    url = Column(Text, nullable=False)

    uploaded_by_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])

    # Prefix-based unique index on relative_path (767 chars * 4 bytes = 3068 bytes < 3072).
    # This guarantees uniqueness while staying within MySQL's key-length limit.
    __table_args__ = (
        Index("uq_mediafile_relpath", "relative_path", mysql_length=767, unique=True),
    )

    def __repr__(self) -> str:
        return f"<MediaFile id={self.id} filename={self.filename!r} category={self.category!r}>"
