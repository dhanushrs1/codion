import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import AuthModal from "../components/AuthModal/AuthModal.jsx";
import { APP_ROUTES } from "../../routes/paths.js";
import "./FrontendLayout.css";

/*
  OAuth callback intercept:
  After the API redirects back, the response carries either:
    - status "active"           → store token, go to dashboard
    - status "pending_username" → open the modal in USERNAME view
*/
export default function FrontendLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState("USER");
  const [displayName, setDisplayName] = useState("");

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("codion_token");
    const role = localStorage.getItem("codion_role");
    const name = localStorage.getItem("codion_username");
    if (token && role && name) {
      setIsAuthenticated(true);
      setUserRole(role.toUpperCase());
      setDisplayName(name);
    }
  }, []);

  // Callback called by AuthModal after successful auth (new or existing user)
  const handleAuthenticate = (role, username) => {
    const normalizedRole = (role ?? "STUDENT").toUpperCase();
    setIsAuthenticated(true);
    setUserRole(normalizedRole);
    setDisplayName(username ?? "");

    localStorage.setItem("codion_role", normalizedRole);
    localStorage.setItem("codion_username", username ?? "");
    setIsAuthModalOpen(false);
    navigate(APP_ROUTES.frontendDashboard);
  };

  const handleLogout = () => {
    localStorage.removeItem("codion_token");
    localStorage.removeItem("codion_role");
    localStorage.removeItem("codion_username");
    setIsAuthenticated(false);
    setUserRole("USER");
    setDisplayName("");
    navigate(APP_ROUTES.home);
  };

  return (
    <>
      <Header
        isAuthenticated={isAuthenticated}
        userRole={userRole}
        displayName={displayName}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
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
