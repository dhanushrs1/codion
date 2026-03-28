"""Codion FastAPI service.

This backend is intentionally stateless:
- It authenticates users (placeholder endpoints for now).
- It queries persistent stores (placeholder read endpoint for now).
- It NEVER executes untrusted user code locally.
- It forwards code execution payloads to the Judge0 network.

Replace the placeholder auth/database logic with real providers while preserving
this service boundary.
"""

from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

# Judge0 base URL should be reachable on the internal service network.
# Example in Docker Compose: http://judge0-server:2358
JUDGE0_BASE_URL = os.getenv("JUDGE0_BASE_URL", "http://judge0-server:2358")

# Query parameters:
# - base64_encoded=false keeps payload readable for debugging
# - wait=false returns immediately with a token for async polling
JUDGE0_SUBMISSION_PATH = "/submissions/?base64_encoded=false&wait=false"

app = FastAPI(
    title="Codion API",
    version="0.1.0",
    description=(
        "Stateless API for auth, data access, and forwarding execution jobs "
        "to the Judge0 service."
    ),
)


class LoginRequest(BaseModel):
    """Minimal login payload.

    This is a stub for initial scaffolding and should be replaced by a secure
    identity flow (OIDC, JWT, session strategy, rate limiting, etc.).
    """

    email: str = Field(..., examples=["learner@codion.dev"])
    password: str = Field(..., min_length=8)


class LoginResponse(BaseModel):
    """Minimal login response schema for bootstrapping frontend integration."""

    access_token: str
    token_type: str = "bearer"


class SubmissionRequest(BaseModel):
    """Execution request accepted by Codion API.

    Note: The API accepts code payloads but does not run them locally.
    It forwards this data to Judge0.
    """

    source_code: str = Field(..., min_length=1)
    language_id: int = Field(..., examples=[71])
    stdin: str = ""


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    """Simple liveness endpoint for probes and local diagnostics."""

    return {"status": "ok", "service": "codion-api"}


@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest) -> LoginResponse:
    """Placeholder auth endpoint.

    In production, this function should:
    - Verify credentials against an identity provider or user table
    - Emit signed tokens or session metadata
    - Apply rate limiting and audit logging
    """

    # Placeholder acceptance rule for scaffolding only.
    if "@" not in payload.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email format is invalid.",
        )

    return LoginResponse(access_token="replace-this-with-real-token")


@app.get("/api/v1/users/{user_id}/profile")
async def get_user_profile(user_id: str) -> dict[str, Any]:
    """Placeholder data-read endpoint.

    This demonstrates where database queries should happen.
    Keep it read/write data only; never execute arbitrary code here.
    """

    # TODO: Replace with actual database repository call.
    return {
        "id": user_id,
        "display_name": "Sample Learner",
        "plan": "free",
        "tracks": ["python", "algorithms"],
    }


@app.post("/api/v1/submissions", status_code=status.HTTP_202_ACCEPTED)
async def create_submission(payload: SubmissionRequest) -> dict[str, Any]:
    """Forward code execution request to Judge0.

    Security boundary reminder:
    - This service ONLY validates/transports payloads.
    - Judge0 performs sandboxed execution.
    """

    judge_payload = {
        "source_code": payload.source_code,
        "language_id": payload.language_id,
        "stdin": payload.stdin,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{JUDGE0_BASE_URL}{JUDGE0_SUBMISSION_PATH}",
                json=judge_payload,
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to enqueue submission in Judge0: {exc}",
        ) from exc

    judge_response = response.json()

    return {
        "message": "Submission accepted and forwarded to Judge0.",
        "judge_token": judge_response.get("token"),
        "judge_response": judge_response,
    }
