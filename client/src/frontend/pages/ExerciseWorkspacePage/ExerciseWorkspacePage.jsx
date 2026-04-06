import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  Code2,
  Layers,
  Loader2,
  Rocket,
} from "lucide-react";
import { APP_ROUTES } from "../../../routes/paths.js";
import { getExerciseForLearner } from "../../../shared/learningApi.js";
import { isExerciseCompleted, setExerciseCompletion } from "../../../shared/learningProgress.js";
import "./ExerciseWorkspacePage.css";

const FALLBACK_LEVELS = [
  {
    key: "L1",
    title: "Level 1",
    subtitle: "Warm-up",
    prompt:
      "Read the scenario and identify the key condition check. Then write one small condition using if/else.",
    starterCode: "# Start here\nnumber = 10\n",
  },
  {
    key: "L2",
    title: "Level 2",
    subtitle: "Core Logic",
    prompt:
      "Implement the complete decision flow and ensure each branch returns the expected result.",
    starterCode: "def solve(value):\n    # Add decision branches\n    pass\n",
  },
  {
    key: "L3",
    title: "Level 3",
    subtitle: "Edge Cases",
    prompt:
      "Handle boundary values and invalid input. Keep the behavior deterministic for all edge paths.",
    starterCode: "# Add edge-case handling\n",
  },
  {
    key: "L4",
    title: "Level 4",
    subtitle: "Refinement",
    prompt:
      "Refactor your implementation for readability and explain why your final logic is stable.",
    starterCode: "# Clean final solution\n",
  },
];

function normalizePrompt(value) {
  return (value ?? "").replace(/\r\n/g, "\n").trim();
}

