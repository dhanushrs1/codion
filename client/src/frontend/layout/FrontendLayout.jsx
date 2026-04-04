import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import AuthModal from "../components/AuthModal/AuthModal.jsx";
import { APP_ROUTES } from "../../routes/paths.js";
import { apiUrl } from "../../shared/api.js";
import "./FrontendLayout.css";

/*
  OAuth callback intercept:
  After the API redirects back, the response carries either:
    - status "active"           → store token, go to dashboard
    - status "pending_username" → open the modal in USERNAME view
*/
export default function FrontendLayout() {
  const navigate = useNavigate();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState("USER");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("codion_token");
    const role = localStorage.getItem("codion_role");
    const name = localStorage.getItem("codion_username") ?? "";
    const storedAvatarUrl = localStorage.getItem("codion_avatar_url") ?? "";
    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role.toUpperCase());
      setDisplayName(name);
      setAvatarUrl(storedAvatarUrl);
    }
  }, []);

  // Callback called by AuthModal after successful auth (new or existing user)
  const handleAuthenticate = (role, username, nextAvatarUrl = "") => {
    const normalizedRole = (role ?? "STUDENT").toUpperCase();
    setIsAuthenticated(true);
    setUserRole(normalizedRole);
    setDisplayName(username ?? "");
    setAvatarUrl(nextAvatarUrl ?? "");

    localStorage.setItem("codion_role", normalizedRole);
    localStorage.setItem("codion_username", username ?? "");
    if ((nextAvatarUrl ?? "").trim()) {
      localStorage.setItem("codion_avatar_url", nextAvatarUrl);
    } else {
      localStorage.removeItem("codion_avatar_url");
    }
    setIsAuthModalOpen(false);
    navigate(APP_ROUTES.frontendDashboard);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("codion_token");
      if (token) {
        // Assuming api.js exposes apiUrl, or we can just fetch relatively because frontend is proxied
        await fetch(apiUrl("/auth/logout"), {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      // Ignore network errors on logout
    }

    localStorage.removeItem("codion_token");
    localStorage.removeItem("codion_role");
    localStorage.removeItem("codion_username");
    localStorage.removeItem("codion_avatar_url");
    setIsAuthenticated(false);
    setUserRole("USER");
    setDisplayName("");
    setAvatarUrl("");
    navigate(APP_ROUTES.home);
  };

  return (
    <>
      <Header
        isAuthenticated={isAuthenticated}
        userRole={userRole}
        displayName={displayName}
        avatarUrl={avatarUrl}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onAdminPanelEntry={undefined}
      />

      <main style={{ minHeight: "calc(100vh - 400px)" }}>
        <Outlet />
      </main>

      <Footer />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticate={handleAuthenticate}
      />
    </>
  );
}
