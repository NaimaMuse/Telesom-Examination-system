import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function StudentProfile() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name:      user?.name      || '',
    email:     user?.email     || '',
    phone:     user?.phone     || '',
    program:   user?.program   || '',
    year:      user?.year      || '',
    studentId: user?.studentId || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const initials = (user?.name||'S').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

  const handleSave = async(e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/student/profile', form);
    } catch {}
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(()=>setSaved(false), 3000);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>My Profile</h1><p>Manage your student account</p></div>
        {!editing && <button className="btn btn-primary" onClick={()=>setEditing(true)}>✏️ Edit Profile</button>}
      </div>

      {saved && <div style={{ background:'#d1fae5',color:'#065f46',padding:'0.75rem 1.25rem',borderRadius:'var(--radius-sm)',marginBottom:'1rem',fontWeight:600,fontSize:'0.875rem' }}>✅ Profile updated.</div>}

      <div className="profile-header" style={{marginBottom:'1.5rem'}}>
        <div className="profile-avatar-lg">{initials}</div>
        <div className="profile-header-info">
          <h2>{user?.name || 'Student'}</h2>
          <p>🎓 Student {user?.studentId ? `· ID: ${user.studentId}` : ''}</p>
          <p>{user?.email}</p>
          {user?.program && <p>📚 {user.program} {user.year ? `· ${user.year}` : ''}</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Profile Details</span></div>
        <div className="card-body">
          {editing ? (
            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required/></div>
                <div className="form-group"><label className="form-label">Email *</label><input className="form-control" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} required/></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-control" type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Student ID</label><input className="form-control" value={form.studentId} readOnly disabled style={{opacity:0.6}} /></div>
                <div className="form-group"><label className="form-label">Program</label><input className="form-control" value={form.program} onChange={e=>setForm(p=>({...p,program:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Year / Level</label><input className="form-control" value={form.year} onChange={e=>setForm(p=>({...p,year:e.target.value}))}/></div>
              </div>
              <div style={{display:'flex',gap:'0.75rem',marginTop:'0.5rem'}}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Save Changes'}</button>
                <button type="button" className="btn btn-secondary" onClick={()=>setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="grid-2">
              {[
                ['Full Name',   form.name],
                ['Email',       form.email],
                ['Phone',       form.phone||'—'],
                ['Student ID',  form.studentId||'—'],
                ['Program',     form.program||'—'],
                ['Year / Level',form.year||'—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{fontSize:'0.75rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'0.25rem'}}>{label}</div>
                  <div style={{fontSize:'0.9rem',color:'var(--text-primary)',fontWeight:500}}>{val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
