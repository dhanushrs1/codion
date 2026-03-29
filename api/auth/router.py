"""
Codion Auth — OAuth2 Router (Google & GitHub).

All callback URIs are built DYNAMICALLY from the incoming Request object,
so they work correctly regardless of the deployment host (localhost, staging,
production, etc.).  No URL is ever hardcoded.

Endpoints:
  GET  /auth/google/login           → redirect to Google consent screen
  GET  /auth/google/callback        → exchange code, intercept or activate
  GET  /auth/github/login           → redirect to GitHub consent screen
  GET  /auth/github/callback        → exchange code, intercept or activate
  POST /auth/complete-profile       → username selection (requires Setup JWT)
"""

from __future__ import annotations

import os
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from auth.database import get_db
from auth.jwt_utils import create_access_token, create_setup_token, verify_setup_token
from auth.models import User, UserSession
from auth.schemas import AccessTokenResponse, CompleteProfileRequest, SetupTokenResponse
from datetime import datetime

# ---------------------------------------------------------------------------
# OAuth App credentials — use getenv so missing GitHub doesn't crash startup
# ---------------------------------------------------------------------------

GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")

# Frontend URL — where the browser is redirected after OAuth completes
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")


# ---------------------------------------------------------------------------
# Dynamic URL helpers
# ---------------------------------------------------------------------------

def _base_url(request: Request) -> str:
    """
    Return the scheme + host of the current request, e.g.
      https://api.codion.dev   (production)
      http://localhost:8000     (local dev)
    This is derived from the live request so nothing is hardcoded.
    """
    return str(request.base_url).rstrip("/")


def _google_callback_uri(request: Request) -> str:
    return f"{_base_url(request)}/auth/google/callback"


def _github_callback_uri(request: Request) -> str:
    return f"{_base_url(request)}/auth/github/callback"


# ---------------------------------------------------------------------------
# Shared intercept logic — always redirects browser to frontend
# ---------------------------------------------------------------------------

from urllib.parse import quote

async def _handle_oauth_profile(
    email: str,
    full_name: str,
    provider: str,
    db: AsyncSession,
    request: Request,
) -> RedirectResponse:
    """
    Existing user  → redirect to frontend with access_token + status=active.
    New user       → redirect to frontend with setup_token + status=pending_username.
    The frontend /auth/callback page reads the query params and acts accordingly.
    """
    user = await db.scalar(select(User).where(User.email == email))

    if user:
        ip_address = request.headers.get("x-real-ip") or request.client.host if request.client else None
        device_info = request.headers.get("user-agent", "")[:500]

        user.last_login = datetime.utcnow()
        new_session = UserSession(
            user_id=user.id,
            ip_address=ip_address,
            device_info=device_info
        )
        db.add(new_session)
        await db.commit()
        await db.refresh(user)

        token = create_access_token(user.username, user.role)
        # Store session ID into token? Usually with JWT we don't, but here the task mentioned logging out.
        # We can implement logout by adding a logout route which takes the access token, however it's stateless.
        # If we want to capture logout time, we need to add a route for logout that takes the current token or just user.
        
        params = urlencode({
            "status": "active",
            "token": token,
            "role": user.role,
            "username": user.username,
        })
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?{params}")

    setup_token = create_setup_token(email, full_name, provider)
    params = urlencode({
        "status": "pending_username",
        "setup_token": setup_token,
    })
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
    params = urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": _google_callback_uri(request),
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    })
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
        return await _handle_oauth_profile(email, full_name, "google", db, request)
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
    params = urlencode({
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": _github_callback_uri(request),
        "scope": "read:user user:email",
    })
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
                    (e for e in emails_resp.json() if e.get("primary") and e.get("verified")),
                    None,
                )
                email = primary["email"] if primary else ""

        if not email:
            raise HTTPException(status_code=400, detail="GitHub did not return a verified email address.")

        full_name: str = profile.get("name") or profile.get("login", email.split("@")[0])
        return await _handle_oauth_profile(email, full_name, "github", db, request)
    except HTTPException:
        raise
    except Exception as exc:
        error_params = urlencode({"error": str(exc)})
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?{error_params}")


# ── Username Check ────────────────────────────────────────────────────────

@router.get(
    "/check-username",
    summary="Check if a username is available",
)
async def check_username(
    username: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    """
    Returns {"available": True} if the username doesn't exist.
    """
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
    # Extract Authorization header directly from request — avoids FastAPI Header conflicts
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization") or ""
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required in Authorization header.")
    claims = verify_setup_token(auth_header[7:])

    email: str = claims["email"]
    full_name: str = claims["full_name"]
    provider: str = claims["provider"]

    # Username uniqueness check
    if await db.scalar(select(User).where(User.username == payload.username)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken. Please choose another.",
        )

    # Race-condition guard: email already registered between intercept and now
    if await db.scalar(select(User).where(User.email == email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please log in.",
        )

    # Create user — role is always hardcoded to "student"
    new_user = User(
        email=email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        username=payload.username,
        auth_provider=provider,
        role="student",
        last_login=datetime.utcnow()
    )
    db.add(new_user)
    try:
        await db.commit()
        await db.refresh(new_user)
        
        # Track initial session
        ip_address = request.headers.get("x-real-ip") or request.client.host if request.client else None
        device_info = request.headers.get("user-agent", "")[:500]
        
        new_session = UserSession(
            user_id=new_user.id,
            ip_address=ip_address,
            device_info=device_info
        )
        db.add(new_session)
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
    """
    Marks the user's most recent session as logged out.
    """
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization") or ""
    if not auth_header.lower().startswith("bearer "):
        # If no token, just ignore and let them logout locally
        return

    try:
        from auth.jwt_utils import _decode
        payload = _decode(auth_header[7:])
        username = payload.get("sub")
        if not username:
            return
            
        user = await db.scalar(select(User).where(User.username == username))
        if user:
            # Find most recent open session for this user
            from sqlalchemy import desc
            recent_session = await db.scalar(
                select(UserSession)
                .where(UserSession.user_id == user.id)
                .where(UserSession.logout_time.is_(None))
                .order_by(desc(UserSession.login_time))
                .limit(1)
            )
            if recent_session:
                recent_session.logout_time = datetime.utcnow()
                await db.commit()
    except Exception:
        # Ignore JWT decode errors on logout, just return success so frontend clears token
        pass


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
    """
    Marks the user's most recent session as logged out.
    """
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization") or ""
    if not auth_header.lower().startswith("bearer "):
        return

    try:
        from auth.jwt_utils import _decode
        payload = _decode(auth_header[7:])
        username = payload.get("sub")
        if not username:
            return
            
        user = await db.scalar(select(User).where(User.username == username))
        if user:
            from sqlalchemy import desc
            recent_session = await db.scalar(
                select(UserSession)
                .where(UserSession.user_id == user.id)
                .where(UserSession.logout_time.is_(None))
                .order_by(desc(UserSession.login_time))
                .limit(1)
            )
            if recent_session:
                recent_session.logout_time = datetime.utcnow()
                await db.commit()
    except Exception:
        pass

