"""
Codion Auth — OAuth2 Router (Google & GitHub).

All callback URIs are built dynamically from the incoming request object,
so this works across local, staging, and production hosts.

Endpoints:
  GET  /auth/google/login
  GET  /auth/google/callback
  GET  /auth/github/login
  GET  /auth/github/callback
  GET  /auth/check-username
  POST /auth/complete-profile
  POST /auth/logout
  POST /auth/admin-activity
  GET  /auth/admin-activity
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from auth.database import get_db
from auth.jwt_utils import _decode, create_access_token, create_setup_token, verify_setup_token
from auth.models import AdminActivityLog, User, UserSession
from auth.schemas import (
    AccessTokenResponse,
    AdminActivityEventRequest,
    AdminActivityLogItem,
    AdminActivityLogListResponse,
    CompleteProfileRequest,
)

# ---------------------------------------------------------------------------
# OAuth App credentials — use getenv so missing GitHub doesn't crash startup
# ---------------------------------------------------------------------------

GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")

# Frontend URL — where browser is redirected after OAuth completes
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

ELEVATED_ROLES = {"ADMIN", "EDITOR"}


# ---------------------------------------------------------------------------
# Dynamic URL helpers
# ---------------------------------------------------------------------------

def _base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


def _google_callback_uri(request: Request) -> str:
    return f"{_base_url(request)}/auth/google/callback"


def _github_callback_uri(request: Request) -> str:
    return f"{_base_url(request)}/auth/github/callback"


# ---------------------------------------------------------------------------
# Request metadata helpers
# ---------------------------------------------------------------------------

def _normalize_role(role: str | None) -> str:
    return (role or "").strip().upper()


def _is_elevated_role(role: str | None) -> bool:
    return _normalize_role(role) in ELEVATED_ROLES


def _extract_client_ip(request: Request) -> str | None:
    # Prefer X-Real-IP — NGINX sets this to $remote_addr (the actual client IP)
    # before any X-Forwarded-For chain is appended, so it is the most reliable.
    for header_name in ("x-real-ip", "cf-connecting-ip", "x-client-ip"):
        value = request.headers.get(header_name)
        if value:
            return value.strip()

    # Fall back to X-Forwarded-For first hop (only if the above headers are absent)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()

    if request.client:
        return request.client.host

    return None


# Private/loopback CIDRs — skip geo lookup for these
_PRIVATE_IP_PREFIXES = (
    "127.", "10.", "192.168.", "172.16.", "172.17.", "172.18.",
    "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
    "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.",
    "172.31.", "::1", "fc", "fd",
)


def _is_private_ip(ip: str | None) -> bool:
    if not ip:
        return True
    return any(ip.startswith(prefix) for prefix in _PRIVATE_IP_PREFIXES)


async def _lookup_geo(ip: str | None) -> dict[str, str | None]:
    """Resolve an IP to country/region/city via ip-api.com (free, no key needed).

    Returns a dict with keys country, region, city — all possibly None.
    Always safe: any network/parse error returns Nones.
    """
    empty: dict[str, str | None] = {"country": None, "region": None, "city": None}

    if _is_private_ip(ip):
        return empty

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"http://ip-api.com/json/{ip}",
                params={"fields": "status,country,regionName,city"},
            )
            if resp.status_code != 200:
                return empty
            data = resp.json()
            if data.get("status") != "success":
                return empty
            return {
                "country": data.get("country") or None,
                "region": data.get("regionName") or None,
                "city": data.get("city") or None,
            }
    except Exception:
        return empty


async def _get_authenticated_user(
    request: Request,
    db: AsyncSession,
) -> tuple[User, str]:
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

    return user, _normalize_role(user.role or payload.get("role"))


async def _record_activity(
    *,
    db: AsyncSession,
    request: Request,
    user: User | None,
    role: str | None,
    activity_type: str,
    activity_context: str | None = None,
    target_path: str | None = None,
    details: dict[str, Any] | None = None,
    state: str | None = None,
    timezone: str | None = None,
    resolve_geo: bool = False,
    commit: bool = True,
) -> AdminActivityLog:
    ip = _extract_client_ip(request)
    geo: dict[str, str | None] = {"country": None, "region": None, "city": None}
    if resolve_geo:
        geo = await _lookup_geo(ip)

    sanitized_details = details if isinstance(details, dict) else None

    log = AdminActivityLog(
        user_id=user.id if user else None,
        username=user.username if user else None,
        role=_normalize_role(role) or None,
        activity_type=activity_type,
        activity_context=activity_context,
        target_path=target_path,
        ip_address=ip,
        country=geo["country"],
        region=geo["region"],
        city=geo["city"],
        state=state or geo["region"],
        timezone=timezone,
        user_agent=(request.headers.get("user-agent") or "")[:512] or None,
        details=sanitized_details,
    )

    db.add(log)

    if commit:
        await db.commit()
        await db.refresh(log)

    return log


# ---------------------------------------------------------------------------
# Shared intercept logic — always redirects browser to frontend
# ---------------------------------------------------------------------------

async def _handle_oauth_profile(
    email: str,
    full_name: str,
    provider: str,
    avatar_url: str | None,
    db: AsyncSession,
    request: Request,
) -> RedirectResponse:
    user = await db.scalar(select(User).where(User.email == email))

    if user:
        user.last_login = datetime.utcnow()
        db.add(
            UserSession(
                user_id=user.id,
                ip_address=_extract_client_ip(request),
                device_info=(request.headers.get("user-agent") or "")[:500] or None,
            )
        )

        normalized_role = _normalize_role(user.role)
        if _is_elevated_role(normalized_role):
            await _record_activity(
                db=db,
                request=request,
                user=user,
                role=normalized_role,
                activity_type="auth_login",
                activity_context="oauth_callback",
                target_path="/auth/callback",
                resolve_geo=True,
                commit=False,
            )

        await db.commit()
        await db.refresh(user)

        token = create_access_token(user.username, user.role)
        params = urlencode(
            {
                "status": "active",
                "token": token,
                "role": user.role,
                "username": user.username,
                "avatar_url": avatar_url or "",
            }
        )
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?{params}")

    setup_token = create_setup_token(email, full_name, provider, avatar_url)
    params = urlencode(
        {
            "status": "pending_username",
            "setup_token": setup_token,
        }
    )
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?{params}")


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Google ────────────────────────────────────────────────────────────────

@router.get("/google/login", summary="Redirect to Google OAuth consent screen")
async def google_login(request: Request) -> RedirectResponse:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured on this server.")

    params = urlencode(
        {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": _google_callback_uri(request),
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "select_account",
        }
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback", summary="Google OAuth callback")
async def google_callback(
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    try:
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": _google_callback_uri(request),
                    "grant_type": "authorization_code",
                },
            )
            token_resp.raise_for_status()

            profile_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token_resp.json()['access_token']}"},
            )
            profile_resp.raise_for_status()
            profile = profile_resp.json()

        email: str = profile.get("email", "")
        if not email:
            raise HTTPException(status_code=400, detail="Google did not return an email address.")

        full_name: str = profile.get("name", email.split("@")[0])
        avatar_url: str | None = profile.get("picture") or None

        return await _handle_oauth_profile(email, full_name, "google", avatar_url, db, request)
    except HTTPException:
        raise
    except Exception as exc:
        error_params = urlencode({"error": str(exc)})
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?{error_params}")


# ── GitHub ────────────────────────────────────────────────────────────────

@router.get("/github/login", summary="Redirect to GitHub OAuth consent screen")
async def github_login(request: Request) -> RedirectResponse:
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=503, detail="GitHub OAuth is not configured on this server.")

    params = urlencode(
        {
            "client_id": GITHUB_CLIENT_ID,
            "redirect_uri": _github_callback_uri(request),
            "scope": "read:user user:email",
        }
    )
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")


@router.get("/github/callback", summary="GitHub OAuth callback")
async def github_callback(
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    try:
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": _github_callback_uri(request),
                },
                headers={"Accept": "application/json"},
            )
            token_resp.raise_for_status()
            gh_token = token_resp.json().get("access_token", "")

            if not gh_token:
                raise HTTPException(status_code=400, detail="GitHub did not return an access token.")

            gh_headers = {
                "Authorization": f"Bearer {gh_token}",
                "Accept": "application/vnd.github+json",
            }

            profile_resp = await client.get("https://api.github.com/user", headers=gh_headers)
            profile_resp.raise_for_status()
            profile = profile_resp.json()

            email: str = profile.get("email") or ""
            if not email:
                emails_resp = await client.get("https://api.github.com/user/emails", headers=gh_headers)
                emails_resp.raise_for_status()
                primary = next(
                    (item for item in emails_resp.json() if item.get("primary") and item.get("verified")),
                    None,
                )
                email = primary["email"] if primary else ""

        if not email:
            raise HTTPException(status_code=400, detail="GitHub did not return a verified email address.")

        full_name: str = profile.get("name") or profile.get("login", email.split("@")[0])
        avatar_url: str | None = profile.get("avatar_url") or None

        return await _handle_oauth_profile(email, full_name, "github", avatar_url, db, request)
    except HTTPException:
        raise
    except Exception as exc:
        error_params = urlencode({"error": str(exc)})
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?{error_params}")


# ── Username Check ────────────────────────────────────────────────────────

@router.get("/check-username", summary="Check if a username is available")
async def check_username(
    username: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    if not username:
        return {"available": False}

    user = await db.scalar(select(User).where(User.username == username))
    return {"available": user is None}


# ── Complete Profile ───────────────────────────────────────────────────────

@router.post(
    "/complete-profile",
    response_model=AccessTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Choose username — finalises new user registration",
)
async def complete_profile(
    payload: CompleteProfileRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AccessTokenResponse:
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization") or ""
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required in Authorization header.")

    claims = verify_setup_token(auth_header[7:])

    email: str = claims["email"]
    provider: str = claims["provider"]
    avatar_url: str | None = claims.get("avatar_url")

    if await db.scalar(select(User).where(User.username == payload.username)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken. Please choose another.",
        )

    if await db.scalar(select(User).where(User.email == email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please log in.",
        )

    new_user = User(
        email=email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        username=payload.username,
        auth_provider=provider,
        role="student",
        last_login=datetime.utcnow(),
    )
    db.add(new_user)

    try:
        await db.commit()
        await db.refresh(new_user)

        db.add(
            UserSession(
                user_id=new_user.id,
                ip_address=_extract_client_ip(request),
                device_info=(request.headers.get("user-agent") or "")[:500] or None,
            )
        )
        await db.commit()
        await db.refresh(new_user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email conflict. Please try again.",
        )

    token = create_access_token(new_user.username, new_user.role)
    return AccessTokenResponse(
        access_token=token,
        status="active",
        role=new_user.role,
        username=new_user.username,
        avatar_url=avatar_url,
    )


# ── Logout ────────────────────────────────────────────────────────────────

@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout user and record logout time",
)
async def logout_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization") or ""
    if not auth_header.lower().startswith("bearer "):
        return

    try:
        payload = _decode(auth_header[7:])
        username = payload.get("sub")
        if not username:
            return

        user = await db.scalar(select(User).where(User.username == username))
        if not user:
            return

        recent_session = await db.scalar(
            select(UserSession)
            .where(UserSession.user_id == user.id)
            .where(UserSession.logout_time.is_(None))
            .order_by(desc(UserSession.login_time))
            .limit(1)
        )

        if recent_session:
            recent_session.logout_time = datetime.utcnow()

        normalized_role = _normalize_role(user.role)
        if _is_elevated_role(normalized_role):
            await _record_activity(
                db=db,
                request=request,
                user=user,
                role=normalized_role,
                activity_type="auth_logout",
                activity_context="header_profile_menu",
                target_path="/auth/logout",
                resolve_geo=True,
                commit=False,
            )

        await db.commit()
    except Exception:
        # Ignore token decode and db issues so frontend can always clear local session.
        pass


# ── Admin Activity Tracking ────────────────────────────────────────────────

@router.post(
    "/admin-activity",
    status_code=status.HTTP_201_CREATED,
    summary="Record admin/editor activity event",
)
async def create_admin_activity_event(
    payload: AdminActivityEventRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user, normalized_role = await _get_authenticated_user(request, db)

    if not _is_elevated_role(normalized_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin/editor activity is accepted for this endpoint.",
        )

    log = await _record_activity(
        db=db,
        request=request,
        user=user,
        role=normalized_role,
        activity_type=payload.activity_type,
        activity_context=payload.activity_context,
        target_path=payload.target_path,
        details=payload.details,
        state=payload.state,
        timezone=payload.timezone,
    )

    return {
        "logged": True,
        "id": log.id,
        "created_at": log.created_at.isoformat(),
    }


@router.get(
    "/admin-activity",
    response_model=AdminActivityLogListResponse,
    summary="List admin/editor activity logs",
)
async def list_admin_activity_logs(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    role: str | None = Query(default=None, max_length=32),
    activity_type: str | None = Query(default=None, max_length=64),
    username: str | None = Query(default=None, max_length=64),
) -> AdminActivityLogListResponse:
    _, normalized_role = await _get_authenticated_user(request, db)

    if not _is_elevated_role(normalized_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin/editor users can view activity logs.",
        )

    query = select(AdminActivityLog)
    count_query = select(func.count()).select_from(AdminActivityLog)

    if role:
        normalized_filter_role = _normalize_role(role)
        query = query.where(AdminActivityLog.role == normalized_filter_role)
        count_query = count_query.where(AdminActivityLog.role == normalized_filter_role)

    if activity_type:
        query = query.where(AdminActivityLog.activity_type == activity_type)
        count_query = count_query.where(AdminActivityLog.activity_type == activity_type)

    if username:
        query = query.where(AdminActivityLog.username == username)
        count_query = count_query.where(AdminActivityLog.username == username)

    query = query.order_by(AdminActivityLog.created_at.desc()).offset(offset).limit(limit)

    items = (await db.scalars(query)).all()
    total = (await db.scalar(count_query)) or 0

    return AdminActivityLogListResponse(
        items=[AdminActivityLogItem.model_validate(item) for item in items],
        total=total,
    )
