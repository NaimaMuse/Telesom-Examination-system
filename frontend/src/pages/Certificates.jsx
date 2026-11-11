import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import './Certificates.css';

const timeZone = 'Africa/Nairobi';
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone });
const yearFormat = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone });
const message = (error, fallback) => error.response?.data?.message || fallback;
const eligible = row => row.status === 'completed' && !row.certificate;

function ViewPdf({ id }) {
  return <a className="btn btn-secondary" href={api.getUri({ url: `/certificates/${id}/pdf` })}
    target="_blank" rel="noopener noreferrer">View PDF <span aria-hidden="true">↗</span></a>;
}

function CourseCertificates({ onIssue }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [draft, setDraft] = useState(null);
  const [startingNumber, setStartingNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selectAllRef = useRef(null);
  const course = courses.find(item => item._id === courseId);
  const candidates = rows.filter(eligible);
  const allSelected = candidates.length > 0 && candidates.length === selected.size;
  const totalCredit = course?.creditHours > 0 ? `${course.creditHours} hours` : 'Not set';
  const now = new Date();

  useEffect(() => {
    const controller = new AbortController();
    api.get('/certificates/courses', { signal: controller.signal }).then(({ data }) => {
      setCourses(data.data);
    }).catch(err => {
      if (!controller.signal.aborted) setError(message(err, 'Could not load courses.'));
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingCourses(false);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!courseId) return;
    const controller = new AbortController();
    api.get(`/certificates/courses/${courseId}/students`, { signal: controller.signal }).then(({ data }) => {
      setRows(data.data);
    }).catch(err => {
      if (!controller.signal.aborted) setError(message(err, 'Could not load the course roster.'));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [courseId]);

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selected.size > 0 && !allSelected;
  }, [selected, allSelected]);

  function changeCourse(event) {
    const next = event.target.value;
    if (next === courseId) return;
    setLoading(Boolean(next));
    setCourseId(next);
    setRows([]);
    setSelected(new Set());
    setDraft(null);
    setNotice('');
    setError('');
  }

  function toggle(id) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function complete(row) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.patch(`/certificates/enrollments/${row._id}/complete`);
      setRows(current => current.map(item => item._id === row._id ? { ...item, status: 'completed' } : item));
      setNotice(`${row.studentName} was marked completed.`);
    } catch (err) {
      setError(message(err, 'Could not mark the course completed.'));
    } finally {
      setBusy(false);
    }
  }

  function prepare() {
    setError('');
    setNotice('');
    setStartingNumber('');
    setDraft({
      courseTitle: course.title,
      students: candidates.filter(row => selected.has(row._id)).map(row => ({ ...row, suffix: '', issueError: '' })),
    });
  }

  function fillNumbers() {
    if (!/^\d{1,16}$/.test(startingNumber)) {
      setError('Enter a starting suffix with 1–16 digits.');
      return;
    }
    const start = BigInt(startingNumber);
    if (String(start + BigInt(draft.students.length - 1)).length > 16) {
      setError('The last suffix would exceed 16 digits.');
      return;
    }
    setError('');
    setDraft(current => ({ ...current, students: current.students.map((row, index) => ({
      ...row, suffix: String(start + BigInt(index)).padStart(startingNumber.length, '0'), issueError: '',
    })) }));
  }

  function editStudent(id, key, value) {
    setDraft(current => ({ ...current, students: current.students.map(row =>
      row._id === id ? { ...row, [key]: value, issueError: '' } : row) }));
  }

  async function issue(event) {
    event.preventDefault();
    const suffixes = draft.students.map(row => row.suffix);
    if (new Set(suffixes).size !== suffixes.length) {
      setError('Each student must have a different certificate number.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    const issued = new Map();
    const failed = [];
    try {
      for (const row of draft.students) {
        try {
          const { data } = await api.post('/certificates', {
            enrollmentId: row._id, studentName: row.studentName, courseTitle: draft.courseTitle, suffix: row.suffix,
          });
          issued.set(row._id, data.data);
        } catch (err) {
          failed.push({ ...row, issueError: message(err, 'Could not issue this certificate.') });
        }
      }
      if (issued.size) {
        setRows(current => current.map(row => issued.has(row._id) ? { ...row, certificate: issued.get(row._id) } : row));
        setSelected(current => new Set([...current].filter(id => !issued.has(id))));
        onIssue();
      }
      setDraft(failed.length ? { ...draft, students: failed } : null);
      setNotice(`${issued.size} issued.${failed.length ? ` ${failed.length} need attention below.` : ''}`);
    } finally {
      setBusy(false);
    }
  }

  return <section className="certificates-panel" aria-labelledby="issue-certificate">
    <div className="certificates-intro">
      <div><h2 id="issue-certificate">Issue course certificates</h2>
        <p>Choose a course, select completed students, and prepare their certificates together.</p></div>
      {course && <div className="certificates-total"><small>Total course credit</small><strong>{totalCredit}</strong></div>}
    </div>
    <label className="certificates-course">Course
      <select value={courseId} onChange={changeCourse} disabled={busy || loadingCourses}>
        <option value="">{loadingCourses ? 'Loading courses…' : 'Choose a course'}</option>
        {courses.map(item => <option key={item._id} value={item._id}>{item.title}{item.code ? ` · ${item.code}` : ''}</option>)}
      </select>
    </label>
    {error && <p role="alert" className="certificates-error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading && <p role="status">Loading students…</p>}
    {course && !loading && <>
      <div className="certificates-toolbar">
        <div><h3>Course roster</h3><small>{rows.length} enrollments · {candidates.length} eligible</small></div>
        <div className="certificates-actions"><span>{selected.size} selected</span>
          <button type="button" className="btn btn-primary" disabled={busy || !selected.size || !(course.creditHours > 0) || Boolean(draft)}
            onClick={prepare}>Prepare selected</button>
        </div>
      </div>
      {!(course.creditHours > 0) && <p>Set the course duration and weekly teaching schedule in Course Management before issuing certificates.</p>}
      {!rows.length ? <p>No enrolled or completed students found.</p> : <div className="certificates-table-wrap">
        <table className="certificates-table">
          <thead><tr><th scope="col"><label className="certificates-check">
            <input ref={selectAllRef} type="checkbox" checked={allSelected} disabled={busy || Boolean(draft) || !candidates.length}
              onChange={() => setSelected(new Set(allSelected ? [] : candidates.map(row => row._id)))} /> Select all
          </label></th><th scope="col">Student</th><th scope="col">Year / Cohort</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row._id}>
            <td><input type="checkbox" aria-label={`Select ${row.studentName}`} checked={selected.has(row._id)}
              disabled={busy || Boolean(draft) || !eligible(row)} onChange={() => toggle(row._id)} /></td>
            <td><strong>{row.studentName}</strong><small>{row.studentId}</small></td>
            <td>{[row.academicYear, row.cohort].filter(Boolean).join(' · ') || '—'}</td>
            <td><span className="certificates-badge" data-status={row.certificate ? 'issued' : row.status}>
              {row.certificate ? 'Issued' : row.status === 'completed' ? 'Completed' : 'Enrolled'}
            </span></td>
            <td>{row.certificate ? <ViewPdf id={row.certificate._id} /> : row.status === 'enrolled'
              ? <button type="button" className="btn btn-secondary" disabled={busy || Boolean(draft)} onClick={() => complete(row)}>Mark completed</button>
              : '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </>}
    {draft && <form className="certificates-form" onSubmit={issue}>
      <h3>Prepare {draft.students.length} {draft.students.length === 1 ? 'certificate' : 'certificates'}</h3>
      <div className="certificates-fields">
        <label>Course title on certificates<input required maxLength={160} value={draft.courseTitle} disabled={busy}
          onChange={event => setDraft(current => ({ ...current, courseTitle: event.target.value }))} /></label>
        {draft.students.length > 1 && <div className="certificates-number-fill">
          <label>Starting suffix (optional)<input inputMode="numeric" maxLength={16} placeholder="0001" value={startingNumber} disabled={busy}
            onChange={event => setStartingNumber(event.target.value)} /></label>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={fillNumbers}>Fill sequence</button>
        </div>}
      </div>
      <p>Total course credit: {totalCredit} · Awarded: {dateFormat.format(now)}</p>
      <div className="certificates-drafts">
        {draft.students.map(row => <div className="certificates-draft" key={row._id}>
          <label>Student name · {row.studentId}<input required maxLength={120} value={row.studentName} disabled={busy}
            onChange={event => editStudent(row._id, 'studentName', event.target.value)} /></label>
          <label>Certificate number suffix
            <span className="certificates-serial"><span>TA: {yearFormat.format(now)}-</span>
              <input required inputMode="numeric" pattern="[0-9]{1,16}" maxLength={16} placeholder="0001" value={row.suffix}
                disabled={busy} onChange={event => editStudent(row._id, 'suffix', event.target.value)} />
            </span>
          </label>
          {row.issueError && <p role="alert" className="certificates-error">{row.issueError}</p>}
        </div>)}
      </div>
      <div className="certificates-actions">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setDraft(null); setError(''); }}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Issuing…' : `Issue ${draft.students.length} ${draft.students.length === 1 ? 'certificate' : 'certificates'}`}</button>
      </div>
    </form>}
  </section>;
}

export default function Certificates({ admin = false }) {
  const [historyError, setHistoryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setHistoryError('');
    api.get('/certificates', { params: { page }, signal: controller.signal }).then(({ data }) => {
      setCertificates(data.data);
      setPages(data.pages);
    }).catch(err => {
      if (!controller.signal.aborted) setHistoryError(message(err, 'Could not load certificates.'));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [page, revision]);

  return <div className="certificates-page">
    {admin && <CourseCertificates onIssue={() => { setPage(1); setRevision(current => current + 1); }} />}
    <section className="certificates-panel" aria-labelledby="issued-certificates">
      <h2 id="issued-certificates">{admin ? 'Issued certificates' : 'My certificates'}</h2>
      {loading ? <p role="status">Loading certificates…</p> : historyError
        ? <p role="alert" className="certificates-error">{historyError}</p>
        : !certificates.length ? <p>No certificates have been issued yet.</p>
        : <ul className="certificates-list">
          {certificates.map(cert => <li key={cert._id}>
            <div><strong>{cert.courseTitle}</strong>
              {admin && <small>{cert.studentName}</small>}
              <small>{cert.certificateNo} · {dateFormat.format(new Date(cert.awardedAt))} · {cert.creditHours} hours</small>
            </div>
            <ViewPdf id={cert._id} />
          </li>)}
        </ul>}
      {pages > 1 && <div className="certificates-actions" aria-label="Certificate pages">
        <button className="btn btn-secondary" disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button className="btn btn-secondary" disabled={loading || page === pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>}
    </section>
  </div>;
}
