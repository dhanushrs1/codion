import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { getRuntimeOrigin } from "../config/runtime.js";
import { APP_ROUTES } from "../routes/paths.js";
import { fetchAdminActivityLogs, logAdminActivity } from "../shared/api.js";
import AdminOverviewCards from "./dashboard/AdminOverviewCards.jsx";
import AdminSidebar from "./sidebar/AdminSidebar.jsx";
import "./AdminDashboardPage.css";

const ELEVATED_ROLES = new Set(["ADMIN", "EDITOR"]);

function formatAuditTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function formatLocation(logItem) {
  const segments = [logItem.city, logItem.state || logItem.region, logItem.country].filter(Boolean);
  return segments.length ? segments.join(", ") : "Unknown";
}

export default function AdminDashboardPage() {
  const runtimeOrigin = getRuntimeOrigin();
  const [viewerRole, setViewerRole] = useState("USER");
  const [viewerName, setViewerName] = useState("guest");
  const [activityLogs, setActivityLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState("");

  useEffect(() => {
    const nextRole = (localStorage.getItem("codion_role") || "USER").toUpperCase();
    const nextName = localStorage.getItem("codion_username") || "guest";
    setViewerRole(nextRole);
    setViewerName(nextName);
  }, []);

  const isElevatedUser = ELEVATED_ROLES.has(viewerRole);

  const buildClientAuditMeta = () => {
    const locale = typeof navigator !== "undefined" ? navigator.language : "";
    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || null
        : null;

    const stateFromLocale = locale.includes("-") ? locale.split("-")[1] : null;

    return {
      locale,
      timezone,
      stateFromLocale,
    };
  };

  const refreshLogs = async () => {
    if (!isElevatedUser) {
      return;
    }

    setIsLoadingLogs(true);
    setLogsError("");

    try {
      const response = await fetchAdminActivityLogs({ limit: 30, offset: 0 });
      setActivityLogs(Array.isArray(response.items) ? response.items : []);
      setTotalLogs(Number(response.total) || 0);
    } catch (error) {
      setLogsError(error instanceof Error ? error.message : "Unable to load admin activity logs.");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSidebarSelect = (itemKey) => {
    const auditMeta = buildClientAuditMeta();

    void logAdminActivity({
      activity_type: "admin_sidebar_click",
      activity_context: itemKey,
      target_path: APP_ROUTES.adminDashboard,
      state: auditMeta.stateFromLocale,
      timezone: auditMeta.timezone,
      details: {
        locale: auditMeta.locale || null,
      },
    });
  };

  useEffect(() => {
    if (!isElevatedUser) {
      return;
    }

    const auditMeta = buildClientAuditMeta();

    void logAdminActivity({
      activity_type: "admin_panel_visit",
      activity_context: "admin_dashboard_page",
      target_path: APP_ROUTES.adminDashboard,
      state: auditMeta.stateFromLocale,
      timezone: auditMeta.timezone,
      details: {
        locale: auditMeta.locale || null,
      },
    });

    void refreshLogs();
  }, [isElevatedUser]);

  const summary = useMemo(() => {
    const now = Date.now();
    const todayIso = new Date().toISOString().slice(0, 10);
    let todayVisits = 0;
    let adminActions = 0;
    let editorActions = 0;
    let lastSixHours = 0;

    activityLogs.forEach((item) => {
      const normalizedRole = (item.role || "").toUpperCase();
      const createdAt = Date.parse(item.created_at || "");

      if (!Number.isNaN(createdAt) && now - createdAt <= 6 * 60 * 60 * 1000) {
        lastSixHours += 1;
      }

      if (
        (item.activity_type === "admin_panel_visit" || item.activity_type === "admin_panel_button_click") &&
        String(item.created_at || "").startsWith(todayIso)
      ) {
        todayVisits += 1;
      }

      if (normalizedRole === "ADMIN") {
        adminActions += 1;
      }
      if (normalizedRole === "EDITOR") {
        editorActions += 1;
      }
    });

    return {
      todayVisits,
      adminActions,
      editorActions,
      lastSixHours,
    };
  }, [activityLogs]);

  if (!isElevatedUser) {
    return (
      <main className="adminDashboardPage adminDashboardPage--limited">
        <section className="adminDashboardPage__limitedCard">
          <h1>Admin Access Required</h1>
          <p>This panel is available only for ADMIN and EDITOR roles.</p>
          <div className="adminDashboardPage__limitedActions">
            <Link className="btn btn-brand" to={APP_ROUTES.home}>
              Go Home
            </Link>
            <Link className="btn btn-ghost" to={APP_ROUTES.frontendDashboard}>
              Open User Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="adminDashboardPage">
      <div className="adminDashboardPage__layout">
        <AdminSidebar
          activeKey="overview"
          role={viewerRole}
          username={viewerName}
          onSelect={handleSidebarSelect}
        />

        <section className="adminDashboardPage__main">
          <header className="adminDashboardPage__header">
            <div>
              <p className="adminDashboardPage__eyebrow">Audit + Monitoring</p>
              <h1>Admin Dashboard</h1>
              <p>
                Route: <strong>{APP_ROUTES.adminDashboard}</strong> | Runtime: {runtimeOrigin || "local"}
              </p>
              <p className="adminDashboardPage__meta">Tracked activity records: {totalLogs}</p>
            </div>

            <div className="adminDashboardPage__headerActions">
              <button type="button" className="btn btn-ghost" onClick={() => void refreshLogs()}>
                <RefreshCw size={14} />
                Refresh Logs
              </button>
              <Link className="btn btn-brand" to={APP_ROUTES.frontendDashboard}>
                User Dashboard
              </Link>
            </div>
          </header>

          <AdminOverviewCards summary={summary} />

          <section className="adminDashboardPage__panel">
            <div className="adminDashboardPage__panelTop">
              <h2>Recent Admin Activity</h2>
              <p>
                Includes button clicks, panel visits, sign-in events, and sign-out events with IP and location
                headers.
              </p>
            </div>

            {isLoadingLogs ? (
              <p className="adminDashboardPage__status">Loading logs...</p>
            ) : null}

            {!isLoadingLogs && logsError ? (
              <p className="adminDashboardPage__status adminDashboardPage__status--error">
                <AlertCircle size={14} />
                {logsError}
              </p>
            ) : null}

            {!isLoadingLogs && !logsError && activityLogs.length === 0 ? (
              <p className="adminDashboardPage__status">No activity has been recorded yet.</p>
            ) : null}

            {!isLoadingLogs && !logsError && activityLogs.length > 0 ? (
              <div className="adminDashboardPage__tableWrap">
                <table className="adminDashboardPage__table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Role</th>
                      <th>Activity</th>
                      <th>Path</th>
                      <th>Location</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((item) => (
                      <tr key={item.id}>
                        <td>{formatAuditTime(item.created_at)}</td>
                        <td>{item.username || "unknown"}</td>
                        <td>
                          <span
                            className={`adminDashboardPage__roleTag adminDashboardPage__roleTag--${
                              (item.role || "unknown").toLowerCase()
                            }`}
                          >
                            {item.role || "UNKNOWN"}
                          </span>
                        </td>
                        <td>{item.activity_type}</td>
                        <td>{item.target_path || "-"}</td>
                        <td>{formatLocation(item)}</td>
                        <td>{item.ip_address || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}
