import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, LayoutList, ChevronDown, LockKeyhole, CheckCircle2, Play, RotateCcw, MessageCircle } from "lucide-react";
import { getTrackTree } from "../../../shared/learningApi.js";
import { getCompletedExerciseIds } from "../../../shared/learningProgress.js";
import { APP_ROUTES } from "../../../routes/paths.js";
import trackHeroImage from "../../../assets/track_hero.jpg";
import "./TrackOverviewPage.css";

const TRACK_IMAGE_FALLBACK = trackHeroImage;

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export default function TrackOverviewPage() {
  const { trackSlug } = useParams();
  const navigate = useNavigate();

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSections, setExpandedSections] = useState({});
  const [completedExerciseIds, setCompletedExerciseIds] = useState(() => getCompletedExerciseIds());
  const sectionRefs = useRef({});

  useEffect(() => {
    let disposed = false;

    async function fetchData() {
      try {
        const payload = await getTrackTree();
        if (!disposed) {
          setTracks(payload || []);
        }
      } catch (err) {
        if (!disposed) {
          setError(err.message || "Failed to load curriculum data.");
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    function refreshProgress() {
      setCompletedExerciseIds(getCompletedExerciseIds());
    }

    window.addEventListener("focus", refreshProgress);
    return () => {
      window.removeEventListener("focus", refreshProgress);
    };
  }, []);

  const track = useMemo(() => {
    if (!tracks.length) return null;
    return tracks.find((t) => slugify(t.title) === trackSlug);
  }, [tracks, trackSlug]);

  // Precompute stats
  const stats = useMemo(() => {
    if (!track) return { totalTime: 0, completedExercises: 0, totalExercises: 0 };

    let totalExercises = 0;
    let completedExercises = 0;

    for (const section of track.sections || []) {
      for (const exercise of section.exercises || []) {
        totalExercises += 1;
        if (completedExerciseIds.includes(Number(exercise.id))) {
          completedExercises += 1;
        }
      }
    }
    
    // Calculate estimated length (approx 20 minutes per exercise)
    const estimatedMinutes = totalExercises * 20;
    const totalTimeHours = Math.floor(estimatedMinutes / 60);
    const totalTimeMins = estimatedMinutes % 60;
    
    let timeString = "";
    if (totalTimeHours > 0) {
      timeString += `${totalTimeHours}h `;
    }
    if (totalTimeMins > 0 || totalTimeHours === 0) {
      timeString += `${totalTimeMins}m`;
    }

    const progressPercent = totalExercises > 0 
      ? Math.round((completedExercises / totalExercises) * 100) 
      : 0;

    const isComplete = progressPercent >= 100;

    return {
      totalTime: timeString.trim(),
      completedExercises,
      totalExercises,
      progressPercent,
      isComplete
    };
  }, [track, completedExerciseIds]);

  const exerciseStatusMap = useMemo(() => {
    if (!track) return {};
    const map = {};
    let isLocked = false;

    for (const section of track.sections || []) {
      for (const exercise of section.exercises || []) {
        const isCompleted = completedExerciseIds.includes(Number(exercise.id));
        map[exercise.id] = { isLocked, isCompleted };
        
        // If this exercise is not completed, lock all subsequent exercises
        if (!isCompleted) {
          isLocked = true;
        }
      }
    }
    return map;
  }, [track, completedExerciseIds]);

  const firstExerciseMeta = useMemo(() => {
    if (!track) return null;
    for (const section of track.sections || []) {
      if (section.exercises && section.exercises.length > 0) {
        return {
          sectionTitle: section.title,
          exerciseId: section.exercises[0].id,
          exerciseTitle: section.exercises[0].title
        };
      }
    }
    return null;
  }, [track]);

  function handleStartLearning() {
    if (!firstExerciseMeta) return;

    navigate(APP_ROUTES.frontendExerciseWorkspace(
      trackSlug,
      slugify(firstExerciseMeta.sectionTitle),
      slugify(firstExerciseMeta.exerciseTitle),
      firstExerciseMeta.exerciseId
    ), {
      state: {
        trackTitle: track.title,
        sectionTitle: firstExerciseMeta.sectionTitle,
        exerciseTitle: firstExerciseMeta.exerciseTitle,
      },
    });
  }

  function handleGoToExercise(exerciseId, sectionTitle, exerciseTitle) {
    if (!exerciseId) return;
    
    navigate(APP_ROUTES.frontendExerciseWorkspace(
      trackSlug,
      slugify(sectionTitle),
      slugify(exerciseTitle),
      exerciseId
    ), {
      state: {
        trackTitle: track.title,
        sectionTitle,
        exerciseTitle,
      },
    });
  }

  function scrollSectionIntoView(sectionId) {
    const sectionNode = sectionRefs.current[sectionId];
    if (!sectionNode) return;

    window.requestAnimationFrame(() => {
      sectionNode.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function toggleSection(sectionId) {
    const currentlyExpanded = expandedSections[sectionId] !== false;
    const nextExpanded = !currentlyExpanded;

    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: nextExpanded,
    }));

    if (nextExpanded) {
      scrollSectionIntoView(sectionId);
    }
  }

  // Determine chapter node state
  function getChapterState(section) {
    const exercises = section.exercises || [];
    if (exercises.length === 0) return "default";

    const completedCount = exercises.filter((ex) =>
      completedExerciseIds.includes(Number(ex.id))
    ).length;

    if (completedCount >= exercises.length) return "completed";
    if (completedCount > 0) return "progress";
    return "default";
  }

  if (loading) {
    return (
      <div className="trackOverviewPage trackOverviewPage--loading">
        <div className="container">
          <p>Loading track overview...</p>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="trackOverviewPage trackOverviewPage--error">
        <div className="container">
          <p>{error || "Track not found."}</p>
          <button className="btn btn-ghost" onClick={() => navigate(APP_ROUTES.frontendTracks)}>
            Back to Tracks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="trackOverviewPage">
      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <section 
        className="trackOverviewPage__hero"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(2,6,23,0.55), rgba(7,89,133,0.45)), url(${track.featured_image_url || TRACK_IMAGE_FALLBACK})`
        }}
      >
        <div className="container">
          <div className="trackOverviewPage__heroContent">
            <h1>{track.title}</h1>
            <p className="trackOverviewPage__description">
              {track.description || "Learn programming fundamentals with this comprehensive course."}
            </p>

            <button 
              className="trackOverviewPage__cta" 
              onClick={handleStartLearning}
              disabled={!firstExerciseMeta}
            >
              {stats.completedExercises > 0 ? "Continue Learning" : "Start Learning for Free"}
            </button>

            <div className="trackOverviewPage__meta">
              <span><Clock size={14} /> {stats.totalTime}</span>
              <span><LayoutList size={14} /> {stats.totalExercises} exercises</span>
              <span>{stats.progressPercent}% complete</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <section className="trackOverviewPage__main">
        {/* Left — Curriculum Timeline */}
        <div className="trackOverviewPage__curriculum">
          {track.sections && track.sections.length > 0 ? (
            <div className="trackOverviewPage__timeline">
              {track.sections.map((section, index) => {
                const isExpanded = expandedSections[section.id] !== false;
                const chapterState = getChapterState(section);
                const totalExercises = section.exercises?.length || 0;
                const completedInSection = (section.exercises || []).filter((exercise) =>
                  completedExerciseIds.includes(Number(exercise.id))
                ).length;
                const sectionProgress = totalExercises > 0
                  ? Math.round((completedInSection / totalExercises) * 100)
                  : 0;

                return (
                  <div
                    key={section.id}
                    ref={(node) => {
                      if (node) {
                        sectionRefs.current[section.id] = node;
                      }
                    }}
                    className="trackOverviewPage__chapter"
                    style={{ "--chapter-index": index }}
                  >
                    {/* Timeline node */}
                    <div className={`trackOverviewPage__chapterNode trackOverviewPage__chapterNode--${chapterState}`}>
                      {chapterState === "completed" ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Chapter header */}
                    <button
                      className={`trackOverviewPage__chapterHeader ${isExpanded ? "is-expanded" : ""}`}
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`chapter-panel-${section.id}`}
                      id={`chapter-btn-${section.id}`}
                    >
                      <div className="trackOverviewPage__chapterTitleGroup">
                        <h3 className="trackOverviewPage__chapterTitle">{section.title}</h3>
                        <div className="trackOverviewPage__chapterMeta">
                          <span>{totalExercises} {totalExercises === 1 ? "exercise" : "exercises"}</span>
                          {completedInSection > 0 && (
                            <span className={`progress-label ${sectionProgress >= 100 ? "is-complete" : ""}`}>
                              {completedInSection}/{totalExercises} done
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="trackOverviewPage__chapterRight">
                        {/* Mini progress bar */}
                        <div className="trackOverviewPage__chapterProgressBar">
                          <div
                            className={`trackOverviewPage__chapterProgressFill ${sectionProgress >= 100 ? "is-complete" : ""}`}
                            style={{ width: `${sectionProgress}%` }}
                          />
                        </div>
                        <ChevronDown
                          size={18}
                          className={`trackOverviewPage__chapterChevron ${isExpanded ? "is-open" : ""}`}
                        />
                      </div>
                    </button>

                    {/* Exercise panel */}
                    <div
                      className={`trackOverviewPage__exercisePanel ${isExpanded ? "is-expanded" : ""}`}
                      id={`chapter-panel-${section.id}`}
                      role="region"
                      aria-labelledby={`chapter-btn-${section.id}`}
                    >
                      <div className="trackOverviewPage__exercisePanelInner">
                        {totalExercises > 0 ? (
                          <div className="trackOverviewPage__exerciseList">
                            {section.exercises.map((exercise, idx) => {
                              const status = exerciseStatusMap[exercise.id] || { isLocked: false, isCompleted: false };
                              const { isLocked, isCompleted } = status;

                              return (
                                <div
                                  key={exercise.id}
                                  className={`trackOverviewPage__exerciseCard ${isCompleted ? "is-completed" : ""} ${isLocked ? "is-locked" : ""}`}
                                  style={{ "--ex-index": idx }}
                                  onClick={() => {
                                    if (!isLocked) {
                                      handleGoToExercise(exercise.id, section.title, exercise.title);
                                    }
                                  }}
                                >
                                  <div className="trackOverviewPage__exerciseCardLeft">
                                    <div className={`trackOverviewPage__exerciseIndex trackOverviewPage__exerciseIndex--${isCompleted ? "done" : (isLocked ? "locked" : "pending")}`}>
                                      {isCompleted ? <CheckCircle2 size={14} /> : (isLocked ? <LockKeyhole size={14} /> : idx + 1)}
                                    </div>

                                    <div className="trackOverviewPage__exerciseInfo">
                                      <span className="trackOverviewPage__exerciseLabel">
                                        Exercise {idx + 1}
                                      </span>
                                      <span className="trackOverviewPage__exerciseName">
                                        {exercise.title}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    className={`trackOverviewPage__exerciseBadge trackOverviewPage__exerciseBadge--${isCompleted ? "review" : (isLocked ? "locked" : "start")}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isLocked) {
                                        handleGoToExercise(exercise.id, section.title, exercise.title);
                                      }
                                    }}
                                    disabled={isLocked}
                                  >
                                    {isCompleted ? (
                                      <><RotateCcw size={12} /> Review</>
                                    ) : isLocked ? (
                                      <><LockKeyhole size={12} /> Locked</>
                                    ) : (
                                      <><Play size={12} /> Start</>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="trackOverviewPage__emptyBox">No exercises linked yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="trackOverviewPage__emptyBox">No sections published for this track yet.</div>
          )}
        </div>

        {/* ═══════════════════ RIGHT SIDEBAR ═══════════════════ */}
        <aside className="trackOverviewPage__sidebar">
          {/* Progress Widget */}
          <div className="trackOverviewPage__widget">
            <h4 className="trackOverviewPage__widgetTitle">Course Progress</h4>

            <div className="trackOverviewPage__donutWrap">
              <div
                className={`trackOverviewPage__donut ${stats.isComplete ? "is-complete" : ""}`}
                style={{ "--donut-value": `${stats.progressPercent}%` }}
              >
                <div className="trackOverviewPage__donutInner">
                  <span className="trackOverviewPage__donutPercent">
                    {stats.isComplete ? (
                      <CheckCircle2 size={22} className="done-icon" />
                    ) : (
                      `${stats.progressPercent}%`
                    )}
                  </span>
                </div>
              </div>

              <div className="trackOverviewPage__progressStats">
                <div className="trackOverviewPage__progressStatsItem">
                  <strong>{stats.completedExercises}</strong> of <strong>{stats.totalExercises}</strong> exercises
                </div>
                <div className="trackOverviewPage__progressStatsItem">
                  <Clock size={12} /> Est. {stats.totalTime}
                </div>
              </div>
            </div>

            <div className="trackOverviewPage__progressLinear">
              <div
                className={`trackOverviewPage__progressLinearFill ${stats.isComplete ? "is-complete" : ""}`}
                style={{ width: `${stats.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Badges Widget */}
          <div className="trackOverviewPage__widget">
            <h4 className="trackOverviewPage__widgetTitle">Course Badges</h4>
            <p className="trackOverviewPage__widgetHelp">Complete chapters to unlock badges — collect them all!</p>
            <div className="trackOverviewPage__badgeGrid">
              <div className="trackOverviewPage__badge locked"><LockKeyhole size={16} /></div>
              <div className="trackOverviewPage__badge locked"><LockKeyhole size={16} /></div>
              <div className="trackOverviewPage__badge locked"><LockKeyhole size={16} /></div>
              <div className="trackOverviewPage__badge locked"><LockKeyhole size={16} /></div>
            </div>
          </div>

          {/* Help Widget */}
          <div className="trackOverviewPage__widget">
            <h4 className="trackOverviewPage__widgetTitle">Need Help?</h4>
            <p className="trackOverviewPage__widgetHelp">Ask questions in our community discord!</p>
            <a href="#" className="trackOverviewPage__communityBtn">
              <MessageCircle size={14} /> Join Community
            </a>
          </div>
        </aside>
      </section>
    </div>
  );
}