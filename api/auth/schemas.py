"""
Codion Auth — Pydantic schemas for OAuth2 request/response validation.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class CompleteProfileRequest(BaseModel):
    """Payload for POST /auth/complete-profile after OAuth intercept."""
    username: str = Field(
        ...,
        min_length=3,
        max_length=64,
        pattern=r"^[a-zA-Z0-9_\-]+$",
    )
    first_name: str = Field(..., min_length=1, max_length=128)
    last_name: str | None = Field(None, max_length=128)

    model_config = {"extra": "forbid"}


class AccessTokenResponse(BaseModel):
    """Returned for existing users or after profile completion."""
    access_token: str
    token_type: str = "bearer"
    status: str       # "active"
    role: str
    username: str


class SetupTokenResponse(BaseModel):
    """Returned for new users who still need to choose a username."""
    setup_token: str
    token_type: str = "bearer"
    status: str       # "pending_username"
    message: str
