import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const PLACEHOLDER_EXAMS = [
  { _id:'ex1', title:'Midterm Exam – CS101', course:'CS101', type:'exam',  date:'2026-11-15', duration:120, totalMarks:100, status:'upcoming' },
  { _id:'ex2', title:'Final Exam – CS201',   course:'CS201', type:'exam',  date:'2026-12-20', duration:180, totalMarks:100, status:'upcoming' },
];
const PLACEHOLDER_QUIZZES = [
  { _id:'q1', title:'Quiz 1 – CS101', course:'CS101', type:'quiz', date:'2026-11-05', duration:30, totalMarks:20, status:'completed' },
  { _id:'q2', title:'Quiz 2 – CS201', course:'CS201', type:'quiz', date:'2026-11-20', duration:30, totalMarks:20, status:'upcoming' },
];

const FIELDS = [
  { key:'title',     label:'Title',         type:'text',   required:true },
  { key:'course',    label:'Course Code',   type:'text',   required:true },
  { key:'date',      label:'Date',          type:'date' },
  { key:'duration',  label:'Duration (min)',type:'number' },
  { key:'totalMarks',label:'Total Marks',   type:'number' },
  { key:'status',    label:'Status', type:'select', options:['upcoming','ongoing','completed','cancelled'] },
];

function CrudModal({ title, fields, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial||{});
  const [saving, setSaving] = useState(false);
  const handleSubmit=async(e)=>{e.preventDefault();setSaving(true);try{await onSave(form);}finally{setSaving(false);}};
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">{title}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2">
              {fields.map(f=>(
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}{f.required&&' *'}</label>
                  {f.type==='select'
                    ?<select className="form-control" value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}><option value="">Select…</option>{f.options.map(o=><option key={o} value={o}>{o}</option>)}</select>
                    :<input className="form-control" type={f.type} required={f.required} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>
                  }
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:380}}>
        <div className="modal-body confirm-content"><div className="confirm-icon">⚠️</div><h3>Confirm Delete</h3><p>{message}</p></div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onCancel}>Cancel</button><button className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading?'Deleting…':'Delete'}</button></div>
      </div>
    </div>
  );
}

const STATUS_BADGE = { upcoming:'warning', scheduled:'warning', completed:'success', ongoing:'info', cancelled:'danger' };

