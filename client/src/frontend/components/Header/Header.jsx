import { Link } from "react-router-dom";
import { APP_ROUTES } from "../../../routes/paths.js";
import "./Header.css";

export default function Header({ isAuthenticated = false, userRole = "USER" }) {
  return (
    <header className="nav-bar">
      <div className="container nav-inner">
        <Link to={APP_ROUTES.home} className="brand-mark">
          Cod<span style={{ color: "var(--accent-primary)" }}>ion</span>
        </Link>
        <nav className="nav-menu">
          <Link to={APP_ROUTES.home}>Architecture</Link>
          <Link to={APP_ROUTES.home}>Execution API</Link>
          <Link to={APP_ROUTES.home}>Documentation</Link>
        </nav>
        <div style={{ display: "flex", gap: "12px" }}>
          {/* Role-Based Access Toggles */}
          {!isAuthenticated ? (
            <>
              <Link to={APP_ROUTES.login} className="btn btn-ghost">
                Sign In
              </Link>
              <Link to={APP_ROUTES.frontendDashboard} className="btn btn-brand">
                Start Coding
              </Link>
            </>
          ) : (
            <>
              {userRole === "ADMIN" ? (
                <Link to={APP_ROUTES.adminDashboard} className="btn btn-ghost">Admin Console</Link>
              ) : null}
              <Link to={APP_ROUTES.frontendDashboard} className="btn btn-brand">
                Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
