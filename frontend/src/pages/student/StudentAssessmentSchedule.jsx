import TeachingIcon from '../../components/TeachingIcon';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi',
});

export default function StudentAssessmentSchedule({kind, items, loading, error, searching}) {
  const isQuiz = kind === 'quizzes';
  const icon = isQuiz ? 'clipboard' : 'file';
  const sorted = [...items].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));

  return <section className="student-assessment-schedule" aria-labelledby="student-assessment-schedule-title">
    <header>
      <TeachingIcon name="calendar" size={19}/>
      <h2 id="student-assessment-schedule-title">Upcoming {isQuiz ? 'Quizzes' : 'Exams'}</h2>
    </header>
    {error && <p className="academy-error" role="alert">{error}</p>}
    {loading ? <p className="student-academic-status" role="status">Loading {kind}…</p>
      : sorted.length > 0 ? <ul>
        {sorted.map(item => {
          const date = new Date(item.date + 'T12:00:00Z');
          return <li key={item._id}>
            <span className={'student-assessment-icon' + (isQuiz ? ' is-quiz' : '')}>
              <TeachingIcon name={icon} size={19}/>
            </span>
            <div className="student-assessment-details">
              <h3>{isQuiz ? item.quiz : item.title}</h3>
              {item.course && <p>{item.course}</p>}
            </div>
            {Number.isFinite(date.getTime()) && <time dateTime={item.date}>
              <TeachingIcon name="calendar" size={16}/>{dateFormatter.format(date)}
            </time>}
          </li>;
        })}
      </ul>
      : !error && <p className="student-academic-status">{searching ? `No matching ${kind}.` : `No upcoming ${kind} scheduled.`}</p>}
  </section>;
}
