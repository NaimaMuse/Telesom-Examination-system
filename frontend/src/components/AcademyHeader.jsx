import { NavLink } from 'react-router-dom';
import TeachingIcon from './TeachingIcon';
import NotificationBell from './NotificationBell';
import './AcademyHeader.css';

export default function AcademyHeader({role,user,avatar,onToggleMenu,onLogout,search,onSearch,pageTitle,onNotificationNavigate}) {
  const roleName = {admin:'Admin',teacher:'Teacher',student:'Student'}[role] || 'User';
  const accountName = role === 'admin' ? 'Telesom Academy' : user?.name || roleName;
  const searchHint = {admin:'Search students, courses, exams, and more…',teacher:'Search courses, exams, quizzes, and more…',student:'Search courses, exams, notes, and more…'}[role];
  const initials = (role === 'admin' ? 'Telesom Academy' : user?.name || roleName).split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  const closeMenu = event => event.currentTarget.closest('details')?.removeAttribute('open');
  return <header className="dash-topbar academy-header">
    <div className="academy-header-brand"><button type="button" className="academy-menu-toggle" onClick={onToggleMenu} aria-label="Toggle sidebar"><TeachingIcon name="menu" size={22}/></button><label className="academy-header-search"><TeachingIcon name="search" size={19}/><input type="search" aria-label={'Search '+pageTitle} placeholder={searchHint} value={search} onChange={event=>onSearch(event.target.value)}/></label></div>
    <div className="academy-header-actions">
      <NotificationBell key={user?._id || user?.id} userId={user?._id || user?.id} onNavigate={onNotificationNavigate}/>
      <details className="academy-account-menu"><summary><span className="academy-account-avatar">{avatar ? <img src={avatar} alt=""/> : initials}</span><span className="academy-account-identity"><strong className="academy-account-name">{accountName}</strong><small>{roleName}</small></span><span className="academy-account-chevron" aria-hidden="true">⌄</span></summary><div className="academy-account-options"><span className="academy-account-role">{roleName} account</span><NavLink to={role==='admin'?'/admin':'/'+role+'/profile'} onClick={closeMenu}><TeachingIcon name="profile" size={16}/>{role==='admin'?'Admin Dashboard':'My Profile'}</NavLink><button type="button" onClick={onLogout}><TeachingIcon name="arrow" size={16}/>Sign Out</button></div></details>
    </div>
  </header>;
}
