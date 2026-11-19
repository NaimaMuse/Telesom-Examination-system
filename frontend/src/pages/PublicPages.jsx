import {useEffect} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import TeachingIcon from '../components/TeachingIcon';
import './PublicPages.css';

const features=[
  {icon:'graduate',title:'Student Management',description:'Student records and progress.'},
  {icon:'teacher',title:'Teacher Management',description:'Teaching and course coordination.'},
  {icon:'chart',title:'Track Performance',description:'Assessments and learning outcomes.'},
  {icon:'clipboard',title:'Assessments & Exams',description:'Quizzes, exams and evaluations.'},
];

function PublicLayout({children}){
  const {user,authLoading}=useAuth();
  const dashboard=user?.role==='judge'?'/judge/project-defenses':`/${user?.role}`;
  const {hash}=useLocation();
  useEffect(()=>{
    const target=document.getElementById(hash.slice(1)||'home');
    target?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  },[hash]);
  return <div className="academy-public">
    <a className="public-skip" href="#public-content">Skip to content</a>
    <header className="public-header">
      <Link className="public-brand" to="/" aria-label="Telesom Academy home">
        <img src="/telesom-academy-logo.png" alt="" width="49" height="49"/>
        <span><b>Telesom</b><span>Academy</span></span>
      </Link>
      <nav className="public-nav" aria-label="Main navigation">
        {[['home','Home','home'],['about','About Us','users'],['contact','Contact Us','profile']].map(([id,label,icon])=>
          <Link key={id} to={'/#'+id} className={(hash||'#home')==='#'+id?'active':''}
            aria-current={(hash||'#home')==='#'+id?'location':undefined}><TeachingIcon name={icon} size={18}/>{label}</Link>)}
      </nav>
      <Link className={`public-login${user?' public-account':''}`} to={user?dashboard:'/login'} aria-label={user?'Go to your dashboard':'Login'} title={user?'My dashboard':'Login'}><TeachingIcon name="profile" size={user?23:18}/>{!user&&!authLoading&&'Login'}</Link>
    </header>
    <main id="public-content">{children}</main>
    <footer className="public-footer">
      <span>© {new Date().getFullYear()} Telesom Academy</span>
      <span>Academic Management System</span>
      <div><Link to="/#about">About Us</Link><Link to="/#contact">Contact Us</Link><Link to={user?dashboard:'/login'}>{user?'My Dashboard':'Login'}</Link></div>
    </footer>
  </div>;
}

function FeatureStrip(){
  return <section className="public-features" aria-label="Platform features">
    {features.map(feature=><article key={feature.title}>
      <span className="public-feature-icon"><TeachingIcon name={feature.icon} size={29}/></span>
      <div><h2>{feature.title}</h2><p>{feature.description}</p></div>
    </article>)}
  </section>;
}

export function HomePage(){
  const {user}=useAuth();
  const accountPath=user?(user.role==='judge'?'/judge/project-defenses':`/${user.role}`):'/login';
  return <PublicLayout>
    <section className="public-hero" id="home">
      <img className="public-campus-background" src="/academy-campus-original-clear-logo.png"
        alt="Academy building with a landscaped entrance and reflective glass facade"
        fetchPriority="high" width="1167" height="1348"/>
      <div className="public-hero-copy">
        <p className="public-eyebrow">ACADEMIC MANAGEMENT SYSTEM<span aria-hidden="true"/></p>
        <h1>Telesom <span>Academy</span></h1>
        <p className="public-hero-description">Learn Today, Lead Tomorrow.</p>
        <p className="public-hero-detail">Manage learning, assessments and performance with the Telesom Academy academic platform.</p>
        <div className="public-hero-actions">
          <Link className="public-button primary" to={accountPath}><TeachingIcon name="bolt" size={19}/>Get Started<TeachingIcon name="arrow" size={17}/></Link>
          <Link className="public-button secondary" to="/#about"><TeachingIcon name="play" size={18}/>Learn More</Link>
        </div>
      </div>
    </section>
    <FeatureStrip/>
    <section id="about" className="public-about-content" aria-labelledby="public-about-title">
      <div className="public-about-mark"><img src="/telesom-academy-logo.png" alt="Telesom Academy" width="100" height="100"/></div>
      <div><p className="public-eyebrow">ABOUT US</p><h2 id="public-about-title">A shared home for academic life</h2><p>Telesom Academy brings student records, teaching, assessments and reporting together. Students follow their progress, teachers manage learning, and administrators coordinate academic activities.</p></div>
    </section>
    <section id="contact" className="public-contact-section" aria-labelledby="public-contact-title">
      <div><p className="public-eyebrow">CONTACT US</p><h2 id="public-contact-title">How can we help?</h2><p>Contact the Telesom Academy office for course and enrollment information, or your academy administrator for account support.</p></div>
      <Link className="public-button primary" to={accountPath}><TeachingIcon name="profile" size={18}/>Login to your account<TeachingIcon name="arrow" size={16}/></Link>
    </section>
  </PublicLayout>;
}
