import { apiUrl } from "./api.js";

function getAuthHeaders() {
  const token = localStorage.getItem("codion_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(endpoint, options = {}) {
  const res = await fetch(apiUrl(endpoint), {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  });
  if (!res.ok) {
    let message = "An error occurred";
    try {
      const data = await res.json();
      message = data.detail || message;
    } catch {}
    throw new Error(message);
  }
  if (res.status !== 204) {
    return res.json();
  }
  return null;
}

// Tracks
export const getTracks = () => request("/api/admin/tracks");
export const createTrack = (data) => request("/api/admin/tracks", { method: "POST", body: JSON.stringify(data) });
export const deleteTrack = (id) => request(`/api/admin/tracks/${id}`, { method: "DELETE" });
export const reorderTracks = (item_ids) => request("/api/admin/tracks/reorder", { method: "PUT", body: JSON.stringify({ item_ids }) });

// Sections
export const getSections = (trackId) => request(`/api/admin/tracks/${trackId}/sections`);
export const createSection = (trackId, data) => request(`/api/admin/tracks/${trackId}/sections`, { method: "POST", body: JSON.stringify(data) });
export const deleteSection = (id) => request(`/api/admin/sections/${id}`, { method: "DELETE" });
export const reorderSections = (item_ids) => request("/api/admin/sections/reorder", { method: "PUT", body: JSON.stringify({ item_ids }) });

// Exercises
export const getExercises = (sectionId) => request(`/api/admin/sections/${sectionId}/exercises`);
export const createExercise = (sectionId, data) => request(`/api/admin/sections/${sectionId}/exercises`, { method: "POST", body: JSON.stringify(data) });
export const deleteExercise = (id) => request(`/api/admin/exercises/${id}`, { method: "DELETE" });
export const reorderExercises = (item_ids) => request("/api/admin/exercises/reorder", { method: "PUT", body: JSON.stringify({ item_ids }) });

// Tasks
export const getTasks = (exerciseId) => request(`/api/admin/exercises/${exerciseId}/tasks`);
export const createTask = (exerciseId, data) => request(`/api/admin/exercises/${exerciseId}/tasks`, { method: "POST", body: JSON.stringify(data) });
export const deleteTask = (id) => request(`/api/admin/tasks/${id}`, { method: "DELETE" });
export const reorderTasks = (item_ids) => request("/api/admin/tasks/reorder", { method: "PUT", body: JSON.stringify({ item_ids }) });
