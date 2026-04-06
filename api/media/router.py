from __future__ import annotations

import mimetypes
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth.database import get_db
from auth.jwt_utils import _decode
from auth.models import User
from media.models import MediaFile

router = APIRouter(tags=["media"])

ELEVATED_ROLES = {"ADMIN", "EDITOR"}
MAX_MEDIA_FILE_BYTES = 25 * 1024 * 1024
ALLOWED_MEDIA_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/avif",
    "image/png",
    "image/x-png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/json",
    "text/csv",
    "application/zip",
}
ALLOWED_MEDIA_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".jfif",
    ".pjpeg",
    ".avif",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
    ".svg",
    ".mp4",
    ".webm",
    ".mov",
    ".mp3",
    ".wav",
    ".ogg",
    ".pdf",
    ".txt",
    ".md",
    ".json",
    ".csv",
    ".zip",
}
PREFERRED_SUFFIX_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/avif": ".avif",
    "image/png": ".png",
    "image/x-png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
    "image/svg+xml": ".svg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/ogg": ".ogg",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "application/json": ".json",
    "text/csv": ".csv",
    "application/zip": ".zip",
}

PUBLIC_MEDIA_ROOT = Path(__file__).resolve().parents[1] / "uploads" / "public"


class DeleteMediaRequest(BaseModel):
    relative_path: str


def _token_session_version(payload: dict[str, Any]) -> int:
    raw = payload.get("sv", 1)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = 1
    return value if value > 0 else 1


async def get_current_admin(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization") or ""
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required.")

    payload = _decode(auth_header[7:])
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.")

    user = await db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is banned.")

    token_version = _token_session_version(payload)
    user_version = int(user.session_version or 1)
    if token_version != user_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
        )

    normalized_role = (user.role or payload.get("role") or "").strip().upper()
    if normalized_role not in ELEVATED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin/editor users can manage media.",
        )

    return user


def _slugify_stem(value: str) -> str:
    stem = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return stem or "media"


def _normalize_relative_path(raw_value: str) -> Path:
    normalized = raw_value.strip().replace("\\", "/")
    candidate = Path(normalized)

    if not normalized:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="relative_path is required.")
    if candidate.is_absolute() or normalized.startswith("/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only relative paths are allowed.")
    if ".." in candidate.parts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Path traversal is not allowed.")

    clean_parts = [part for part in candidate.parts if part not in {"", "."}]
    if not clean_parts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid relative_path value.")

    return Path(*clean_parts)


def _ensure_safe_target(root: Path, relative_path: Path) -> Path:
    resolved_root = root.resolve()
    target = (resolved_root / relative_path).resolve()
    try:
        target.relative_to(resolved_root)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path.") from exc
    return target


def _allowed_media(content_type: str, suffix: str) -> bool:
    return content_type in ALLOWED_MEDIA_CONTENT_TYPES or suffix in ALLOWED_MEDIA_EXTENSIONS


def _resolve_category(content_type: str, suffix: str) -> str:
    if content_type.startswith("image/") or suffix in {".jpg", ".jpeg", ".jfif", ".pjpeg", ".avif", ".png", ".webp", ".gif", ".bmp", ".svg"}:
        return "image"
    if content_type.startswith("video/") or suffix in {".mp4", ".webm", ".mov"}:
        return "video"
    if content_type.startswith("audio/") or suffix in {".mp3", ".wav", ".ogg"}:
        return "audio"
    if suffix in {".pdf", ".txt", ".md", ".json", ".csv", ".zip"}:
        return "document"
    return "file"


def _media_item_from_path(path: Path, root: Path) -> dict[str, Any]:
    rel = path.relative_to(root).as_posix()
    guessed_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    suffix = path.suffix.lower()
    stats = path.stat()

    return {
        "filename": path.name,
        "relative_path": rel,
        "visibility": "public",
        "size": int(stats.st_size),
        "content_type": guessed_type,
        "category": _resolve_category(guessed_type, suffix),
        "modified_at": datetime.utcfromtimestamp(stats.st_mtime).isoformat() + "Z",
        "url": f"/uploads/{rel}",
    }


def _iter_media_items(root: Path, query: str) -> list[dict[str, Any]]:
    if not root.exists():
        return []

    lowered = query.lower().strip()
    items: list[dict[str, Any]] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue

        suffix = path.suffix.lower()
        content_type = (mimetypes.guess_type(path.name)[0] or "").lower()
        if not _allowed_media(content_type, suffix):
            continue

        item = _media_item_from_path(path, root)
        if lowered:
            haystack = f"{item['filename']} {item['relative_path']} {item['content_type']} {item['category']}".lower()
            if lowered not in haystack:
                continue

        items.append(item)

    items.sort(key=lambda row: str(row["modified_at"]), reverse=True)
    return items


