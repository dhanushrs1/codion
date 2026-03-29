import { Navigate, Route, Routes } from "react-router-dom";
import AdminDashboardPage from "./admin/AdminDashboardPage.jsx";
import LoginPage from "./shared/auth/LoginPage.jsx";
import HomePage from "./shared/home/HomePage.jsx";
import NotFoundPage from "./shared/404/NotFoundPage.jsx";
import UserDashboardPage from "./user/UserDashboardPage.jsx";
import { APP_ROUTES } from "./routes/paths.js";

export default function App() {
  return (
    <Routes>
      <Route path={APP_ROUTES.home} element={<HomePage />} />
      <Route path={APP_ROUTES.login} element={<LoginPage />} />

      <Route
        path={APP_ROUTES.userRoot}
        element={<Navigate to={APP_ROUTES.userDashboard} replace />}
      />
      <Route path={APP_ROUTES.userDashboard} element={<UserDashboardPage />} />

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
