import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Globe,
  ChevronRight,
  ShieldCheck,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { APP_ROUTES } from "../routes/paths.js";
import { apiUrl } from "../shared/api.js";
import UserManagement from "./users/UserManagement.jsx";
import "./AdminDashboardPage.css";

// ── Sidebar items ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "users", label: "User Management", icon: Users },
];

// ── Live clock ─────────────────────────────────────────────────────────────

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Sidebar ────────────────────────────────────────────────────────────────

function AdminSidebar({ activeKey, onSelect, isOpen, onToggle, onLogout }) {
  const VERSION = import.meta.env.VITE_APP_VERSION ?? "1.0.0";

  return (
    <aside className={`ap-sidebar ${isOpen ? "ap-sidebar--open" : "ap-sidebar--closed"}`}>
      {/* Brand row with toggle */}
      <div className="ap-sidebar__top">
        {isOpen ? (
          <div className="ap-sidebar__brandArea">
            <Link to={APP_ROUTES.home} className="ap-sidebar__brand">
              Cod<span style={{ color: "var(--accent-primary)" }}>ion</span>
            </Link>
            <span className="ap-sidebar__adminTag">CONSOLE</span>
          </div>
        ) : (
          <div className="ap-sidebar__brandArea ap-sidebar__brandArea--closed">
            <ShieldCheck size={22} className="ap-sidebar__shieldIcon" />
          </div>
        )}

        <button 
          className="ap-sidebar__toggle" 
          onClick={onToggle}
          title={isOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="ap-sidebar__nav" aria-label="Admin navigation">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`ap-sidebar__item ${activeKey === key ? "ap-sidebar__item--active" : ""}`}
            onClick={() => onSelect(key)}
          >
            <Icon size={18} className="ap-sidebar__itemIcon" />
            
            {isOpen && <span className="ap-sidebar__itemLabel">{label}</span>}
            {isOpen && activeKey === key && <ChevronRight size={14} className="ap-sidebar__chevron" />}
            
            {/* Custom Tooltip for closed state */}
            {!isOpen && (
              <span className="ap-sidebar__tooltip">{label}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="ap-sidebar__footer">
        {isOpen ? (
          <p className="ap-sidebar__version">Version: v{VERSION}</p>
        ) : (
          <p className="ap-sidebar__version ap-sidebar__version--closed">v{VERSION}</p>
        )}
      </div>
    </aside>
  );
}

// ── Top bar ────────────────────────────────────────────────────────────────

function AdminTopBar({ activeKey, username, role, avatarUrl, onLogout }) {
  const now = useLiveClock();

  const pageTitle = NAV_ITEMS.find((i) => i.key === activeKey)?.label ?? "Dashboard";

  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="ap-topbar">
      <div className="ap-topbar__left">
        <h1 className="ap-topbar__title">{pageTitle}</h1>
      </div>

      <div className="ap-topbar__right">
        {/* Clock */}
        <div className="ap-topbar__clock">
          <span className="ap-topbar__time">{timeStr}</span>
        </div>

        {/* Visit site */}
        <Link
          className="ap-topbar__visitBtn"
          to={APP_ROUTES.home}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Globe size={14} />
          Visit Site
        </Link>
        
        <div className="ap-topbar__divider"></div>

        {/* User Profile Info */}
        <div className="ap-topbar__userProfile">
          <div className="ap-topbar__userInfo">
            <span className="ap-topbar__userName">@{username || "admin"}</span>
            <span className="ap-topbar__userRole">{role || "ADMIN"}</span>
          </div>
          <div className="ap-topbar__avatar" aria-label={`Signed in as ${username}`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={username} />
            ) : (
              <span>{(username || "A")[0].toUpperCase()}</span>
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          className="ap-topbar__logout"
          onClick={onLogout}
        >
          <LogOut size={16} />
          <span className="ap-topbar__tooltip">Sign out</span>
        </button>
      </div>
    </header>
  );
}

// ── Pages ──────────────────────────────────────────────────────────────────

function OverviewPage() {
  return (
    <div className="ap-page">
      <div className="ap-page__empty">
        <LayoutDashboard size={40} strokeWidth={1.2} />
        <h2>Overview</h2>
        <p>Dashboard metrics and summaries will appear here.</p>
      </div>
    </div>
  );
}



// ── Access denied ──────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <main className="ap-denied">
      <div className="ap-denied__card">
        <ShieldCheck size={36} />
        <h1>Access Restricted</h1>
        <p>This panel is available only to admins and editors.</p>
        <Link className="ap-denied__link" to={APP_ROUTES.frontendDashboard}>
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

const ELEVATED = new Set(["ADMIN", "EDITOR"]);

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState("USER");
  const [username, setUsername] = useState("guest");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [activeKey, setActiveKey] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    setRole((localStorage.getItem("codion_role") || "USER").toUpperCase());
    setUsername(localStorage.getItem("codion_username") || "guest");
    setAvatarUrl(localStorage.getItem("codion_avatar_url") || "");
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const token = localStorage.getItem("codion_token");
      if (token) {
        await fetch(apiUrl("/auth/logout"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          keepalive: true,
        });
      }
    } catch {
      // ignore
    }
    ["codion_token", "codion_role", "codion_username", "codion_avatar_url"].forEach(
      (k) => localStorage.removeItem(k)
    );
    navigate(APP_ROUTES.home);
  }, [navigate]);

  if (!ELEVATED.has(role)) {
    return <AccessDenied />;
  }

  return (
    <main className={`ap-root ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <AdminSidebar
        activeKey={activeKey}
        onSelect={setActiveKey}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
        onLogout={handleLogout}
      />

      <div className="ap-content">
        <AdminTopBar 
          activeKey={activeKey} 
          username={username} 
          role={role}
          avatarUrl={avatarUrl} 
          onLogout={handleLogout}
        />

        <div className="ap-body">
          {activeKey === "overview" && <OverviewPage />}
          {activeKey === "users" && <UserManagement role={role} username={username} />}
        </div>
      </div>
    </main>
  );
}
