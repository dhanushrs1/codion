import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import AuthModal from "../components/AuthModal/AuthModal.jsx";
import "./FrontendLayout.css";

export default function FrontendLayout() {
  const location = useLocation();
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState('LOGIN');
  
  // Dynamic Authentication state simulation
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState("USER"); // 'USER', 'ADMIN', 'EDITOR'

  const openAuthModal = (view) => {
    setAuthView(view);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Triggers when a rigorous mock role is submitted in the modal form
  const handleAuthenticate = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
    closeAuthModal();
  };

  return (
    <>
      <Header 
        isAuthenticated={isAuthenticated} 
        userRole={userRole} 
        onOpenAuthModal={openAuthModal}
      />

      <main style={{ minHeight: "calc(100vh - 400px)" }}>
        <Outlet />
      </main>

      <Footer />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal} 
        initialView={authView}
        onAuthenticate={handleAuthenticate}
      />
    </>
  );
}
