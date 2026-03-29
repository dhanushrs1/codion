import { useState } from "react";
import { X, Mail, Lock, User, ArrowRight } from "lucide-react";
import "./AuthModal.css";

// Views: 'LOGIN', 'REGISTER', 'FORGOT', 'RESET'
export default function AuthModal({ isOpen, onClose, onAuthenticate, initialView = 'LOGIN' }) {
  const [view, setView] = useState(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (view === 'LOGIN' || view === 'REGISTER') {
      // Mocking Role-Based Access visually
      let role = "USER";
      const checkEmail = email.toLowerCase();
      if (checkEmail.includes("admin")) {
        role = "ADMIN";
      } else if (checkEmail.includes("editor")) {
        role = "EDITOR";
      }
      onAuthenticate(role);
    } else if (view === 'FORGOT') {
      setView('RESET');
    } else if (view === 'RESET') {
      setView('LOGIN');
    }
  };

  const resetState = (newView) => {
    setView(newView);
    setEmail("");
    setPassword("");
    setName("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="brand-mark">
            Cod<span style={{ color: "var(--accent-primary)" }}>ion</span>
          </div>
          <h2>
            {view === 'LOGIN' && "Welcome back"}
            {view === 'REGISTER' && "Create an account"}
            {view === 'FORGOT' && "Reset your password"}
            {view === 'RESET' && "Secure new password"}
          </h2>
          <p>
            {view === 'LOGIN' && "Sign in to access your structured curriculum."}
            {view === 'REGISTER' && "Initialize your workspace and track your progress."}
            {view === 'FORGOT' && "Enter your email to receive recovery instructions."}
            {view === 'RESET' && "Complete the reset procedure for your account."}
          </p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {view === 'REGISTER' && (
            <div className="input-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="Engineering Student"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {(view === 'LOGIN' || view === 'REGISTER' || view === 'FORGOT') && (
             <div className="input-group">
               <label>Email Address</label>
               <div className="input-wrapper">
                 <Mail size={18} className="input-icon" />
                 <input
                   type="email"
                   placeholder="coder@university.edu (Type 'admin' for Admin)"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   required
                 />
               </div>
             </div>
          )}

          {(view === 'LOGIN' || view === 'REGISTER' || view === 'RESET') && (
            <div className="input-group">
              <label>{view === 'RESET' ? "New Password" : "Password"}</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {view === 'LOGIN' && (
                <div className="forgot-link" onClick={() => resetState('FORGOT')}>
                  Forgot password?
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-brand modal-submit">
            {view === 'LOGIN' && "Sign In"}
            {view === 'REGISTER' && "Initialize Workspace"}
            {view === 'FORGOT' && "Send Reset Link"}
            {view === 'RESET' && "Confirm New Password"}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="modal-footer">
          {view === 'LOGIN' && (
             <span>
               Don't have an account? <a onClick={() => resetState('REGISTER')}>Create Workspace</a>
             </span>
          )}
          {view === 'REGISTER' && (
             <span>
               Already have access? <a onClick={() => resetState('LOGIN')}>Sign In safely</a>
             </span>
          )}
          {(view === 'FORGOT' || view === 'RESET') && (
             <span>
               <a onClick={() => resetState('LOGIN')}>Return to Sign In</a>
             </span>
          )}
        </div>
      </div>
    </div>
  );
}
