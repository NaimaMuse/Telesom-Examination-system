import './TeacherDirectory.css';
import { WeeklySchedulePreview } from '../../components/WeeklySchedule';
import { contractEndDate, contractDurationDays, contractDurationLabel } from '../teacher/teachingSchedule.mjs';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TeachingIcon from '../../components/TeachingIcon';
import TeacherAttendance from './TeacherAttendance';
import api from '../../services/api';

const TEACHER_FIELDS = [
  { key: 'name', label: 'Full Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Phone', type: 'tel' },
];

const TEACHER_EDIT_FIELDS = [
  ...TEACHER_FIELDS,
  { key: 'newPassword', label: 'New password (optional)', type: 'password' },
  { key: 'teacherId', label: 'Teacher ID', type: 'text', required: true },
  { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female'] },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'on_leave', 'inactive'], required: true },
  { key: 'course', label: 'Assigned course', type: 'course' },
];

function CrudModal({ title, fields, initial, courses, coursesLoading, onSave, onClose }) {
  const [form, setForm] = useState({ course: '', ...(initial || {}) });
  const [cohorts, setCohorts] = useState([]);
  const [cohortsLoading, setCohortsLoading] = useState(true);
  const [cohortsError, setCohortsError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api.get('/academy/cohorts', {signal: controller.signal})
      .then(({data}) => { if (!controller.signal.aborted) setCohorts((data.cohorts || []).filter(cohort => cohort.status !== 'archived')); })
      .catch(() => { if (!controller.signal.aborted) setCohortsError('Cohorts could not load. Close and reopen this form to retry.'); })
      .finally(() => { if (!controller.signal.aborted) setCohortsLoading(false); });
    return () => controller.abort();
  }, []);
  const [teacherContracts,setTeacherContracts]=useState([]);
  const [contractsLoading,setContractsLoading]=useState(!!initial?._id);
  const [contractLoadError,setContractLoadError]=useState('');
  const chooseContract=contract=>setForm(current=>({...current,editContractBasis:contract?.dayBasis||'teaching',editContractId:contract?._id||'',editContractDays:contract?.totalContractDays||'',editContractStart:contract?.startDate||'',editContractEnd:contract?.endDate||''}));
  useEffect(()=>{
    if(!initial?._id)return;
    const controller=new AbortController();
    api.get('/teacher-contracts',{params:{teacher:initial._id},signal:controller.signal}).then(({data})=>{
      if(controller.signal.aborted)return;
      const records=data.contracts||[];setTeacherContracts(records);chooseContract(records.find(contract=>contract.status==='active')||records[0]);
    }).catch(()=>{if(!controller.signal.aborted)setContractLoadError('Contracts could not load. Close and reopen the form to retry.');}).finally(()=>{if(!controller.signal.aborted)setContractsLoading(false);});
    return()=>controller.abort();
  },[initial?._id]);
  const selectedCourse = courses.find(course => course._id === form.course);
  useEffect(() => {
    if (initial?._id || !selectedCourse) return;
    const cohort=cohorts.find(item => item.name===selectedCourse.cohort && item.academicYear===selectedCourse.academicYear);
    setForm(current => ({...current,contractCohortId:cohort?._id||'',contractCohort:cohort?.name||'',contractAcademicYear:cohort?.academicYear||''}));
  }, [selectedCourse, cohorts, initial?._id]);
  useEffect(() => {
    setForm(current => ({...current,contractEnd:contractEndDate(current.contractStart,contractDurationDays(current.contractStart,current.contractDays,current.contractDurationUnit?.toLowerCase())),...(current.editContractBasis==='calendar'?{editContractEnd:contractEndDate(current.editContractStart,current.editContractDays)}:{})}));
  }, [form.contractStart, form.contractDays, form.contractDurationUnit, form.editContractStart, form.editContractDays, form.editContractBasis]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fields.some(field => field.type === 'cohort') && !form.contractCohortId) { setError('Select an existing contract cohort.'); return; }
    setSaving(true);
    setError('');
    try { await onSave(form); }
    catch (saveError) { setError(saveError.response?.data?.message || saveError.message || 'Teacher could not be saved.'); }
    finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-box teacher-form-modal${initial?._id ? '' : ' teacher-create-modal'}`} role="dialog" aria-modal="true" aria-labelledby="teacher-form-title" onClick={e => e.stopPropagation()}>
        <div className="modal-header teacher-form-header"><div><span className="teacher-form-eyebrow">TELESOM ACADEMY</span><h2 className="modal-title" id="teacher-form-title">{title}</h2><p>Teacher account &amp; teaching contract</p></div><button type="button" className="modal-close" aria-label="Close teacher form" onClick={onClose}>×</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2 teacher-form-grid">
              {fields.map(f => (
                <div className="form-group" key={f.key}>
                  <label className="form-label" htmlFor={`teacher-${f.key}`}>{f.label}{f.required && ' *'}</label>
                  {f.type === 'course'
                    ? <select id={`teacher-${f.key}`} className="form-control" required={f.required} value={form.course||''} disabled={coursesLoading || courses.length === 0} onChange={e=>setForm(p=>({...p,course:e.target.value}))}><option value="">{coursesLoading ? 'Loading courses…' : courses.length ? 'Select a course' : 'No courses available'}</option>{courses.map(course=><option key={course._id} value={course._id}>{course.courseCode ? `${course.courseCode} · ` : ''}{course.title || course.name}</option>)}</select>
                    : f.type === 'cohort'
                    ? <><select id={`teacher-${f.key}`} className="form-control" required disabled={cohortsLoading || !!cohortsError || !cohorts.length} value={form.contractCohortId || ''} onChange={e => { const cohort = cohorts.find(item => item._id === e.target.value); setForm(current => ({...current, contractCohortId: cohort?._id || '', contractCohort: cohort?.name || '', contractAcademicYear: cohort?.academicYear || ''})); }}><option value="">{cohortsLoading ? 'Loading cohorts…' : cohortsError ? 'Cohorts unavailable' : cohorts.length ? 'Select a cohort' : 'No cohorts available'}</option>{cohorts.filter(cohort => !selectedCourse?.cohort || (cohort.name===selectedCourse.cohort && cohort.academicYear===selectedCourse.academicYear)).map(cohort => <option key={cohort._id} value={cohort._id}>{cohort.name} · {cohort.academicYear}</option>)}</select>{cohortsError && <p role="alert">{cohortsError}</p>}</>
                    : f.type === 'select'
                    ? <select id={`teacher-${f.key}`} required={f.required} className="form-control" value={form[f.key]||''} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}><option value="">Select…</option>{f.options.map(o=><option key={o} value={o}>{o}</option>)}</select>
                    : <input id={`teacher-${f.key}`} className="form-control" type={f.type} readOnly={f.key==='contractEnd'} minLength={f.type === 'password' ? 8 : undefined} maxLength={f.type === 'password' ? 72 : undefined} max={f.key==='contractDays'?36500:undefined} autoComplete={f.type === 'password' ? 'new-password' : undefined} min={f.type==='number'?1:undefined} step={f.type==='number'?1:undefined} required={f.required} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
                  }
                </div>
              ))}
            </div>
            {selectedCourse && <WeeklySchedulePreview schedule={selectedCourse.teachingSchedule || []} title="Assigned course schedule" />}
            <p className="teacher-password-hint">{initial?._id ? 'Leave the password field blank to keep the current password.' : 'The teacher signs in with the password you set.'}</p>
            {initial?._id && <section className="teacher-edit-contract"><h3>Teaching contract</h3>
              {contractsLoading?<p>Loading contracts…</p>:contractLoadError?<p role="alert">{contractLoadError}</p>:!teacherContracts.length?<p>No saved contract found. Create one in Teaching &amp; Outlines.</p>:<>
              <label className="form-label" htmlFor="teacher-edit-contract">Course / Year / Cohort</label><select id="teacher-edit-contract" className="form-control" value={form.editContractId||''} onChange={event=>chooseContract(teacherContracts.find(contract=>contract._id===event.target.value))}>{teacherContracts.map(contract=><option key={contract._id} value={contract._id}>{contract.course?.title||contract.course?.name} · {contract.academicYear} / {contract.cohort} · {contract.contractStatus}</option>)}</select>
              <label className="form-label">Duration basis<select className="form-control" value={form.editContractBasis||'teaching'} onChange={event=>setForm(current=>({...current,editContractBasis:event.target.value}))}><option value="calendar">Calendar days</option><option value="teaching">Teaching days (legacy)</option></select></label><div className="grid-2 teacher-form-grid">{[['editContractDays','Contract days','number'],['editContractStart','Start date','date'],['editContractEnd',form.editContractBasis==='calendar'?'End date (calculated)':'End date (optional)','date']].map(([key,label,type])=><div className="form-group" key={key}><label className="form-label" htmlFor={key}>{label}</label><input id={key} className="form-control" type={type} readOnly={key==='editContractEnd' && form.editContractBasis==='calendar'} min={type==='number'?1:undefined} step={type==='number'?1:undefined} required={key!=='editContractEnd'} value={form[key]||''} onChange={event=>setForm(current=>({...current,[key]:event.target.value}))}/></div>)}</div>
              </>}
            </section>}
          </div>
          {error && <div className="teacher-create-error" role="alert">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || coursesLoading || courses.length === 0 || contractsLoading || !!contractLoadError}>{saving?'Saving…':initial?._id?'Save changes':'Create teacher'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeacherDetailsModal({ teacher, courseAssignment, loading, error, onClose }) {
  const course = courseAssignment?.course;
  const details = [
    ['Full name', teacher.name],
    ['Teacher ID', teacher.teacherId],
    ['Account status', teacher.user?.isActive === false ? 'Inactive' : (teacher.status || 'Active')],
    ['Work email', teacher.email],
    ['Phone', teacher.phone],
    ['Course', teacher.department],
    ['Specialization', teacher.specialization || teacher.subjects],
    ['Qualification', teacher.qualification],
    ['Registered on', teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : null],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-box teacher-details-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-details-title" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header teacher-details-header">
          {teacher.profilePicture && <img className="teacher-details-avatar" style={{objectFit:'cover'}} src={teacher.profilePicture} alt="Teacher profile"/>}<div className="teacher-details-avatar" style={teacher.profilePicture?{display:'none'}:undefined} aria-hidden="true">{(teacher.name || 'T').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
          <div className="teacher-details-heading"><span className="teacher-directory-kicker">FACULTY PROFILE</span><h2 className="modal-title" id="teacher-details-title">{teacher.name || 'Teacher details'}</h2><p>{teacher.email || 'Email not provided'}</p></div>
          <button type="button" className="modal-close" aria-label="Close teacher details" onClick={onClose}>×</button>
        </header>
        <div className="modal-body teacher-details-body">
          {loading ? (
            <div className="teacher-details-loading"><div className="spinner" /><span>Loading teacher profile…</span></div>
          ) : error ? (
            <div className="teacher-details-error" role="alert">{error}</div>
          ) : <>
          <section className="teacher-details-course">
            <span className="teacher-details-course-icon" aria-hidden="true">▤</span>
            <div><small>ASSIGNED COURSE</small><strong>{course?.title || course?.name || 'No course assigned'}</strong><p>{course?.description || 'No course description available.'}</p></div>
          </section>
          <dl className="teacher-details-grid">
            {details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}
          </dl>
          <section className="teacher-details-contracts" aria-label="Teaching contracts">
            <h3>Teaching contracts</h3>
            {teacher.contracts?.length ? teacher.contracts.map(contract => <article className="teacher-details-contract" key={contract._id}>
              <div className="teacher-details-contract-heading"><strong>{contract.course?.title || contract.course?.name || 'Course'}</strong><span>{contract.contractStatus}</span></div>
              <WeeklySchedulePreview schedule={contract.course?.teachingSchedule || []} /><div className="teacher-details-contract-metrics">{[['Teaching days completed',contract.completedTeachingDays],['Upcoming teaching days',contract.remainingScheduledTeachingDays??'—'],['Total teaching days',contract.targetTeachingDays??'—']].map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
              <dl className="teacher-details-grid">{[['Cohort',contract.cohort],['Academic year',contract.academicYear],['Start date',contract.startDate],['End date',contract.endDate || 'Not set'],['Contract duration',contractDurationLabel(contract)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl>
            </article>) : <p className="teacher-details-contract-empty">No teaching contract configured.</p>}
          </section>
          </>}
        </div>
        <footer className="modal-footer"><button type="button" className="btn btn-primary" onClick={onClose}>Done</button></footer>
      </section>
    </div>
  );
}

function ConfirmModal({ message, error, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={loading ? undefined : onCancel}>
      <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:380}}>
        <div className="modal-body confirm-content">
          <div className="confirm-icon">⚠️</div>
          <h3>Confirm Delete</h3>
          <p>{message}</p>
          {error && <div className="teacher-create-error" role="alert">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading?'Deleting…':'Delete'}</button>
        </div>
      </div>
    </div>
  );
}

function TeacherCredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState('');

  const copyValue = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setCopyError('');
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopyError('Copy is unavailable here. Select the value and copy it manually.');
    }
  };

  const credentialRows = [
    ['Email address', credentials.email],
    ['Teacher ID', credentials.teacherId],
    ['Password', credentials.temporaryPassword],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-box teacher-credentials-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-credentials-title" onClick={event => event.stopPropagation()}>
        <header className="modal-header teacher-credentials-header">
          <div>
            <span className="teacher-credentials-kicker">ACCOUNT READY</span>
            <h2 className="modal-title" id="teacher-credentials-title">Teacher sign-in details</h2>
          </div>
          <button type="button" className="modal-close" aria-label="Close credentials" onClick={onClose}>×</button>
        </header>
        <div className="modal-body teacher-credentials-body">
          <div className="teacher-credentials-success"><span aria-hidden="true">✓</span><div><strong>{credentials.name}</strong><p>Teacher account ready</p></div><span className="teacher-ready-pill">Created</span></div>
          <section className="teacher-credential-section" aria-label="Sign-in credentials">
            <h3 className="visually-hidden">Sign-in credentials</h3>
            <div className="teacher-credential-list">
              {credentialRows.map(([label, value]) => (
                <div className={`teacher-credential-row ${label === 'Password' ? 'password' : ''}`} key={label}>
                  <div><span>{label}</span><strong>{value}</strong></div>
                  <button type="button" className={`teacher-credential-copy ${copied === label ? 'is-copied' : ''}`} onClick={() => copyValue(label, value)} aria-label={`Copy ${label}`}>
                    {copied === label ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
            <p className="teacher-credential-hint">Only an administrator can reset this password.</p>
          </section>
          <section className={`teacher-course-assignment ${credentials.warning ? 'has-warning' : ''}`} aria-label="Course assignment">
            <span className="teacher-course-assignment-icon" aria-hidden="true">{credentials.warning ? '!' : '▤'}</span>
            <div><span>Assigned course</span><strong>{credentials.course || 'Not assigned'}</strong></div>
            <span className="teacher-course-assignment-status">{credentials.warning ? 'Needs attention' : 'Assigned'}</span>
          </section>
          {credentials.warning && <p className="teacher-assignment-warning" role="alert">{credentials.warning}</p>}
          {copyError && <p className="teacher-credential-copy-error" role="alert">{copyError}</p>}
        </div>
        <footer className="modal-footer teacher-credentials-footer">
          <span>Share these details privately with the teacher.</span>
          <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}

const PAGE_SIZE = 8;

export default function TeacherMgmt() {
  const [params] = useSearchParams();
  const isAttendance = params.get('view') === 'attendance';

  const navigation = (
    <nav className="teacher-management-nav" aria-label="Teacher management">
      <Link to="/admin/teachers" aria-current={!isAttendance ? 'page' : undefined}>
        <TeachingIcon name="users" size={16}/> Directory
      </Link>
      <Link to="/admin/teachers?view=attendance" aria-current={isAttendance ? 'page' : undefined}>
        <TeachingIcon name="calendar" size={16}/> Teacher Attendance
      </Link>
    </nav>
  );
  return isAttendance
    ? <>{navigation}<TeacherAttendance/></>
    : <TeacherDirectory navigation={navigation}/>;
}

function TeacherDirectory({ navigation }) {
  const [search] = usePageSearch();
  const [teachers, setTeachers] = useState([]);
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  useEffect(() => { setPage(1); }, [search]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherDetailsLoading, setTeacherDetailsLoading] = useState(false);
  const [teacherDetailsError, setTeacherDetailsError] = useState('');
  const teacherDetailsRequest = useRef(0);
  const [showInactive, setShowInactive] = useState(false);
  const [showDirectoryDetails, setShowDirectoryDetails] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchTeachers = useCallback(async (background = false, context = {}) => {
    if (!background) setLoading(true);
    try {
      const res = await api.get('/teachers', { signal: context.signal, params: { limit: 100 } });
      if (context.isCurrent && !context.isCurrent()) return;
      const records = res.data?.data || res.data?.teachers;
      if (Array.isArray(records)) setTeachers(records.map((record) => ({
        ...record,
        name: record.user?.name || record.name || '',
        email: record.user?.email || record.email || '',
        subjects: record.specialization || record.subjects || '',
      })));
    } catch {
      if (context.isCurrent && !context.isCurrent()) return; if (!background) setTeachers([]); } finally { if (!background && (!context.isCurrent || context.isCurrent())) setLoading(false); }
  }, []);



  const fetchCourseAssignments = useCallback(async (background = false, context = {}) => {
    try {
      const response = await api.get('/course-teachers', { signal: context.signal, params: { limit: 100, status: 'active' } });
      if (context.isCurrent && !context.isCurrent()) return;
      const rows = response.data?.data || [];
      setCourseAssignments(Array.isArray(rows) ? rows : []);
    } catch {
      if (context.isCurrent && !context.isCurrent()) return;
      setCourseAssignments([]);
    }
  }, []);



  const fetchCourses = useCallback(async (background = false, context = {}) => {
    if (!background) setCoursesLoading(true);
    try {
      const response = await api.get('/courses', { signal: context.signal, params: { limit: 100, status: 'active' } });
      if (context.isCurrent && !context.isCurrent()) return;
      const rows = response.data?.data || response.data?.courses || [];
      setCourses(Array.isArray(rows) ? rows.filter((course) => course.isActive !== false && course.status !== 'inactive') : []);
    } catch {
      if (context.isCurrent && !context.isCurrent()) return;
      if (!background) setCourses([]);
    } finally {
      if (!background && (!context.isCurrent || context.isCurrent())) setCoursesLoading(false);
    }
  }, []);



  useAutoRefresh(async context => {
    await Promise.all([fetchTeachers(!context.initial, context), fetchCourseAssignments(!context.initial, context), fetchCourses(!context.initial, context)]);
  }, { enabled: !showModal && !deleting });

  const currentTeachers = teachers.filter(teacher => teacher.status !== 'inactive' && teacher.user?.isActive !== false);
  const filtered = (showInactive ? teachers : currentTeachers).filter(teacher => matchesPageSearch(search, teacher.name, teacher.email, teacher.phone, teacher.teacherId, teacher.department, teacher.subjects, courseAssignments.filter(a => String(a.teacher?._id || a.teacher) === String(teacher._id)).map(a => [a.course?.title, a.course?.name, a.course?.courseCode])));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { setPage(current => Math.min(current, totalPages)); }, [totalPages]);
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const activeTeachers = currentTeachers.filter((teacher) => (teacher.status || 'active') === 'active').length;
  const assignedTeacherIds = new Set(courseAssignments.map(assignment => String(assignment.teacher?._id || assignment.teacher)));
  const assignedTeachers = currentTeachers.filter(teacher => assignedTeacherIds.has(String(teacher._id))).length;
  const unassignedTeachers = currentTeachers.length - assignedTeachers;
  const getTeacherAssignment = (teacher) => courseAssignments.find((assignment) => String(assignment.teacher?._id || assignment.teacher) === String(teacher._id));

  const viewTeacherDetails = async (teacher) => {
    const requestId = teacherDetailsRequest.current + 1;
    teacherDetailsRequest.current = requestId;
    setSelectedTeacher(teacher);
    setTeacherDetailsLoading(true);
    setTeacherDetailsError('');
    try {
      const [response, contractsResponse] = await Promise.all([api.get(`/teachers/${teacher._id}/details`), api.get('/teacher-contracts', {params:{teacher:teacher._id}})]);
      if (requestId !== teacherDetailsRequest.current) return;
      const record = response.data?.data || response.data?.teacher;
      if (!record) throw new Error('Teacher profile could not be found.');
      setSelectedTeacher({
        ...record,
        contracts: contractsResponse.data?.contracts || [],
        name: record.user?.name || record.name || teacher.name,
        email: record.user?.email || record.email || teacher.email,
      });
    } catch (error) {
      if (requestId === teacherDetailsRequest.current) {
        setTeacherDetailsError(error.response?.data?.message || error.message || 'Could not load this teacher profile.');
      }
    } finally {
      if (requestId === teacherDetailsRequest.current) setTeacherDetailsLoading(false);
    }
  };

  const handleSave = async (form) => {
    if (editTarget && !String(editTarget._id).startsWith('t')) {
      await api.put(`/teachers/${editTarget._id}`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        teacherId: form.teacherId,
        gender: form.gender,
        ...(form.newPassword ? {newPassword:form.newPassword} : {}),
        status: form.status,
      });
      const assignment = getTeacherAssignment(editTarget);
      const currentCourse = String(assignment?.course?._id || assignment?.course || '');
      if (form.course !== currentCourse) {
        if (!form.course && assignment) {
          await api.patch('/course-teachers/' + assignment._id, {status: 'inactive'});
        } else if (form.course) {
          const selectedCourse = courses.find(course => course._id === form.course);
          const payload = {course: form.course, academicYear: selectedCourse?.academicYear || assignment?.academicYear || String(new Date().getFullYear()), semester: selectedCourse?.semester || '', status: 'active'};
          if (assignment) await api.patch('/course-teachers/' + assignment._id, payload);
          else await api.post('/course-teachers', {...payload, teacher: editTarget._id, role: 'lead', isPrimary: true});
        }
      }
      if(form.editContractId) await api.put('/teacher-contracts/'+form.editContractId,{dayBasis:form.editContractBasis,totalDays:Number(form.editContractDays),startDate:form.editContractStart,endDate:form.editContractEnd||null});
      await Promise.all([fetchTeachers(), fetchCourseAssignments()]);
      setShowModal(false);
      setEditTarget(null);
      return;
    }

    const course = courses.find((item) => item._id === form.course);
    if (!course || !form.contractCohort || !form.contractAcademicYear || !contractDurationDays(form.contractStart,form.contractDays,form.contractDurationUnit?.toLowerCase())) throw new Error('Select a course, matching cohort, start date and valid contract duration.');
    const response = await api.post('/users/teachers', {
      password: form.password,
      name: form.name,
      email: form.email,
      phone: form.phone,
    });
    const teacher = response.data?.data?.teacher;
    const { email, temporaryPassword } = response.data?.data?.credentials || {};
    const teacherId = teacher?.teacherId;
    if (!teacher?._id) throw new Error('Teacher was created but the server did not return its profile ID.');

    let assignmentWarning = '';
    try {
      await api.post('/course-teachers', {
        teacher: teacher._id,
        course: course._id,
        academicYear: form.contractAcademicYear || course.academicYear || String(new Date().getFullYear()),
        semester: course.semester || undefined,
        role: 'lead',
        isPrimary: true,
        status: 'active',
      });
      await api.post('/teacher-contracts', {teacher:teacher._id, course:course._id, academicYear:form.contractAcademicYear || course.academicYear || String(new Date().getFullYear()), cohort:form.contractCohort, startDate:form.contractStart, endDate:form.contractEnd || null, dayBasis:'calendar',totalDays:contractDurationDays(form.contractStart,form.contractDays,form.contractDurationUnit?.toLowerCase())});
    } catch (assignmentError) {
      assignmentWarning = assignmentError.response?.data?.message || 'The account was created, but the course assignment or contract could not be saved. Complete setup in Teacher Contracts.';
    }

    setCreatedCredentials({ name: form.name, email, teacherId, temporaryPassword, course: course.title || course.name, warning: assignmentWarning });
    await Promise.all([fetchTeachers(), fetchCourseAssignments()]);
    setShowModal(false);
    setEditTarget(null);
  };

  const handleDelete = async () => {
    setDeleteError('');
    setDeleting(true);
    try {
      await api.delete(`/teachers/${deleteTarget._id}`);
      setTeachers(current => current.filter(teacher => teacher._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error.response?.data?.message || 'Could not delete this teacher. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="teacher-directory-page">
      <div className="teacher-directory-top">
        <div className="teacher-directory-stats" aria-label="Teacher totals">
          <div><span className="teacher-stat-label">ACTIVE</span><strong>{activeTeachers}</strong><small>Active accounts</small></div>
          <div><span className="teacher-stat-label">ASSIGNED</span><strong>{assignedTeachers}</strong><small>With a course</small></div>
          <div><span className="teacher-stat-label">UNASSIGNED</span><strong>{unassignedTeachers}</strong><small>Need a course assignment</small></div>
        </div>
        {navigation}
      </div>

      <section className="teacher-directory-panel">
        <header className="teacher-directory-panel-header">
          <div>
            <span className="teacher-directory-kicker">STAFF RECORDS</span>
            <h2>Teachers <span>{filtered.length}</span></h2>
          </div>
          <div className="teacher-directory-header-actions">
          {teachers.length>currentTeachers.length && <button type="button" className="teacher-directory-details-toggle" aria-pressed={showInactive} onClick={()=>{setShowInactive(current=>!current);setPage(1);}}>
            {showInactive ? 'Hide inactive' : 'Show inactive'}
          </button>}
          <button type="button" className="teacher-directory-details-toggle" aria-pressed={showDirectoryDetails} onClick={() => setShowDirectoryDetails((current) => !current)}>
            {showDirectoryDetails ? 'Hide details' : 'View details'}
          </button>
          <button type="button" className="teacher-directory-add" onClick={() => { setEditTarget(null); setShowModal(true); }}>
            <span aria-hidden="true">+</span> Add teacher
          </button>
          </div>
        </header>

        {loading ? (
          <div className="teacher-directory-loading"><div className="spinner" /><span>Loading faculty records…</span></div>
        ) : paginated.length === 0 ? (
          <div className="teacher-directory-empty">
            <span aria-hidden="true">T</span><h3>No teachers yet</h3><p>Add a teacher to begin building the faculty directory.</p>
            <button type="button" className="teacher-directory-add" onClick={() => { setEditTarget(null); setShowModal(true); }}>+ Add first teacher</button>
          </div>
        ) : (
          <div className="table-responsive teacher-directory-table-wrap">
            <table className="data-table teacher-directory-table">
              <thead><tr><th>Faculty member</th><th>Course</th><th>Phone</th><th>Status</th>{showDirectoryDetails && <><th>Teacher ID</th><th>Course description</th></>}<th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody> 
                {paginated.map((teacher) => {
                  const assignment = getTeacherAssignment(teacher);
                  const assignedCourse = assignment?.course;
                  return (
                  <tr key={teacher._id}>
                    <td>
                      <div className="teacher-directory-person">
                        <span className="teacher-directory-avatar" aria-hidden="true">{(teacher.name || 'T').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                        <span><strong>{teacher.name || 'Teacher'}</strong><small>{teacher.email || 'Email not provided'}</small></span>
                      </div>
                    </td>
                    <td><span className="teacher-department-tag">{assignedCourse ? `${assignedCourse.courseCode ? `${assignedCourse.courseCode} · ` : ''}${assignedCourse.title || assignedCourse.name || 'Course'}` : 'Not assigned'}</span></td>
                    <td>{teacher.phone || '—'}</td>
                    <td><span className={`teacher-account-status ${teacher.status === 'active' || !teacher.status ? 'is-active' : ''}`}><i aria-hidden="true" />{teacher.status || 'active'}</span></td>
                    {showDirectoryDetails && <><td><code>{teacher.teacherId || '—'}</code></td><td><span className="teacher-subjects-text">{assignedCourse?.description || 'No course description'}</span></td></>}
                    <td>
                      <div className="teacher-directory-actions">
                        <button type="button" className="teacher-directory-edit" onClick={() => viewTeacherDetails(teacher)}>View</button>
                        <button type="button" className="teacher-directory-edit" onClick={() => { setEditTarget({...teacher, course: getTeacherAssignment(teacher)?.course?._id || getTeacherAssignment(teacher)?.course || '', status: teacher.status || 'active'}); setShowModal(true); }}>Edit</button>
                        <button type="button" className="teacher-directory-delete" aria-label={`Delete ${teacher.name || 'teacher'}`} title="Delete teacher" onClick={() => { setDeleteError(''); setDeleteTarget(teacher); }}>×</button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="teacher-directory-pagination">
          <span>Showing {Math.min((page-1)*PAGE_SIZE+1,filtered.length)}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length} faculty</span>
          <div>
            <button type="button" className="page-btn" aria-label="Previous page" disabled={page===1} onClick={() => setPage(current => current-1)}>‹</button>
            {Array.from({length:totalPages},(_,index)=><button type="button" key={index} className={`page-btn ${page===index+1?'active':''}`} aria-current={page===index+1?'page':undefined} onClick={() => setPage(index+1)}>{index+1}</button>)}
            <button type="button" className="page-btn" aria-label="Next page" disabled={page===totalPages} onClick={() => setPage(current => current+1)}>›</button>
          </div>
        </footer>
      </section>

      {showModal && <CrudModal title={editTarget?'Edit Teacher':'Add New Teacher'} fields={editTarget ? TEACHER_EDIT_FIELDS : [...TEACHER_FIELDS, { key: 'password', label: 'Password', type: 'password', required: true }, { key: 'course', label: 'Course', type: 'course', required: true }, { key: 'contractDays', label: 'Contract duration', type: 'number', required: true }, { key: 'contractDurationUnit', label: 'Duration unit', type: 'select', options: ['Days', 'Months'] }, { key: 'contractCohort', label: 'Contract cohort', type: 'cohort', required: true }, { key: 'contractStart', label: 'Start date', type: 'date', required: true }, { key: 'contractEnd', label: 'End date (calculated)', type: 'date' }]} initial={editTarget||{}} courses={courses} coursesLoading={coursesLoading} onSave={handleSave} onClose={()=>{setShowModal(false);setEditTarget(null);}} />}
      {deleteTarget && <ConfirmModal message={`Permanently delete "${deleteTarget.name}" and their login account? This cannot be undone.`} error={deleteError} onConfirm={handleDelete} onCancel={()=>setDeleteTarget(null)} loading={deleting} />}
      {createdCredentials && <TeacherCredentialsModal credentials={createdCredentials} onClose={() => setCreatedCredentials(null)} />}
      {selectedTeacher && <TeacherDetailsModal teacher={selectedTeacher} courseAssignment={selectedTeacher.assignedCourse || null} loading={teacherDetailsLoading} error={teacherDetailsError} onClose={() => { teacherDetailsRequest.current += 1; setSelectedTeacher(null); setTeacherDetailsError(''); }} />}
    </div>
  );
}
