import { useState, useEffect } from "react";
import { Plus, ExternalLink, AlertCircle } from "lucide-react";
import { getTracks, getSections, createSection, deleteSection, reorderSections } from "../../shared/curriculumApi.js";
import { DeleteConfirmButton } from "../shared/DeleteConfirmButton.jsx";
import "./CurriculumManagement.css";

export default function SectionManagement({ initialTrackId, onSelectSection }) {
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(initialTrackId ? String(initialTrackId) : "");
  const [sections, setSections] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTracks();
  }, []);

  useEffect(() => {
    if (initialTrackId) {
      setSelectedTrackId(String(initialTrackId));
    }
  }, [initialTrackId]);

  useEffect(() => {
    if (selectedTrackId) {
      loadSections(selectedTrackId);
    } else {
      setSections([]);
    }
  }, [selectedTrackId]);

  async function loadTracks() {
    try {
      const data = await getTracks();
      setTracks(data || []);
      if (!selectedTrackId && data?.length > 0) {
        setSelectedTrackId(String(data[0].id));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  const selectedTrack = tracks.find((track) => String(track.id) === String(selectedTrackId));

  async function loadSections(trackId) {
    setLoading(true);
    setError(null);
    try {
      const data = await getSections(trackId);
      setSections(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || !selectedTrackId) return;
    setIsSubmitting(true);
    try {
      await createSection(selectedTrackId, { title: title.trim() });
      setTitle("");
      await loadSections(selectedTrackId);
    } catch (err) {
      setError("Failed to create section: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {

    try {
      await deleteSection(id);
      await loadSections(selectedTrackId);
    } catch (err) {
      setError("Failed to delete section: " + err.message);
    }
  }

  async function handleMoveUp(index) {
    if (index === 0) return;
    const newItems = [...sections];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setSections(newItems);
    try {
      await reorderSections(newItems.map(s => s.id));
    } catch (err) {
      setError("Failed to reorder sections: " + err.message);
      await loadSections(selectedTrackId);
    }
  }

  async function handleMoveDown(index) {
    if (index === sections.length - 1) return;
    const newItems = [...sections];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setSections(newItems);
    try {
      await reorderSections(newItems.map(s => s.id));
    } catch (err) {
      setError("Failed to reorder sections: " + err.message);
      await loadSections(selectedTrackId);
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
      </div>

      <div className="ap-curriculum-panel__header">
        <div>
          <h2>Sections Overview</h2>
          <p>Organize sequential sub-areas under a track to guide user learning.</p>
        </div>
      </div>

      <div className="ap-curriculum-panel__filter">
        <label>Select Track:</label>
        <select value={selectedTrackId} onChange={(e) => setSelectedTrackId(e.target.value)}>
          <option value="" disabled>-- Pick a Track --</option>
          {tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {selectedTrackId && (
        <div className="ap-curriculum-panel__content">
          <div className="ap-curriculum-panel__form-card">
            <h3>Create New Section in this Track</h3>
            {error && <div className="ap-curriculum-panel__error">{error}</div>}
            <form className="ap-curriculum-panel__form" onSubmit={handleCreate}>
              <div className="ap-curriculum-form-group">
                <label>Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Lists and Sets" />
              </div>
              <button type="submit" disabled={isSubmitting || !title.trim()} className="ap-curriculum-panel__btn">
                <Plus size={16} /> Add Section
              </button>
            </form>
          </div>

          <div className="ap-curriculum-panel__list-card">
            <h3>Existing Sections</h3>
            {loading ? (
              <p>Loading sections...</p>
            ) : sections.length === 0 ? (
              <p className="ap-curriculum-panel__empty">No sections in this track.</p>
            ) : (
              <ul className="ap-curriculum-panel__list">
                {sections.map((section, idx) => (
                  <li key={section.id} className="ap-curriculum-panel__list-item">
                    <div className="ap-curriculum-panel__item-drag">
                      <button type="button" onClick={() => handleMoveUp(idx)} disabled={idx === 0}>▲</button>
                      <button type="button" onClick={() => handleMoveDown(idx)} disabled={idx === sections.length - 1}>▼</button>
                    </div>
                    <div className="ap-curriculum-panel__item-info">
                      <strong>{section.title}</strong>
                      <span className="ap-curriculum-panel__item-desc">Order {section.order}</span>
                    </div>
                    <div className="ap-curriculum-panel__item-actions">
                      <button type="button" className="ap-curriculum-panel__icon-btn" title="Manage Exercises in this Section" onClick={() => onSelectSection(section.id)}>
                        <ExternalLink size={16} /> Exercises
                      </button>
                      <DeleteConfirmButton onConfirm={() => handleDelete(section.id)} />
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
