import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import TeachingIcon from '../components/TeachingIcon';
import './Certificates.css';

const timeZone = 'Africa/Nairobi';
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone });
const dateInputFormat = new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
const message = (error, fallback) => error.response?.data?.message || fallback;
const eligible = row => row.status === 'completed' && !row.certificate;

function ViewPdf({ id, iconOnly = false }) {
  return <a className="btn btn-secondary" href={api.getUri({ url: `/certificates/${id}/pdf` })}
    target="_blank" rel="noopener noreferrer" aria-label={iconOnly ? 'View PDF' : undefined} title={iconOnly ? 'View PDF' : undefined}>
    {iconOnly ? <TeachingIcon name="eye" size={17} /> : <>View PDF <span aria-hidden="true">↗</span></>}
  </a>;
}

function IssuedCertificateRow({ certificate }) {
  const downloadUrl = api.getUri({ url: `/certificates/${certificate._id}/pdf`, params: { download: 1 } });
  return <li className="certificates-issued-row">
    <div className="certificates-issued-course">
      <span className="certificates-icon"><TeachingIcon name="certificate" size={19} /></span>
      <h3>{certificate.courseTitle}</h3>
    </div>
    <div className="certificates-issued-details">
      <strong><TeachingIcon name="profile" size={14} />{certificate.studentName}</strong>
      <p><TeachingIcon name="calendar" size={14} /><span>
        <span className="certificates-issued-number">{certificate.certificateNo}</span>
        {' · '}{dateFormat.format(new Date(certificate.awardedAt))}{' · '}{certificate.creditHours} hours
      </span></p>
    </div>
    <div className="certificates-issued-actions">
      <ViewPdf id={certificate._id} iconOnly />
      <a className="btn btn-primary" href={downloadUrl} aria-label="Download PDF" title="Download PDF">
        <TeachingIcon name="download" size={17} />
      </a>
    </div>
  </li>;
}

