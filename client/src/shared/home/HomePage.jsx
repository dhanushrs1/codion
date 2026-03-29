import { Link } from "react-router-dom";
import { getApiBaseUrl, getRuntimeOrigin } from "../../config/runtime.js";
import { APP_ROUTES } from "../../routes/paths.js";
import "./HomePage.css";

const FEATURE_ITEMS = [
  {
    title: "Practice to Production",
    description:
      "Use curated coding tracks and graduate from daily drills into project-level problem solving.",
  },
  {
    title: "Live Progress Signals",
    description:
      "Dummy metrics today, real analytics tomorrow. This card represents your learner activity stream.",
  },
  {
    title: "Execution-Ready Pipeline",
    description:
      "Submit code through a secure API path and execute with isolated Judge0 workers.",
  },
];

const TIMELINE_ITEMS = [
  "Sign in from a common access portal.",
  "Select a learning plan and target level.",
  "Practice challenges and review result details.",
  "Publish progress to mentors and team dashboards.",
];

export default function HomePage() {
  const runtimeOrigin = getRuntimeOrigin();
  const apiBaseUrl = getApiBaseUrl();

  return (
    <main className="homePage">
      <div className="homePage__backdrop" aria-hidden="true" />

      <header className="homePage__topbar">
        <div className="homePage__brand">
          <span className="homePage__brandMark">C</span>
          <div>
            <strong>Codion</strong>
            <p>Engineering Learning Platform</p>
          </div>
        </div>

        <nav className="homePage__nav">
          <Link to={APP_ROUTES.login}>Common Login</Link>
          <Link to={APP_ROUTES.userDashboard}>User Panel</Link>
          <Link to={APP_ROUTES.adminDashboard}>Admin Panel</Link>
        </nav>
      </header>

      <section className="homePage__hero">
        <article className="homePage__heroContent">
          <p className="homePage__eyebrow">Build Smart, Learn Faster</p>
          <h1>One Platform for Learners, Mentors, and Admin Teams</h1>
          <p className="homePage__lead">
            This is a production-style home page with placeholder content. You
            can now expand this section into your final marketing narrative.
          </p>

          <div className="homePage__ctaRow">
            <Link className="homePage__cta homePage__cta--primary" to={APP_ROUTES.login}>
              Start with Common Login
            </Link>
            <Link className="homePage__cta homePage__cta--secondary" to={APP_ROUTES.userDashboard}>
              Open User Dashboard
            </Link>
          </div>
        </article>

        <aside className="homePage__runtimeCard">
          <h2>Runtime Snapshot</h2>
          <dl>
            <div>
              <dt>Frontend Origin</dt>
              <dd>{runtimeOrigin || "Unavailable"}</dd>
            </div>
            <div>
              <dt>Resolved API Base</dt>
              <dd>{apiBaseUrl}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Ready for integration</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="homePage__features" aria-label="Platform highlights">
        {FEATURE_ITEMS.map((item) => (
          <article key={item.title} className="homePage__featureCard">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <section className="homePage__timelineSection">
        <h2>How the Flow Works</h2>
        <ol className="homePage__timeline">
          {TIMELINE_ITEMS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}