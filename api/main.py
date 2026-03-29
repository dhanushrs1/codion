"""Codion FastAPI backend.

This service is intentionally stateless and must remain a secure middleman:
- Receives requests from the frontend.
- Validates payloads.
- Forwards execution jobs to Judge0.
- Never executes untrusted user code locally.
"""

from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import APIRouter, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

JUDGE0_BASE_URL = os.getenv("JUDGE0_BASE_URL", "http://judge0-server:2358")
JUDGE0_SUBMIT_PATH = "/submissions/?base64_encoded=false&wait=false"

# Guardrails are centralized here so every forwarded submission gets the same
# protection defaults even if client payloads omit limits.
JUDGE0_CPU_TIME_LIMIT = float(os.getenv("JUDGE0_CPU_TIME_LIMIT", "2"))
JUDGE0_MEMORY_LIMIT_KB = int(os.getenv("JUDGE0_MEMORY_LIMIT_KB", "131072"))
JUDGE0_ENABLE_NETWORK = (
    os.getenv("JUDGE0_ENABLE_NETWORK", "false").strip().lower() == "true"
)

# Frontend origins are configurable to support local dev and staged deployments.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app = FastAPI(
    title="Codion API",
    version="0.2.0",
    description="Stateless middle tier between the frontend and Judge0 workers.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api/v1", tags=["core"])


class SubmissionRequest(BaseModel):
    """Request body accepted from frontend clients."""

    source_code: str = Field(..., min_length=1)
    language_id: int = Field(..., examples=[71])
    stdin: str = ""


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    """Liveness endpoint for gateway checks and orchestration probes."""

    return {"status": "ok", "service": "codion-api"}


@router.get("/status")
async def api_status() -> dict[str, str]:
    """Versioned status endpoint under the public API prefix."""

    return {"status": "ready", "layer": "middleman"}


@router.post("/judge/submissions", status_code=status.HTTP_202_ACCEPTED)
async def create_submission(payload: SubmissionRequest) -> dict[str, Any]:
    """Forward code execution payload to Judge0 with strict guardrails.

    Enforced limits:
    - cpu_time_limit: 2 seconds
    - memory_limit: 128 MB
    - enable_network: false
    """

    judge_payload = {
        "source_code": payload.source_code,
        "language_id": payload.language_id,
        "stdin": payload.stdin,
        "cpu_time_limit": JUDGE0_CPU_TIME_LIMIT,
        "memory_limit": JUDGE0_MEMORY_LIMIT_KB,
        "enable_network": JUDGE0_ENABLE_NETWORK,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{JUDGE0_BASE_URL}{JUDGE0_SUBMIT_PATH}",
                json=judge_payload,
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Judge0 is unavailable or rejected the submission: {exc}",
        ) from exc

    data = response.json()
    return {
        "message": "Submission queued in Judge0.",
        "token": data.get("token"),
        "limits": {
            "cpu_time_limit": JUDGE0_CPU_TIME_LIMIT,
            "memory_limit_kb": JUDGE0_MEMORY_LIMIT_KB,
            "enable_network": JUDGE0_ENABLE_NETWORK,
        },
    }


@router.get("/judge/submissions/{token}")
async def get_submission(token: str) -> dict[str, Any]:
    """Read a Judge0 submission result by token through the API middle tier."""

    path = f"/submissions/{token}?base64_encoded=false"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(f"{JUDGE0_BASE_URL}{path}")
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch submission from Judge0: {exc}",
        ) from exc

    return response.json()


app.include_router(router)
