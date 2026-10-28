import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ChangePasswordForm({ onSuccess, onClose, onSignOut, required = false }) {
  const { user, updateSession } = useAuth();
  const [form, setForm] = useState({currentPassword:'',newPassword:'',confirmation:''});
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [saved,setSaved] = useState(false);
  const submit = async event => {
    event.preventDefault();setError('');setSaved(false);
    if(form.newPassword!==form.confirmation){setError('New passwords do not match.');return;}
    setSaving(true);
    try {
      const {data}=await api.put('/auth/password',{currentPassword:form.currentPassword,newPassword:form.newPassword});
      updateSession(data.token,data.user);setForm({currentPassword:'',newPassword:'',confirmation:''});setSaved(true);onSuccess?.();
    } catch(err){setError(err.response?.data?.message||'Password could not be changed. Please try again.');}
    finally{setSaving(false);}
  };
  return <section className="card password-form-card" aria-labelledby="change-password-title"><div className="card-header"><div className="password-dialog-heading"><span className="password-dialog-eyebrow">ACCOUNT SECURITY</span><h3 className="card-title" id="change-password-title">Change password</h3></div>{!required && onClose && <button type="button" className="modal-close" aria-label="Close change password" disabled={saving} onClick={onClose}>×</button>}</div><div className="card-body">
    {user?.mustChangePassword && <p className="password-dialog-intro">Choose your own password to replace the temporary one.</p>}
    {saved && <p role="status" style={{marginBottom:16,color:'var(--brand-green-active)'}}>Password changed successfully.</p>}
    <form onSubmit={submit}><div className="grid-2">{[['currentPassword','Current password','current-password'],['newPassword','New password','new-password'],['confirmation','Confirm new password','new-password']].map(([key,label,autoComplete])=><div className="form-group" key={key}><label className="form-label" htmlFor={`password-${key}`}>{label}</label><input className="form-control" id={`password-${key}`} type="password" autoComplete={autoComplete} minLength={key==='currentPassword'?undefined:8} maxLength={128} required disabled={saving} value={form[key]} onChange={event=>setForm(current=>({...current,[key]:event.target.value}))}/></div>)}</div>
    <p className="password-dialog-hint">At least 8 characters. Other sessions will be signed out.</p>{error && <p role="alert" className="profile-save-error">{error}</p>}<div className="password-dialog-actions"><button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Changing…':'Change password'}</button>{required && onSignOut && <button type="button" className="btn btn-secondary" disabled={saving} onClick={onSignOut}>Sign out</button>}</div></form>
  </div></section>;
}
