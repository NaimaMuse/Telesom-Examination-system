import {useEffect} from 'react';
import {Link,useLocation} from 'react-router-dom';
import TeachingIcon from '../components/TeachingIcon';
import './PublicPages.css';

const features=[
  {icon:'users',title:'Student Management',description:'Keep student records and learning progress in one place.'},
  {icon:'clipboard',title:'Assessments & Exams',description:'Manage quizzes, exams and project evaluations.'},
  {icon:'chart',title:'Detailed Reports',description:'Follow academic performance and learning outcomes.'},
];

function PublicLayout({children}){
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
        <span><b>Telesom</b> Academy</span>
      </Link>
      <nav className="public-nav" aria-label="Main navigation">
        {[['home','Home'],['about','About Us'],['contact','Contact Us']].map(([id,label])=>
          <Link key={id} to={'/#'+id} className={(hash||'#home')==='#'+id?'active':''}
            aria-current={(hash||'#home')==='#'+id?'location':undefined}>{label}</Link>)}
      </nav>
      <Link className="public-login" to="/staff/login"><TeachingIcon name="profile" size={18}/>Login</Link>
    </header>
    <main id="public-content">{children}</main>
    <footer className="public-footer">
      <span>© {new Date().getFullYear()} Telesom Academy</span>
      <span>Academic Management System</span>
      <div><Link to="/#about">About Us</Link><Link to="/#contact">Contact Us</Link><Link to="/staff/login">Login</Link></div>
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
  return <PublicLayout>
    <section className="public-hero" id="home">
      <div className="public-hero-copy">
        <p className="public-eyebrow">ACADEMIC MANAGEMENT SYSTEM<span aria-hidden="true"/></p>
        <h1>Telesom <span>Academy</span></h1>
        <p className="public-hero-description">A connected space for students, teachers and academic progress.</p>
        <p className="public-hero-detail">Manage learning, assessments and performance with the Telesom Academy academic platform.</p>
        <div className="public-hero-actions">
          <Link className="public-button primary" to="/staff/login"><TeachingIcon name="users" size={19}/>Get Started<TeachingIcon name="arrow" size={17}/></Link>
          <Link className="public-button secondary" to="/#about"><TeachingIcon name="book" size={18}/>Learn More</Link>
        </div>
      </div>
      <div className="public-hero-visual">
        <img src="/academy-home-hero.png" alt="Laptop displaying an academic dashboard beside books and a green plant" fetchPriority="high" width="900" height="600"/>
      </div>
    </section>
    <FeatureStrip/>
    <section id="about" className="public-about-content" aria-labelledby="public-about-title">
      <div className="public-about-mark"><img src="/telesom-academy-logo.png" alt="Telesom Academy" width="100" height="100"/></div>
      <div><p className="public-eyebrow">ABOUT US</p><h2 id="public-about-title">A shared home for academic life</h2><p>Telesom Academy brings student records, teaching, assessments and reporting together. Students follow their progress, teachers manage learning, and administrators coordinate academic activities.</p></div>
    </section>
    <section id="contact" className="public-contact-section" aria-labelledby="public-contact-title">
      <div><p className="public-eyebrow">CONTACT US</p><h2 id="public-contact-title">How can we help?</h2><p>Contact the Telesom Academy office for course and enrollment information, or your academy administrator for account support.</p></div>
      <Link className="public-button primary" to="/staff/login"><TeachingIcon name="profile" size={18}/>Login to your account<TeachingIcon name="arrow" size={16}/></Link>
    </section>
  </PublicLayout>;
}
