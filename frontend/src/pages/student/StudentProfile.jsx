import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function StudentProfile() {
  const [search] = usePageSearch();
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name:      user?.name      || '',
    email:     user?.email     || '',
    phone:     user?.phone     || '',
    address:   user?.address   || '',
    academicYear: user?.academicYear || '',
    studentId: user?.studentId || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const applyProfile = (data) => {
    const next = { ...data.profile, ...data.user };
    setProfile(next);
    setForm({ name: next.name || '', email: next.email || '', phone: next.phone || '', studentId: next.studentId || '', address: next.address || '', academicYear: next.academicYear || '' });
    updateUser(next);
  };
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useAutoRefresh(async ({ signal, isCurrent }) => {
    try { const { data } = await api.get('/profile', { signal }); if (isCurrent()) { applyProfile(data.data); setError(''); } }
    catch (err) { if (isCurrent()) setError(err.response?.data?.message || 'Profile could not refresh. Retrying automatically.'); }
    finally { if (isCurrent()) setLoading(false); }
  }, { enabled: !editing && !saving });

  const initials = (user?.name||'S').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

  const handleSave = async(e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.put('/student/profile', {name:form.name, email:form.email, phone:form.phone, address:form.address});
      applyProfile(res.data);
    } catch (err) { setError(err.response?.data?.message || 'Unable to save profile.'); setSaving(false); return; }
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(()=>setSaved(false), 3000);
  };

  if (loading) return <div className="spinner-wrap"><div className="spinner"/></div>;
  if (!profile) return <div role="alert">{error}</div>;

  return (
    <>
      {error && <div className="card card-body" role="alert">{error}</div>}
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
                <div className="form-group"><label className="form-label">Address</label><input className="form-control" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Academic Year</label><input className="form-control" value={form.academicYear} readOnly disabled/></div>
              </div>
              <div style={{display:'flex',gap:'0.75rem',marginTop:'0.5rem'}}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Save Changes'}</button>
                <button type="button" className="btn btn-secondary" onClick={()=>{ applyProfile({user:profile}); setEditing(false); }}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="grid-2">
              {[
                ['Full Name',   form.name],
                ['Email',       form.email],
                ['Phone',       form.phone||'—'],
                ['Student ID',  form.studentId||'—'],
                ['Address',     form.address||'—'],
                ['Academic Year',form.academicYear||'—'],
              ].filter(([label,val]) => matchesPageSearch(search, label, val)).map(([label, val]) => (
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
