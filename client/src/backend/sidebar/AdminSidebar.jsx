import { Activity, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import "./AdminSidebar.css";

const SIDEBAR_ITEMS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "activity", label: "Activity Logs", icon: Activity },
  { key: "roles", label: "Roles & Access", icon: Users },
];

export default function AdminSidebar({
  activeKey = "overview",
  role = "ADMIN",
  username = "admin",
  onSelect,
}) {
  return (
    <aside className="adminSidebar">
      <div className="adminSidebar__top">
        <p className="adminSidebar__eyebrow">Control Center</p>
        <h2>Admin Panel</h2>
      </div>

      <nav className="adminSidebar__nav" aria-label="Admin menu">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeKey;

          return (
            <button
              key={item.key}
              type="button"
              className={`adminSidebar__item ${isActive ? "adminSidebar__item--active" : ""}`}
              onClick={() => {
                if (typeof onSelect === "function") {
                  onSelect(item.key);
                }
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="adminSidebar__footer">
        <p className="adminSidebar__role">
          <ShieldCheck size={14} />
          <span>{role}</span>
        </p>
        <p className="adminSidebar__user">@{username}</p>
      </div>
    </aside>
  );
}