export default function ExerciseWorkspacePage() {
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  const location = useLocation();

  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeLevelIndex, setActiveLevelIndex] = useState(0);
  const [exerciseCompleted, setExerciseCompletedState] = useState(false);

  useEffect(() => {
    const numericExerciseId = Number(exerciseId);
    setExerciseCompletedState(isExerciseCompleted(numericExerciseId));
  }, [exerciseId]);

  useEffect(() => {
    let disposed = false;

    async function loadExercise() {
      if (!exerciseId) {
        setLoading(false);
        setError("Missing exercise id.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const payload = await getExerciseForLearner(exerciseId);
        if (!disposed) {
          setExercise(payload);
        }
      } catch (err) {
        if (!disposed) {
          setError(err.message || "Unable to load exercise details.");
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    loadExercise();

    return () => {
      disposed = true;
    };
  }, [exerciseId]);

  const levels = useMemo(() => {
    const orderedTasks = (exercise?.tasks ?? [])
      .slice()
      .sort((a, b) => Number(a.step_number ?? 0) - Number(b.step_number ?? 0));

    if (orderedTasks.length === 0) {
      return FALLBACK_LEVELS;
    }

    return orderedTasks.map((task, index) => ({
      key: String(task.id ?? index + 1),
      title: `Level ${index + 1}`,
      subtitle: `Step ${task.step_number ?? index + 1}`,
      prompt:
        normalizePrompt(task.instructions_md) ||
        "Implement this challenge level based on the exercise requirements.",
      starterCode: task.starter_code ?? "",
    }));
  }, [exercise]);

  useEffect(() => {
    if (activeLevelIndex > levels.length - 1) {
      setActiveLevelIndex(0);
    }
  }, [activeLevelIndex, levels.length]);

  const activeLevel = levels[activeLevelIndex] ?? null;
  const progress = levels.length > 0
    ? Math.round(((activeLevelIndex + 1) / levels.length) * 100)
    : 0;

  const stateTrackTitle = location.state?.trackTitle;
  const stateSectionTitle = location.state?.sectionTitle;
  const stateExerciseTitle = location.state?.exerciseTitle;

  const trackTitle = stateTrackTitle || "Track";
  const sectionTitle = stateSectionTitle || "Section";
  const exerciseTitle = stateExerciseTitle || exercise?.title || `Exercise ${exerciseId}`;

  function goPrevious() {
    setActiveLevelIndex((prev) => Math.max(0, prev - 1));
  }

  function goNext() {
    setActiveLevelIndex((prev) => Math.min(levels.length - 1, prev + 1));
  }

  function toggleExerciseCompletion() {
    const numericExerciseId = Number(exerciseId);
    if (!Number.isInteger(numericExerciseId) || numericExerciseId <= 0) {
      return;
    }

    const nextValue = !exerciseCompleted;
    setExerciseCompletion(numericExerciseId, nextValue);
    setExerciseCompletedState(nextValue);
  }

  return (
    <div className="exerciseWorkspacePage">
      <div className="container">
        <header className="exerciseWorkspacePage__header">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(APP_ROUTES.frontendTracks)}
          >
            <ArrowLeft size={14} /> Back to Tracks
          </button>

          <p className="exerciseWorkspacePage__eyebrow">Exercise Workspace</p>
          <h1>{exerciseTitle}</h1>

          <p className="exerciseWorkspacePage__trail">
            {trackTitle}
            <ChevronRight size={14} />
            {sectionTitle}
            <ChevronRight size={14} />
            {exerciseTitle}
          </p>
        </header>

        {loading && (
          <div className="exerciseWorkspacePage__status" role="status">
            <Loader2 size={18} className="exerciseWorkspacePage__spin" />
            Loading workspace...
          </div>
        )}

        {!loading && error && (
          <div className="exerciseWorkspacePage__status exerciseWorkspacePage__status--error" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && activeLevel && (
          <div className="exerciseWorkspacePage__layout">
            <aside className="exerciseWorkspacePage__levels" aria-label="Exercise levels">
              <div className="exerciseWorkspacePage__levelsHead">
                <h2>
                  <Layers size={16} /> Levels
                </h2>
                <span>{levels.length}</span>
              </div>

              <ul>
                {levels.map((level, index) => {
                  const isActive = index === activeLevelIndex;
                  const isCompleted = index < activeLevelIndex;

                  return (
                    <li key={level.key}>
                      <button
                        type="button"
                        className={`exerciseWorkspacePage__levelButton${isActive ? " is-active" : ""}`}
                        onClick={() => setActiveLevelIndex(index)}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={16} className="exerciseWorkspacePage__levelIcon" />
                        ) : (
                          <Circle size={16} className="exerciseWorkspacePage__levelIcon" />
                        )}

                        <div>
                          <strong>{level.title}</strong>
                          <span>{level.subtitle}</span>
                        </div>

                        <ChevronRight size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section className="exerciseWorkspacePage__content">
              <div className="exerciseWorkspacePage__progressCard">
                <div>
                  <span className="exerciseWorkspacePage__progressLabel">
                    Level {activeLevelIndex + 1} of {levels.length}
                  </span>
                  <strong>{progress}% complete</strong>
                </div>
                <button
                  type="button"
                  className={`exerciseWorkspacePage__completionToggle ${exerciseCompleted ? "is-complete" : ""}`}
                  onClick={toggleExerciseCompletion}
                >
                  {exerciseCompleted ? "Completed" : "Mark Complete"}
                </button>
                <div className="exerciseWorkspacePage__progressTrack" aria-hidden="true">
                  <div style={{ width: `${progress}%` }} />
                </div>
              </div>

              <article className="exerciseWorkspacePage__promptCard">
                <div className="exerciseWorkspacePage__promptHeader">
                  <div>
                    <p>Current challenge</p>
                    <h2>{activeLevel.title}</h2>
                  </div>
                  <span className="exerciseWorkspacePage__subtitle">{activeLevel.subtitle}</span>
                </div>

                <section className="exerciseWorkspacePage__block">
                  <h3>
                    <Rocket size={15} /> Prompt
                  </h3>
                  <p>{activeLevel.prompt}</p>
                </section>

                <section className="exerciseWorkspacePage__block">
                  <h3>
                    <Code2 size={15} /> Starter code
                  </h3>
                  <pre>
                    {activeLevel.starterCode || "// Starter code for this level will be provided here."}
                  </pre>
                </section>

                <div className="exerciseWorkspacePage__actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={goPrevious}
                    disabled={activeLevelIndex === 0}
                  >
                    Previous Level
                  </button>

                  <button
                    type="button"
                    className="btn btn-brand"
                    onClick={goNext}
                    disabled={activeLevelIndex >= levels.length - 1}
                  >
                    Next Level
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => navigate(APP_ROUTES.frontendWorkspace)}
                  >
                    Open IDE Sandbox
                  </button>
                </div>

                <p className="exerciseWorkspacePage__note">
                  This is a clean dummy workspace shell. We can design the full coding and evaluation flow next.
                </p>
              </article>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
