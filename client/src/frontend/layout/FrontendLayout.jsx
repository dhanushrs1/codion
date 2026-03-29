import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import "./FrontendLayout.css";

export default function FrontendLayout() {
  const location = useLocation();
  
  // This evaluates to true if the user is on the /dashboard (or similar protected frontend routes)
  // For now, this is a simulated role-based access flag
  const isDashboardRoute = location.pathname.includes('/dashboard'); 
  const isAuthenticated = isDashboardRoute; // Mock check for authentication
  const userRole = "USER"; // Mock standard student user

  return (
    <>
      <Header isAuthenticated={isAuthenticated} userRole={userRole} />

      <main style={{ minHeight: "calc(100vh - 400px)" }}>
        <Outlet />
      </main>

      <Footer />
    </>
  );
}
