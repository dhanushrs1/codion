import { Navigate, Route, Routes } from "react-router-dom";
import AdminDashboardPage from "./backend/AdminDashboardPage.jsx";
import HomePage from "./frontend/pages/HomePage/HomePage.jsx";
import OAuthCallbackPage from "./frontend/pages/OAuthCallbackPage/OAuthCallbackPage.jsx";
import WorkspacePage from "./frontend/pages/WorkspacePage/WorkspacePage.jsx";
import TracksPage from "./frontend/pages/TracksPage/TracksPage.jsx";
import ExerciseWorkspacePage from "./frontend/pages/ExerciseWorkspacePage/ExerciseWorkspacePage.jsx";
import NotFoundPage from "./shared/404/NotFoundPage.jsx";
import FrontendDashboardPage from "./frontend/FrontendDashboardPage.jsx";
import FrontendLayout from "./frontend/layout/FrontendLayout.jsx";
import { APP_ROUTES } from "./routes/paths.js";

export default function App() {
  return (
    <Routes>
      {/* OAuth callback — fullscreen, no header/footer */}
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />

      {/* Frontend Unified Layout wrapping user-facing pages */}
      <Route element={<FrontendLayout />}>
        <Route path={APP_ROUTES.home} element={<HomePage />} />

        <Route
          path={APP_ROUTES.frontendRoot}
          element={<Navigate to={APP_ROUTES.frontendDashboard} replace />}
        />
        <Route
          path={APP_ROUTES.frontendDashboardLegacy}
          element={<Navigate to={APP_ROUTES.frontendDashboard} replace />}
        />
        <Route
          path={APP_ROUTES.frontendTracksLegacy}
          element={<Navigate to={APP_ROUTES.frontendTracks} replace />}
        />
        <Route
          path={APP_ROUTES.frontendWorkspaceLegacy}
          element={<Navigate to={APP_ROUTES.frontendWorkspace} replace />}
        />
        <Route path={APP_ROUTES.frontendDashboard} element={<FrontendDashboardPage />} />
        <Route path={APP_ROUTES.frontendTracks} element={<TracksPage />} />
        <Route path={APP_ROUTES.frontendWorkspace} element={<WorkspacePage />} />
        <Route path={APP_ROUTES.frontendExerciseWorkspacePattern} element={<ExerciseWorkspacePage />} />
      </Route>

      {/* Admin Panel remains isolated without global header/footer */}
      <Route
        path={APP_ROUTES.adminRoot}
        element={<Navigate to={APP_ROUTES.adminDashboardTab("overview")} replace />}
      />
      <Route
        path={APP_ROUTES.adminDashboard}
        element={<AdminDashboardPage />}
      />
      <Route
        path={APP_ROUTES.adminOverviewLegacy}
        element={<Navigate to={APP_ROUTES.adminDashboardTab("overview")} replace />}
      />
      <Route
        path={APP_ROUTES.adminTracksLegacy}
        element={<Navigate to={APP_ROUTES.adminDashboardTab("tracks")} replace />}
      />
      <Route
        path={APP_ROUTES.adminMediaLegacy}
        element={<Navigate to={APP_ROUTES.adminDashboardTab("media")} replace />}
      />
      <Route
        path={APP_ROUTES.adminUsersLegacy}
        element={<Navigate to={APP_ROUTES.adminDashboardTab("users")} replace />}
      />
      <Route
        path={APP_ROUTES.backendRootLegacy}
        element={<Navigate to={APP_ROUTES.adminDashboardTab("overview")} replace />}
      />
      <Route
        path={APP_ROUTES.backendDashboardLegacy}
        element={<Navigate to={APP_ROUTES.adminDashboardTab("overview")} replace />}
      />
      <Route path="/admin/*" element={<Navigate to={APP_ROUTES.adminDashboardTab("overview")} replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