@router.get("/api/admin/media")
async def list_media(
    q: str = Query(default="", max_length=120),
    category: str = Query(default="", max_length=32),
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, list[dict[str, Any]]]:
    stmt = select(MediaFile).options(selectinload(MediaFile.uploaded_by)).order_by(MediaFile.uploaded_at.desc())
    if category and category != "all":
        stmt = stmt.where(MediaFile.category == category)
    if q:
        search = f"%{q}%"
        stmt = stmt.where(MediaFile.filename.ilike(search) | MediaFile.original_filename.ilike(search))
        
    result = await db.execute(stmt)
    rows = result.scalars().all()
    
    items = []
    for row in rows:
        items.append({
            "id": row.id,
            "filename": row.filename,
            "original_filename": row.original_filename,
            "relative_path": row.relative_path,
            "size": row.file_size,
            "content_type": row.mime_type,
            "category": row.category,
            "url": row.url,
            "uploaded_at": row.uploaded_at.isoformat() + "Z",
            "uploaded_by_name": row.uploaded_by.username if row.uploaded_by else "Unknown",
            "uploaded_by_role": row.uploaded_by.role if row.uploaded_by else "Unknown"
        })
    return {"items": items}


@router.post("/api/admin/media/upload")
async def upload_media(
    files: list[UploadFile] = File(...),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, list[dict[str, Any]]]:
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded.")

    root = PUBLIC_MEDIA_ROOT
    now = datetime.utcnow()
    year = f"{now.year:04d}"
    month = f"{now.month:02d}"
    target_dir = root / year / month
    target_dir.mkdir(parents=True, exist_ok=True)

    uploaded_items: list[dict[str, Any]] = []

    for file in files:
        raw_name = file.filename or "media"
        content_type = (file.content_type or "").lower()
        suffix = Path(raw_name).suffix.lower()

        if suffix not in ALLOWED_MEDIA_EXTENSIONS:
            suffix = PREFERRED_SUFFIX_BY_CONTENT_TYPE.get(content_type, suffix)

        if not _allowed_media(content_type, suffix):
            await file.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type for {raw_name}.",
            )

        blob = await file.read()
        await file.close()

        if not blob:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{raw_name} is empty.")
        if len(blob) > MAX_MEDIA_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{raw_name} exceeds max size of 25MB.",
            )

        stem = _slugify_stem(Path(raw_name).stem)
        safe_filename = f"{stem}-{uuid4().hex[:12]}{suffix}"
        target_path = target_dir / safe_filename
        target_path.write_bytes(blob)
        
        rel_path = target_path.relative_to(root).as_posix()
        cat = _resolve_category(content_type, suffix)
        
        db_file = MediaFile(
            filename=safe_filename,
            original_filename=raw_name,
            relative_path=rel_path,
            file_size=len(blob),
            mime_type=content_type,
            category=cat,
            url=f"/uploads/{rel_path}",
            uploaded_by_id=admin.id,
            uploaded_at=now
        )
        db.add(db_file)

        uploaded_items.append({
            "filename": safe_filename,
            "original_filename": raw_name,
            "relative_path": rel_path,
            "size": len(blob),
            "content_type": content_type,
            "category": cat,
            "url": f"/uploads/{rel_path}",
            "uploaded_at": now.isoformat() + "Z",
            "uploaded_by_name": admin.username,
            "uploaded_by_role": admin.role
        })

    await db.commit()
    return {"items": uploaded_items}


@router.delete("/api/admin/media")
async def delete_media(
    payload: DeleteMediaRequest,
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    root = PUBLIC_MEDIA_ROOT
    relative_path = _normalize_relative_path(payload.relative_path)
    target_path = _ensure_safe_target(root, relative_path)

    # Check file existence BEFORE modifying anything
    if not target_path.exists() or not target_path.is_file():
        # Still clean up the DB record if it's orphaned
        rel_str = relative_path.as_posix()
        stmt = select(MediaFile).where(MediaFile.relative_path == rel_str)
        result = await db.execute(stmt)
        db_file = result.scalar_one_or_none()
        if db_file:
            await db.delete(db_file)
            await db.commit()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media file not found on disk.")

    # Delete from DB first (so the record isn't orphaned if disk delete fails)
    rel_str = relative_path.as_posix()
    stmt = select(MediaFile).where(MediaFile.relative_path == rel_str)
    result = await db.execute(stmt)
    db_file = result.scalar_one_or_none()
    if db_file:
        await db.delete(db_file)
        await db.commit()

    # Delete from disk
    target_path.unlink(missing_ok=True)

    # Clean up empty parent directories
    resolved_root = root.resolve()
    current = target_path.parent
    while current.resolve() != resolved_root:
        try:
            current.rmdir()
        except OSError:
            break
        current = current.parent

    return {"message": "Media deleted"}
