export const APP_ROUTES = Object.freeze({
  home: "/",
  login: "/",

  // Clean user-facing slugs.
  frontendDashboard: "/dashboard",
  frontendTracks: "/tracks",
  frontendTrackOverviewPattern: "/tracks/:trackSlug",
  frontendTrackOverview: (trackSlug) => `/tracks/${trackSlug}`,
  frontendWorkspace: "/workspace",
  frontendExerciseWorkspacePattern: "/workspace/:exerciseId",
  frontendExerciseWorkspace: (exerciseId) => `/workspace/${exerciseId}`,

  // Legacy frontend-prefixed slugs kept for redirects.
  frontendRoot: "/frontend",
  frontendDashboardLegacy: "/frontend/dashboard",
  frontendTracksLegacy: "/frontend/tracks",
  frontendWorkspaceLegacy: "/frontend/workspace",

  // Admin routes (query-driven canonical pattern).
  adminRoot: "/admin",
  adminDashboard: "/admin/dashboard",
  adminDashboardTab: (tab = "overview") => `/admin/dashboard?tab=${encodeURIComponent(tab)}`,

  // Legacy path-based admin section slugs kept for redirects.
  adminOverviewLegacy: "/admin/overview",
  adminTracksLegacy: "/admin/tracks",
  adminMediaLegacy: "/admin/media",
  adminUsersLegacy: "/admin/users",

  // Legacy backend slugs from previous rename, kept for compatibility.
  backendRootLegacy: "/backend",
  backendDashboardLegacy: "/backend/dashboard",

  // Convenience alias used by existing links.
  userDashboard: "/dashboard",
});