function CourseCertificates() {
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
  const [draftError, setDraftError] = useState('');
  const [notice, setNotice] = useState('');
  const selectAllRef = useRef(null);
  const dialogRef = useRef(null);
  const historyHeadingRef = useRef(null);
  const focusHistoryAfterIssue = useRef(false);
  const preparing = Boolean(draft);
  const course = courses.find(item => item._id === courseId);
  const candidates = rows.filter(eligible);
  const allSelected = candidates.length > 0 && candidates.length === selected.size;
  const totalCredit = course?.creditHours > 0 ? `${course.creditHours} hours` : 'Not set';

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
      if (!controller.signal.aborted) setRows(data.data);
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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (preparing && !dialog.open) dialog.showModal();
    if (!preparing && dialog.open) dialog.close();
  }, [preparing]);

  useEffect(() => {
    if (!courseId && focusHistoryAfterIssue.current) {
      focusHistoryAfterIssue.current = false;
      historyHeadingRef.current?.focus();
    }
  }, [courseId]);

  function changeCourse(next) {
    if (next === courseId) return;
    setLoading(Boolean(next));
    setCourseId(next);
    setRows([]);
    setSelected(new Set());
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

  function prepare(students) {
    setDraftError('');
    setNotice('');
    setStartingNumber('');
    setDraft({
      courseTitle: course.title,
      awardDate: dateInputFormat.format(new Date()),
      students: students.map(row => ({ ...row, suffix: '', issueError: '' })),
    });
  }

  function fillNumbers() {
    if (!/^\d{1,16}$/.test(startingNumber)) {
      setDraftError('Enter a starting suffix with 1–16 digits.');
      return;
    }
    const start = BigInt(startingNumber);
    if (String(start + BigInt(draft.students.length - 1)).length > 16) {
      setDraftError('The last suffix would exceed 16 digits.');
      return;
    }
    setDraftError('');
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
      setDraftError('Each student must have a different certificate number.');
      return;
    }
    setBusy(true);
    setDraftError('');
    setNotice('');
    const issued = new Map();
    const failed = [];
    try {
      for (const row of draft.students) {
        try {
          const { data } = await api.post('/certificates', {
            enrollmentId: row._id, studentName: row.studentName, courseTitle: draft.courseTitle,
            suffix: row.suffix, awardDate: draft.awardDate,
          });
          issued.set(row._id, data.data);
        } catch (err) {
          failed.push({ ...row, issueError: message(err, 'Could not issue this certificate.') });
        }
      }
      if (issued.size) {
        setRows(current => current.map(row => issued.has(row._id) ? { ...row, certificate: issued.get(row._id) } : row));
        setSelected(current => new Set([...current].filter(id => !issued.has(id))));
      }
      setDraft(failed.length ? { ...draft, students: failed } : null);
      if (failed.length) {
        setDraftError(`${issued.size} issued. Review the errors for the remaining certificates.`);
      } else {
        focusHistoryAfterIssue.current = true;
        changeCourse('');
      }
    } finally {
      setBusy(false);
    }
  }

  return <>
  <section className="certificates-panel certificates-workspace" aria-labelledby="issue-certificate">
    <header className="certificates-hero">
      <span className="certificates-icon"><TeachingIcon name="certificate" size={25} /></span>
      <div className="certificates-hero-copy">
        <h2 id="issue-certificate">Issue Course <span>Certificates</span></h2>
        <p>Select a course to view the roster and issue certificates.</p>
      </div>
    </header>
    <div className="certificates-course-bar">
      <span className="certificates-icon"><TeachingIcon name="graduate" size={18} /></span>
      <label className="certificates-course">Course
        <select value={courseId} onChange={event => changeCourse(event.target.value)} disabled={busy || loadingCourses}>
          <option value="">{loadingCourses ? 'Loading courses…' : 'Choose a course'}</option>
          {courses.map(item => <option key={item._id} value={item._id}>{item.title}{item.code ? ` · ${item.code}` : ''}</option>)}
        </select>
      </label>
      {course && <div className="certificates-total"><small>Total course credit</small><strong>{totalCredit}</strong></div>}
    </div>
    {error && <p role="alert" className="certificates-error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading && <p role="status">Loading students…</p>}
    {course && !loading && !rows.length && !error && <p role="status">No students are enrolled in this course.</p>}
    {course && !loading && rows.length > 0 && <>
      <div className="certificates-toolbar">
        <div><h3 id="certificate-roster-title">Course roster</h3><small>{rows.length} enrollments · {candidates.length} eligible</small></div>
        <div className="certificates-actions"><span>{selected.size} selected</span>
          <button type="button" className="btn btn-primary" disabled={busy || !selected.size || !(course.creditHours > 0)}
            onClick={() => prepare(candidates.filter(row => selected.has(row._id)))}>
            <TeachingIcon name="check" size={15} /> Prepare selected
          </button>
        </div>
      </div>
      {!(course.creditHours > 0) && <p>Set the course duration and weekly teaching schedule in Course Management before issuing certificates.</p>}
      <div className="certificates-table-wrap"
        role="region" aria-labelledby="certificate-roster-title" tabIndex={0}>
        <table className="certificates-table">
          <thead><tr><th scope="col"><label className="certificates-check">
            <input ref={selectAllRef} type="checkbox" checked={allSelected} disabled={busy || !candidates.length}
              onChange={() => setSelected(new Set(allSelected ? [] : candidates.map(row => row._id)))} /> Select all
          </label></th><th scope="col">Student</th><th scope="col">Year / Cohort</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row._id} className={selected.has(row._id) ? 'certificates-row-selected' : undefined}>
            <td><input type="checkbox" aria-label={`Select ${row.studentName}`} checked={selected.has(row._id)}
              disabled={busy || !eligible(row)} onChange={() => toggle(row._id)} /></td>
            <td><strong>{row.studentName}</strong><small>{row.studentId}</small></td>
            <td>{[row.academicYear, row.cohort].filter(Boolean).join(' · ') || '—'}</td>
            <td><span className="certificates-badge" data-status={row.certificate ? 'issued' : row.status}>
              {(row.certificate || row.status === 'completed') && <TeachingIcon name="check" size={13} />}
              {row.certificate ? 'Issued' : row.status === 'completed' ? 'Completed' : 'Enrolled'}
            </span></td>
            <td>{row.certificate ? <ViewPdf id={row.certificate._id} /> : row.status === 'enrolled'
              ? <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => complete(row)}>Mark completed</button>
              : <button type="button" className="btn btn-primary" disabled={busy || !(course.creditHours > 0)}
                onClick={() => prepare([row])}>Generate certificate</button>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
    <dialog ref={dialogRef} className="certificates-dialog" aria-labelledby="certificate-draft-title"
      onCancel={event => { event.preventDefault(); if (!busy) setDraft(null); }}>
    {draft && <form className="certificates-form" onSubmit={issue} aria-busy={busy}>
      <header className="certificates-form-header">
        <h3 id="certificate-draft-title">Prepare {draft.students.length} {draft.students.length === 1 ? 'certificate' : 'certificates'}</h3>
        <button type="button" className="certificates-form-close" aria-label="Close certificate form"
          disabled={busy} onClick={() => setDraft(null)}><span aria-hidden="true">×</span></button>
      </header>
      <div className="certificates-fields">
        <label>Course title on certificates<input autoFocus required maxLength={160} value={draft.courseTitle} disabled={busy}
          onChange={event => setDraft(current => ({ ...current, courseTitle: event.target.value }))} /></label>
        {draft.students.length > 1 && <div className="certificates-number-fill">
          <label>Starting suffix (optional)<input inputMode="numeric" maxLength={16} placeholder="0001" value={startingNumber} disabled={busy}
            onChange={event => setStartingNumber(event.target.value)} /></label>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={fillNumbers}>Fill sequence</button>
        </div>}
      </div>
      <dl className="certificates-details">
        <div><dt>Total course credit</dt><dd>{totalCredit}</dd></div>
        <div>
          <dt><label htmlFor="certificate-award-date">Awarded</label></dt>
          <dd><input type="date" id="certificate-award-date" required min="0001-01-01" max="9999-12-31"
            value={draft.awardDate} disabled={busy}
            onChange={event => setDraft(current => ({ ...current, awardDate: event.target.value }))} /></dd>
        </div>
      </dl>
      {draftError && <p role="alert" className="certificates-error">{draftError}</p>}
      <div className="certificates-drafts">
        {draft.students.map(row => <div className="certificates-draft" key={row._id}>
          <label>Student name · {row.studentId}<input required maxLength={120} value={row.studentName} disabled={busy}
            onChange={event => editStudent(row._id, 'studentName', event.target.value)} /></label>
          <label>Certificate number suffix
            <span className="certificates-serial"><span>TA: {draft.awardDate.slice(0, 4) || 'YYYY'}-</span>
              <input required inputMode="numeric" pattern="[0-9]{1,16}" maxLength={16} placeholder="0001" value={row.suffix}
                disabled={busy} onChange={event => editStudent(row._id, 'suffix', event.target.value)} />
            </span>
          </label>
          {row.issueError && <p role="alert" className="certificates-error">{row.issueError}</p>}
        </div>)}
      </div>
      <div className="certificates-actions">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Issuing…' : `Issue ${draft.students.length} ${draft.students.length === 1 ? 'certificate' : 'certificates'}`}</button>
      </div>
    </form>}
    </dialog>
  </section>
  {!courseId && <CertificateHistory admin headingRef={historyHeadingRef} />}
  </>;
}

