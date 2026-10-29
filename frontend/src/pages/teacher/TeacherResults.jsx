import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch } from '../../context/PageSearchContext';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import './teacher.css';

const assessmentKey = (assessment) => `${assessment.type}:${assessment._id}`;

export default function TeacherResults({scope,onEditingChange}) {
  const scopeIdentity=JSON.stringify(scope||{});
  const [assessments, setAssessments] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = usePageSearch();
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(()=>{onEditingChange?.(dirty||saving);},[dirty,saving,onEditingChange]);
  useEffect(()=>()=>onEditingChange?.(false),[onEditingChange]);
  useAutoRefresh(async ({ signal, isCurrent }) => {
    try {
      const response = await api.get('/teacher/results/assessments', { signal,params:scope });
      if (!isCurrent()) return;
      const rows = Array.isArray(response.data?.assessments) ? response.data.assessments : [];
      setAssessments(rows);
      const selected = rows.find(item => assessmentKey(item) === selectedKey) || rows[0];
      if (!selected) { setSelectedKey(''); setAssessment(null); setStudents([]); return; }
      if (assessmentKey(selected) !== selectedKey) { setSelectedKey(assessmentKey(selected)); return; }
      const roster = await api.get('/teacher/results/' + selected.type + '/' + selected._id, { signal,params:scope });
      if (!isCurrent()) return;
      setAssessment(roster.data?.assessment || null);
      setStudents((roster.data?.students || []).map(student => ({ ...student, marksObtained:student.marksObtained == null ? '' : String(student.marksObtained), remarks:student.remarks || '' })));
      setError('');
    } catch (err) { if (isCurrent()) setError(err.response?.data?.message || 'Results could not refresh. Retrying automatically.'); }
    finally { if (isCurrent()) { setLoadingAssessments(false); setLoadingRoster(false); } }
  }, { enabled: !dirty && !saving, deps: [selectedKey,scopeIdentity] });

  const updateStudent = (studentId, field, value) => {
    setDirty(true);
    setStudents((current) => current.map((student) => (
      student._id === studentId ? { ...student, [field]: value } : student
    )));
    setError('');
    setNotice('');
  };

  const visibleStudents = students.filter((student) => (
    [student.name, student.studentId, student.email]
      .some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))
  ));
  const enteredCount = students.filter((student) => student.marksObtained !== '').length;
  const markedStudents = students.filter(student => String(student.marksObtained).trim() !== '');
  const passedCount = students.filter((student) => (
    student.marksObtained !== '' && Number(student.marksObtained) >= (assessment?.passingMarks ?? Infinity)
  )).length;
  const completion = students.length ? Math.round((enteredCount / students.length) * 100) : 0;

  const saveResults = async (event) => {
    event.preventDefault();
    if (!assessment || !markedStudents.length) {
      setError('Enter marks for at least one student before saving.');
      return;
    }
    const invalid = markedStudents.find((student) => {
      const mark = Number(student.marksObtained);
      return !Number.isFinite(mark) || mark < 0 || mark > assessment.totalMarks;
    });
    if (invalid) {
      setError(`Check ${invalid.name}: marks must be between 0 and ${assessment.totalMarks}.`);
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.put(`/teacher/results/${assessment.type}/${assessment._id}`, {
        results: markedStudents.map((student) => ({
          studentId: student._id,
          marksObtained: Number(student.marksObtained),
          remarks: student.remarks,
        })),
      },{params:scope});
      setDirty(false);
      setNotice(`Saved results for ${response.data?.savedCount ?? markedStudents.length} students.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Results could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="teacher-scope teacher-results-page">

      <section className="results-toolbar card results-selection-panel" aria-label="Assessment selection">
        <div className="results-select-heading">
          <span className="results-kicker">GRADEBOOK</span>
          <strong>Select an assessment</strong>
        </div>
        <div className="results-assessment-select">
          <label className="form-label" htmlFor="results-assessment">Assessment</label>
          <select
            id="results-assessment"
            className="form-control"
            value={selectedKey}
            disabled={saving || loadingAssessments || assessments.length === 0}
            onChange={(event) => {setDirty(false);setLoadingRoster(true);setSelectedKey(event.target.value);}}
          >
            <option value="">{loadingAssessments ? 'Loading assessments...' : 'Select an assessment'}</option>
            {assessments.map((item) => (
              <option key={assessmentKey(item)} value={assessmentKey(item)}>
                {item.assessmentType|| (item.type === 'quiz' ? 'Quiz' : 'Exam')} · {item.title} · {item.totalMarks} marks
              </option>
            ))}
          </select>
        </div>
        {assessment && (
          <div className="results-assessment-meta">
            <span className="results-assessment-type">{assessment.type === 'quiz' ? 'Quiz' : 'Exam'}</span>
            <span>Pass mark <strong>{assessment.passingMarks}/{assessment.totalMarks}</strong></span>
          </div>
        )}
      </section>

      {error && <div className="results-message results-message-error" role="alert">{error}</div>}
      {notice && <div className="results-message results-message-success" role="status">{notice}</div>}

      <section className="card results-table-card">
        <div className="card-header results-card-header">
          <div>
            <span className="results-kicker">CLASS GRADEBOOK</span>
            <h2 className="card-title">{assessment?.title || 'Student marks'}</h2>
            <p>{assessment ? `${students.length} enrolled students · Maximum ${assessment.totalMarks} marks` : 'Choose an assessment to load its enrolled students.'}</p>
          </div>
          <div className="search-input-wrap results-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Search students"
              placeholder="Find a student..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={!students.length}
            />
          </div>
        </div>

        {loadingRoster ? (
          <div className="results-state"><div className="spinner" /><span>Loading enrolled students...</span></div>
        ) : !selectedKey ? (
          <div className="results-state"><span className="results-state-icon">▤</span><strong>No assessments available</strong><span>Create an exam or quiz for your assigned course first.</span></div>
        ) : students.length === 0 ? (
          <div className="results-state"><span className="results-state-icon">♙</span><strong>No enrolled students</strong><span>This course currently has no active enrollments.</span></div>
        ) : (
          <form onSubmit={saveResults}>
            <div className="table-responsive">
              <table className="data-table results-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Student ID</th>
                    <th>Mark / {assessment?.totalMarks}</th>
                    <th>Result</th>

                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.length === 0 ? (
                    <tr><td className="results-no-matches" colSpan="4">No students match “{search}”.</td></tr>
                  ) : visibleStudents.map((student) => {
                    const mark = student.marksObtained === '' ? null : Number(student.marksObtained);
                    const passed = mark !== null && mark >= (assessment?.passingMarks ?? 0);
                    return (
                      <tr key={student._id}>
                        <td>
                          <div className="results-student-name">{student.name}</div>
                          <div className="results-student-email">{student.email || ' '}</div>
                        </td>
                        <td><code>{student.studentId || '—'}</code></td>
                        <td>
                          <input
                            className="form-control results-mark-input"
                            disabled={saving}
                            type="number"
                            min="0"
                            max={assessment?.totalMarks}
                            step="0.01"
                            inputMode="decimal"
                            aria-label={`Marks for ${student.name}`}
                            value={student.marksObtained}
                            onChange={(event) => updateStudent(student._id, 'marksObtained', event.target.value)}
                          />
                        </td>
                        <td>
                          {mark === null ? <span className="results-ungraded">Not entered</span> : (
                            <span className={`results-outcome ${passed ? 'is-pass' : 'is-fail'}`}>
                              {passed ? 'Pass' : 'Needs review'}
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="results-footer">
              <span>{dirty ? 'Unsaved marks. Live updates resume after saving.' : `${enteredCount} students with marks. Leave non-participants blank.`}</span>{dirty && <button type="button" className="btn btn-secondary" disabled={saving} onClick={()=>{setLoadingRoster(true);setDirty(false);}}>Discard changes</button>}
              <button type="submit" className="btn btn-primary" disabled={saving || !markedStudents.length}>
                {saving ? 'Saving results...' : 'Save class results'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
