import './MyCourseDesign.css';
import './CourseOutlineDesign.css';
import './StudyNotes.css';
import CourseStudents from '../../components/CourseStudents';
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
  const requestScope=useMemo(()=>{
    const scope=Object.fromEntries(['courseId','academicYear','cohort','contractId'].filter(k=>params.has(k)).map(k=>[k,params.get(k)]));
    if(!params.has('cohort')&&params.has('batch'))scope.cohort=params.get('batch');
    return scope;
  },[params]);
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
    setParams(previous=>{const next=new URLSearchParams(previous);next.set('courseId',cohort.courseId);next.set('academicYear',cohort.academicYear);next.set('cohort',cohort.cohort);next.delete('contractId');return next;});
  };


  const renderOverview = () => <CourseOverview course={course} contract={workspace?.contract} lessonProgress={workspace?.lessonProgress} students={students} notes={notes.filter(note=>matchesPageSearch(search,note.title,note.description,note.filename))} upcoming={upcoming.filter(exam=>matchesPageSearch(search,exam.title,exam.type,exam.course?.title))} onTab={setTab}/>;
  const renderNotes = () => (
    <section className="study-notes-panel notes-library">
      <header className="notes-library-header"><span className="notes-library-mark"><TeachingIcon name="folder" size={25}/></span><div><span>COURSE RESOURCES</span><h2>Study Notes</h2><p>Share learning materials with your students.</p></div><span className="notes-library-total">{notes.length} {notes.length===1?'document':'documents'}</span></header>
      <div className="notes-library-body">
        <form className="notes-upload-form" onSubmit={handleUpload}>
          <div className="notes-form-title"><TeachingIcon name="file" size={18}/><h3>{editingNoteId?'Edit document':'Upload a document'}</h3><span>PDF · Word · PowerPoint</span></div>
          <div className="notes-form-grid"><div className="notes-field"><label htmlFor="course-note-title">Document title <span>*</span></label><input id="course-note-title" required disabled={uploading} value={form.title} onChange={event=>setForm(current=>({...current,title:event.target.value}))} placeholder="e.g. Week 3 – Lecture notes"/></div>
          <div className="notes-field"><label htmlFor="course-note-file">{editingNoteId?'Replace document (optional)':'Select document *'}</label><input key={(editingNoteId||'new')+'-'+revision} id="course-note-file" type="file" disabled={uploading} accept={NOTE_FILE_TYPES.join(',')} onChange={event=>setForm(current=>({...current,file:event.target.files?.[0]||null}))}/><small>PDF, DOC, DOCX, PPT or PPTX · Up to 15 MB</small></div></div>
          <div className="notes-field"><label htmlFor="course-note-description">Description <small>Optional</small></label><textarea rows={2} maxLength={4000} id="course-note-description" disabled={uploading} value={form.description} onChange={event=>setForm(current=>({...current,description:event.target.value}))} placeholder="Add a short summary for your students…"/></div>
          {noteError && <p className="notes-library-error" role="alert">{noteError}</p>}
          <div className="notes-form-actions"><button type="submit" className="notes-button primary" disabled={uploading}><TeachingIcon name="file" size={15}/>{uploading?'Saving…':editingNoteId?'Save changes':'Upload document'}</button>{(editingNoteId||form.title||form.description||form.file)&&<button type="button" className="notes-button secondary" disabled={uploading} onClick={()=>{setEditingNoteId(null);setForm({title:'',description:'',file:null});setNoteError('');setRevision(value=>value+1);}}>Cancel</button>}</div>
        </form>
        <section className="notes-library-column" aria-label="Document library">
        <div className="notes-library-toolbar"><div><h3>Document library <span>{filteredNotes.length}</span></h3><p>Materials for this course and cohort</p></div><label className="notes-library-search"><TeachingIcon name="search" size={17}/><input type="search" aria-label="Search uploaded notes" placeholder="Search documents…" value={noteSearch} onChange={event=>setNoteSearch(event.target.value)}/></label></div>
        {!filteredNotes.length ? <div className="notes-library-empty"><span><TeachingIcon name="folder" size={32}/></span><h3>{notes.length?'No matching documents':'No documents yet'}</h3><p>{notes.length?'Try another title, description or filename.':'Upload your first document to start the course library.'}</p></div> : <div className="notes-library-list">{filteredNotes.map(note=><article className={'notes-document'+(editingNoteId===note._id?' is-editing':'')} key={note._id}><div className="notes-document-icon"><TeachingIcon name="file" size={24}/><span>{note.fileType?.toUpperCase()||note.filename?.split('.').pop()?.toUpperCase()||'DOC'}</span></div><div className="notes-document-copy"><h4>{note.title}</h4><p className="notes-document-meta"><span>{note.filename||'Document'}</span><span>{note.size||'Size unavailable'}</span></p>{note.description&&<p className="notes-document-description">{note.description}</p>}</div><div className="notes-document-actions"><button type="button" className="notes-button primary" disabled={uploading} onClick={()=>downloadNote(note)}>Download</button><button type="button" className="notes-button secondary" disabled={uploading} onClick={()=>{setEditingNoteId(note._id);setForm({title:note.title,description:note.description||'',file:null});setNoteError('');}}>Edit</button><button type="button" className="notes-button delete" disabled={uploading} onClick={()=>handleDelete(note._id)}>Delete</button></div></article>)}</div>}
        </section>
      </div>
    </section>
  );

  const renderStudents = () => <CourseStudents key={scopeKey} students={students} course={course} search={search} cohorts={workspace?.cohorts||[]} selectedScope={workspace?.scope} onCohortChange={cohort=>{setLoading(true);setParams(previous=>{const next=new URLSearchParams(previous);next.set('tab','students');next.set('courseId',cohort.courseId);next.set('academicYear',cohort.academicYear);next.set('cohort',cohort.cohort);next.delete('contractId');return next;});}}/>;

  if(!outlinePage&&tab==='outline')return <Navigate to={outlineUrl()} replace/>;
  if(outlinePage)return <div className="teacher-scope teacher-course-page professional-course-page dedicated-outline-page">
    <nav className="course-tabs planner-navigation" aria-label="Course sections">{[['overview','grid','Overview'],['outline','book','Course Outline'],['notes','folder','Study Notes'],['students','users','Students']].map(([key,icon,label])=><button type="button" key={key} className={'course-tab '+(key==='outline'?'active':'')} aria-current={key==='outline'?'page':undefined} disabled={hasDraft&&key!=='outline'} onClick={()=>{if(key==='outline')return;const next=new URLSearchParams(params);next.set('tab',key);navigate('/teacher/my-course?'+next.toString());}}><TeachingIcon name={icon} size={18}/><span>{label}</span></button>)}</nav>
    {error&&<p className="profile-save-error" role="alert">{error}</p>}
    {loading?<div className="card course-loading"><div className="spinner-wrap"><div className="spinner"/></div></div>:workspace?.contract?<TeacherContracts key={workspace.scope.contractId} combined controlledContractId={workspace.scope.contractId} workspaceMode="outline" onContractUpdate={updateContract} onEditingChange={setChildBusy}/>:<section className="outline-start"><TeachingIcon name="book" size={32}/><h2>{course?'Teaching contract not configured':'No assigned course available'}</h2><p>{course?'Ask your administrator to assign a teaching contract before adding outlines and lessons.':'Your assigned course will appear here when it is available.'}</p></section>}
  </div>;

  return (
    <div className="teacher-scope teacher-course-page professional-course-page">

      {error && (
        <div className="course-page-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {hasDraft&&<p className="course-draft-hint" role="status">Save or cancel your changes before switching course or tab.</p>}
      <div className="course-tabs" role="tablist" aria-label="Course sections">
        {['overview', 'outline', 'notes', 'students'].map((nextTab) => (
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
          workspace?.contract?<TeacherContracts key={workspace.scope.contractId} combined controlledContractId={workspace.scope.contractId} workspaceMode="outline" onContractUpdate={updateContract} onEditingChange={setChildBusy}/>:<div className="card course-panel"><div className="empty-state"><h3>Teaching contract not configured</h3><p>Your administrator must configure a contract for this course and cohort before you add outlines and lessons.</p></div></div>
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
