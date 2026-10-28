import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function TeacherProfile() {
  const [search] = usePageSearch();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name:       user?.name        || '',
    email:      user?.email       || '',
    phone:      user?.phone       || '',
    department: user?.department  || '',
    subjects:   user?.subjects    || user?.specialization || '',
    bio:        user?.bio         || user?.qualification || '',
  });
  const [profileDetails, setProfileDetails] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [saveError, setSaveError] = useState('');

  const initials = (user?.name||'T').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

  useEffect(() => {
    let active = true;
    api.get('/teacher/profile')
      .then((response) => {
        if (!active) return;
        const details = response.data?.teacher || null;
        if (!details) return;
        setProfileDetails(details);
        setForm((current) => ({
          ...current,
          name: details.name || current.name,
          email: details.email || current.email,
          phone: details.phone || current.phone,
          department: details.department || current.department,
          subjects: details.specialization || current.subjects,
          bio: details.qualification || current.bio,
        }));
      })
      .catch(() => {
        if (active) setProfileDetails(null);
      });
    return () => { active = false; };
  }, []);

  const handleSave = async(e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const response = await api.put('/teacher/profile', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        department: form.department,
        specialization: form.subjects,
        qualification: form.bio,
      });
      const details = response.data?.teacher;
      if (!details) throw new Error('Profile was saved, but the updated profile was not returned.');
      setProfileDetails(details);
      setForm((current) => ({
        ...current,
        name: details.name || current.name,
        email: details.email || current.email,
        phone: details.phone || '',
        department: details.department || '',
        subjects: details.specialization || '',
        bio: details.qualification || '',
      }));
      setSaved(true);
      setEditing(false);
      setTimeout(()=>setSaved(false), 3000);
    } catch (error) {
      setSaveError(error.response?.data?.message || error.message || 'Profile could not be saved. Please try again.');
    } finally { setSaving(false); }
  };

  const assignedCourse = profileDetails?.assignedCourse?.title || profileDetails?.assignedCourse?.name || 'Not assigned';
  const profileFields = [
    ['Full name', form.name || 'Not provided'],
    ['Work email', form.email || 'Not provided'],
    ['Phone', form.phone || 'Not provided'],
    ['Course', form.department || 'Not provided'],
    ['Specialization', form.subjects || 'Not provided'],
    ['Qualification', form.bio || 'Not provided'],
  ];

  return (
    <div className="teacher-scope teacher-profile-page">
      <section className="teacher-profile-hero">
        <div className="teacher-profile-avatar">{initials}</div>
        <div className="teacher-profile-identity">
          <span className="profile-section-kicker">FACULTY DIRECTORY / TEACHING STAFF</span>
          <h1>{form.name || 'Teacher profile'}</h1>
          <p><span className="profile-role-label">Teacher</span><span className="profile-identity-divider">/</span>{form.department || 'Course not specified'}</p>
          <span className="profile-email-line">{form.email || 'Work email not provided'}</span>
        </div>
        <div className="teacher-profile-actions">
          <span className="profile-account-label"><i aria-hidden="true" /> FACULTY ACCOUNT</span>
          {!editing && <button type="button" className="profile-edit-button" onClick={() => setEditing(true)}><span aria-hidden="true">✎</span> Edit profile</button>}
        </div>
      </section>

      {saved && <div className="profile-saved-message" role="status"><span aria-hidden="true">✓</span> Profile updated successfully.</div>}
      {saveError && <div className="profile-save-error" role="alert">{saveError}</div>}

      <section className="profile-summary-strip" aria-label="Professional summary">
        <div><span className="profile-summary-icon" aria-hidden="true">⌖</span><span className="profile-summary-copy"><small>COURSE</small><strong>{form.department || 'Not specified'}</strong></span></div>
        <div><span className="profile-summary-icon" aria-hidden="true">◈</span><span className="profile-summary-copy"><small>SPECIALIZATION</small><strong>{form.subjects || 'Not specified'}</strong></span></div>
        <div><span className="profile-summary-icon" aria-hidden="true">▤</span><span className="profile-summary-copy"><small>ASSIGNED COURSE</small><strong>{assignedCourse}</strong></span></div>
      </section>

      <section className="profile-information-panel">
        <header className="profile-panel-heading">
          <div><span className="profile-section-kicker">ACCOUNT DETAILS</span><h2>{editing ? 'Edit professional details' : 'Professional information'}</h2></div>
          {!editing && <span className="profile-panel-role">TEACHER</span>}
        </header>
        <div className="profile-panel-body">
          {editing ? (
            <form onSubmit={handleSave}>
              <div className="profile-edit-grid">
                <div className="form-group"><label className="form-label" htmlFor="teacher-profile-name">Full name *</label><input id="teacher-profile-name" className="form-control" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} required /></div>
                <div className="form-group"><label className="form-label" htmlFor="teacher-profile-email">Work email *</label><input id="teacher-profile-email" className="form-control" type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} required /></div>
                <div className="form-group"><label className="form-label" htmlFor="teacher-profile-phone">Phone</label><input id="teacher-profile-phone" className="form-control" type="tel" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} /></div>
                <div className="form-group"><label className="form-label" htmlFor="teacher-profile-department">Course</label><input id="teacher-profile-department" className="form-control" value={form.department} onChange={event => setForm(current => ({ ...current, department: event.target.value }))} /></div>
                <div className="form-group"><label className="form-label" htmlFor="teacher-profile-specialization">Specialization</label><input id="teacher-profile-specialization" className="form-control" value={form.subjects} onChange={event => setForm(current => ({ ...current, subjects: event.target.value }))} /></div>
                <div className="form-group"><label className="form-label" htmlFor="teacher-profile-qualification">Qualification</label><input id="teacher-profile-qualification" className="form-control" value={form.bio} onChange={event => setForm(current => ({ ...current, bio: event.target.value }))} /></div>
              </div>
              {saveError && <div className="profile-save-error" role="alert">{saveError}</div>}
              <div className="profile-form-actions">
                <button type="submit" className="profile-edit-button" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                <button type="button" className="profile-cancel-button" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="profile-overview-layout">
              <dl className="profile-fields-grid">
                {search && !profileFields.some(([label, value]) => matchesPageSearch(search, label, value)) && <p role="status">No matching profile details.</p>}
                {profileFields.filter(([label, value]) => matchesPageSearch(search, label, value)).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <aside className="profile-course-spotlight">
                <span className="profile-course-eyebrow">CURRENT ASSIGNMENT</span>
                <span className="profile-course-icon" aria-hidden="true">▤</span>
                <h3>{assignedCourse}</h3>
                {profileDetails?.assignedCourse ? (
                  <>
                    <p>{profileDetails.assignedCourse.description || 'Assigned teaching course'}</p>
                    <div className="profile-course-meta">
                      <span>Course code</span><strong>{profileDetails.assignedCourse.courseCode || '—'}</strong>
                    </div>
                    <div className="profile-course-meta">
                      <span>Credits</span><strong>{profileDetails.assignedCourse.credits ?? '—'}</strong>
                    </div>
                  </>
                ) : <p>No course assignment is linked to this profile yet.</p>}
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
