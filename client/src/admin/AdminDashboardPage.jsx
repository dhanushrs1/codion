import { buildAppUrl, getRuntimeOrigin } from "../config/runtime.js";
import { APP_ROUTES } from "../routes/paths.js";
import "./AdminDashboardPage.css";

const ADMIN_MODULES = [
  {
    title: "User Accounts",
    description: "Manage approvals, profile flags, and role upgrades.",
  },
  {
    title: "Content Pipeline",
    description: "Create and publish learning modules in release batches.",
  },
  {
    title: "Platform Health",
    description: "Track API, queue, and submission service availability.",
  },
];

export default function AdminDashboardPage() {
  const runtimeOrigin = getRuntimeOrigin();

  return (
    <main className="adminDashboardPage">
      <header className="adminDashboardPage__header">
        <p className="adminDashboardPage__eyebrow">Admin Panel</p>
        <h1>Admin Dashboard</h1>
        <p>
          Slug route: <strong>{APP_ROUTES.adminDashboard}</strong>
        </p>
        <p className="adminDashboardPage__origin">Running on {runtimeOrigin}</p>
      </header>

      <section className="adminDashboardPage__grid">
        {ADMIN_MODULES.map((item) => (
          <article className="adminDashboardPage__card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <footer className="adminDashboardPage__footer">
        <a className="adminDashboardPage__link" href={buildAppUrl(APP_ROUTES.login)}>
          Go to Common Login
        </a>
        <a
          className="adminDashboardPage__link adminDashboardPage__link--secondary"
          href={buildAppUrl(APP_ROUTES.userDashboard)}
        >
          Open User Dashboard
        </a>
      </footer>
    </main>
  );
}