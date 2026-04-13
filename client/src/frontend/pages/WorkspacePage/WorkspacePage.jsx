import DOMPurify from "dompurify";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Play, Square, ChevronLeft, ChevronRight, Loader2, Terminal,
  CheckCircle, XCircle, AlertTriangle, Clock, Cpu, Send,
  BookOpen, List, ArrowLeft,
} from "lucide-react";
import { apiUrl } from "../../../shared/api.js";
import { getExerciseWorkspace } from "../../../shared/learningApi.js";
import { APP_ROUTES } from "../../../routes/paths.js";
import "./WorkspacePage.css";

/* ── Language helpers ──────────────────────────────────────────────────── */
const LANG_MAP = {
  71:  { name: "Python",     ext: "py",   mono: "python",     icon: "🐍", starter: '# Write code below 💖\n' },
  63:  { name: "JavaScript", ext: "js",   mono: "javascript",  icon: "⚡", starter: '// Write code below 💖\n' },
  62:  { name: "Java",       ext: "java", mono: "java",        icon: "☕", starter: '// Write code below 💖\n' },
  54:  { name: "C++",        ext: "cpp",  mono: "cpp",         icon: "⚙️", starter: '// Write code below 💖\n' },
  50:  { name: "C",          ext: "c",    mono: "c",           icon: "🔧", starter: '// Write code below 💖\n' },
  60:  { name: "Go",         ext: "go",   mono: "go",          icon: "🐹", starter: '// Write code below 💖\n' },
  73:  { name: "Rust",       ext: "rs",   mono: "rust",        icon: "🦀", starter: '// Write code below 💖\n' },
  74:  { name: "TypeScript", ext: "ts",   mono: "typescript",  icon: "🔷", starter: '// Write code below 💖\n' },
};
const DEFAULT_LANG = LANG_MAP[71];

function getLangInfo(languageId) {
  return LANG_MAP[languageId] || DEFAULT_LANG;
}

/* ── File icon component ───────────────────────────────────────────────── */
function FileIcon({ ext }) {
  const iconMap = {
    py: "🐍", js: "⚡", ts: "🔷", java: "☕",
    cpp: "⚙️", c: "🔧", go: "🐹", rs: "🦀",
  };
  return <span className="ws-file-icon">{iconMap[ext] || "📄"}</span>;
}

/* ── Verdict helpers ───────────────────────────────────────────────────── */
const VERDICT_META = {
  Accepted:             { color: "#10b981", Icon: CheckCircle },
  "Wrong Answer":       { color: "#f59e0b", Icon: XCircle },
  "Runtime Error":      { color: "#ef4444", Icon: XCircle },
  "Compilation Error":  { color: "#ef4444", Icon: AlertTriangle },
  "Time Limit Exceeded":{ color: "#f59e0b", Icon: AlertTriangle },
  "Internal Error":     { color: "#ef4444", Icon: AlertTriangle },
};

const POLL_INTERVAL_MS = 800;
const MAX_POLLS = 30;

/* ── Parse starter code from task ──────────────────────────────────────── */
function parseStarterCode(task, langInfo) {
  if (!task?.starter_code) return { filename: `script.${langInfo.ext}`, content: langInfo.starter };
  
  try {
    const files = JSON.parse(task.starter_code);
    if (Array.isArray(files) && files.length > 0) {
      const mainFile = files.find(f => f.is_main) || files[0];
      return { filename: mainFile.filename, content: mainFile.content || "" };
    }
  } catch {
    // starter_code is plain text, not JSON
    return { filename: `script.${langInfo.ext}`, content: task.starter_code };
  }
  return { filename: `script.${langInfo.ext}`, content: langInfo.starter };
}

