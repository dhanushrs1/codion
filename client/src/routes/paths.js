export const APP_ROUTES = Object.freeze({
  home: "/",
  login: "/",

  // Clean user-facing slugs.
  frontendDashboard: "/dashboard",
  frontendWorkspace: "/workspace",

  // Legacy frontend-prefixed slugs kept for redirects.
  frontendRoot: "/frontend",
  frontendDashboardLegacy: "/frontend/dashboard",
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