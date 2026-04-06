import { apiUrl } from "./api.js";

function buildHeaders() {
  const token = localStorage.getItem("codion_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(endpoint) {
  const response = await fetch(apiUrl(endpoint), {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch {
      // Keep generic error when body is not JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

export function getTrackTree() {
  return request("/api/tracks");
}

export function getExerciseForLearner(exerciseId) {
  return request(`/api/exercises/${exerciseId}`);
}
