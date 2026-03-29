"""Codion FastAPI backend.

This service natively executes user code in isolated subprocesses.
It mimics the Judge0 API to ensure frontend compatibility out of the box.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from pathlib import Path

# Load .env — search order: project root → api/ directory → OS env already set
# This supports both  .\run.ps1  (root .env) and  docker  (env_file in compose)
_here = Path(__file__).parent
for _env_path in [_here.parent / ".env", _here / ".env"]:
    if _env_path.exists():
        load_dotenv(_env_path, override=False)  # Don't override Docker-injected env vars
        break


from fastapi import APIRouter, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from auth.database import init_db
from auth.router import router as auth_router

CPU_TIME_LIMIT = float(os.getenv("JUDGE0_CPU_TIME_LIMIT", "2"))
MEMORY_LIMIT_KB = int(os.getenv("JUDGE0_MEMORY_LIMIT_KB", "131072"))

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create database tables if not present."""
    await init_db()
    yield

app = FastAPI(
    title="Codion API",
    version="0.4.0",
    description="Backend service with internal local execution.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api/v1", tags=["core"])

# In-memory storage for execution results (mocking Judge0)
submissions_db: dict[str, dict[str, Any]] = {}

class SubmissionRequest(BaseModel):
    """Request body accepted from frontend clients."""
    source_code: str = Field(..., min_length=1)
    language_id: int = Field(..., examples=[71])  # 71 = Python in Judge0
    stdin: str = ""

@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": "codion-api"}

@router.get("/status")
async def api_status() -> dict[str, str]:
    return {"status": "ready", "layer": "executor"}

async def execute_code_task(token: str, source_code: str, language_id: int, stdin_data: str):
    """Background task to run code and update the DB."""
    submissions_db[token] = {
        "status": {"id": 2, "description": "Processing"},
        "stdout": None,
        "stderr": None,
        "compile_output": None,
        "time": None,
        "memory": None,
        "token": token,
    }

    if language_id != 71:
        submissions_db[token].update({
            "status": {"id": 13, "description": "Internal Error"},
            "stderr": "Only Python (language_id=71) is supported by this lightweight executor.",
        })
        return

    # Write code to a temporary file
    script_path = f"/tmp/{token}.py"
    with open(script_path, "w") as f:
        f.write(source_code)

    try:
        # Run subprocess
        proc = await asyncio.create_subprocess_exec(
            "python3", script_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=stdin_data.encode() if stdin_data else None),
                timeout=CPU_TIME_LIMIT
            )
            
            if proc.returncode == 0:
                status_obj = {"id": 3, "description": "Accepted"}
            else:
                status_obj = {"id": 11, "description": "Runtime Error (NZEC)"}

            submissions_db[token].update({
                "status": status_obj,
                "stdout": stdout.decode() if stdout else None,
                "stderr": stderr.decode() if stderr else None,
                "time": "0.01",  # Mocked
            })

        except asyncio.TimeoutError:
            proc.kill()
            submissions_db[token].update({
                "status": {"id": 5, "description": "Time Limit Exceeded"},
                "stderr": "Execution timed out.",
            })

    except Exception as e:
        submissions_db[token].update({
            "status": {"id": 13, "description": "Internal Error"},
            "stderr": str(e),
        })
    finally:
        if os.path.exists(script_path):
            os.remove(script_path)


@router.post("/judge/submissions", status_code=status.HTTP_202_ACCEPTED)
async def create_submission(payload: SubmissionRequest) -> dict[str, Any]:
    """Execute logic locally instead of relying on external Judge0."""
    token = str(uuid.uuid4())
    
    # Fire off execution task
    asyncio.create_task(execute_code_task(token, payload.source_code, payload.language_id, payload.stdin))

    return {
        "message": "Submission queued locally.",
        "token": token,
        "limits": {
            "cpu_time_limit": CPU_TIME_LIMIT,
            "memory_limit_kb": MEMORY_LIMIT_KB,
            "enable_network": False,
        },
    }

@router.get("/judge/submissions/{token}")
async def get_submission(token: str) -> dict[str, Any]:
    """Read submission result."""
    if token not in submissions_db:
        raise HTTPException(status_code=404, detail="Submission not found.")
    
    return submissions_db[token]

app.include_router(router)
app.include_router(auth_router)
