/**
 * Codion — Media API client
 * Handles list, upload, and delete operations for the admin media library.
 */

import { apiUrl } from "./api.js";

// ── Auth helpers ──────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem("codion_token") ?? "";
}

function getAuthHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Error extraction ──────────────────────────────────────────────────────

function extractErrorMessage(data, fallback) {
  if (!data) return fallback;

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const first = data.detail[0];
    if (typeof first === "string") return first;
    if (first && typeof first.msg === "string") return first.msg;
  }

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  return fallback;
}

async function parseErrorResponse(res, fallback) {
  try {
    const data = await res.json();
    return extractErrorMessage(data, fallback);
  } catch {
    return fallback;
  }
}

// ── Typed API calls ───────────────────────────────────────────────────────

/**
 * List all media files, with optional search query and category filter.
 * @param {{ query?: string, category?: string }} options
 * @returns {Promise<{ items: object[] }>}
 */
export async function listMedia({ query = "", category = "" } = {}) {
  const params = new URLSearchParams();
  if (query && query.trim()) params.set("q", query.trim());
  if (category && category !== "all") params.set("category", category);

  const suffix = params.size ? `?${params.toString()}` : "";
  const res = await fetch(apiUrl(`/api/admin/media${suffix}`), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
  });

  if (!res.ok) {
    const msg = await parseErrorResponse(res, `Failed to load media (${res.status}).`);
    throw new Error(msg);
  }

  return res.json();
}

/**
 * Upload one or more files to the admin media library.
 * NOTE: Do NOT set Content-Type — the browser sets it automatically for FormData.
 * @param {File[]} files
 * @returns {Promise<{ items: object[] }>}
 */
export async function uploadMediaFiles(files) {
  if (!files || files.length === 0) {
    throw new Error("Select at least one file to upload.");
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await fetch(apiUrl("/api/admin/media/upload"), {
    method: "POST",
    headers: {
      // No Content-Type — the browser sets multipart/form-data with the correct boundary.
      ...getAuthHeader(),
    },
    body: formData,
  });

  if (!res.ok) {
    const msg = await parseErrorResponse(res, `Upload failed (${res.status}).`);
    throw new Error(msg);
  }

  return res.json();
}

/**
 * Delete a media file by its relative path.
 * @param {{ relativePath: string }} options
 * @returns {Promise<{ message: string }>}
 */
export async function deleteMediaFile({ relativePath }) {
  if (!relativePath) {
    throw new Error("relative_path is required for deletion.");
  }

  const res = await fetch(apiUrl("/api/admin/media"), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ relative_path: relativePath }),
  });

  if (!res.ok) {
    // 404 means the file was already removed from disk — treat cleanly
    if (res.status === 404) {
      return { message: "File already removed." };
    }
    const msg = await parseErrorResponse(res, `Delete failed (${res.status}).`);
    throw new Error(msg);
  }

  return res.json();
}
