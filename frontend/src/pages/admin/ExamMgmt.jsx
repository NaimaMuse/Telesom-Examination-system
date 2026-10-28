import { useEffect, useRef, useState } from 'react';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import api from '../../services/api';
import './AssessmentOverview.css';

const statusLabel = status => ({ upcoming: 'Scheduled', scheduled: 'Scheduled', draft: 'Scheduled', published: 'Scheduled', ongoing: 'In progress', completed: 'Completed', cancelled: 'Cancelled' }[status] || status);
const typeLabel = type => ({ exam: 'Exam', quiz: 'Quiz', midterm: 'Midterm', final: 'Final exam', practical: 'Practical', assignment: 'Assignment', assessment: 'Assessment', supplementary: 'Supplementary' }[type] || type || 'Exam');
const dateLabel = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';
export function cohortCounts(row, batch) {
  const cohort = batch ? row.batchStats?.find(item => item.batch === batch) : null;
  return { enrolled: cohort?.enrolled ?? row.enrolledCount, graded: cohort?.graded ?? row.gradedCount };
}
function Details({ row, batch, onClose }) {
  const ref = useRef(null);
  const { enrolled, graded } = cohortCounts(row, batch);
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; ref.current?.focus();
    const key = event => { if (event.key === 'Escape') onClose(); if (event.key === 'Tab') { event.preventDefault(); ref.current?.focus(); } };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); if (document.contains(previous)) previous.focus(); };
  }, [onClose]);
  return <div className="ao-overlay" role="dialog" aria-modal="true" aria-labelledby="ao-detail-title" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="ao-dialog"><header><div><small>ASSESSMENT DETAILS</small><h2 id="ao-detail-title">{row.title}</h2></div><button ref={ref} onClick={onClose} aria-label="Close assessment details">×</button></header><div className="ao-dialog-body"><span className={'ao-status ' + row.status}>{statusLabel(row.status)}</span><dl><div><dt>Course</dt><dd>{row.course?.title || 'Unavailable'}</dd></div><div><dt>Teacher</dt><dd>{row.createdBy?.name || 'Not recorded'}</dd></div><div><dt>Type</dt><dd>{typeLabel(row.type)}</dd></div><div><dt>Year / Batch</dt><dd>{batch || row.batches?.join(', ') || row.academicYear || 'Not specified'}</dd></div><div><dt>Maximum marks</dt><dd>{row.totalMarks}</dd></div><div><dt>Pass mark</dt><dd>{row.passingMarks ?? 'Not set'}</dd></div><div><dt>Date</dt><dd>{dateLabel(row.examDate)}</dd></div><div><dt>Duration</dt><dd>{row.durationMinutes ? row.durationMinutes + ' minutes' : 'Not set'}</dd></div></dl><section className="ao-mark-summary"><div><span>Marks recorded</span><strong>{graded}<small> / {enrolled} students</small></strong></div><div className="ao-track"><span style={{ width: (enrolled ? Math.min(100, graded / enrolled * 100) : 0) + '%' }} /></div><p>{Math.max(0, enrolled - graded)} students without saved marks. Non-participants may remain ungraded.</p></section></div></div></div>;
}
export default function ExamMgmt() {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [course, setCourse] = useState(''), [teacher, setTeacher] = useState(''), [batch, setBatch] = useState(''), [type, setType] = useState(''), [status, setStatus] = useState('');
  const [search] = usePageSearch();
  const [courseOptions, setCourseOptions] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [page, setPage] = useState(1), [selectedKey, setSelectedKey] = useState(null), [retry, setRetry] = useState(0);
  const closeRef = useRef(() => setSelectedKey(null));
  useEffect(() => {
    let active = true, busy = false;
    const controller = new AbortController();
    const load = async () => {
      if (busy) return; busy = true;
      try {
        const { data } = await api.get('/reports/assessment-overview', { signal: controller.signal });
        if (!active) return;
        setItems(data.data || []);
        setCourseOptions(data.courses || []);
        setTeacherOptions(data.teachers || []);
        setError('');
      } catch (error) { if (active) setError(error.response?.data?.message || 'Could not refresh assessments. Retrying automatically.'); }
      finally { busy = false; if (active) setLoading(false); }
    };
    load();
    const refresh = () => { if (!document.hidden) load(); };
    const timer = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { active = false; controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [retry]);
  const batches = [...new Set(items.flatMap(row => row.batches || []))].sort();
  const types = [...new Set(items.map(row => row.type))].sort();
  const scope = items.filter(row => (!course || row.course?._id === course) && (!teacher || row.createdBy?._id === teacher) && (!batch || row.batches?.includes(batch)) && (!type || row.type === type) && matchesPageSearch(search, row.title, row.examCode, row.course?.title, row.course?.courseCode, row.createdBy?.name, row.type));
  const filtered = scope.filter(row => !status || statusLabel(row.status) === status);
  const totals = [{ label: 'Total assessments', count: scope.length }, { label: 'Scheduled', count: scope.filter(row => statusLabel(row.status) === 'Scheduled').length }, { label: 'In progress', count: scope.filter(row => row.status === 'ongoing').length }, { label: 'Completed', count: scope.filter(row => row.status === 'completed').length }];
  const pages = Math.max(1, Math.ceil(filtered.length / 8)), safePage = Math.min(page, pages);
  const selected = items.find(row => row.key === selectedKey);
  const change = setter => event => { setter(event.target.value); setPage(1); };
  return <div className="ao-page exam-mgmt-container"><div className="ao-heading"><h1>Assessment Overview</h1><span>Faculty assessments</span></div>{error && <div className="ao-error" role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Retry</button></div>}<section className="ao-stats" aria-label="Assessment totals">{totals.map(item => <div key={item.label}><span>{item.label}</span><strong>{loading ? '—' : item.count}</strong></div>)}</section><section className="ao-panel"><div className="ao-filters"><label>Course<select value={course} onChange={change(setCourse)}><option value="">All courses</option>{courseOptions.map(item => <option key={item._id} value={item._id}>{item.courseCode} · {item.title}</option>)}</select></label><label>Teacher<select value={teacher} onChange={change(setTeacher)}><option value="">All teachers</option>{teacherOptions.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label>Year / Batch<select value={batch} onChange={change(setBatch)}><option value="">All batches</option>{batches.map(item => <option key={item}>{item}</option>)}</select></label><label>Assessment type<select value={type} onChange={change(setType)}><option value="">All types</option>{types.map(item => <option key={item} value={item}>{typeLabel(item)}</option>)}</select></label></div><div className="ao-list-heading"><h2>Assessment records <span>{filtered.length}</span></h2><select aria-label="Filter assessment status" value={status} onChange={change(setStatus)}><option value="">All statuses</option>{['Scheduled', 'In progress', 'Completed', 'Cancelled'].map(item => <option key={item}>{item}</option>)}</select></div>{loading ? <div className="ao-empty" role="status">Loading assessments…</div> : !filtered.length ? <div className="ao-empty">No assessments match these filters.</div> : <div className="ao-table-wrap"><table><thead><tr><th>Assessment</th><th>Type</th><th>Course</th><th>Teacher</th><th>Maximum</th><th>Date</th><th>Status</th><th>Details</th></tr></thead><tbody>{filtered.slice((safePage - 1) * 8, safePage * 8).map(row => <tr key={row.key}><td><strong>{row.title}</strong><small>{row.examCode}</small></td><td><span className="ao-type">{typeLabel(row.type)}</span></td><td className="ao-course">{row.course?.title || 'Unavailable'}<small>{row.course?.courseCode}</small></td><td>{row.createdBy?.name || 'Not recorded'}</td><td><strong>{row.totalMarks}</strong> marks</td><td>{dateLabel(row.examDate)}</td><td><span className={'ao-status ' + row.status}>{statusLabel(row.status)}</span></td><td><button className="ao-view" aria-label={'View ' + row.title} onClick={() => setSelectedKey(row.key)}>View ↗</button></td></tr>)}</tbody></table></div>}<footer className="ao-pagination"><span>{filtered.length ? (safePage - 1) * 8 + 1 : 0}–{Math.min(safePage * 8, filtered.length)} of {filtered.length} assessments</span><div><button disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>‹</button><span>{safePage} / {pages}</span><button disabled={safePage === pages} onClick={() => setPage(safePage + 1)}>›</button></div></footer></section>{selected && <Details row={selected} batch={batch} onClose={closeRef.current} />}</div>;
}