function formatAssessmentDate(value) {
  if (!value) return 'Date not set';
  const dateValue = String(value);
  const date = new Date(dateValue.length === 10 ? `${dateValue}T12:00:00` : dateValue);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TeacherExams() {
  const [tab, setTab] = useState('exams');
  const [exams,   setExams]   = useState(PLACEHOLDER_EXAMS);
  const [quizzes, setQuizzes] = useState(PLACEHOLDER_QUIZZES);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const data    = tab === 'exams' ? exams : quizzes;
  const setData = tab === 'exams' ? setExams : setQuizzes;
  const prefix  = tab === 'exams' ? 'ex' : 'q';
  const typeVal = tab === 'exams' ? 'exam' : 'quiz';
  const allAssessments = [...exams, ...quizzes];
  const scheduledCount = allAssessments.filter((assessment) => ['upcoming', 'scheduled', 'ongoing'].includes(assessment.status)).length;
  const completedCount = allAssessments.filter((assessment) => assessment.status === 'completed').length;

  const handleSave = async(form)=>{
    const payload = { ...form, type: typeVal };
    try{
      if(editTarget&&!editTarget._id.startsWith(prefix))await api.put(`/teacher/exams/${editTarget._id}`,payload);
      else await api.post('/teacher/exams',payload);
    }catch{
      if(editTarget)setData(prev=>prev.map(e=>e._id===editTarget._id?{...e,...payload}:e));
      else setData(prev=>[...prev,{...payload,_id:`${prefix}${Date.now()}`}]);
    }
    setShowModal(false);setEditTarget(null);
  };

  const handleDelete=async()=>{
    setDeleting(true);
    try{await api.delete(`/teacher/exams/${deleteTarget._id}`);}
    catch{setData(prev=>prev.filter(e=>e._id!==deleteTarget._id));}
    finally{setDeleting(false);setDeleteTarget(null);}
  };

  return (
    <div className="teacher-scope teacher-assessments-page">
      <section className="assessment-summary" aria-label="Assessment totals">
        <article className="assessment-summary-item">
          <span className="assessment-summary-icon total" aria-hidden="true">▤</span>
          <div><strong>{allAssessments.length}</strong><span>Total assessments</span></div>
        </article>
        <article className="assessment-summary-item">
          <span className="assessment-summary-icon scheduled" aria-hidden="true">◷</span>
          <div><strong>{scheduledCount}</strong><span>Scheduled</span></div>
        </article>
        <article className="assessment-summary-item">
          <span className="assessment-summary-icon completed" aria-hidden="true">✓</span>
          <div><strong>{completedCount}</strong><span>Completed</span></div>
        </article>
      </section>

      <section className="assessment-list-section" aria-label="Manage assessments">
        <div className="assessment-list-heading">
          <div>
            <span className="assessment-kicker">ASSESSMENT LIBRARY</span>
            <h2>Your assessments</h2>
          </div>
          <div className="assessment-list-actions">
            <div className="assessment-switcher" role="tablist" aria-label="Assessment type">
              <button type="button" id="exams-tab" role="tab" aria-selected={tab === 'exams'} aria-controls="assessments-panel" className={tab === 'exams' ? 'active' : ''} onClick={() => setTab('exams')}>
                <span>Exams</span><span className="assessment-switch-count">{exams.length}</span>
              </button>
              <button type="button" id="quizzes-tab" role="tab" aria-selected={tab === 'quizzes'} aria-controls="assessments-panel" className={tab === 'quizzes' ? 'active' : ''} onClick={() => setTab('quizzes')}>
                <span>Quizzes</span><span className="assessment-switch-count">{quizzes.length}</span>
              </button>
            </div>
            <button type="button" className="assessment-create-button" onClick={() => { setEditTarget(null); setShowModal(true); }}>
              <span aria-hidden="true">+</span> Create {tab === 'exams' ? 'exam' : 'quiz'}
            </button>
          </div>
        </div>

        <div id="assessments-panel" role="tabpanel" aria-labelledby={`${tab}-tab`} className="assessment-list-content">
          {data.length === 0 ? (
            <div className="assessment-empty-state">
              <span className="assessment-empty-mark" aria-hidden="true">{tab === 'exams' ? 'E' : 'Q'}</span>
              <h3>No {tab} yet</h3>
              <p>Your {tab} will appear here once they are created.</p>
              <button type="button" className="assessment-empty-action" onClick={() => { setEditTarget(null); setShowModal(true); }}>
                Create your first {tab === 'exams' ? 'exam' : 'quiz'} <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table assessments-table">
                <thead><tr><th>Assessment</th><th>Course</th><th>Date</th><th>Duration</th><th>Marks</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
                <tbody>
                  {data.map((assessment, index) => (
                    <tr key={assessment._id}>
                      <td><div className="assessment-title-cell"><span className={`assessment-type-mark ${tab}`} aria-hidden="true">{tab === 'exams' ? 'E' : 'Q'}</span><span><strong>{assessment.title}</strong><small>{tab === 'exams' ? 'Exam' : 'Quiz'}</small></span></div></td>
                      <td><span className="assessment-course-code">{assessment.course || '—'}</span></td>
                      <td>{formatAssessmentDate(assessment.date)}</td>
                      <td>{assessment.duration ? `${assessment.duration} min` : '—'}</td>
                      <td>{assessment.totalMarks ?? '—'}</td>
                      <td><span className={`badge badge-${STATUS_BADGE[assessment.status] || 'muted'} assessment-status`}>{assessment.status || 'upcoming'}</span></td>
                      <td>
                        <div className="assessment-row-actions">
                          <button type="button" className="assessment-icon-button" aria-label={`Edit ${assessment.title}`} title="Edit assessment" onClick={() => { setEditTarget(assessment); setShowModal(true); }}>✎</button>
                          <button type="button" className="assessment-icon-button danger" aria-label={`Delete ${assessment.title}`} title="Delete assessment" onClick={() => setDeleteTarget(assessment)}>×</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {showModal && <CrudModal title={editTarget ? `Edit ${typeVal}` : `Create ${typeVal}`} fields={FIELDS} initial={editTarget || {}} onSave={handleSave} onClose={() => { setShowModal(false); setEditTarget(null); }} />}
      {deleteTarget && <ConfirmModal message={`Delete "${deleteTarget.title}"?`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}
    </div>
  );
}
