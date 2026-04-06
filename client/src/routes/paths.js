export const APP_ROUTES = Object.freeze({
  home: "/",
  login: "/",

  // Clean user-facing slugs.
  frontendDashboard: "/dashboard",
  frontendTracks: "/tracks",
  frontendWorkspace: "/workspace",
  frontendExerciseWorkspacePattern: "/workspace/:exerciseId",
  frontendExerciseWorkspace: (exerciseId) => `/workspace/${exerciseId}`,

  // Legacy frontend-prefixed slugs kept for redirects.
  frontendRoot: "/frontend",
  frontendDashboardLegacy: "/frontend/dashboard",
  frontendTracksLegacy: "/frontend/tracks",
  frontendWorkspaceLegacy: "/frontend/workspace",

  // Admin routes remain canonical.
  adminRoot: "/admin",
  adminDashboard: "/admin/dashboard",

  // Legacy backend slugs from previous rename, kept for compatibility.
  backendRootLegacy: "/backend",
  backendDashboardLegacy: "/backend/dashboard",

  // Convenience alias used by existing links.
  userDashboard: "/dashboard",
});