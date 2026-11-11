import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch } from '../../context/PageSearchContext';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './teacher.css';

const assessmentKey = (assessment) => `${assessment.type}:${assessment._id}`;

export default function TeacherResults({scope,onEditingChange}) {
  const scopeIdentity=JSON.stringify(scope||{});
  const [assessments, setAssessments] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [rosterRetry, setRosterRetry] = useState(0);
  const [assessment, setAssessment] = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = usePageSearch();
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState('');
  const [importIssues, setImportIssues] = useState([]);

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
      if (assessmentKey(selected) !== selectedKey) { setAssessment(null);setStudents([]);setLoadingRoster(true);setSelectedKey(assessmentKey(selected)); return; }
      const roster = await api.get('/teacher/results/' + selected.type + '/' + selected._id, { signal,params:scope });
      if (!isCurrent()) return;
      setAssessment(roster.data?.assessment || null);
      setStudents((roster.data?.students || []).map(student => ({ ...student, marksObtained:student.marksObtained == null ? '' : String(student.marksObtained), remarks:student.remarks || '' })));
      setError('');
    } catch (err) { if (isCurrent()) setError(err.response?.data?.message || 'Results could not refresh. Retrying automatically.'); }
    finally { if (isCurrent()) { setLoadingAssessments(false); setLoadingRoster(false); } }
  }, { enabled: !dirty && !saving && !importing, deps: [selectedKey,scopeIdentity,rosterRetry] });

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

  const importResults = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !assessment) return;
    setImportFile(file.name);
    setImportIssues([]);
    setImporting(true);
    setError('');
    setNotice('');
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {defval: ''});
      const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
      const byName = new Map();
      const byEmail = new Map();
      for (const student of students) {
        const name = normalize(student.name);
        byName.set(name, [...(byName.get(name) || []), student]);
        if (student.email) byEmail.set(normalize(student.email), student);
      }
      const marks = new Map();
      let skipped = 0;
      const issues = [];
      for (const [index, source] of rows.entries()) {
        const row = Object.fromEntries(Object.entries(source).map(([key, value]) => [normalize(key), value]));
        const result = String(row.result ?? row.marks ?? '').trim();
        if (!result) {
          skipped++;
          continue;
        }
        const name = normalize(row.name || row['student name'] || row['full name'] || row.student);
        const email = normalize(row.email);
        const emailMatch = byEmail.get(email);
        const candidates = emailMatch ? [emailMatch] : byName.get(name) || [];
        const rowNumber = (source.__rowNum__ ?? index + 1) + 1;
        const student = candidates[0];
        const mark = Number(result);
        let issue;
        if (!student) issue = 'No matching student in this assessment.';
        else if (candidates.length > 1) issue = 'Multiple students share this name. Add the student’s email.';
        else if (emailMatch && name && normalize(emailMatch.name) !== name && byName.has(name)) {
          issue = 'The name and email match different students.';
        } else if (!Number.isFinite(mark) || mark < 0 || mark > assessment.totalMarks) {
          issue = 'Result must be between 0 and ' + assessment.totalMarks + '.';
        } else if (marks.has(student._id)) issue = 'This student already has a result in the file.';
        if (issue) {
          issues.push({row:rowNumber, message:issue});
          continue;
        }
        marks.set(student._id, String(mark));
      }
      setImportIssues(issues);
      if (!marks.size) {
        setNotice('No results loaded. Blank rows skipped: ' + skipped + '.');
        return;
      }
      setStudents(current => current.map(student => marks.has(student._id)
        ? {...student, marksObtained: marks.get(student._id)}
        : student));
      setDirty(true);
      setNotice('Loaded ' + marks.size + ' results. Skipped ' + skipped + ' blank results and ' + issues.length + ' rows that need review. Check the marks before saving.');
    } catch (error) {
      setError(error.message || 'The results file could not be read.');
    } finally {
      setImporting(false);
    }
  };

  const saveResults = async (event) => {
    event.preventDefault();
    if (importing || saving) return;
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

      {assessment && !loadingRoster && students.length > 0 && <section className="results-import" aria-labelledby="results-import-title">
        <div className="results-import-main">
          <div>
            <span className="results-kicker">GRADEBOOK IMPORT</span>
            <h2 id="results-import-title">Upload Excel results</h2>
            <p>Use <strong>Name</strong> and <strong>Result</strong>. Blank results are skipped.</p>
            <p>Add <strong>Email</strong> if students share a name.</p>
          </div>
          <div className="results-import-picker">
            <input id="results-excel" className="visually-hidden" type="file" accept=".xlsx,.xls,.csv" disabled={importing || saving} onChange={importResults}/>
            <label htmlFor="results-excel">{importing ? 'Reading file…' : importFile ? 'Choose another file' : 'Choose Excel file'}</label>
            <span>.xlsx, .xls, or .csv</span>
          </div>
        </div>
        {importFile && <p className="results-import-file" role="status"><strong>{importing ? 'Reading' : 'Selected file'}</strong><span>{importFile}</span></p>}
        {!!importIssues.length && <details className="results-import-issues" open>
          <summary>{importIssues.length} {importIssues.length === 1 ? 'row needs' : 'rows need'} review</summary>
          <ul>{importIssues.map(issue=><li key={issue.row}><strong>Row {issue.row}</strong><span>{issue.message}</span></li>)}</ul>
        </details>}
      </section>}
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
            disabled={importing || saving || loadingAssessments || assessments.length === 0}
            onChange={(event) => {setDirty(false);setAssessment(null);setStudents([]);setNotice('');setLoadingRoster(true);setImportFile('');setImportIssues([]);setSelectedKey(event.target.value);}}
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
        ) : !assessment ? (
          <div className="results-state" role="status">
            <strong>{error ? 'Could not load the gradebook' : 'Loading gradebook…'}</strong>
            {error && <button type="button" className="btn btn-secondary" onClick={() => setRosterRetry(value => value + 1)}>Retry</button>}
          </div>
        ) : students.length === 0 ? (
          <div className="results-state"><span className="results-state-icon">♙</span><strong>No enrolled students</strong><span>{assessment.cohort
            ? 'This assessment is assigned to '+assessment.cohort+'. No enrolled students match that cohort.'
            : 'No active enrollments match this assessment.'}</span>
            <Link to="/teacher/exams" className="btn btn-secondary">Review assessment settings</Link></div>
        ) : (
          <form onSubmit={saveResults}>
            <div className="table-responsive">
              <table className="data-table results-table">
                <thead>
                  <tr>
                    <th>Name</th>
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
              <button type="submit" className="btn btn-primary" disabled={importing || saving || !markedStudents.length}>
                {saving ? 'Saving results...' : 'Save class results'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
