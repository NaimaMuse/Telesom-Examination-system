import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import useAutoRefresh from '../hooks/useAutoRefresh';
import TeachingIcon from './TeachingIcon';
import AnnouncementRecipients from './AnnouncementRecipients';
import './AnnouncementCenter.css';

const recipientGroups = {admin:['teacher', 'student'], teacher:['admin', 'student']};
const groupLabels = {admin:'Admins', teacher:'Teachers', student:'Students'};
const roleLabels = {admin:'Admin', teacher:'Teacher'};
const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle:'medium', timeStyle:'short', timeZone:'Africa/Nairobi',
});
const emptyDraft = {title:'', message:'', audience:[], teacherId:'', includeTeacher:true, studentIds:[]};

export default function AnnouncementCenter({ role }) {
  const trigger = useRef(null);
  const dialog = useRef(null);
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [page, setPage] = useState(1);
  const [feed, setFeed] = useState(null);
  const [listError, setListError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState(emptyDraft);
  const [targeted, setTargeted] = useState(role === 'admin');
  const [saving, setSaving] = useState(false);
  const [sendError, setSendError] = useState('');
  const groups = recipientGroups[role];
  const selectedAudience = targeted
    ? [...(draft.includeTeacher ? ['teacher'] : []), ...(draft.studentIds.length ? ['student'] : [])]
    : draft.audience;
  const canSend = selectedAudience.length > 0 && (!targeted || Boolean(draft.teacherId));

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element.showModal();
    return () => {
      element.close();
      trigger.current?.focus();
    };
  }, [open]);

  useAutoRefresh(async ({signal, isCurrent}) => {
    try {
      const {data} = await api.get('/announcements', {params:{page}, signal});
      if (isCurrent()) {
        setFeed(data);
        setListError('');
      }
    } catch (error) {
      if (isCurrent()) setListError(error.response?.data?.message || 'Could not load announcements.');
    }
  }, {enabled:open && !composing, deps:[page]});

  function showPage(nextPage) {
    setFeed(null);
    setListError('');
    setPage(nextPage);
  }

  function toggleAudience(group) {
    setDraft(current => ({
      ...current,
      audience:current.audience.includes(group)
        ? current.audience.filter(item => item !== group)
        : [...current.audience, group],
    }));
  }

  async function send(event) {
    event.preventDefault();
    if (saving || !canSend) return;
    setSaving(true);
    setSendError('');
    try {
      await api.post('/announcements', {
        title:draft.title, message:draft.message, audience:selectedAudience,
        ...(targeted ? {teacherId:draft.teacherId, studentIds:draft.studentIds} : {}),
      });
      setDraft(emptyDraft);
      setNotice('Announcement sent.');
      showPage(1);
      setComposing(false);
    } catch (error) {
      setSendError(error.response?.data?.message || 'Could not send the announcement. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button ref={trigger} type="button" className="topbar-icon-btn announcement-trigger" aria-label="Announcements"
        aria-haspopup="dialog" aria-expanded={open} title="Announcements" onClick={() => {
          showPage(1);
          setComposing(false);
          setNotice('');
          setOpen(true);
        }}>
        <TeachingIcon name="megaphone" size={20}/>
      </button>

      {open && (
        <dialog ref={dialog} className="announcement-dialog" aria-labelledby="announcement-title"
          onCancel={event => { event.preventDefault(); if (!saving) setOpen(false); }}>
          <header className="announcement-header">
            <span className="announcement-header-icon"><TeachingIcon name="megaphone" size={21}/></span>
            <h2 id="announcement-title">Announcements</h2>
            <button type="button" className="announcement-close" aria-label="Close announcements"
              disabled={saving} onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="announcement-body">
            {groups && (
              <div className="announcement-toolbar">
                <button type="button" className="btn btn-sm btn-secondary" aria-pressed={!composing}
                  disabled={saving} onClick={() => setComposing(false)}>Messages</button>
                <button type="button" className="btn btn-sm btn-primary" aria-pressed={composing}
                  disabled={saving} onClick={() => { setNotice(''); setComposing(true); }}>New announcement</button>
              </div>
            )}
            {notice && <p className="announcement-notice" role="status">{notice}</p>}
            {composing && groups ? (
              <form className="announcement-form" onSubmit={send}>
                {role === 'admin' && (
                  <label>Recipient type
                    <select className="form-control" value={targeted ? 'selected' : 'groups'} disabled={saving}
                      onChange={event => { setTargeted(event.target.value === 'selected'); setSendError(''); }}>
                      <option value="selected">Select a teacher and students</option>
                      <option value="groups">Send to groups</option>
                    </select>
                  </label>
                )}
                {targeted ? <AnnouncementRecipients draft={draft} setDraft={setDraft} disabled={saving}/> : <fieldset disabled={saving}>
                  <legend>Send to</legend>
                  <div className="announcement-recipients">
                    {groups.map(group => (
                      <label key={group}>
                        <input type="checkbox" checked={draft.audience.includes(group)} onChange={() => toggleAudience(group)}/>
                        {role === 'teacher' && group === 'student' ? 'Students in my courses' : groupLabels[group]}
                      </label>
                    ))}
                  </div>
                </fieldset>}
                <label>Title
                  <input className="form-control" value={draft.title} maxLength={120} required disabled={saving}
                    onChange={event => setDraft(current => ({...current, title:event.target.value}))}/>
                </label>
                <label>Message
                  <textarea className="form-control" value={draft.message} maxLength={4000} required rows={3} disabled={saving}
                    onChange={event => setDraft(current => ({...current, message:event.target.value}))}/>
                </label>
                {sendError && <p className="announcement-error" role="alert">{sendError}</p>}
                <button type="submit" className="btn btn-primary" disabled={saving || !canSend}>
                  {saving ? 'Sending…' : 'Send announcement'}
                </button>
              </form>
            ) : (
              <div className="announcement-feed" aria-busy={!feed && !listError}>
                {listError && <p className="announcement-error" role="alert">{listError}</p>}
                {!feed && !listError && <p role="status">Loading announcements…</p>}
                {feed?.announcements.length === 0 && !listError && <p>No announcements yet.</p>}
                {feed?.announcements.map(item => (
                  <article key={item._id} className="announcement-item">
                    <div className="announcement-meta">
                      <span>{item.sentByMe ? `You · To ${item.targeted ? 'selected ' : ''}${item.audience.map(group => groupLabels[group]).join(' and ')}` : `${item.senderName} · ${roleLabels[item.senderRole]}`}</span>
                      <time dateTime={item.createdAt}>{dateFormat.format(new Date(item.createdAt))}</time>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.message}</p>
                  </article>
                ))}
                {(page > 1 || feed?.hasMore) && (
                  <nav className="announcement-pagination" aria-label="Announcement pages">
                    <button type="button" className="btn btn-sm btn-secondary" disabled={page === 1}
                      onClick={() => showPage(page - 1)}>Previous</button>
                    <span>Page {page}</span>
                    <button type="button" className="btn btn-sm btn-secondary" disabled={!feed?.hasMore}
                      onClick={() => showPage(page + 1)}>Next</button>
                  </nav>
                )}
              </div>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
