import { useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, Network, Activity, TerminalSquare, Code, Clock, Database, Play, Loader2, FileCode } from "lucide-react";
import { APP_ROUTES } from "../../../routes/paths.js";
import "./HomePage.css";

const FEATURES = [
  {
    icon: <Cpu size={32} />,
    title: "Isolated Sandbox Execution",
    description: "Code runs in a secure, Dockerized container network. Instant feedback on syntax errors, memory limits, and hidden test cases. Designed to process millions of submissions seamlessly.",
  },
  {
    icon: <Network size={32} />,
    title: "Flat Curriculum",
    description: "Move seamlessly from overarching Tracks directly into specific Exercises via a unified sidebar. Zero redirects.",
  },
  {
    icon: <Activity size={32} />,
    title: "Pure Telemetry",
    description: "Track progression through control flows and OOP concepts with raw analytical data. No gamified badges.",
  },
  {
    icon: <TerminalSquare size={32} />,
    title: "Native Developer UI",
    description: "We eliminated heavy shadows and floating UI components. The Codion workspace strictly mimics the flat, high-contrast environments professional engineers use daily.",
  },
];

const IDE_FILES = [
  {
    id: 1,
    name: "main.py",
    title: "Python 3.10",
    code: `def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\n# Compute the 15th Fibonacci number\nprint(f"The 15th Fibonacci number is: {fibonacci(15)}")`,
    output: "The 15th Fibonacci number is: 610\n\nProcess finished with exit code 0.",
  },
  {
    id: 2,
    name: "App.java",
    title: "Java 21",
    code: `public class App {\n    public static void main(String[] args) {\n        String text = "Advanced Execution Environment";\n        int vowels = 0;\n        for (char c : text.toLowerCase().toCharArray()) {\n            if ("aeiou".indexOf(c) != -1) vowels++;\n        }\n        System.out.println("Input: " + text);\n        System.out.println("Vowel Count: " + vowels);\n    }\n}`,
    output: "Input: Advanced Execution Environment\nVowel Count: 11\n\nProcess finished with exit code 0.",
  },
  {
    id: 3,
    name: "main.c",
    title: "C (GCC 11)",
    code: `#include <stdio.h>\n\nint main() {\n    int num = 42;\n    int *ptr = &num;\n    \n    printf("Original Value: %d\\n", num);\n    *ptr = 100;\n    printf("Modified via Pointer: %d\\n", num);\n    \n    return 0;\n}`,
    output: "Original Value: 42\nModified via Pointer: 100\n\nProcess finished with exit code 0.",
  },
  {
    id: 4,
    name: "script.js",
    title: "JavaScript (Node.js)",
    code: `const data = [\n  { id: 1, active: true, load: 45 },\n  { id: 2, active: false, load: 12 },\n  { id: 3, active: true, load: 88 }\n];\n\nconst activeLoads = data\n  .filter(node => node.active)\n  .map(node => node.load);\n\nconsole.log(\"Active Cluster Loads:\", activeLoads);`,
    output: "Active Cluster Loads: [ 45, 88 ]\n\nProcess finished with exit code 0.",
  },
];

