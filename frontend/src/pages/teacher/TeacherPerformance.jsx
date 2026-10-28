import StudentPerformanceReport from './StudentPerformanceReport';
import { usePageSearch } from '../../context/PageSearchContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import './TeacherPerformance.css';

function gradeColor(g) { return g?.startsWith('A') ? 'grade-A' : g?.startsWith('B') ? 'grade-B' : g?.startsWith('C') ? 'grade-C' : g?.startsWith('D') ? 'grade-D' : 'grade-F'; }


function StudentResultsModal({ student, onClose }) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]') || [])];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [onClose]);
  const results = [...(student.assessmentResults || [])].sort((a, b) => a.assessmentName.localeCompare(b.assessmentName, undefined, { numeric: true }));
  return <div className="performance-overlay" role="dialog" aria-modal="true" aria-labelledby="performance-student-results-title" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="performance-dialog" ref={dialogRef}>
      <header className="performance-dialog-header"><span className="performance-dialog-avatar" aria-hidden="true">{student.student?.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span><div className="performance-dialog-identity"><span className="performance-eyebrow">Student results</span><h2 id="performance-student-results-title">{student.student}</h2><span className="performance-muted">{student.studentId} · {student.batches?.join(', ') || 'Batch not specified'}</span></div><button ref={closeRef} className="performance-close" onClick={onClose} aria-label="Close student results">×</button></header>
      <div className="performance-dialog-body">
        <div className="performance-result-summary"><div><span className="performance-eyebrow">Course</span><h3>{student.courseName || student.course}</h3><span className="performance-muted">{student.gradedAssessments}/{student.expectedAssessments} assessments recorded</span></div><div className="performance-total"><span className="performance-score-label">Course total</span><strong>{student.hasMarks ? student.totalMarks : '—'}<small>/100</small></strong><div className="performance-total-track" aria-hidden="true"><span style={{ width: Math.max(0, Math.min(100, student.totalMarks || 0)) + '%' }} /></div><span className="performance-status">{student.status}</span></div></div>
        {!student.finalized && <p className="performance-note">Provisional result · More marks are still to be recorded.</p>}
        <div className="performance-section-heading"><h3>Assessment results</h3><span>{results.length} recorded</span></div>
        {!results.length ? <div className="performance-empty"><h3>No marks yet</h3><p>Saved results will appear here.</p></div> : <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Assessment</th><th>Type</th><th>Marks</th><th>Grade</th></tr></thead><tbody>{results.map(result => <tr key={result._id}><td><strong>{result.assessmentName}</strong></td><td><span className={'performance-type ' + result.assessmentType}>{result.resultType || result.assessmentType}</span></td><td><strong>{result.marks}<span className="performance-muted">/{result.totalMarks}</span></strong></td><td><span className={'performance-grade ' + gradeColor(result.grade)}>{result.grade || '—'}</span></td></tr>)}</tbody></table></div>}
      </div>
      <footer className="performance-dialog-footer"><span className="performance-muted">All saved results for this course</span><button className="performance-button primary" onClick={onClose}>Done</button></footer>
    </div>
  </div>;
}

