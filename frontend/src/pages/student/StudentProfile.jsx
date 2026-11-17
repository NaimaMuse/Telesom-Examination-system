import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import TeachingIcon from '../../components/TeachingIcon';
import api from '../../services/api';
import './StudentProfile.css';

export default function StudentProfile() {
  const [search] = usePageSearch();
  const { user, updateUser } = useAuth();
  const photoInput = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoNotice, setPhotoNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [params, setParams] = useSearchParams();
  const resetPassword = params.get('reset') === 'password' && !user?.mustChangePassword;
  const closeResetPassword = () => {
    setParams(current => {
      const next = new URLSearchParams(current);
      next.delete('reset');
      return next;
    }, {replace:true});
  };
  const [passwordReset, setPasswordReset] = useState(false);
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
    const {name, email, phone, address, academicYear, studentId} = next;
    updateUser({name, email, phone, address, academicYear, studentId});
  };
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useAutoRefresh(async ({ signal, isCurrent }) => {
    try { const { data } = await api.get('/profile', { signal }); if (isCurrent()) { applyProfile(data.data); setError(''); } }
    catch (err) { if (isCurrent()) setError(err.response?.data?.message || 'Profile could not refresh. Retrying automatically.'); }
    finally { if (isCurrent()) setLoading(false); }
  }, { enabled: !editing && !saving && (!resetPassword || !profile) });

  const initials = (user?.name?.trim() || 'Student').split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();

  async function savePhoto(file) {
    setPhotoNotice('');
    setPhotoError('');
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024)) {
      setPhotoError('Choose a JPG, PNG or WebP image up to 2 MB.');
      return;
    }
    setPhotoBusy(true);
    try {
      let response;
      if (file) {
        const body = new FormData();
        body.append('file', file);
        response = await api.put('/student/profile-picture', body, {headers: {'Content-Type':'multipart/form-data'}});
      } else {
        response = await api.delete('/student/profile-picture');
      }
      updateUser({profilePicture: response.data.picture});
      setPhotoNotice(file ? 'Profile photo updated.' : 'Profile photo removed.');
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Could not update your profile photo.');
    } finally {
      setPhotoBusy(false);
    }
  }

  const handleSave = async(e) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      const res = await api.put('/student/profile', {name:form.name, phone:form.phone, address:form.address});
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
    <section className="student-profile-page" aria-label="My profile">
      {error && <div className="card card-body" role="alert">{error}</div>}
      <header className="student-profile-heading">
        <div className="student-profile-actions">
          {!user?.mustChangePassword && (
            <Link className="btn btn-secondary" to="/student/forgot-password">Reset password</Link>
          )}
          {!editing && <button type="button" className="btn btn-primary" onClick={()=>setEditing(true)}><TeachingIcon name="edit" size={15}/> Edit profile</button>}
        </div>
      </header>

      {saved && <div className="student-profile-message" role="status">Profile updated.</div>}
      {passwordReset && <p className="card card-body" role="status">Portal password updated. You can sign in with your registered email and new password.</p>}
      {resetPassword && (
        <ChangePasswordModal onClose={closeResetPassword} onSuccess={() => {
          closeResetPassword();
          setPasswordReset(true);
        }}/>
      )}

      <div className="student-profile-identity">
        <div className="student-profile-avatar">
          {user?.profilePicture ? <img src={user.profilePicture} alt="Your profile photo"/> : initials}
        </div>
        <div className="student-profile-name">
          <h2>{user?.name || 'Student'}</h2>
          <p>Student{user?.studentId ? ` · ${user.studentId}` : ''}</p>
        </div>
        <div className="student-profile-photo">
          <input ref={photoInput} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={event => {
            const file = event.currentTarget.files[0];
            event.currentTarget.value = '';
            if (file) savePhoto(file);
          }}/>
          <div className="student-profile-actions">
            <button type="button" className="btn btn-secondary" aria-describedby="student-photo-hint" disabled={photoBusy} onClick={() => photoInput.current?.click()}>
              {photoBusy ? 'Updating…' : user?.profilePicture ? 'Change photo' : 'Upload photo'}
            </button>
            {user?.profilePicture && <button type="button" className="student-profile-remove" disabled={photoBusy} onClick={() => savePhoto(null)}>Remove</button>}
          </div>
          <small id="student-photo-hint">JPG, PNG or WebP · Up to 2 MB</small>
        </div>
      </div>
      {photoError && <p className="student-profile-message is-error" role="alert">{photoError}</p>}
      {photoNotice && <p className="student-profile-message" role="status">{photoNotice}</p>}

      <div className="card student-profile-card">
        <div className="card-header"><span className="card-title">Profile Details</span></div>
        <div className="card-body">
          {editing ? (
            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required/></div>
                <div className="form-group"><label className="form-label" htmlFor="student-profile-email">Registered email</label><input id="student-profile-email" className="form-control" type="email" value={form.email} readOnly /><small>Contact your administrator to update this email.</small></div>
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
            <dl className="student-profile-details">
              {[
                ['Full Name',   form.name],
                ['Email',       form.email||'Not provided'],
                ['Phone',       form.phone||'—'],
                ['Student ID',  form.studentId||'—'],
                ['Address',     form.address||'—'],
                ['Academic Year',form.academicYear||'—'],
              ].filter(([label,val]) => matchesPageSearch(search, label, val)).map(([label, val]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{val}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