export default function HomePage() {
  const [activeFileId, setActiveFileId] = useState(1);
  const [terminalState, setTerminalState] = useState("IDLE");
  
  const activeFile = IDE_FILES.find((f) => f.id === activeFileId);

  const handleFileSelect = (id) => {
    setActiveFileId(id);
    setTerminalState("IDLE");
  };

  const handleRunCode = () => {
    setTerminalState("RUNNING");
    setTimeout(() => {
      setTerminalState("FINISHED");
    }, 1200);
  };

  return (
    <div className="homePage">
      <section className="hero">
        <div className="container hero-layout-centered">
          <div className="hero-text-centered">
            <h1>Master robust <span>engineering.</span></h1>
            <p>A rigorous, highly optimized progression environment designed for computer science execution and architectural mastery.</p>
            <div className="hero-actions">
              <Link to={APP_ROUTES.login} className="btn btn-brand">
                Initialize Workspace
              </Link>
              <Link to={APP_ROUTES.home} className="btn btn-ghost">
                Explore Curriculum
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <div className="section-head">
            <h2>Core Capabilities</h2>
            <p style={{ fontSize: "1.1rem" }}>Precision tooling designed specifically for computer science curriculums.</p>
          </div>

          <div className="perf-grid">
            {FEATURES.map((feature, idx) => (
              <div key={feature.title} className={`perf-card ${idx === 0 || idx === 3 ? "span-2" : ""}`}>
                <div className="perf-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="studio">
        <div className="container">
          <div className="section-head" style={{ textAlign: "center", margin: "0 auto 64px", maxWidth: "600px" }}>
            <h2>The Studio Environment</h2>
            <p>A unified, professional workspace natively evaluating raw syntax across multiple environments instantly.</p>
          </div>

          <div className="ide-wrapper">
            <div className="ide-sidebar">
              <div className="ide-title">Environments</div>
              {IDE_FILES.map((file) => (
                <div
                  key={file.id}
                  className={`ide-file ${activeFileId === file.id ? "active" : ""}`}
                  onClick={() => handleFileSelect(file.id)}
                >
                  <FileCode size={16} />
                  {file.title}
                </div>
              ))}
            </div>

            <div className="ide-main">
              <div className="ide-tabs">
                <div className="ide-tab">{activeFile?.name || "script.py"}</div>
                <div className="ide-actions">
                  <button className="ide-run-btn" onClick={handleRunCode} disabled={terminalState === "RUNNING"}>
                    {terminalState === "RUNNING" ? (
                      <><Loader2 size={14} className="spin" /> Executing...</>
                    ) : (
                      <><Play size={14} fill="currentColor" /> Run</>
                    )}
                  </button>
                </div>
              </div>

              <div className="ide-code-container">
                {/* Changed exactly into a simple <pre> read-only block to avoid modification per user spec */}
                <pre className="ide-textarea">
                  {activeFile?.code}
                </pre>
              </div>

              <div className="ide-terminal">
                <span style={{ color: "var(--text-tertiary)" }}>$ engine_execute --file {activeFile?.name}</span>
                <br />
                {terminalState === "IDLE" && (
                  <span style={{ color: "var(--text-secondary)" }}>&gt; Ready for input. Press 'Run' to compile logic.</span>
                )}
                {terminalState === "RUNNING" && (
                  <span style={{ color: "var(--accent-highlight)" }}>&gt; Booting isolated container environment & syncing memory bounds...</span>
                )}
                {terminalState === "FINISHED" && (
                  <div className="term-output">
                    {activeFile?.output}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="tracks">
        <div className="container">
          <div className="section-head">
            <h2>Engineering Tracks</h2>
            <p>Structured progression paths for modern developers.</p>
          </div>

          <div className="track-grid">
            <div className="track-card">
              <div className="track-id">01</div>
              <div className="track-info">
                <h3>Python Foundation</h3>
                <p>Master the foundational syntax, data structures, and object-oriented principles required to build enterprise-grade backend software.</p>
                <div className="track-stats">
                  <span><Code size={16} style={{ marginRight: "4px" }} /> 42 EXERCISES</span>
                  <span><Clock size={16} style={{ marginRight: "4px" }} /> 12 HOURS</span>
                </div>
              </div>
            </div>

            <div className="track-card">
              <div className="track-id">02</div>
              <div className="track-info">
                <h3>Relational Databases</h3>
                <p>Design rigid schemas, execute complex table joins, and optimize SQL query latency for scalable web applications.</p>
                <div className="track-stats">
                  <span><Database size={16} style={{ marginRight: "4px" }} /> 28 EXERCISES</span>
                  <span><Clock size={16} style={{ marginRight: "4px" }} /> 8 HOURS</span>
                </div>
              </div>
            </div>

            <div className="track-card">
              <div className="track-id">03</div>
              <div className="track-info">
                <h3>Docker & Deployments</h3>
                <p>Learn to containerize applications, manage isolated internal networks, and scale microservices securely for production.</p>
                <div className="track-stats">
                  <span><TerminalSquare size={16} style={{ marginRight: "4px" }} /> 15 EXERCISES</span>
                  <span><Clock size={16} style={{ marginRight: "4px" }} /> 6 HOURS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}