import { useState, useEffect } from "react";
import { Plus, AlertCircle, ChevronRight } from "lucide-react";
import { getTracks, getSections, getExercises, getTasks, createTask, deleteTask, reorderTasks } from "../../shared/curriculumApi.js";
import { DeleteConfirmButton } from "../shared/DeleteConfirmButton.jsx";
import "./CurriculumManagement.css";

export default function TaskManagement({ initialExerciseId }) {
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const [exercises, setExercises] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState(initialExerciseId ? String(initialExerciseId) : "");

  const [tasks, setTasks] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form State
  const [instructionsMd, setInstructionsMd] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [solutionCode, setSolutionCode] = useState("");
  const [testCasesRaw, setTestCasesRaw] = useState("[\n  {\n    \"input\": \"\",\n    \"expected_output\": \"\"\n  }\n]");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTracks();
  }, []);

  useEffect(() => {
    if (initialExerciseId) {
      setSelectedExerciseId(String(initialExerciseId));
    }
  }, [initialExerciseId]);

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

  useEffect(() => {
    if (selectedExerciseId) {
      loadTasks(selectedExerciseId);
    } else {
      setTasks([]);
    }
  }, [selectedExerciseId]);

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

  async function loadExercises(sectionId) {
    try {
      const data = await getExercises(sectionId);
      setExercises(data || []);
      if (data?.length > 0 && !selectedExerciseId) {
        setSelectedExerciseId(String(data[0].id));
      } else if (data?.length === 0) {
        setSelectedExerciseId("");
      }
    } catch (err) {
      setError("Exercises load failed: " + err.message);
    }
  }

  const selectedTrack = tracks.find((track) => String(track.id) === String(selectedTrackId));
  const selectedSection = sections.find((section) => String(section.id) === String(selectedSectionId));
  const selectedExercise = exercises.find((exercise) => String(exercise.id) === String(selectedExerciseId));

  async function loadTasks(exerciseId) {
    setLoading(true);
    setError(null);
    try {
      const data = await getTasks(exerciseId);
      setTasks(data || []);
    } catch (err) {
      setError("Tasks load failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!instructionsMd.trim() || !selectedExerciseId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      let test_cases = null;
      try {
        if (testCasesRaw.trim()) {
           test_cases = JSON.parse(testCasesRaw);
        }
      } catch (jsonErr) {
        throw new Error("Invalid JSON in Test Cases.");
      }

      await createTask(selectedExerciseId, { 
        instructions_md: instructionsMd.trim(),
        starter_code: starterCode.trim() || null,
        solution_code: solutionCode.trim() || null,
        test_cases: test_cases
      });

      setInstructionsMd("");
      setStarterCode("");
      setSolutionCode("");
      setTestCasesRaw("[\n  {\n    \"input\": \"\",\n    \"expected_output\": \"\"\n  }\n]");

      await loadTasks(selectedExerciseId);
    } catch (err) {
      setError("Failed to create task: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {

    try {
      await deleteTask(id);
      await loadTasks(selectedExerciseId);
    } catch (err) {
      setError("Failed to delete task: " + err.message);
    }
  }

  async function handleMoveUp(index) {
    if (index === 0) return;
    const newItems = [...tasks];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setTasks(newItems);
    try {
      await reorderTasks(newItems.map(t => t.id));
    } catch (err) {
      setError("Failed to reorder tasks: " + err.message);
      await loadTasks(selectedExerciseId);
    }
  }

  async function handleMoveDown(index) {
    if (index === tasks.length - 1) return;
    const newItems = [...tasks];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setTasks(newItems);
    try {
      await reorderTasks(newItems.map(t => t.id));
    } catch (err) {
      setError("Failed to reorder tasks: " + err.message);
      await loadTasks(selectedExerciseId);
    }
  }

  return (
    <div className="ap-curriculum-panel">
      <div className="ap-curriculum-panel__header">
        <div>
          <div className="ap-curriculum-breadcrumbs">
            <span className="breadcrumb-path">Tracks</span>
            {selectedTrack ? (
              <>
                <ChevronRight size={14} className="breadcrumb-separator" />
                <span className="breadcrumb-path">{selectedTrack.title}</span>
              </>
            ) : null}
            {selectedSection ? (
              <>
                <ChevronRight size={14} className="breadcrumb-separator" />
                <span className="breadcrumb-path">{selectedSection.title}</span>
              </>
            ) : null}
            {selectedExercise ? (
              <>
                <ChevronRight size={14} className="breadcrumb-separator" />
                <span className="breadcrumb-path">{selectedExercise.title}</span>
              </>
            ) : null}
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">Tasks</span>
          </div>
          <h2>Task Management</h2>
          <p>Manage step-by-step coding tasks for the selected exercises.</p>
        </div>
      </div>

      <div className="ap-curriculum-panel__filters-row ap-curriculum-panel__filters-row--3">
        <div className="ap-curriculum-panel__filter">
          <label>Filter by Track:</label>
          <select value={selectedTrackId} onChange={(e) => setSelectedTrackId(e.target.value)}>
            <option value="" disabled>-- Pick Track --</option>
            {tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>

        <div className="ap-curriculum-panel__filter">
          <label>Filter by Section:</label>
          <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} disabled={!sections.length}>
            <option value="" disabled>-- Pick Section --</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>

        <div className="ap-curriculum-panel__filter">
          <label>Select Exercise:</label>
          <select value={selectedExerciseId} onChange={(e) => setSelectedExerciseId(e.target.value)} disabled={!exercises.length}>
            <option value="" disabled>-- Pick Exercise --</option>
            {exercises.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
      </div>

      {selectedExerciseId && (
        <div className="ap-curriculum-panel__content ap-curriculum-panel__content--task">
          <div className="ap-curriculum-panel__form-card">
            <h3>Create New Task</h3>
            {error && <div className="ap-curriculum-panel__error">{error}</div>}
            <form className="ap-curriculum-panel__form" onSubmit={handleCreate}>
              
              <div className="ap-curriculum-form-group">
                <label>Instructions (Markdown)</label>
                <textarea 
                  value={instructionsMd} 
                  onChange={(e) => setInstructionsMd(e.target.value)} 
                  required 
                  rows="4" 
                  placeholder="e.g. Write a function that returns True." 
                />
              </div>

              <div className="ap-curriculum-form-group">
                <label>Starter Code</label>
                <textarea 
                  value={starterCode} 
                  onChange={(e) => setStarterCode(e.target.value)} 
                  rows="3" 
                  placeholder="e.g. def my_function():" 
                />
              </div>

              <div className="ap-curriculum-form-group">
                <label>Solution Code</label>
                <textarea 
                  value={solutionCode} 
                  onChange={(e) => setSolutionCode(e.target.value)} 
                  rows="3" 
                  placeholder="e.g. def my_function(): return True" 
                />
              </div>

              <div className="ap-curriculum-form-group">
                <label>Test Cases (JSON array)</label>
                <textarea 
                  value={testCasesRaw} 
                  onChange={(e) => setTestCasesRaw(e.target.value)} 
                  rows="6" 
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>

              <button type="submit" disabled={isSubmitting || !instructionsMd.trim()} className="ap-curriculum-panel__btn">
                <Plus size={16} /> Add Task
              </button>
            </form>
          </div>

          <div className="ap-curriculum-panel__list-card">
            <h3>Tasks in this Exercise</h3>
            {loading ? (
              <p>Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="ap-curriculum-panel__empty">No tasks here yet.</p>
            ) : (
              <ul className="ap-curriculum-panel__list">
                {tasks.map((task, idx) => (
                  <li key={task.id} className="ap-curriculum-panel__list-item ap-curriculum-panel__list-item--col">
                    <div className="ap-curriculum-panel__item-header">
                      <div className="ap-curriculum-panel__item-drag">
                        <button type="button" onClick={() => handleMoveUp(idx)} disabled={idx === 0}>▲</button>
                        <button type="button" onClick={() => handleMoveDown(idx)} disabled={idx === tasks.length - 1}>▼</button>
                      </div>
                      <div className="ap-curriculum-panel__item-info">
                        <strong>Step {task.step_number}</strong>
                      </div>
                      <div className="ap-curriculum-panel__item-actions">
                        <DeleteConfirmButton onConfirm={() => handleDelete(task.id)} />
                      </div>
                    </div>
                    <div className="ap-curriculum-panel__item-body">
                       <div className="ap-curriculum-panel__preview">
                         <small>Instructions snippet:</small>
                         <p>{task.instructions_md.length > 120 ? `${task.instructions_md.substring(0, 120)}...` : task.instructions_md}</p>
                       </div>
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
