import * as XLSX from 'xlsx';
import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

export function reportColumns(report) {
  return [...(report.assessments || [])].sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
}
export function assessmentScore(student, id) {
  return student.assessmentResults?.find(result => result.assessmentId === id);
}

export function createReportWorkbook(XLSX, report, batch = '') {
  const columns = reportColumns(report), students = report.students || [];
  const headers = ['Student name', 'Student ID', 'Course', 'Year / Batch', ...columns.map(item => `${item.title} (${item.type}, /${item.totalMarks})`), 'Total /100'];
  const rows = students.map(student => [student.student, student.studentId, student.courseName || student.course, student.batches?.join(', ') || '', ...columns.map(item => assessmentScore(student, item._id)?.marks ?? null), student.hasMarks ? student.totalMarks : null]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet['!cols'] = headers.map((_, index) => ({ wch: index === 0 ? 30 : index === 2 ? 44 : index < 4 ? 20 : 23 }));
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: headers.length - 1 } }) };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Student performance');
  return book;
}

export default function StudentPerformanceReport({ courseId, batch, onClose }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const dialog = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/teacher/performance', { params: { courseId, batch: batch || undefined, assessmentType: 'all' }, signal: controller.signal })
      .then(({ data }) => setReport(data)).catch(error => { if (!controller.signal.aborted) setError(error.response?.data?.message || 'Report could not be loaded. Close and try again.'); });
    return () => controller.abort();
  }, [courseId, batch]);
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    const keydown = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (document.contains(previous)) previous.focus(); };
  }, [onClose]);
  const columns = reportColumns(report || {}), students = report?.students || [];
  const download = () => {
    setExporting(true);
    setError('');
    try {
      const book = createReportWorkbook(XLSX, report, batch);
      const code = (report.course?.courseCode || 'course').replace(/[^a-z0-9_-]/gi, '-');
      const bytes = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Student-Performance-${code}.xlsx`;
      document.body.appendChild(link);
      try { link.click(); }
      finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 60000); }
    } catch { setError('Excel download failed. Please try again.'); }
    finally { setExporting(false); }
  };
  return <div className="performance-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="performance-report" role="dialog" aria-modal="true" aria-labelledby="performance-report-title" ref={dialog}>
      <header className="performance-report-header"><div><span className="performance-eyebrow">Class gradebook</span><div className="performance-report-title-row"><h2 id="performance-report-title">Student performance report</h2><button type="button" className="performance-button primary" onClick={download} disabled={!report || !students.length || exporting}>{exporting ? 'Preparing Excel…' : '↓ Download Excel'}</button></div><p>{report?.course?.title || 'Loading course…'} · {batch || 'All batches'}</p></div><button className="performance-close" onClick={onClose} aria-label="Close report">×</button></header>
      {error && <div className="performance-alert error" role="alert">{error}</div>}
      <div className="performance-report-body">{!report ? <div className="performance-empty" role="status">{error ? 'Report unavailable' : 'Preparing student report…'}</div> : !students.length ? <div className="performance-empty">No enrolled students in this course and batch.</div> : <table className="performance-table performance-report-table"><thead><tr><th>Student name</th><th>Student ID</th><th>Course</th><th>Year / Batch</th>{columns.map(item => <th key={item._id}>{item.title}<small>{item.type} · /{item.totalMarks}</small></th>)}<th>Total<small>/100</small></th></tr></thead><tbody>{students.map(student => <tr key={student._id}><td><strong>{student.student}</strong></td><td>{student.studentId}</td><td>{student.courseName || student.course}</td><td>{student.batches?.join(', ') || '—'}</td>{columns.map(item => { const score = assessmentScore(student, item._id); return <td key={item._id}>{score ? <strong>{score.marks}<span className="performance-muted">/{score.totalMarks}</span></strong> : <span className="performance-muted">—</span>}</td>; })}<td><strong>{student.hasMarks ? student.totalMarks : '—'}<span className="performance-muted">/100</span></strong></td></tr>)}</tbody></table>}</div>
      <footer className="performance-report-footer"><span>— No saved result. 0 is a recorded score.</span><span>All students in the selected course{batch ? ' and batch' : ''}.</span></footer>
    </section>
  </div>;
}
