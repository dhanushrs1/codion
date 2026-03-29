import { Link } from "react-router-dom";
import { APP_ROUTES } from "../../../routes/paths.js";
import "./Header.css";

export default function Header({
  isAuthenticated = false,
  userRole = "USER",
  displayName = "",
  onOpenAuthModal,
  onLogout,
}) {
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

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {!isAuthenticated ? (
            <>
              <button onClick={onOpenAuthModal} className="btn btn-ghost">
                Sign In
              </button>
              <button onClick={onOpenAuthModal} className="btn btn-brand">
                Start Coding
              </button>
            </>
          ) : (
            <>
              {/* Admin Console — visible to ADMIN and EDITOR roles */}
              {(userRole === "ADMIN" || userRole === "EDITOR") && (
                <Link to={APP_ROUTES.adminDashboard} className="btn btn-ghost">
                  Admin Console
                </Link>
              )}
              <Link to={APP_ROUTES.frontendDashboard} className="btn btn-brand">
                Dashboard
              </Link>
              {displayName && (
                <span className="nav-username">@{displayName}</span>
              )}
              <button onClick={onLogout} className="nav-logout">
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
