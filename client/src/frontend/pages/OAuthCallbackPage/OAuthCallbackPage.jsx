import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AtSign, ArrowRight, Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { APP_ROUTES } from "../../../routes/paths.js";
import { apiUrl } from "../../../shared/api.js";
import "./OAuthCallbackPage.css";

/*
  This page is the frontend landing point after Google/GitHub OAuth.
  The API redirects here with one of:
    ?status=active&token=...&role=...&username=...
    ?status=pending_username&setup_token=...
    ?error=...
*/
export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const status = params.get("status");
  const token = params.get("token");
  const role = params.get("role");
  const username = params.get("username");
  const setupToken = params.get("setup_token");
  const error = params.get("error");

  const decodeJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return {};
    }
  };

  const setupTokenPayload = setupToken ? decodeJwt(setupToken) : {};
  const fullName = setupTokenPayload.full_name || '';
  const initialFirstName = fullName.split(' ')[0] || '';
  const initialLastName = fullName.split(' ').slice(1).join(' ') || '';

  const [usernameInput, setUsernameInput] = useState("");
  const [firstNameInput, setFirstNameInput] = useState(initialFirstName);
  const [lastNameInput, setLastNameInput] = useState(initialLastName);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState(error ?? "");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);

  // Existing user — store session and redirect immediately
  useEffect(() => {
    if (status === "active" && token) {
      localStorage.setItem("codion_token", token);
      localStorage.setItem("codion_role", (role ?? "student").toUpperCase());
      localStorage.setItem("codion_username", username ?? "");
      navigate(APP_ROUTES.frontendDashboard, { replace: true });
    }
  }, [status, token, role, username, navigate]);

  // Live username availability check (Debounced)
  useEffect(() => {
    if (usernameInput.length < 3) {
      setIsUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/auth/check-username?username=${usernameInput}`));
        if (res.ok) {
          const data = await res.json();
          setIsUsernameAvailable(data.available);
        } else {
          setIsUsernameAvailable(null);
        }
      } catch {
        setIsUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500); // 500ms delay to prevent server spam

    return () => clearTimeout(timeoutId);
  }, [usernameInput]);

  // Handle username submission for new users
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim() || usernameInput.length < 3 || !firstNameInput.trim()) return;
    setLoading(true);
    setErrMsg("");

    try {
      const res = await fetch(apiUrl("/auth/complete-profile"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${setupToken}`,
        },
        body: JSON.stringify({
          username: usernameInput.trim(),
          first_name: firstNameInput.trim(),
          last_name: lastNameInput.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrMsg(data.detail ?? "Something went wrong. Please try again.");
        return;
      }

      localStorage.setItem("codion_token", data.access_token);
      localStorage.setItem("codion_role", (data.role ?? "student").toUpperCase());
      localStorage.setItem("codion_username", data.username ?? "");
      navigate(APP_ROUTES.frontendDashboard, { replace: true });
    } catch {
      setErrMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show a brief loading screen while redirecting existing users
  if (status === "active") {
    return (
      <div className="callback-screen">
        <Loader2 size={32} className="callback-spin" />
        <p>Signing you in…</p>
      </div>
    );
  }

  // Hard error from API (e.g. OAuth provider rejected)
  if (errMsg && status !== "pending_username") {
    return (
      <div className="callback-screen">
        <AlertCircle size={40} color="var(--state-error)" />
        <h2>Authentication failed</h2>
        <p style={{ maxWidth: 360, textAlign: "center" }}>{errMsg}</p>
        <button className="btn btn-brand" onClick={() => navigate(APP_ROUTES.home)}>
          Return home
        </button>
      </div>
    );
  }

  // No recognised status — something went wrong before the redirect
  if (!status && !setupToken) {
    return (
      <div className="callback-screen">
        <AlertCircle size={40} color="var(--state-error)" />
        <h2>Invalid callback</h2>
        <p>This page can only be reached after signing in with Google or GitHub.</p>
        <button className="btn btn-brand" onClick={() => navigate(APP_ROUTES.home)}>
          Return home
        </button>
      </div>
    );
  }

  // New user — username selection
  return (
    <div className="callback-screen">
      <div className="callback-card">
        <div className="callback-brand">
          Cod<span style={{ color: "var(--accent-primary)" }}>ion</span>
        </div>

        <h2>One last step</h2>
        <p>
          Your identity was verified. Choose a unique username to activate your workspace.
        </p>

        <form onSubmit={handleSubmit} className="callback-form">
          <div className="input-group">
            <label>First Name *</label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="e.g. John"
                value={firstNameInput}
                onChange={(e) => setFirstNameInput(e.target.value)}
                maxLength={64}
                required
                style={{ paddingLeft: "14px" }}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Last Name (Optional)</label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="e.g. Doe"
                value={lastNameInput}
                onChange={(e) => setLastNameInput(e.target.value)}
                maxLength={64}
                style={{ paddingLeft: "14px" }}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Username *</label>
            <div className="input-wrapper">
              <AtSign size={18} className="input-icon" />
              <input
                type="text"
                placeholder="e.g. devraj_23"
                value={usernameInput}
                onChange={(e) =>
                  setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, ""))
                }
                maxLength={64}
                autoFocus
                required
                style={{ paddingRight: "40px" }}
              />
              {isCheckingUsername ? (
                <Loader2 size={18} className="username-status-icon callback-spin" />
              ) : usernameInput.length >= 3 && isUsernameAvailable !== null ? (
                isUsernameAvailable ? (
                  <CheckCircle size={18} className="username-status-icon status-available" />
                ) : (
                  <XCircle size={18} className="username-status-icon status-taken" />
                )
              ) : null}
            </div>
            <span className="input-hint">
              {usernameInput.length >= 3 && isUsernameAvailable === false ? (
                <span style={{ color: "var(--state-error)" }}>This username is already taken.</span>
              ) : (
                "3–64 characters · letters, numbers, _ and - only · cannot be changed later"
              )}
            </span>
          </div>

          {errMsg && <div className="callback-error">{errMsg}</div>}

          <button
            type="submit"
            className="btn btn-brand callback-submit"
            disabled={loading || usernameInput.length < 3 || isUsernameAvailable === false || isCheckingUsername || !firstNameInput.trim()}
          >
            {loading ? (
              <><Loader2 size={16} className="callback-spin-sm" /> Activating…</>
            ) : (
              <>Activate Workspace <ArrowRight size={16} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
