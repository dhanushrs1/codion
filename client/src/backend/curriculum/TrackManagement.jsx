import { useState, useEffect } from "react";
import { ExternalLink, ImagePlus, Loader2, Plus, Upload } from "lucide-react";
import {
  createTrack,
  deleteTrack,
  getTracks,
  reorderTracks,
  updateTrack,
  uploadTrackFeaturedImage,
} from "../../shared/curriculumApi.js";
import { DeleteConfirmButton } from "../shared/DeleteConfirmButton.jsx";
import "./CurriculumManagement.css";

export default function TrackManagement({ onSelectTrack }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [languageId, setLanguageId] = useState("71"); // Default python
  const [featuredImageFile, setFeaturedImageFile] = useState(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingDraftImage, setIsUploadingDraftImage] = useState(false);
  const [uploadingTrackId, setUploadingTrackId] = useState(null);

  useEffect(() => {
    loadTracks();
  }, []);

  async function loadTracks() {
    setLoading(true);
    setError(null);
    try {
      const data = await getTracks();
      setTracks(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || !languageId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      let nextFeaturedImageUrl = featuredImageUrl || null;
      if (featuredImageFile && !nextFeaturedImageUrl) {
        setIsUploadingDraftImage(true);
        const upload = await uploadTrackFeaturedImage(featuredImageFile);
        nextFeaturedImageUrl = upload.url;
        setIsUploadingDraftImage(false);
      }

      await createTrack({
        title: title.trim(),
        description: description.trim(),
        language_id: parseInt(languageId, 10),
        featured_image_url: nextFeaturedImageUrl,
      });
      setTitle("");
      setDescription("");
      setFeaturedImageFile(null);
      setFeaturedImageUrl("");
      await loadTracks();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploadingDraftImage(false);
      setIsSubmitting(false);
    }
  }

  async function handleUploadDraftImage() {
    if (!featuredImageFile) return;
    setIsUploadingDraftImage(true);
    setError(null);
    try {
      const upload = await uploadTrackFeaturedImage(featuredImageFile);
      setFeaturedImageUrl(upload.url || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploadingDraftImage(false);
    }
  }

  async function handleReplaceTrackImage(trackId, file) {
    if (!file) return;
    setUploadingTrackId(trackId);
    setError(null);
    try {
      const upload = await uploadTrackFeaturedImage(file);
      await updateTrack(trackId, { featured_image_url: upload.url || null });
      await loadTracks();
    } catch (err) {
      setError(`Failed to update track image: ${err.message}`);
    } finally {
      setUploadingTrackId(null);
    }
  }

  async function handleDelete(id) {

    try {
      await deleteTrack(id);
      await loadTracks();
    } catch (err) {
      setError("Failed to delete track: " + err.message);
    }
  }

  async function handleMoveUp(index) {
    if (index === 0) return;
    const newItems = [...tracks];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setTracks(newItems);
    try {
      await reorderTracks(newItems.map(t => t.id));
    } catch (err) {
      setError("Failed to reorder tracks: " + err.message);
      await loadTracks();
    }
  }

  async function handleMoveDown(index) {
    if (index === tracks.length - 1) return;
    const newItems = [...tracks];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setTracks(newItems);
    try {
      await reorderTracks(newItems.map(t => t.id));
    } catch (err) {
      setError("Failed to reorder tracks: " + err.message);
      await loadTracks();
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
      </div>

      <div className="ap-curriculum-panel__header">
        <div>
          <h2>Tracks Overview</h2>
          <p>Manage top-level curriculum bounds and their primary language context.</p>
        </div>
      </div>

      <div className="ap-curriculum-panel__content">
        <div className="ap-curriculum-panel__form-card">
          <h3>Create New Track</h3>
          {error && <div className="ap-curriculum-panel__error">{error}</div>}
          <form className="ap-curriculum-panel__form" onSubmit={handleCreate}>
            <div className="ap-curriculum-form-group">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Data Structures" />
            </div>
            <div className="ap-curriculum-form-group">
              <label>Language Context</label>
              <select value={languageId} onChange={(e) => setLanguageId(e.target.value)} required className="ap-curriculum-select">
                <option value="71">Python (3.8.1)</option>
                <option value="93">JavaScript (Node.js 18.15.0)</option>
                <option value="62">Java (OpenJDK 13.0.1)</option>
                <option value="54">C++ (GCC 9.2.0)</option>
                <option value="50">C (GCC 9.2.0)</option>
                <option value="73">Rust (1.40.0)</option>
                <option value="60">Go (1.40.0)</option>
              </select>
            </div>
            <div className="ap-curriculum-form-group">
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="2" />
            </div>
            <div className="ap-curriculum-form-group">
              <label>Featured Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setFeaturedImageFile(file);
                }}
              />
              <div className="ap-curriculum-track-image-row">
                <button
                  type="button"
                  className="ap-curriculum-panel__icon-btn"
                  onClick={handleUploadDraftImage}
                  disabled={!featuredImageFile || isUploadingDraftImage}
                >
                  {isUploadingDraftImage ? (
                    <>
                      <Loader2 size={14} className="spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={14} /> Upload image
                    </>
                  )}
                </button>
                {featuredImageUrl && <span className="ap-curriculum-track-image-ok">Image uploaded</span>}
              </div>
              {featuredImageUrl && (
                <img
                  src={featuredImageUrl}
                  alt="Track featured preview"
                  className="ap-curriculum-track-preview"
                />
              )}
            </div>
            <button type="submit" disabled={isSubmitting} className="ap-curriculum-panel__btn">
              <Plus size={16} /> Add Track
            </button>
          </form>
        </div>

        <div className="ap-curriculum-panel__list-card">
          <h3>Existing Tracks</h3>
          {loading ? (
            <p>Loading tracks...</p>
          ) : tracks.length === 0 ? (
            <p className="ap-curriculum-panel__empty">No tracks found. Create one above.</p>
          ) : (
            <ul className="ap-curriculum-panel__list">
              {tracks.map((track, idx) => (
                <li key={track.id} className="ap-curriculum-panel__list-item">
                  <div className="ap-curriculum-panel__item-drag">
                    <button type="button" onClick={() => handleMoveUp(idx)} disabled={idx === 0}>▲</button>
                    <button type="button" onClick={() => handleMoveDown(idx)} disabled={idx === tracks.length - 1}>▼</button>
                  </div>
                  <div className="ap-curriculum-track-thumb">
                    {track.featured_image_url ? (
                      <img src={track.featured_image_url} alt={`${track.title} featured`} />
                    ) : (
                      <div className="ap-curriculum-track-thumb--empty">
                        <ImagePlus size={14} />
                        No image
                      </div>
                    )}
                  </div>
                  <div className="ap-curriculum-panel__item-info">
                    <strong>{track.title}</strong>
                    <span className="ap-curriculum-panel__item-desc">Language {track.language_id} • Order {track.order}</span>
                  </div>
                  <div className="ap-curriculum-panel__item-actions">
                    <label className="ap-curriculum-panel__icon-btn ap-curriculum-panel__icon-btn--upload" title="Replace featured image">
                      {uploadingTrackId === track.id ? (
                        <>
                          <Loader2 size={14} className="spin" /> Uploading
                        </>
                      ) : (
                        <>
                          <Upload size={14} /> Change image
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="ap-curriculum-hidden-input"
                        disabled={uploadingTrackId === track.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          void handleReplaceTrackImage(track.id, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button type="button" className="ap-curriculum-panel__icon-btn" title="Manage Sections in this Track" onClick={() => onSelectTrack(track.id)}>
                      <ExternalLink size={16} /> Sections
                    </button>
                    <DeleteConfirmButton onConfirm={() => handleDelete(track.id)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
