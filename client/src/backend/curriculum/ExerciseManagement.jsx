import { useState, useEffect } from "react";
import { Plus, ExternalLink, AlertCircle } from "lucide-react";
import { getTracks, getSections, getExercises, createExercise, deleteExercise, reorderExercises } from "../../shared/curriculumApi.js";
import { DeleteConfirmButton } from "../shared/DeleteConfirmButton.jsx";
import "./CurriculumManagement.css";

export default function ExerciseManagement({ initialSectionId, onSelectExercise }) {
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(initialSectionId ? String(initialSectionId) : "");

  const [exercises, setExercises] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTracks();
  }, []);

  useEffect(() => {
    if (initialSectionId) {
      setSelectedSectionId(String(initialSectionId));
    }
  }, [initialSectionId]);

  useEffect(() => {
    if (selectedTrackId) {
      loadSections(selectedTrackId);
    } else {
      setSections([]);
    }
  }, [selectedTrackId]);

  useEffect(() => {
    if (selectedSectionId) {
      loadExercises(selectedSectionId);
    } else {
      setExercises([]);
    }
  }, [selectedSectionId]);

  async function loadTracks() {
    try {
      const data = await getTracks();
      setTracks(data || []);
      if (!selectedTrackId && data?.length > 0) {
        setSelectedTrackId(String(data[0].id));
      }
    } catch (err) {
      setError("Tracks load failed: " + err.message);
    }
  }

  async function loadSections(trackId) {
    try {
      const data = await getSections(trackId);
      setSections(data || []);
      if (data?.length > 0 && !selectedSectionId) {
        setSelectedSectionId(String(data[0].id));
      } else if (data?.length === 0) {
        setSelectedSectionId("");
      }
    } catch (err) {
      setError("Sections load failed: " + err.message);
    }
  }

  const selectedTrack = tracks.find((track) => String(track.id) === String(selectedTrackId));
  const selectedSection = sections.find((section) => String(section.id) === String(selectedSectionId));

  async function loadExercises(sectionId) {
    setLoading(true);
    setError(null);
    try {
      const data = await getExercises(sectionId);
      setExercises(data || []);
    } catch (err) {
      setError("Exercises load failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || !selectedSectionId) return;
    setIsSubmitting(true);
    try {
      await createExercise(selectedSectionId, { title: title.trim() });
      setTitle("");
      await loadExercises(selectedSectionId);
    } catch (err) {
      setError("Failed to create exercise: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {

    try {
      await deleteExercise(id);
      await loadExercises(selectedSectionId);
    } catch (err) {
      setError("Failed to delete exercise: " + err.message);
    }
  }

  async function handleMoveUp(index) {
    if (index === 0) return;
    const newItems = [...exercises];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setExercises(newItems);
    try {
      await reorderExercises(newItems.map(e => e.id));
    } catch (err) {
      setError("Failed to reorder exercises: " + err.message);
      await loadExercises(selectedSectionId);
    }
  }

  async function handleMoveDown(index) {
    if (index === exercises.length - 1) return;
    const newItems = [...exercises];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setExercises(newItems);
    try {
      await reorderExercises(newItems.map(e => e.id));
    } catch (err) {
      setError("Failed to reorder exercises: " + err.message);
      await loadExercises(selectedSectionId);
    }
  }

  return (
    <div className="ap-curriculum-panel">
      <div className="ap-curriculum-breadcrumbs">
        <span>Learning Structure</span>
        <span className="ap-curriculum-breadcrumbs__divider">/</span>
        <div className="ap-curriculum-breadcrumbs__item">
          <strong>Tracks</strong>
        </div>
        {selectedTrack && (
          <>
            <span className="ap-curriculum-breadcrumbs__divider">/</span>
            <div className="ap-curriculum-breadcrumbs__item">
              <span className="ap-curriculum-breadcrumbs__interactive">{selectedTrack.title}</span>
            </div>
            <span className="ap-curriculum-breadcrumbs__divider">/</span>
            <div className="ap-curriculum-breadcrumbs__item">
              <strong>Sections</strong>
            </div>
          </>
        )}
        {selectedSection && (
          <>
            <span className="ap-curriculum-breadcrumbs__divider">/</span>
            <div className="ap-curriculum-breadcrumbs__item">
              <span className="ap-curriculum-breadcrumbs__interactive">{selectedSection.title}</span>
            </div>
            <span className="ap-curriculum-breadcrumbs__divider">/</span>
            <div className="ap-curriculum-breadcrumbs__item">
              <strong>Exercises</strong>
            </div>
          </>
        )}
      </div>

      <div className="ap-curriculum-panel__header">
        <div>
          <h2>Exercises Catalog</h2>
          <p>Create focused coding exercises containing multiple hands-on tasks.</p>
        </div>
      </div>

      <div className="ap-curriculum-panel__filters-row">
        <div className="ap-curriculum-panel__filter">
          <label>Filter by Track:</label>
          <select value={selectedTrackId} onChange={(e) => setSelectedTrackId(e.target.value)}>
            <option value="" disabled>-- Pick Track --</option>
            {tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>

        <div className="ap-curriculum-panel__filter">
          <label>Select Section:</label>
          <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} disabled={!sections.length}>
            <option value="" disabled>-- Pick Section --</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
      </div>

      {selectedSectionId && (
        <div className="ap-curriculum-panel__content">
          <div className="ap-curriculum-panel__form-card">
            <h3>Create New Exercise in this Section</h3>
            {error && <div className="ap-curriculum-panel__error">{error}</div>}
            <form className="ap-curriculum-panel__form" onSubmit={handleCreate}>
              <div className="ap-curriculum-form-group">
                <label>Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Iterating arrays" />
              </div>
              <button type="submit" disabled={isSubmitting || !title.trim()} className="ap-curriculum-panel__btn">
                <Plus size={16} /> Add Exercise
              </button>
            </form>
          </div>

          <div className="ap-curriculum-panel__list-card">
            <h3>Existing Exercises</h3>
            {loading ? (
              <p>Loading exercises...</p>
            ) : exercises.length === 0 ? (
              <p className="ap-curriculum-panel__empty">No exercises in this section.</p>
            ) : (
              <ul className="ap-curriculum-panel__list">
                {exercises.map((exercise, idx) => (
                  <li key={exercise.id} className="ap-curriculum-panel__list-item">
                    <div className="ap-curriculum-panel__item-drag">
                      <button type="button" onClick={() => handleMoveUp(idx)} disabled={idx === 0}>▲</button>
                      <button type="button" onClick={() => handleMoveDown(idx)} disabled={idx === exercises.length - 1}>▼</button>
                    </div>
                    <div className="ap-curriculum-panel__item-info">
                      <strong>{exercise.title}</strong>
                      <span className="ap-curriculum-panel__item-desc">Order {exercise.order}</span>
                    </div>
                    <div className="ap-curriculum-panel__item-actions">
                      <button type="button" className="ap-curriculum-panel__icon-btn" title="Manage Tasks in this Exercise" onClick={() => onSelectExercise(exercise.id)}>
                        <ExternalLink size={16} /> Tasks
                      </button>
                      <DeleteConfirmButton onConfirm={() => handleDelete(exercise.id)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
