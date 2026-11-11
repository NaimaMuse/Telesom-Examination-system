import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const emptyForm = {currentPassword:'', newPassword:'', confirmation:''};
const passwordFields = [
  ['currentPassword', 'Current password', 'current-password'],
  ['newPassword', 'New password', 'new-password'],
  ['confirmation', 'Confirm new password', 'new-password'],
];

export default function ChangePasswordForm({ onSuccess, onClose, onSignOut, required = false }) {
  const { user, updateSession } = useAuth();
  const isStudent = user?.role === 'student';
  const creatingPassword = isStudent && user.mustChangePassword;
  const title = isStudent
    ? (creatingPassword ? 'Create your portal password' : 'Reset your portal password')
    : 'Change password';
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (form.newPassword !== form.confirmation) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { newPassword, currentPassword } = form;
      const { data } = isStudent
        ? await api.put('/auth/student/password', { newPassword })
        : await api.put('/auth/password', { currentPassword, newPassword });
      updateSession(data.token, data.user);
      setForm(emptyForm);
      setSaved(true);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Password could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fields = isStudent ? passwordFields.slice(1) : passwordFields;
  return (
    <section className="card password-form-card" aria-labelledby="change-password-title">
      <div className="card-header">
        <div className="password-dialog-heading">
          <span className="password-dialog-eyebrow">ACCOUNT SECURITY</span>
          <h3 className="card-title" id="change-password-title">{title}</h3>
        </div>
        {!required && onClose && (
          <button type="button" className="modal-close" aria-label="Close change password" disabled={saving} onClick={onClose}>×</button>
        )}
      </div>
      <div className="card-body">
        {(isStudent || user?.mustChangePassword) && (
          <p className="password-dialog-intro">
            {isStudent
              ? 'Set a password for your Telesom Academy account. Use your registered Google account each time you sign in.'
              : 'Choose your own password to replace the temporary one.'}
          </p>
        )}
        {saved && <p role="status" style={{marginBottom:16,color:'var(--brand-green-active)'}}>Password changed successfully.</p>}
        <form onSubmit={submit}>
          <div className="grid-2">
            {fields.map(([key, label, autoComplete]) => (
              <div className="form-group" key={key}>
                <label className="form-label" htmlFor={`password-${key}`}>{label}</label>
                <input
                  className="form-control"
                  id={`password-${key}`}
                  type="password"
                  autoComplete={autoComplete}
                  minLength={key === 'currentPassword' ? undefined : 8}
                  maxLength={128}
                  required
                  disabled={saving}
                  value={form[key]}
                  onChange={event => setForm(current => ({...current, [key]:event.target.value}))}
                />
              </div>
            ))}
          </div>
          <p className="password-dialog-hint">At least 8 characters. Other sessions will be signed out.</p>
          {error && <p role="alert" className="profile-save-error">{error}</p>}
          <div className="password-dialog-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isStudent ? 'Save password' : 'Change password'}
            </button>
            {required && onSignOut && (
              <button type="button" className="btn btn-secondary" disabled={saving} onClick={onSignOut}>Sign out</button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
