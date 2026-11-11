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

function AnnouncementMessage({ item, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  return <dialog ref={dialog} className="announcement-dialog announcement-message-dialog" aria-labelledby="announcement-message-title"
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <header className="announcement-header">
      <h2 id="announcement-message-title">{item.title}</h2>
      <button type="button" className="announcement-close" aria-label="Close message" onClick={onClose}>×</button>
    </header>
    <div className="announcement-body announcement-full-message">{item.message}</div>
  </dialog>;
}

export default function AnnouncementCenter({ role }) {
  const trigger = useRef(null);
  const dialog = useRef(null);
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [page, setPage] = useState(1);
  const [feed, setFeed] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [revision, refresh] = useState(0);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [actionError, setActionError] = useState('');
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
    const loadFeed = open && !composing;
    try {
      const {data} = loadFeed
        ? await api.get('/announcements', {params:{page}, signal})
        : await api.get('/announcements/unread-count', {signal});
      if (isCurrent()) {
        setUnreadCount(data.unreadCount || 0);
        if (loadFeed) {
          setFeed(data);
          setListError('');
        }
      }
    } catch (error) {
      if (isCurrent() && loadFeed) setListError(error.response?.data?.message || 'Could not load announcements.');
    }
  }, {deps:[open, composing, page, revision]});

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

  async function viewAnnouncement(item) {
    setViewing(item);
    setActionError('');
    if (item.sentByMe || item.read) return;
    try {
      await api.patch(`/announcements/${item._id}/read`);
      refresh(current => current + 1);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not mark this announcement as read.');
    }
  }

  async function deleteAnnouncement(item) {
    setDeleting(item._id);
    setActionError('');
    try {
      await api.delete(`/announcements/${item._id}`);
      if (page > 1 && feed.announcements.length === 1 && !feed.hasMore) showPage(page - 1);
      else setFeed(current => current && {
        ...current, announcements:current.announcements.filter(row => row._id !== item._id),
      });
      refresh(current => current + 1);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not delete this announcement.');
    } finally {
      setDeleting(null);
    }
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
      <button ref={trigger} type="button" className="topbar-icon-btn announcement-trigger"
        aria-label={`Announcements${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-haspopup="dialog" aria-expanded={open} title="Announcements" onClick={() => {
          showPage(1);
          setComposing(false);
          setNotice('');
          setActionError('');
          setOpen(true);
        }}>
        <TeachingIcon name="megaphone" size={20}/>
        {unreadCount > 0 && <span className="notification-count" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <dialog ref={dialog} className="announcement-dialog" aria-labelledby="announcement-title"
          onCancel={event => { event.preventDefault(); if (!saving && !deleting) setOpen(false); }}>
          <header className="announcement-header">
            <span className="announcement-header-icon"><TeachingIcon name="megaphone" size={21}/></span>
            <h2 id="announcement-title">Announcements</h2>
            <button type="button" className="announcement-close" aria-label="Close announcements"
              disabled={saving || Boolean(deleting)} onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="announcement-body">
            {groups && (
              <div className="announcement-toolbar">
                <button type="button" className="btn btn-sm btn-secondary" aria-pressed={!composing}
                  disabled={saving || Boolean(deleting)} onClick={() => setComposing(false)}>Messages</button>
                <button type="button" className="btn btn-sm btn-primary" aria-pressed={composing}
                  disabled={saving || Boolean(deleting)} onClick={() => { setNotice(''); setComposing(true); }}>New announcement</button>
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
                {actionError && <p className="announcement-error" role="alert">{actionError}</p>}
                {!feed && !listError && <p role="status">Loading announcements…</p>}
                {feed?.announcements.length === 0 && !listError && <p>No announcements yet.</p>}
                {feed?.announcements.map(item => (
                  <article key={item._id} className={`announcement-item${!item.sentByMe && !item.read ? ' announcement-unread' : ''}`}>
                    <div className="announcement-meta">
                      <span>{item.sentByMe ? `You · To ${item.targeted ? 'selected ' : ''}${item.audience.map(group => groupLabels[group]).join(' and ')}` : `${item.senderName} · ${roleLabels[item.senderRole]}`}</span>
                      <time dateTime={item.createdAt}>{dateFormat.format(new Date(item.createdAt))}</time>
                    </div>
                    <div className="announcement-item-heading">
                      <h3>{item.title}</h3>
                      <div className="announcement-item-actions">
                        <button type="button" className="btn btn-secondary" title="View announcement" aria-label={`View announcement: ${item.title}`}
                          disabled={Boolean(deleting)} onClick={() => viewAnnouncement(item)}><TeachingIcon name="eye" size={16}/></button>
                        {!item.sentByMe && <button type="button" className="btn btn-secondary announcement-delete" title="Delete announcement"
                          aria-label={`Delete announcement: ${item.title}`} disabled={Boolean(deleting)}
                          onClick={() => deleteAnnouncement(item)}><TeachingIcon name="trash" size={16}/></button>}
                      </div>
                    </div>
                    <p>{item.message}</p>
                  </article>
                ))}
                {(page > 1 || feed?.hasMore) && (
                  <nav className="announcement-pagination" aria-label="Announcement pages">
                    <button type="button" className="btn btn-sm btn-secondary" disabled={page === 1 || Boolean(deleting)}
                      onClick={() => showPage(page - 1)}>Previous</button>
                    <span>Page {page}</span>
                    <button type="button" className="btn btn-sm btn-secondary" disabled={!feed?.hasMore || Boolean(deleting)}
                      onClick={() => showPage(page + 1)}>Next</button>
                  </nav>
                )}
              </div>
            )}
          </div>
          {viewing && <AnnouncementMessage item={viewing} onClose={() => setViewing(null)} />}
        </dialog>
      )}
    </>
  );
}
