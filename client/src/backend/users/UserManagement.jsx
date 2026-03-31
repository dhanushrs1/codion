import { useEffect, useState, useMemo } from "react";
import { 
  Search, 
  MoreVertical, 
  ShieldAlert, 
  UserX, 
  UserCheck, 
  Shield, 
  User as UserIcon, 
  PenTool, 
  Loader2,
  X 
} from "lucide-react";
import { apiUrl } from "../../shared/api.js";
import "./UserManagement.css";

function BanModal({ user, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onConfirm(user.id, reason);
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="um-modal-overlay">
      <div className="um-modal">
        <div className="um-modal__header">
          <h3>Ban User: @{user.username}</h3>
          <button className="um-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="um-modal__body">
          <p className="um-modal__desc">
            You are about to ban <strong>{user.first_name}</strong>. They will no longer be able to log in or create an account.
          </p>
          <div className="um-input-group">
            <label>Reason for Ban *</label>
            <textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Violation of community guidelines..."
              required
              rows={3}
            />
          </div>
          <div className="um-modal__actions">
            <button type="button" className="um-btn um-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="um-btn um-btn--danger" disabled={loading || !reason.trim()}>
              {loading ? <Loader2 size={16} className="um-spin" /> : "Confirm Ban"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagement({ role: currentUserRole, username: currentUsername }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [banModalUser, setBanModalUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // track loading by user id

  if (currentUserRole !== "ADMIN") {
    return (
      <div className="um-restricted">
        <ShieldAlert size={48} className="um-restricted__icon" />
        <h2>Access Restricted</h2>
        <p>You do not have permission to view User Management.</p>
        <p className="um-restricted__sub">Only administrators can manage platform users and their roles.</p>
      </div>
    );
  }

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("codion_token");
      const res = await fetch(apiUrl("/auth/admin/users"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Failed to fetch users", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem("codion_token");
      const res = await fetch(apiUrl(`/auth/admin/users/${userId}/role`), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBan = async (userId, reason = null, currentStatus) => {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem("codion_token");
      const res = await fetch(apiUrl(`/auth/admin/users/${userId}/status`), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ is_active: !currentStatus, ban_reason: reason })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      }
      setBanModalUser(null);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          user.username.toLowerCase().includes(s) ||
          user.email.toLowerCase().includes(s) ||
          user.first_name.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [users, search, roleFilter]);

  const getRoleIcon = (role) => {
    if (role === "admin") return <Shield size={14} />;
    if (role === "editor") return <PenTool size={14} />;
    return <UserIcon size={14} />;
  };

  return (
    <div className="um-container">
      <div className="um-header">
        <div>
          <h2 className="um-title">User Management</h2>
          <p className="um-subtitle">Manage roles, secure accounts, and oversee platform access.</p>
        </div>
      </div>

      <div className="um-controls">
        <div className="um-search">
          <Search size={16} className="um-search__icon" />
          <input 
            type="text" 
            placeholder="Search by name, @username, or email..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="um-filters">
          {["all", "admin", "editor", "student"].map(r => (
            <button 
              key={r}
              className={`um-filter-btn ${roleFilter === r ? "um-filter-btn--active" : ""}`}
              onClick={() => setRoleFilter(r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="um-table-wrapper">
        <table className="um-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Contact Details</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th className="um-table__actions-head">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="um-table__empty">
                  <Loader2 size={24} className="um-spin" style={{ color: "var(--text-secondary)" }}/>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="um-table__empty">No users found.</td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const isMe = user.username === currentUsername;
                const isBanned = !user.is_active;

                return (
                  <tr key={user.id} className={isBanned ? "um-row-banned" : ""}>
                    {/* User Profile */}
                    <td>
                      <div className="um-user-cell">
                        <div className="um-avatar">
                          {user.first_name[0].toUpperCase()}
                        </div>
                        <div className="um-user-info">
                          <span className="um-name">
                            {user.first_name} {user.last_name || ""}
                            {isMe && <span className="um-badge-me">You</span>}
                          </span>
                          <span className="um-username">@{user.username}</span>
                        </div>
                      </div>
                    </td>

                    {/* Email / Auth */}
                    <td>
                      <div className="um-email-cell">
                        <span>{user.email}</span>
                        <span className="um-provider">via {user.auth_provider}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <div className={`um-role-badge um-role-badge--${user.role}`}>
                        {getRoleIcon(user.role)}
                        {user.role}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      {isBanned ? (
                        <div className="um-status-badge um-status-badge--banned" title={user.ban_reason}>
                          <UserX size={14} /> Banned
                        </div>
                      ) : (
                        <div className="um-status-badge um-status-badge--active">
                          <UserCheck size={14} /> Active
                        </div>
                      )}
                    </td>

                    {/* Joined */}
                    <td>
                      <span className="um-date">
                        {new Date(user.created_at).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="um-actions">
                        <select 
                          className="um-role-select"
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={isMe || actionLoading === user.id}
                        >
                          <option value="student">Student</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                        
                        <button 
                          className={`um-ban-btn ${isBanned ? "um-ban-btn--unban" : "um-ban-btn--ban"}`}
                          disabled={isMe || actionLoading === user.id}
                          onClick={() => isBanned ? handleToggleBan(user.id, null, false) : setBanModalUser(user)}
                          title={isBanned ? "Unban user" : "Ban user"}
                        >
                          {isBanned ? "Unban" : "Ban"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {banModalUser && (
        <BanModal 
          user={banModalUser} 
          onClose={() => setBanModalUser(null)}
          onConfirm={handleToggleBan}
        />
      )}
    </div>
  );
}
