import CourseOverview from '../../components/CourseOverview';
import TeachingIcon from '../../components/TeachingIcon';
import {Navigate,useNavigate,useSearchParams} from 'react-router-dom';
import TeacherContracts from '../../components/TeacherContracts';
import TeacherExams from './TeacherExams';
import TeacherResults from './TeacherResults';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useCallback, useMemo, useState } from 'react';
import api from '../../services/api';

const NOTE_FILE_TYPES = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
];

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export default function MyCourse({outlinePage=false}) {
  const [search] = usePageSearch();
  const [params,setParams]=useSearchParams();
  const navigate=useNavigate();
  const outlineUrl=()=>{const query=new URLSearchParams(params);query.delete('tab');return '/teacher/my-course/outline'+(query.size?'?'+query.toString():'');};
  const tab=['overview','outline','notes','students','assessments'].includes(params.get('tab'))?params.get('tab'):'overview';
  const setTab=next=>next==='outline'?navigate(outlineUrl()):setParams(previous=>{const nextParams=new URLSearchParams(previous);nextParams.set('tab',next);return nextParams;});
  const [workspace,setWorkspace]=useState(null),[revision,setRevision]=useState(0),[childBusy,setChildBusy]=useState(false),[assessmentView,setAssessmentView]=useState('activities');
  const requestScope=useMemo(()=>Object.fromEntries(['courseId','academicYear','batch','contractId'].filter(k=>params.has(k)).map(k=>[k,params.get(k)])),[params]);
  const scopeKey=JSON.stringify(requestScope);
  const updateContract=useCallback(data=>{if(data?.contract)setWorkspace(p=>p?{...p,contract:{...p.contract,...data.contract}}:p);setRevision(v=>v+1);},[]);
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteSearch, setNoteSearch] = useState('');
  const [noteError, setNoteError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', file: null });

  useAutoRefresh(async ({ signal, isCurrent, initial }) => {
    try {
      const response = await api.get('/teacher/my-course', { signal,params:requestScope });
      if (!isCurrent()) return;
      const payload = response.data || {};
      setWorkspace(payload);
      setCourse(payload.course || null);
      setStudents(Array.isArray(payload.students) ? payload.students : []);
      setUpcoming(Array.isArray(payload.upcomingExams) ? payload.upcomingExams : []);
      setNotes(Array.isArray(payload.notes) ? payload.notes : []);
      setError(null);
    } catch (err) { if (isCurrent()) setError('My Course data could not refresh. Retrying automatically.'); }
    finally { if (isCurrent()) setLoading(false); }
  }, { enabled: !uploading && !editingNoteId && !form.title && !form.description && !form.file, deps:[scopeKey,revision] });

  const filteredNotes = useMemo(() => {
    const matchingNotes = notes.filter(note => matchesPageSearch(search, note.title, note.description, note.filename));
    if (!noteSearch.trim()) return matchingNotes;
    const q = noteSearch.toLowerCase();
    return matchingNotes.filter((note) =>
      [note.title, note.description, note.filename].some((value) =>
        String(value || '').toLowerCase().includes(q)
      )
    );
  }, [notes, noteSearch, search]);

  const handleFileValidation = (file) => {
    if (!file) {
      return 'Please select a file.';
    }

    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!NOTE_FILE_TYPES.includes(extension)) {
      return 'Only PDF, DOC, DOCX, PPT, and PPTX files are supported.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be 15 MB or smaller.';
    }

    return '';
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    const validationError=form.file?handleFileValidation(form.file):editingNoteId?'':handleFileValidation(null);
    if(!form.title.trim()||validationError){setNoteError(validationError||'Please enter a document title.');return;}
    setUploading(true);setNoteError('');
    try{
      const body=new FormData();body.append('title',form.title.trim());body.append('description',form.description.trim());
      for(const [key,value] of Object.entries(workspace.scope))if(key!=='contractId')body.append(key,value);
      if(form.file)body.append('file',form.file);
      const response=editingNoteId?await api.put('/teacher/materials/'+editingNoteId,body,{headers:{'Content-Type':'multipart/form-data'}}):await api.post('/teacher/materials',body,{headers:{'Content-Type':'multipart/form-data'}});
      setNotes(current=>[response.data.note,...current.filter(n=>n._id!==response.data.note._id)]);
      setEditingNoteId(null);setForm({title:'',description:'',file:null});setRevision(v=>v+1);
    }catch(error){setNoteError(error.response?.data?.message||'Study material could not be saved.');}finally{setUploading(false);}
  };
  const handleDelete=async noteId=>{
    if(!window.confirm('Remove this study material from the course?'))return;
    setUploading(true);setNoteError('');
    try{await api.delete('/teacher/materials/'+noteId);setNotes(current=>current.filter(n=>n._id!==noteId));if(editingNoteId===noteId){setEditingNoteId(null);setForm({title:'',description:'',file:null});}setRevision(v=>v+1);}
    catch(error){setNoteError(error.response?.data?.message||'Study material could not be removed.');}finally{setUploading(false);}
  };
  const downloadNote=async note=>{
    try{const response=await api.get('/teacher/materials/'+note._id+'/file',{responseType:'blob'});const url=URL.createObjectURL(response.data),link=document.createElement('a');link.href=url;link.download=note.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
    catch{setNoteError('The document could not be downloaded.');}
  };
  const hasDraft=childBusy||uploading||!!(editingNoteId||form.title||form.description||form.file);
  const changeCohort=key=>{
    const cohort=workspace.cohorts.find(c=>c.key===key);if(!cohort)return;
    setLoading(true);setWorkspace(null);setCourse(null);setStudents([]);setUpcoming([]);setNotes([]);setChildBusy(false);
    setParams(previous=>{const next=new URLSearchParams(previous);next.set('courseId',cohort.courseId);next.set('academicYear',cohort.academicYear);next.set('batch',cohort.batch);next.delete('contractId');return next;});
  };

  const renderOverview = () => <CourseOverview course={course} contract={workspace?.contract} lessonProgress={workspace?.lessonProgress} students={students} notes={notes.filter(note=>matchesPageSearch(search,note.title,note.description,note.filename))} upcoming={upcoming.filter(exam=>matchesPageSearch(search,exam.title,exam.type,exam.course?.title))} onTab={setTab}/>;
  const renderNotes = () => (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Study Notes</span>
      </div>
      <div className="card-body">
        <form onSubmit={handleUpload} style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="course-note-title">Document Title *</label>
              <input
                className="form-control"
                id="course-note-title" required
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Week 3 – Lecture notes"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="course-note-file">{editingNoteId?'Replace document (optional)':'Select Document *'}</label>
              <input
                className="form-control"
                key={`${editingNoteId||'new'}-${revision}`}
                id="course-note-file"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="course-note-description">Description</label>
            <textarea
              className="form-control"
              rows={3} id="course-note-description" maxLength={4000}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Add a short summary for students..."
            />
          </div>

          {noteError && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', borderRadius: 8, padding: '0.7rem 0.9rem', fontSize: '0.85rem' }}>
              {noteError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Uploading…' : editingNoteId ? 'Save Changes' : 'Upload Document'}
            </button>
            {(editingNoteId||form.title||form.description||form.file) && (
              <button type="button" className="btn btn-secondary" onClick={() => { setEditingNoteId(null); setForm({ title: '', description: '', file: null }); }}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div style={{ marginBottom: '0.75rem' }}>
          <div className="search-input-wrap" style={{ maxWidth: 360 }}>
            <span style={{ color: 'var(--text-muted)' }}>🔍</span>
            <input
              placeholder="Search uploaded notes..."
              value={noteSearch}
              onChange={(event) => setNoteSearch(event.target.value)}
            />
          </div>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-state-icon">📄</div>
            <h3>No notes uploaded yet</h3>
            <p>Upload the first document for this course.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            {filteredNotes.map((note) => (
              <div key={note._id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📄</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{note.title}</div>
                    <div style={{ color: '#6B7280', fontSize: '0.82rem', marginBottom: 4 }}>
                      {note.filename || 'Document'} • {note.size || 'Unknown size'}
                    </div>
                    {note.description && (
                      <div style={{ color: '#4B5563', fontSize: '0.82rem', lineHeight: 1.5 }}>{note.description}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><button type="button" className="btn btn-sm btn-primary" onClick={()=>downloadNote(note)}>Download</button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      setEditingNoteId(note._id);
                      setForm({
                        title: note.title,
                        description: note.description || '',
                        file: null,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(note._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const visibleStudents = students.filter(student => matchesPageSearch(search, student.name, student.studentId, student.email, student.status));

  const renderStudents = () => (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Students</span>
      </div>
      <div className="card-body">
        {visibleStudents.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-state-icon">🎓</div>
            <h3>{search ? 'No matching students' : 'No students enrolled'}</h3>
            <p>{search ? 'Try another name, student ID or email.' : 'There are no students assigned to this course yet.'}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => (
                  <tr key={student._id || student.studentId}>
                    <td style={{ fontWeight: 600 }}>{student.name || 'Student'}</td>
                    <td>{student.studentId || '—'}</td>
                    <td>{student.email || '—'}</td>
                    <td><span className="badge badge-success">{student.status || 'active'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  if(!outlinePage&&tab==='outline')return <Navigate to={outlineUrl()} replace/>;
  if(outlinePage)return <div className="teacher-scope teacher-course-page dedicated-outline-page">
    {error&&<p className="profile-save-error" role="alert">{error}</p>}
    {loading?<div className="card course-loading"><div className="spinner-wrap"><div className="spinner"/></div></div>:workspace?.contract?<TeacherContracts key={workspace.scope.contractId} combined controlledContractId={workspace.scope.contractId} workspaceMode="outline" onContractUpdate={updateContract} onEditingChange={setChildBusy}/>:<section className="outline-start"><TeachingIcon name="book" size={32}/><h2>{course?'Teaching contract not configured':'No assigned course available'}</h2><p>{course?'Ask your administrator to assign a teaching contract before adding outlines and lessons.':'Your assigned course will appear here when it is available.'}</p></section>}
  </div>;

  return (
    <div className="teacher-scope teacher-course-page">
      {course&&<section className="co-course-meta" aria-label="Course details">{[['calendar','blue','Batch / Academic Year',[course.batch,course.academicYear].filter(Boolean).join(' · ')||'Not specified'],['star','amber','Credits',course.credits],['users','blue','Enrolled Students',students.length]].map(([icon,tone,label,value])=><div key={label}><span className={'tp-icon '+tone}><TeachingIcon name={icon}/></span><span><small>{label}</small><strong>{value??'Not specified'}</strong></span></div>)}</section>}
      {error && (
        <div className="course-page-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {workspace?.course&&<section className="course-workspace-selector"><label>Assigned course / batch / academic year<select className="form-control" disabled={hasDraft} value={workspace.cohorts.find(c=>String(c.courseId)===String(workspace.scope.courseId)&&c.batch===workspace.scope.batch&&c.academicYear===workspace.scope.academicYear)?.key||''} onChange={e=>changeCohort(e.target.value)}>{workspace.cohorts.map(c=><option key={c.key} value={c.key}>{c.courseName} · {c.batch||'No batch assigned'} · {c.academicYear}</option>)}</select></label>{workspace.contracts.length>1&&<label>Teaching contract<select className="form-control" disabled={hasDraft} value={workspace.scope.contractId} onChange={e=>{setLoading(true);setParams(previous=>{const next=new URLSearchParams(previous);for(const key of ['courseId','academicYear','batch'])next.set(key,workspace.scope[key]);next.set('contractId',e.target.value);return next;});}}>{workspace.contracts.map(c=><option key={c._id} value={c._id}>{c.startDate} · {c.status}</option>)}</select></label>}<div className="course-cohort-badges"><span>{course.batch||'No batch assigned'}</span><span>{course.academicYear}</span></div></section>}
      {hasDraft&&<p className="course-draft-hint" role="status">Save or cancel your changes before switching course or tab.</p>}
      <div className="course-tabs" role="tablist" aria-label="Course sections">
        {['overview', 'outline', 'notes'].map((nextTab) => (
          <button
            key={nextTab}
            type="button"
            id={`course-${nextTab}-tab`}
            role="tab"
            aria-selected={tab === nextTab}
            aria-controls={`course-${nextTab}-panel`}
            className={`course-tab ${tab === nextTab ? 'active' : ''}`}
            disabled={hasDraft&&tab!==nextTab}
            onClick={() => setTab(nextTab)}
          >
            <TeachingIcon name={{overview:'grid',outline:'book',notes:'folder',students:'users',assessments:'file'}[nextTab]} size={18}/><span>{{overview:'Overview',outline:'Course Outline',notes:'Study Notes',students:'Students',assessments:'Assessments'}[nextTab]}</span>
            <span className="course-tab-count">{nextTab === 'notes' ? notes.length : nextTab === 'students' ? students.length : ''}</span>
          </button>
        ))}
      </div>

      <div className="course-tab-content" id={`course-${tab}-panel`} role="tabpanel" aria-labelledby={`course-${tab}-tab`}>
        {loading ? (
          <div className="card course-loading"><div className="spinner-wrap"><div className="spinner" /></div></div>
        ) : !course ? (<div className="card course-panel"><div className="empty-state"><h3>No assigned course available</h3><p>{error||'Your administrator has not assigned a course yet.'}</p></div></div>) : tab === 'overview' ? (
          renderOverview()
        ) : tab === 'outline' ? (
          workspace?.contract?<TeacherContracts key={workspace.scope.contractId} combined controlledContractId={workspace.scope.contractId} workspaceMode="outline" onContractUpdate={updateContract} onEditingChange={setChildBusy}/>:<div className="card course-panel"><div className="empty-state"><h3>Teaching contract not configured</h3><p>Your administrator must configure a contract for this course and batch before you add outlines and lessons.</p></div></div>
        ) : tab === 'assessments' ? (
          course&&<div className="mycourse-assessment-panel"><div className="course-assessment-tabs"><button type="button" disabled={childBusy} className={assessmentView==='activities'?'active':''} onClick={()=>setAssessmentView('activities')}>Exams, quizzes &amp; assignments</button><button type="button" disabled={childBusy} className={assessmentView==='marks'?'active':''} onClick={()=>setAssessmentView('marks')}>Results &amp; marks</button></div>{assessmentView==='activities'?<TeacherExams key={scopeKey} scope={{...workspace.scope,course}} onEditingChange={setChildBusy} onChange={()=>setRevision(v=>v+1)}/>:<TeacherResults key={scopeKey} scope={workspace.scope} onEditingChange={setChildBusy}/>}</div>
        ) : tab === 'notes' ? (
          renderNotes()
        ) : (
          renderStudents()
        )}
      </div>
    </div>
  );
}
