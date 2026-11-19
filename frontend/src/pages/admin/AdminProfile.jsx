import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordForm from '../../components/ChangePasswordForm';
import '../../components/ChangePasswordModal.css';
import api from '../../services/api';
import './AdminProfile.css';

export default function AdminProfile() {
  const { user, updateSession, updateUser } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [picture, setPicture] = useState(user?.profilePicture || '');
  const [preview, setPreview] = useState('');
  const [pictureFile, setPictureFile] = useState(null);
  const [pictureBusy, setPictureBusy] = useState(false);
  const [pictureError, setPictureError] = useState('');
  const [pictureSaved, setPictureSaved] = useState(false);
  const initials = (user?.name || 'Admin').split(' ').filter(Boolean).slice(0,2).map(part => part[0]).join('').toUpperCase();

  useEffect(() => {
    setEmail(user?.email || '');
  }, [user?.email]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const choosePicture = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setPictureFile(null);
      setPreview('');
      setPictureError('Choose a PNG, JPEG or WebP image up to 2 MB.');
      return;
    }
    setPictureFile(file);
    setPreview(URL.createObjectURL(file));
    setPictureError('');
    setPictureSaved(false);
  };

  const savePicture = async () => {
    if (!pictureFile) return;
    setPictureBusy(true);
    setPictureError('');
    setPictureSaved(false);
    try {
      const body = new FormData();
      body.append('file',pictureFile);
      const { data } = await api.put('/profile/picture',body,{headers:{'Content-Type':'multipart/form-data'}});
      setPicture(data.picture);
      setPictureFile(null);
      setPreview('');
      updateUser({profilePicture:data.picture});
      setPictureSaved(true);
    } catch (requestError) {
      setPictureError(requestError.response?.data?.message || 'Profile picture could not be saved. Please try again.');
    } finally {
      setPictureBusy(false);
    }
  };

  const removePicture = async () => {
    setPictureBusy(true);
    setPictureError('');
    setPictureSaved(false);
    try {
      await api.delete('/profile/picture');
      setPicture('');
      setPictureFile(null);
      setPreview('');
      updateUser({profilePicture:''});
      setPictureSaved(true);
    } catch (requestError) {
      setPictureError(requestError.response?.data?.message || 'Profile picture could not be removed. Please try again.');
    } finally {
      setPictureBusy(false);
    }
  };

  const updateEmail = async event => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await api.put('/profile', { email, currentPassword });
      updateSession(data.token, data.data.user);
      setEmail(data.data.user.email);
      setCurrentPassword('');
      setSaved(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Email could not be updated. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-account-settings">
      <header className="admin-account-heading">
        <div>
          <span className="admin-account-kicker">ACCOUNT SETTINGS</span>
          <h1>My account</h1>
          <p>Manage your profile and secure your administrator sign-in.</p>
        </div>
        <span className="admin-account-heading-mark" aria-hidden="true">A</span>
      </header>

      <section className="admin-account-card admin-account-identity-card" aria-labelledby="admin-profile-title">
        <div className="admin-account-avatar">
          {preview || picture
            ? <img src={preview || picture} alt="Administrator profile"/>
            : <span aria-label="Default administrator avatar">{initials}</span>}
        </div>
        <div className="admin-account-identity">
          <span className="admin-account-badge">ADMINISTRATOR</span>
          <h2 id="admin-profile-title">{user?.name || 'Administrator'}</h2>
          <p>{email || 'No email address set'}</p>
          <div className="admin-picture-actions">
            <label className="admin-picture-select">
              <span aria-hidden="true">＋</span> Choose a photo
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={pictureBusy} onChange={choosePicture}/>
            </label>
            {pictureFile && <button type="button" className="admin-account-button admin-account-button-primary" disabled={pictureBusy} onClick={savePicture}>{pictureBusy ? 'Uploading…' : 'Save photo'}</button>}
            {pictureFile && <button type="button" className="admin-account-button" disabled={pictureBusy} onClick={() => {setPictureFile(null);setPreview('');setPictureError('');}}>Cancel</button>}
            {!pictureFile && picture && <button type="button" className="admin-account-button admin-account-button-danger" disabled={pictureBusy} onClick={removePicture}>{pictureBusy ? 'Removing…' : 'Remove photo'}</button>}
          </div>
          <p className="admin-account-hint">PNG, JPEG or WebP · Maximum 2 MB</p>
          {pictureSaved && <p className="admin-account-success" role="status">Profile photo updated.</p>}
          {pictureError && <p className="admin-account-error" role="alert">{pictureError}</p>}
        </div>
        <div className="admin-account-protected"><span aria-hidden="true">✓</span> Account protected</div>
      </section>

      <div className="admin-account-grid">
        <section className="admin-account-card" aria-labelledby="admin-email-title">
          <div className="admin-account-card-heading">
            <span className="admin-account-section-icon" aria-hidden="true">@</span>
            <div><span className="admin-account-section-label">LOGIN DETAILS</span><h2 id="admin-email-title">Email address</h2></div>
          </div>
          <p className="admin-account-description">Your email is used to sign in. Confirm your current password before changing it.</p>
          <form onSubmit={updateEmail}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-account-email">New email address</label>
              <input id="admin-account-email" className="form-control" type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} disabled={saving}/>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-account-current-password">Current password</label>
              <input id="admin-account-current-password" className="form-control" type="password" autoComplete="current-password" maxLength={128} required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} disabled={saving}/>
            </div>
            {saved && <p className="admin-account-success" role="status">Email updated successfully.</p>}
            {error && <p className="admin-account-error" role="alert">{error}</p>}
            <button type="submit" className="admin-account-button admin-account-button-primary" disabled={saving}>{saving ? 'Saving…' : 'Update email'}</button>
          </form>
        </section>

        <div className="admin-account-password">
          <div className="admin-account-password-heading">
            <span className="admin-account-section-icon" aria-hidden="true">⌑</span>
            <div><span className="admin-account-section-label">ACCOUNT SECURITY</span><h2>Password</h2></div>
          </div>
          <p>Use a unique password and change it regularly to keep your administrator account secure.</p>
          <ChangePasswordForm/>
        </div>
      </div>
    </div>
  );
}
