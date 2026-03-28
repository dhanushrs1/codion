const sampleTracks = [
  { title: "Data Structures", level: "Intermediate" },
  { title: "System Design", level: "Advanced" },
  { title: "Python Fundamentals", level: "Beginner" },
];

export default function App() {
  return (
    <div className="app-shell">
      {/* Top navigation remains minimal and flat for enterprise clarity. */}
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden>
            C
          </span>
          <div>
            <h1>Codion</h1>
            <p>Distributed coding education platform</p>
          </div>
        </div>
        <button className="primary-button" type="button">
          Create Workspace
        </button>
      </header>

      {/* Main content uses bordered sections instead of shadows or glass effects. */}
      <main className="content-grid">
        <section className="panel">
          <h2>Platform Status</h2>
          <p>
            Frontend is served as static assets, API requests route to
            <strong> /api/</strong>, and code execution is delegated to Judge0.
          </p>
          <div className="stat-row">
            <article className="stat-card">
              <h3>Gateway</h3>
              <p>NGINX</p>
            </article>
            <article className="stat-card">
              <h3>Backend</h3>
              <p>FastAPI</p>
            </article>
            <article className="stat-card">
              <h3>Execution</h3>
              <p>Judge0 + Redis</p>
            </article>
          </div>
        </section>

        <section className="panel">
          <h2>Learning Tracks</h2>
          <ul className="track-list">
            {sampleTracks.map((track) => (
              <li className="track-item" key={track.title}>
                <span>{track.title}</span>
                <span>{track.level}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
