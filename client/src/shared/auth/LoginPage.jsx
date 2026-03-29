import { buildAppUrl, getApiBaseUrl, getRuntimeOrigin } from "../../config/runtime.js";
import { APP_ROUTES } from "../../routes/paths.js";
import "./LoginPage.css";

function redirectTo(pathname) {
  window.location.assign(buildAppUrl(pathname));
}

export default function LoginPage() {
  const runtimeOrigin = getRuntimeOrigin();
  const apiBaseUrl = getApiBaseUrl();

  return (
    <main className="loginPage">
      <section className="loginPage__panel">
        <header className="loginPage__header">
          <p className="loginPage__eyebrow">Codion Platform</p>
          <h1>Common Login Portal</h1>
          <p>
            Single login entry point for both user and admin panels with
            production-safe route slugs.
          </p>
        </header>

        <div className="loginPage__runtimeInfo">
          <div>
            <span>Current Frontend Origin</span>
            <strong>{runtimeOrigin || "Unavailable"}</strong>
          </div>
          <div>
            <span>Resolved API Base URL</span>
            <strong>{apiBaseUrl}</strong>
          </div>
        </div>

        <div className="loginPage__actions">
          <button
            type="button"
            className="loginPage__button loginPage__button--user"
            onClick={() => redirectTo(APP_ROUTES.userDashboard)}
          >
            Continue as User
          </button>
          <button
            type="button"
            className="loginPage__button loginPage__button--admin"
            onClick={() => redirectTo(APP_ROUTES.adminDashboard)}
          >
            Continue as Admin
          </button>
        </div>
      </section>
    </main>
  );
}