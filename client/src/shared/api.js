/**
 * Codion — API URL resolver
 *
 * Docker / production (VITE_API_URL is empty or unset):
 *   All fetch("/auth/...") calls go to the SAME ORIGIN (port 80).
 *   NGINX proxies /auth/* and /api/* to FastAPI automatically.
 *   No hostname needed — just a path prefix of "".
 *
 * Local dev without Docker (set VITE_API_URL=http://localhost:8000 in client/.env):
 *   Overrides to reach FastAPI directly on port 8000.
 */

const _raw = import.meta.env.VITE_API_URL ?? "";

// Treat empty string, whitespace, or undefined the same — same-origin mode
export const API_BASE = _raw.trim();

/**
 * Build a full API URL from a path.
 * @param {string} path - e.g. "/auth/complete-profile"
 * @returns {string}
 */
export function apiUrl(path) {
  // Same-origin: returns just the path — works through NGINX on any host
  // With explicit base: returns "http://some-host:port/path"
  return `${API_BASE}${path}`;
}