export default function TeacherPerformance() {
  const [report, setReport] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search] = usePageSearch();
  const [courseId, setCourseId] = useState('');
  const [assessmentId, setAssessmentId] = useState('');
  const [revision, setRevision] = useState(0);
  const [batch, setBatch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const closeReport = useCallback(() => setShowReport(false), []);
  const closeDetails = useCallback(() => setSelectedStudentId(null), []);

  useEffect(() => {
    let active = true, busy = false;
    const controller = new AbortController();
    setLoading(true);
    const load = async (initial = false) => {
      if (busy) return;
      busy = true;
      try {
        const { data } = await api.get('/teacher/performance', { params: { courseId: courseId || undefined, assessmentType: 'all', assessmentId: assessmentId || undefined, batch: batch || undefined, search: search || undefined }, signal: controller.signal });
        if (!active) return;
        setReport(data); setCourses(data.courses || []); setError('');
        setSelectedStudentId(current => data.students?.some(student => String(student._id) === current) ? current : null);
        if (assessmentId && data.selectedAssessmentId !== assessmentId) setAssessmentId('');
      } catch (err) {
        if (!active) return;
        if (err.response?.status === 403) setReport(null);
        setError(err.response?.data?.message || 'Performance could not be loaded. Please retry. Previously loaded data may be out of date.');
      } finally { busy = false; if (active && initial) setLoading(false); }
    };
    load(true);
    const refresh = () => { if (!document.hidden) load(); };
    const interval = setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; controller.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [courseId, assessmentId, search, revision, batch]);

  const summary = report?.summary, allocation = report?.allocation, students = report?.students || [];
  const selectedStudent = students.find(student => String(student._id) === selectedStudentId);
  const selectedAssessment = report?.assessments?.find(item => item._id === assessmentId);
  const hasAssessmentFilter = !!report?.hasAssessmentFilter;
  const filteredMarksLabel = selectedAssessment ? selectedAssessment.title + ' marks' : 'Assessment marks';
  const ready = !loading && !!report;
  const changeCourse = event => { setCourseId(event.target.value); setAssessmentId(''); setBatch(''); closeDetails(); };

  return <div className="performance-page">
    {error && <div role="alert" className="performance-alert error">{error} <button className="performance-button" onClick={() => setRevision(value => value + 1)}>Retry</button></div>}
    <div className="performance-report-action"><button type="button" className="performance-button primary" disabled={!ready || !report?.course?._id} onClick={() => setShowReport(true)}>▤ View report & Excel</button></div>
    <section className="performance-stats" aria-label="Course summary" aria-live="polite">
      <div className="performance-stat"><span>Class average</span><strong>{ready && summary?.classAverage != null ? summary.classAverage + '%' : '—'}</strong><small>{summary?.recordedStudents || 0} students with marks{summary?.provisional ? ' · provisional' : ''}</small></div>
      <div className="performance-stat"><span>Highest score</span><strong>{ready && summary?.highestScore != null ? summary.highestScore : '—'}<em>/100</em></strong><small>Overall course marks</small></div>
      <div className="performance-stat success"><span>Passing students</span><strong>{ready ? summary?.passingStudents || 0 : '—'}</strong><small>Completed results</small></div>
      <div className="performance-stat"><span>Failing students</span><strong>{ready ? summary?.failingStudents || 0 : '—'}</strong><small>{summary?.incompleteStudents || 0} incomplete results excluded</small></div>
    </section>
    <section className="performance-panel">
      <div className="performance-filters">
        <label>Course<select value={courseId || report?.course?._id || ''} onChange={changeCourse}>{!courses.length && <option value="">{loading ? 'Loading courses…' : 'No assigned courses'}</option>}{courses.map(course => <option key={course._id} value={course._id}>{course.courseCode} · {course.title}</option>)}</select></label>
        <label>Year / Batch<select disabled={loading} value={batch} onChange={event => { setBatch(event.target.value); closeDetails(); }}><option value="">All batches</option>{(report?.batches || []).map(year => <option key={year} value={year}>{year}</option>)}{batch && !report?.batches?.includes(batch) && <option value={batch}>{batch}</option>}</select></label>
        <label>Assessment<select disabled={loading} value={assessmentId} onChange={event => { setAssessmentId(event.target.value); closeDetails(); }}><option value="">All assessments</option>{(report?.assessments || []).map(assessment => <option key={assessment._id} value={assessment._id}>{assessment.title}</option>)}</select></label>
      </div>
      {!loading && allocation && (allocation.allocatedMarks > 100 || !!allocation.invalidAssessmentCount) && <div role="status" className="performance-alert">{allocation.allocatedMarks > 100 ? 'Allocations exceed 100 marks. Update assessment maxima to finalize results.' : ''}{!!allocation.invalidAssessmentCount && ' ' + allocation.invalidAssessmentCount + ' invalid assessments excluded.'}</div>}
      <div className="performance-list-heading"><div><h2>Student records <span>{loading ? '…' : students.length}</span></h2><p>{hasAssessmentFilter ? 'Showing students with saved marks for the selected assessments.' : 'Total marks combine all saved course results.'}</p></div>{!loading && allocation && <div className="performance-allocation"><span><strong>100</strong> course marks</span><span><strong>{allocation.allocatedMarks}</strong> allocated</span><span><strong>{allocation.remainingMarks}</strong> remaining</span><span className="performance-threshold">Pass mark: {allocation.passingThreshold == null ? 'Not set' : allocation.passingThreshold + '/100'}</span></div>}</div>
      {loading ? <div className="performance-empty" role="status"><div className="spinner" /><p>Loading student records…</p></div> : !students.length ? <div className="performance-empty"><span className="performance-empty-symbol">⌕</span><h3>{error ? 'Records unavailable' : 'No students found'}</h3><p>{error ? 'Retry to load the latest records.' : 'Try another course, batch or assessment.'}</p></div> : <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Student</th><th>Student ID</th><th>Course</th><th>Year / Batch</th><th>Course total</th>{hasAssessmentFilter && <th>{filteredMarksLabel}</th>}<th><span className="performance-sr-only">Actions</span></th></tr></thead><tbody>{students.map(student => <tr key={student._id}>
        <td><div className="performance-student"><span className="performance-avatar" aria-hidden="true">{student.student?.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span><strong>{student.student}</strong></div></td><td><span className="performance-id">{student.studentId}</span></td>
        <td><div className="performance-course-name">{student.courseName || student.course}</div><small className="performance-muted">{report?.course?.courseCode}</small></td><td>{student.batches?.join(', ') || '—'}</td>
        <td><div className="performance-score"><strong>{student.hasMarks ? student.totalMarks : '—'}<span>/100</span></strong><div className="performance-progress"><span style={{ width: Math.max(0, Math.min(100, student.totalMarks || 0)) + '%' }} /></div><small>{student.status}</small></div></td>
        {hasAssessmentFilter && <td><strong>{student.filteredMarks}<span className="performance-muted">/{student.filteredMaximum}</span></strong></td>}
        <td><button type="button" className="performance-view" aria-label={'View results for ' + student.student} onClick={() => setSelectedStudentId(String(student._id))}>View <span aria-hidden="true">↗</span></button></td>
      </tr>)}</tbody></table></div>}
    </section>
    {showReport && <StudentPerformanceReport courseId={courseId || report?.course?._id} batch={batch} onClose={closeReport} />}
    {selectedStudent && <StudentResultsModal student={selectedStudent} onClose={closeDetails} />}
  </div>;
}
