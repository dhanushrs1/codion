import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, LayoutList, ChevronDown, LockKeyhole } from "lucide-react";
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

    navigate(APP_ROUTES.frontendExerciseWorkspace(firstExerciseMeta.exerciseId), {
      state: {
        trackTitle: track.title,
        sectionTitle: firstExerciseMeta.sectionTitle,
        exerciseTitle: firstExerciseMeta.exerciseTitle,
      },
    });
  }

  function handleGoToExercise(exerciseId, sectionTitle, exerciseTitle) {
    if (!exerciseId || stats.completedExercises === 0) return; // Keep locked if no previous access mechanism desired, actually just link directly
    
    navigate(APP_ROUTES.frontendExerciseWorkspace(exerciseId), {
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

  function openSection(sectionId) {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: true,
    }));

    scrollSectionIntoView(sectionId);
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
          <button className="btn btn-secondary" onClick={() => navigate(APP_ROUTES.frontendTracks)}>
            Back to Tracks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="trackOverviewPage">
      {/* Hero Section Banner */}
      <section 
        className="trackOverviewPage__hero"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(2,6,23,0.5), rgba(2,6,23,0.8)), url(${track.featured_image_url || TRACK_IMAGE_FALLBACK})`
        }}
      >
        <div className="container">
          <div className="trackOverviewPage__heroContent">
            <h1>{track.title}</h1>
            <p className="trackOverviewPage__description">
              {track.description || "Learn programming fundamentals with this comprehensive course."}
            </p>

            <button 
              className="btn btn-brand trackOverviewPage__cta action-cta" 
              onClick={handleStartLearning}
              disabled={!firstExerciseMeta}
            >
              {stats.completedExercises > 0 ? "Continue Learning" : "Start Learning for Free"}
            </button>

            <div className="trackOverviewPage__meta">
              <span><Clock size={14} /> Estimated length: {stats.totalTime}</span>
              <span><LayoutList size={14} /> {stats.totalExercises} exercises</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <section className="trackOverviewPage__main container">
        {/* Left curriculum column */}
        <div className="trackOverviewPage__curriculum">
          {track.sections && track.sections.length > 0 ? (
            <div className="trackOverviewPage__accordionGroup">
              <div className="trackOverviewPage__sectionNav" aria-label="Jump to section">
                {track.sections.map((section, index) => {
                  const isExpanded = expandedSections[section.id] !== false;

                  return (
                    <button
                      key={`nav-${section.id}`}
                      className={`trackOverviewPage__sectionPill ${isExpanded ? "is-active" : ""}`}
                      onClick={() => openSection(section.id)}
                    >
                      {index + 1}. {section.title}
                    </button>
                  );
                })}
              </div>

              {track.sections.map((section, index) => {
                const isExpanded = expandedSections[section.id] !== false; // default to open
                const sectionNumber = index + 1;
                const totalExercises = section.exercises?.length || 0;
                const completedInSection = (section.exercises || []).filter((exercise) =>
                  completedExerciseIds.includes(Number(exercise.id))
                ).length;
                
                return (
                  <div
                    key={section.id}
                    ref={(node) => {
                      if (node) {
                        sectionRefs.current[section.id] = node;
                      }
                    }}
                    className={`trackOverviewPage__accordion ${isExpanded ? "is-expanded" : ""}`}
                  >
                    <button 
                      className={`trackOverviewPage__accordionHeader ${isExpanded ? 'is-expanded' : ''}`}
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`section-panel-${section.id}`}
                      id={`section-button-${section.id}`}
                    >
                      <div className="trackOverviewPage__accordionTitleGroup">
                        <div className="trackOverviewPage__accordionNumber">{sectionNumber}</div>
                        <h3>{section.title}</h3>
                      </div>
                      <div className="trackOverviewPage__accordionRight">
                        <span className="trackOverviewPage__accordionProgress">
                          {completedInSection}/{totalExercises} done
                        </span>
                        <span className="trackOverviewPage__accordionCount">{totalExercises} {totalExercises === 1 ? 'exercise' : 'exercises'}</span>
                        <ChevronDown size={20} className={`trackOverviewPage__accordionChevron ${isExpanded ? "is-open" : ""}`} />
                      </div>
                    </button>

                    <div
                      className={`trackOverviewPage__accordionBody ${isExpanded ? "is-expanded" : ""}`}
                      id={`section-panel-${section.id}`}
                      role="region"
                      aria-labelledby={`section-button-${section.id}`}
                    >
                      <div className="trackOverviewPage__accordionContent">
                        {totalExercises > 0 ? (
                          <div className="trackOverviewPage__exerciseList">
                            {section.exercises.map((exercise, idx) => {
                              const isCompleted = completedExerciseIds.includes(Number(exercise.id));

                              return (
                                <div
                                  key={exercise.id}
                                  className={`trackOverviewPage__exerciseItem ${isCompleted ? 'is-completed' : ''}`}
                                  style={{ "--exercise-order": idx + 1 }}
                                >
                                  <div className="trackOverviewPage__exerciseItemLeft">
                                    <span className="trackOverviewPage__exerciseNumber">Exercise {idx + 1}</span>
                                    <span className="trackOverviewPage__exerciseTitle">{exercise.title}</span>
                                  </div>
                                  
                                  <button 
                                    className={`trackOverviewPage__exerciseAction ${isCompleted ? 'action-done' : 'action-start'}`}
                                    onClick={() => handleGoToExercise(exercise.id, section.title, exercise.title)}
                                  >
                                    {isCompleted ? 'Review' : 'Start'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="trackOverviewPage__emptyBox">No exercises perfectly linked yet.</div>
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

        {/* Right sidebar column */}
        <aside className="trackOverviewPage__sidebar">
          {/* Progress Box */}
          <div className="trackOverviewPage__widget">
            <h4 className="trackOverviewPage__widgetTitle">Course Progress</h4>
            <div className="trackOverviewPage__progressRow">
              <span>Exercises</span>
              <span>{stats.completedExercises} / {stats.totalExercises}</span>
            </div>
            <div className="trackOverviewPage__progressBar">
              <div 
                className="trackOverviewPage__progressFill" 
                style={{ width: `${stats.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="trackOverviewPage__widget trackOverviewPage__badgesWidget">
            <h4 className="trackOverviewPage__widgetTitle">Course Badges</h4>
            <p className="trackOverviewPage__widgetHelp">Complete chapters to earn a badge — collect 'em all!</p>
            <div className="trackOverviewPage__badgeGrid">
              <div className="trackOverviewPage__badge icon-badge locked"><LockKeyhole size={18}/></div>
              <div className="trackOverviewPage__badge icon-badge locked"><LockKeyhole size={18}/></div>
              <div className="trackOverviewPage__badge icon-badge locked"><LockKeyhole size={18}/></div>
              <div className="trackOverviewPage__badge icon-badge locked"><LockKeyhole size={18}/></div>
            </div>
          </div>

          <div className="trackOverviewPage__widget">
            <h4 className="trackOverviewPage__widgetTitle">Need Help?</h4>
            <p className="trackOverviewPage__widgetHelp">Ask questions in our community discord!</p>
            <a href="#" className="btn btn-outline trackOverviewPage__communityBtn">Join Community</a>
          </div>
        </aside>
      </section>
    </div>
  );
}