function CertificateHistory({ admin = false, headingRef }) {
  const [historyError, setHistoryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setHistoryError('');
    api.get('/certificates', { params: { page }, signal: controller.signal }).then(({ data }) => {
      setCertificates(data.data);
      setPages(data.pages);
      setTotal(data.total ?? null);
    }).catch(err => {
      if (!controller.signal.aborted) setHistoryError(message(err, 'Could not load certificates.'));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [page]);

  return <section className={admin ? 'certificates-panel certificates-history' : 'certificates-panel'} aria-labelledby="issued-certificates">
      {admin
        ? <header className="certificates-history-header">
          <h2 id="issued-certificates" ref={headingRef} tabIndex={-1}><TeachingIcon name="certificate" size={25} /> Issued Certificates</h2>
          {!loading && !historyError && <span className="certificates-count">
            <TeachingIcon name="list" size={17} />{total ?? certificates.length} {(total ?? certificates.length) === 1 ? 'certificate' : 'certificates'}{total === null && pages > 1 ? ' on this page' : ''}
          </span>}
        </header>
        : <h2 id="issued-certificates">My certificates</h2>}
      {loading ? <p role="status">Loading certificates…</p> : historyError
        ? <p role="alert" className="certificates-error">{historyError}</p>
        : !certificates.length ? <p>No certificates have been issued yet.</p>
        : admin ? <ul className="certificates-issued-list">
          {certificates.map(certificate => <IssuedCertificateRow key={certificate._id} certificate={certificate} />)}
        </ul>
        : <ul className="certificates-list">
          {certificates.map(cert => <li key={cert._id}>
            <div><strong>{cert.courseTitle}</strong>
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
    </section>;
}

export default function Certificates({ admin = false }) {
  return <div className="certificates-page">
    {admin ? <CourseCertificates /> : <CertificateHistory />}
  </div>;
}