/* ── Detect judge language ID from file extension ──────────────────────── */
function detectJudgeLangId(filename, trackLangId) {
  const extMap = { ".py": 71, ".js": 63, ".ts": 74, ".java": 62, ".cpp": 54, ".c": 50, ".go": 60, ".rs": 73 };
  const ext = Object.keys(extMap).find(e => filename.endsWith(e));
  return ext ? extMap[ext] : (trackLangId || 71);
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
export default function WorkspacePage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();

  /* ── Data state ── */
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ── Editor state ── */
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("script.py");

  /* ── Execution state ── */
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("idle");
  const pollRef = useRef(null);
  const pollCount = useRef(0);

  /* ── UI state ── */
  const [tocOpen, setTocOpen] = useState(false);

  /* ── Load exercise data ── */
  useEffect(() => {
    let disposed = false;
    async function load() {
      if (!exerciseId) { setLoading(false); setError("Missing exercise id."); return; }
      setLoading(true);
      setError("");
      setOutput(null);
      setPhase("idle");
      try {
        const payload = await getExerciseWorkspace(exerciseId);
        if (!disposed) {
          setData(payload);
          const langInfo = getLangInfo(payload.language_id);
          const task = payload.tasks?.[0];
          const parsed = parseStarterCode(task, langInfo);
          setFilename(parsed.filename);
          setCode(parsed.content);
        }
      } catch (err) {
        if (!disposed) setError(err.message || "Unable to load workspace.");
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    load();
    return () => { disposed = true; };
  }, [exerciseId]);

  /* ── Derived values ── */
  const langInfo = useMemo(() => data ? getLangInfo(data.language_id) : DEFAULT_LANG, [data]);
  const currentIndex = useMemo(() => {
    if (!data) return 0;
    const idx = data.exercises_in_section.findIndex(e => e.id === data.id);
    return idx >= 0 ? idx : 0;
  }, [data]);
  const totalExercises = data?.total_exercises_in_section || 0;
  const progress = totalExercises > 0 ? Math.round(((currentIndex + 1) / totalExercises) * 100) : 0;
  const prevExercise = data?.exercises_in_section?.[currentIndex - 1] || null;
  const nextExercise = data?.exercises_in_section?.[currentIndex + 1] || null;

  /* ── Code execution ── */
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

    const langId = detectJudgeLangId(filename, data?.language_id);
    let jobId;
    try {
      const res = await fetch(apiUrl("/api/v1/judge/submissions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: code, language_id: langId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail ?? "Submission failed");
      jobId = d.job_id;
    } catch (err) {
      setOutput({ error: err.message, verdict: "Internal Error" });
      setPhase("done");
      setRunning(false);
      return;
    }

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
        const d = await res.json();
        if (d.status === "processing") { setPhase("processing"); return; }
        if (d.status === "completed") {
          stopPolling();
          setOutput(d);
          setPhase("done");
          setRunning(false);
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL_MS);
  }

  function handleSubmit() {
    runCode(); // For now, submit = run. Can be extended with judge evaluation later.
  }

  /* ── Tab key in editor ── */
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

  /* ── Navigation ── */
  function goToExercise(id) {
    if (!id) return;
    navigate(APP_ROUTES.frontendExerciseWorkspace(id));
  }

  /* ── Verdict display ── */
  const verdict = output?.verdict;
  const vm = VERDICT_META[verdict] ?? {};

  /* ══ LOADING STATE ══ */
  if (loading) {
    return (
      <div className="ws-root ws-loading-screen">
        <Loader2 size={32} className="ws-spin" />
        <p>Loading workspace…</p>
      </div>
    );
  }

  /* ══ ERROR STATE ══ */
  if (error || !data) {
    return (
      <div className="ws-root ws-error-screen">
        <p>{error || "Exercise not found."}</p>
        <button className="ws-back-link" onClick={() => navigate(APP_ROUTES.frontendTracks)}>
          <ArrowLeft size={14} /> Back to Tracks
        </button>
      </div>
    );
  }

  const fileExt = filename.split(".").pop() || langInfo.ext;

  return (
    <div className="ws-root">
      {/* ═══════════ TOP HEADER BAR ═══════════ */}
      <header className="ws-header">
        <div className="ws-header-left">
          <button className="ws-header-back" onClick={() => navigate(APP_ROUTES.frontendTracks)} title="Back to tracks">
            <ArrowLeft size={16} />
          </button>
          <div className="ws-header-breadcrumb">
            <span className="ws-header-track">{data.track_title}</span>
            <ChevronRight size={12} className="ws-header-sep" />
            <span className="ws-header-section">{data.section_title}</span>
          </div>
        </div>

        <div className="ws-header-center">
          <div className="ws-progress-bar">
            <div className="ws-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="ws-progress-text">{progress}%</span>
        </div>

        <div className="ws-header-right">
          <span className="ws-header-exercise-badge">
            Exercise {currentIndex + 1}/{totalExercises}
          </span>
        </div>
      </header>

      {/* ═══════════ MAIN BODY ═══════════ */}
      <div className="ws-body">

        {/* ─── LEFT PANEL: Theory + Table of Contents ─── */}
        <div className="ws-left-panel">
          <div className="ws-left-scrollable">
            {/* Exercise Label */}
            <div className="ws-exercise-label">Exercise</div>

            {/* Exercise Title */}
            <h1 className="ws-exercise-title">
              {String(currentIndex + 1).padStart(2, "0")}. {data.title}
            </h1>

            {/* Theory Content */}
            {data.theory_content && (
              <div
                className="ws-theory-content"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.theory_content) }}
              />
            )}

            {/* If no theory_content, show task instructions instead */}
            {!data.theory_content && data.tasks?.[0]?.instructions_md && (
              <div
                className="ws-theory-content"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.tasks[0].instructions_md) }}
              />
            )}
          </div>

          {/* Table of Contents Toggle */}
          <div className="ws-toc-section">
            <button
              className="ws-toc-toggle"
              onClick={() => setTocOpen(v => !v)}
            >
              <List size={14} />
              <span>Table of Contents</span>
              <ChevronRight size={14} className={`ws-toc-chevron ${tocOpen ? "is-open" : ""}`} />
            </button>

            {tocOpen && (
              <div className="ws-toc-list">
                {data.exercises_in_section.map((ex, idx) => (
                  <button
                    key={ex.id}
                    className={`ws-toc-item ${ex.id === data.id ? "is-active" : ""}`}
                    onClick={() => goToExercise(ex.id)}
                  >
                    <span className="ws-toc-num">{String(idx + 1).padStart(2, "0")}</span>
                    <span className="ws-toc-name">{ex.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL: Code Editor + Terminal ─── */}
        <div className="ws-right-panel">
          {/* File Tab */}
          <div className="ws-file-tabs">
            <div className="ws-file-tab is-active">
              <FileIcon ext={fileExt} />
              <span>{filename}</span>
            </div>
          </div>

          {/* Code Editor */}
          <div className="ws-editor-area">
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

          {/* Editor Toolbar */}
          <div className="ws-editor-toolbar">
            <div className="ws-toolbar-icons">
              {/* Decorative icons like in Codédex */}
              <span className="ws-deco-icon" title="Chat">💬</span>
              <span className="ws-deco-icon" title="Screenshot">📸</span>
              <span className="ws-deco-icon" title="Hint">💡</span>
              <span className="ws-deco-icon" title="Help">🤖</span>
              <span className="ws-deco-icon" title="Share">🎨</span>
            </div>
            <div className="ws-toolbar-actions">
              <button
                className="ws-run-btn"
                onClick={runCode}
                disabled={running}
              >
                {running ? <Square size={13} /> : <Play size={13} />}
                {running ? "Running" : "Run"}
              </button>
              <button
                className="ws-submit-btn"
                onClick={handleSubmit}
                disabled={running}
              >
                <Send size={13} />
                Submit answer
              </button>
            </div>
          </div>

          {/* Terminal */}
          <div className="ws-terminal">
            <div className="ws-terminal-header">
              <Terminal size={13} />
              <span>Terminal</span>
              {verdict && vm.Icon && (
                <span className="ws-terminal-verdict" style={{ color: vm.color }}>
                  <vm.Icon size={12} /> {verdict}
                </span>
              )}
            </div>
            <div className="ws-terminal-body">
              {phase === "idle" && !output && (
                <div className="ws-terminal-placeholder">
                  <div className="ws-terminal-placeholder-icon">✦</div>
                  <p>Click <strong>Run</strong> to view your results</p>
                </div>
              )}

              {(phase === "pending" || phase === "processing") && (
                <div className="ws-terminal-running">
                  <Loader2 size={20} className="ws-spin" />
                  <p>{phase === "pending" ? "Queuing job…" : "Executing…"}</p>
                </div>
              )}

              {phase === "done" && output && (
                <div className="ws-terminal-result">
                  {output.output && (
                    <pre className="ws-terminal-stdout">{output.output}</pre>
                  )}
                  {(output.error || (!output.output && !output.error)) && (
                    <pre className="ws-terminal-stderr">
                      {output.error ?? "No output produced."}
                    </pre>
                  )}
                  {output.time && (
                    <div className="ws-terminal-meta">
                      <span><Clock size={11} /> {output.time}s</span>
                      {output.memory && <span><Cpu size={11} /> {(output.memory / 1024).toFixed(1)} MB</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ BOTTOM FOOTER BAR ═══════════ */}
      <footer className="ws-footer">
        <div className="ws-footer-left">
          <span className="ws-footer-level">{data.section_title}</span>
          <span className="ws-footer-exercise-info">
            Exercise {currentIndex + 1} / {totalExercises}
          </span>
          <span className="ws-footer-xp">10 XP</span>
        </div>
        <div className="ws-footer-right">
          <button
            className="ws-nav-btn ws-nav-back"
            onClick={() => goToExercise(prevExercise?.id)}
            disabled={!prevExercise}
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <button
            className="ws-nav-btn ws-nav-next"
            onClick={() => goToExercise(nextExercise?.id)}
            disabled={!nextExercise}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
}
