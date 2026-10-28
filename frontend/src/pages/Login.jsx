import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TelesomLogo from '../components/TelesomLogo';
import './Login.css';

const ROLES = ['admin', 'teacher', 'student'];
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isStudent = role === 'student';
  const submit = async event => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const user = await login(isStudent ? {studentId:studentId.trim().toUpperCase(),role} : {email:email.trim().toLowerCase(),password,role});
      navigate(`/${user.role}`, {replace:true});
    } catch(err) { setError(err.response?.data?.message || 'Sign in failed. Check your details and make sure the server is available.'); }
    finally { setLoading(false); }
  };
  return <div className="auth-page-wrapper"><div className="auth-centered-container"><div className="auth-card">
    <div className="auth-card-header"><div className="header-brand-wrap"><TelesomLogo size="lg"/></div><h2>Sign in to Portal</h2><p>Access your Telesom Academy account</p></div>
    <div className="role-selector" role="group" aria-label="Select portal role">{ROLES.map(item=><button type="button" key={item} className={`role-btn${role===item?' active green-role':''}`} aria-pressed={role===item} disabled={loading} onClick={()=>{setRole(item);setError('');setPassword('');}}>{item[0].toUpperCase()+item.slice(1)}</button>)}</div>
    <form onSubmit={submit}>
      {error && <div className="auth-alert error" role="alert">{error}</div>}
      {isStudent ? <div className="form-field-group"><label htmlFor="login-student-id">Student ID</label><div className="input-with-icon"><input id="login-student-id" value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="TL-2026-01" autoComplete="username" required disabled={loading}/></div><p className="field-hint">Use the Student ID assigned by your administrator.</p></div> : <>
        <div className="form-field-group"><label htmlFor="login-email">{role==='admin'?'Admin email / username':'Registered email'}</label><div className="input-with-icon"><input id="login-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required disabled={loading}/></div></div>
        <div className="form-field-group"><label htmlFor="login-password">Password</label><div className="input-with-icon"><input id="login-password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required disabled={loading}/><button type="button" className="toggle-password-btn" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(value=>!value)}>{showPassword?'Hide':'Show'}</button></div></div>
      </>}
      <button type="submit" className="btn-submit" disabled={loading}>{loading?'Signing in…':`Sign in as ${role}`}</button>
    </form>
    <p className="auth-bottom-tag">Accounts are created by the administrator. Contact the academy if you need access.</p>
  </div></div></div>;
}
