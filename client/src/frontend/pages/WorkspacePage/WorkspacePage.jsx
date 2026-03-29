import { useState, useRef } from "react";
import {
  Play, Square, ChevronDown, Clock, Cpu,
  CheckCircle, XCircle, AlertTriangle, Loader2, Terminal,
} from "lucide-react";
import { apiUrl } from "../../../shared/api.js";
import "./WorkspacePage.css";

/* ── Language map ────────────────────────────────────────────────────────── */
const LANGUAGES = [
  { id: 71, name: "Python 3",    ext: "py",  mono: "python",     starter: 'print("Hello, Codion!")' },
  { id: 63, name: "JavaScript",  ext: "js",  mono: "javascript",  starter: 'console.log("Hello, Codion!");' },
  { id: 54, name: "C++",         ext: "cpp", mono: "cpp",         starter: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello, Codion!" << endl;\n    return 0;\n}' },
  { id: 50, name: "C",           ext: "c",   mono: "c",           starter: '#include <stdio.h>\nint main() {\n    printf("Hello, Codion!\\n");\n    return 0;\n}' },
  { id: 62, name: "Java",        ext: "java",mono: "java",        starter: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Codion!");\n    }\n}' },
  { id: 60, name: "Go",          ext: "go",  mono: "go",          starter: 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello, Codion!")\n}' },
  { id: 73, name: "Rust",        ext: "rs",  mono: "rust",        starter: 'fn main() {\n    println!("Hello, Codion!");\n}' },
];

/* ── Verdict helpers ─────────────────────────────────────────────────────── */
const VERDICT_META = {
  Accepted:           { color: "var(--state-success)", Icon: CheckCircle },
  "Wrong Answer":     { color: "var(--state-warn)",    Icon: XCircle },
  "Runtime Error":    { color: "var(--state-error)",   Icon: XCircle },
  "Compilation Error":{ color: "var(--state-error)",   Icon: AlertTriangle },
  "Time Limit Exceeded":{ color: "var(--state-warn)", Icon: AlertTriangle },
  "Internal Error":   { color: "var(--state-error)",   Icon: AlertTriangle },
};

const POLL_INTERVAL_MS = 800;
const MAX_POLLS = 30; // 24-second max wait

export default function WorkspacePage() {
  const [langIdx, setLangIdx] = useState(0);
  const [code, setCode]       = useState(LANGUAGES[0].starter);
  const [output, setOutput]   = useState(null);
  const [running, setRunning] = useState(false);
  const [phase, setPhase]     = useState("idle"); // idle | pending | processing | done
  const [showLangMenu, setShowLangMenu] = useState(false);
  const pollRef = useRef(null);
  const pollCount = useRef(0);

  const lang = LANGUAGES[langIdx];

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    pollCount.current = 0;
  }

  async function runCode() {
    if (running) return;
    setRunning(true);
    setPhase("pending");
    setOutput(null);
    stopPolling();

    /* ── Step 1: POST to Python API (middleman) → enqueue job ── */
    let jobId;
    try {
      const res = await fetch(apiUrl("/api/v1/judge/submissions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: code, language_id: lang.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Submission failed");
      jobId = data.job_id;
    } catch (err) {
      setOutput({ error: err.message, verdict: "Internal Error" });
      setPhase("done");
      setRunning(false);
      return;
    }

    /* ── Step 2: Poll GET through Python API until job completes ── */
    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > MAX_POLLS) {
        stopPolling();
        setOutput({ error: "Timed out waiting for result.", verdict: "Time Limit Exceeded" });
        setPhase("done");
        setRunning(false);
        return;
      }

      try {
        const res = await fetch(apiUrl(`/api/v1/judge/submissions/${jobId}`));
        const data = await res.json();

        if (data.status === "processing") { setPhase("processing"); return; }
        if (data.status === "completed") {
          stopPolling();
          setOutput(data);
          setPhase("done");
          setRunning(false);
        }
      } catch {
        // transient error — keep polling
      }
    }, POLL_INTERVAL_MS);
  }

  function handleLangChange(idx) {
    setLangIdx(idx);
    setCode(LANGUAGES[idx].starter);
    setOutput(null);
    setPhase("idle");
    setShowLangMenu(false);
  }

  function handleTabKey(e) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const { selectionStart: s, selectionEnd: en } = e.target;
    const next = code.slice(0, s) + "  " + code.slice(en);
    setCode(next);
    requestAnimationFrame(() => {
      e.target.selectionStart = e.target.selectionEnd = s + 2;
    });
  }

  const verdict = output?.verdict;
  const vm = VERDICT_META[verdict] ?? {};

  return (
    <div className="ws-root">
      {/* ── Toolbar ── */}
      <div className="ws-toolbar">
        <div className="ws-toolbar-left">
          {/* Language selector */}
          <div className="ws-lang-select" onClick={() => setShowLangMenu(v => !v)}>
            <span className="ws-lang-dot" data-lang={lang.mono} />
            <span className="ws-lang-name">{lang.name}</span>
            <ChevronDown size={14} />
            {showLangMenu && (
              <div className="ws-lang-menu">
                {LANGUAGES.map((l, i) => (
                  <button
                    key={l.id}
                    className={`ws-lang-option${i === langIdx ? " active" : ""}`}
                    onClick={e => { e.stopPropagation(); handleLangChange(i); }}
                  >
                    <span className="ws-lang-dot" data-lang={l.mono} />
                    {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ws-toolbar-right">
          {running && (
            <span className="ws-phase-badge">
              {phase === "pending" && <><Loader2 size={12} className="ws-spin" /> Queuing…</>}
              {phase === "processing" && <><Loader2 size={12} className="ws-spin" /> Running…</>}
            </span>
          )}
          <button className="btn btn-brand ws-run-btn" onClick={runCode} disabled={running}>
            {running ? <Square size={14} /> : <Play size={14} />}
            {running ? "Running" : "Run Code"}
          </button>
        </div>
      </div>

      {/* ── Editor + Output Split ── */}
      <div className="ws-body">
        {/* Editor panel */}
        <div className="ws-editor-panel">
          <div className="ws-panel-header">
            <span>Editor</span>
            <span className="ws-filename">solution.{lang.ext}</span>
          </div>
          <div className="ws-editor-wrap">
            {/* Line numbers */}
            <div className="ws-line-nums" aria-hidden="true">
              {code.split("\n").map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <textarea
              className="ws-editor"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={handleTabKey}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>

        {/* Output panel */}
        <div className="ws-output-panel">
          <div className="ws-panel-header">
            <Terminal size={14} />
            <span>Output</span>
            {verdict && vm.Icon && (
              <span className="ws-verdict" style={{ color: vm.color }}>
                <vm.Icon size={13} /> {verdict}
              </span>
            )}
          </div>

          <div className="ws-output-body">
            {phase === "idle" && !output && (
              <p className="ws-placeholder">Click <strong>Run Code</strong> to execute your program.</p>
            )}

            {(phase === "pending" || phase === "processing") && (
              <div className="ws-running-state">
                <Loader2 size={28} className="ws-spin-lg" />
                <p>{phase === "pending" ? "Job queued — waiting for executor…" : "Executing code in sandbox…"}</p>
              </div>
            )}

            {phase === "done" && output && (
              <>
                {/* stdout */}
                {output.output && (
                  <pre className="ws-output-pre ws-stdout">{output.output}</pre>
                )}

                {/* stderr / error */}
                {(output.error || (!output.output && !output.error)) && (
                  <pre className="ws-output-pre ws-stderr">
                    {output.error ?? "No output produced."}
                  </pre>
                )}

                {/* Metadata row */}
                {output.time && (
                  <div className="ws-meta-row">
                    <span><Clock size={12} /> {output.time}s</span>
                    {output.memory && <span><Cpu size={12} /> {(output.memory / 1024).toFixed(1)} MB</span>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
