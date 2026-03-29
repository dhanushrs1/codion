import { Navigate, Route, Routes } from "react-router-dom";
import AdminDashboardPage from "./admin/AdminDashboardPage.jsx";
import HomePage from "./frontend/pages/HomePage/HomePage.jsx";
import OAuthCallbackPage from "./frontend/pages/OAuthCallbackPage/OAuthCallbackPage.jsx";
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
        <Route path={APP_ROUTES.frontendDashboard} element={<FrontendDashboardPage />} />
      </Route>

      {/* Admin Panel remains isolated without global header/footer */}
      <Route
        path={APP_ROUTES.adminRoot}
        element={<Navigate to={APP_ROUTES.adminDashboard} replace />}
      />
      <Route
        path={APP_ROUTES.adminDashboard}
        element={<AdminDashboardPage />}
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
