import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './NotificationBell.css';

export default function NotificationBell({ userId, onNavigate }) {
  const storageKey = `telesom-notifications-read:${userId}`;
  const [read, setRead] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
  });
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const wrapper = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    let active = true, timer;
    const controller = new AbortController();
    const fetchUpdates = async () => {
      try {
        const response = await api.get('/notifications', {signal:controller.signal});
        if (active) { setItems(response.data.notifications || []); setError(''); }
      } catch (err) { if (active) setError(err.response?.data?.message || 'Unable to load notifications.'); }
      finally { if (active) { setLoading(false); timer = setTimeout(fetchUpdates, 30000); } }
    };
    fetchUpdates();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [userId, refresh]);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!wrapper.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const markRead = ids => {
    setRead(previous => {
      const next = [...new Set([...ids, ...previous])].slice(0,1000);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Reading still works for this session. */ }
      return next;
    });
  };
  const unread = items.filter(item => !read.includes(item.id));
  return <div className="notification-bell" ref={wrapper}>
    <button ref={trigger} type="button" className="topbar-icon-btn" aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`} aria-expanded={open} aria-controls="notification-panel" onClick={() => setOpen(value => !value)}>
      <span aria-hidden="true">🔔</span>{unread.length > 0 && <span className="notification-count">{unread.length > 99 ? '99+' : unread.length}</span>}
    </button>
    {open && <section className="notification-panel" id="notification-panel" aria-label="Notifications">
      <header><div><strong>Important notices</strong><p>Upcoming exams, quizzes & assessments · next 7 days</p></div><button type="button" aria-label="Close notifications" onClick={() => {setOpen(false);trigger.current?.focus();}}>×</button></header>
      <div className="notification-tools"><span aria-live="polite">{unread.length} unread</span><button type="button" disabled={!unread.length} onClick={() => markRead(items.map(item=>item.id))}>Mark all read</button></div>
      {error && <div className="notification-error" role="alert">{error} <button type="button" onClick={() => setRefresh(value=>value+1)}>Retry</button></div>}
      <div className="notification-list">
        {loading ? <p className="notification-empty">Loading updates…</p> : !items.length && !error ? <p className="notification-empty">No important notices right now.</p> : items.map(item => <Link className={`notification-item ${read.includes(item.id) ? '' : 'unread'}`} key={item.id} to={item.href} onClick={() => {markRead([item.id]);setOpen(false);onNavigate?.();}}>
          <span className="notification-indicator" aria-label={read.includes(item.id) ? 'Read' : 'Unread'}/><div><strong>{item.title}</strong><time dateTime={item.scheduledAt}>{new Date(item.scheduledAt).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}</time></div>
        </Link>)}
      </div>
    </section>}
  </div>;
}
