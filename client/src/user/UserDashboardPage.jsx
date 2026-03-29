import { buildAppUrl, getRuntimeOrigin } from "../config/runtime.js";
import { APP_ROUTES } from "../routes/paths.js";
import "./UserDashboardPage.css";

const USER_AREAS = [
  {
    title: "Learning Queue",
    description: "Continue pending tasks and watch submission status by challenge.",
  },
  {
    title: "Progress",
    description: "Track current level, completed streak, and skill growth markers.",
  },
  {
    title: "Practice Arena",
    description: "Start coding sessions and submit solutions through API routing.",
  },
];

export default function UserDashboardPage() {
  const runtimeOrigin = getRuntimeOrigin();

  return (
    <main className="userDashboardPage">
      <header className="userDashboardPage__header">
        <p className="userDashboardPage__eyebrow">User Panel</p>
        <h1>User Dashboard</h1>
        <p>
          Slug route: <strong>{APP_ROUTES.userDashboard}</strong>
        </p>
        <p className="userDashboardPage__origin">Running on {runtimeOrigin}</p>
      </header>

      <section className="userDashboardPage__grid">
        {USER_AREAS.map((item) => (
          <article className="userDashboardPage__card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <footer className="userDashboardPage__footer">
        <a className="userDashboardPage__link" href={buildAppUrl(APP_ROUTES.login)}>
          Go to Common Login
        </a>
        <a
          className="userDashboardPage__link userDashboardPage__link--secondary"
          href={buildAppUrl(APP_ROUTES.adminDashboard)}
        >
          Open Admin Dashboard
        </a>
      </footer>
    </main>
  );
}