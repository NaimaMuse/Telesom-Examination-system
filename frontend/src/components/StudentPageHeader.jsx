import './StudentPageHeader.css';

export default function StudentPageHeader({title, hint, variant = 'default'}) {
  return <header className={`student-page-banner student-page-banner--${variant}`} aria-labelledby="student-page-title">
    <div className="student-page-banner-copy">
      <h1 id="student-page-title">{title}</h1>
      <p>{hint}</p>
    </div>
  </header>;
}
