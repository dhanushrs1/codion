# Codion PowerShell startup script — Local dev (no Docker)
# Run from project root: .\run.ps1
# Requirements: Python 3.10+

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

Write-Host "`n[Codion] Starting local dev environment...`n" -ForegroundColor Cyan

# ── 1. Create Python venv if missing ──────────────────────────────────────────
$venvPath = Join-Path $ROOT "api\.venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "[API] Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv $venvPath
}

# ── 2. Install / sync API dependencies ────────────────────────────────────────
$pip = Join-Path $venvPath "Scripts\pip.exe"
$uvicorn = Join-Path $venvPath "Scripts\uvicorn.exe"
Write-Host "[API] Installing dependencies from requirements.txt..." -ForegroundColor Yellow
& $pip install -r (Join-Path $ROOT "api\requirements.txt") --quiet

# ── 3. Load root .env and pass it to the API process ─────────────────────────
Write-Host "[API] Loading root .env..." -ForegroundColor Yellow
Get-Content (Join-Path $ROOT ".env") | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)=(.*)') {
        [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
}

# ── 4. Launch FastAPI in background ──────────────────────────────────────────
$apiJob = Start-Job -ScriptBlock {
    param($root, $venv, $port)
    $uv = Join-Path $venv "Scripts\uvicorn.exe"
    Set-Location (Join-Path $root "api")
    # Pass env from parent manually
    & $uv main:app --reload --host 0.0.0.0 --port $port
} -ArgumentList $ROOT, $venvPath, ($env:API_PORT ?? "8000")

Write-Host "[API] FastAPI started → http://localhost:$($env:API_PORT ?? '8000')" -ForegroundColor Green

# ── 5. Install frontend deps and launch Vite ──────────────────────────────────
Write-Host "[Client] Installing npm dependencies..." -ForegroundColor Yellow
Set-Location (Join-Path $ROOT "client")
npm install --silent
Write-Host "[Client] Vite dev server starting → http://localhost:5173" -ForegroundColor Green
npm run dev
