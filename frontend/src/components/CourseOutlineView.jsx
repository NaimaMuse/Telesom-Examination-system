import {useEffect,useRef,useState} from 'react';
import TeachingIcon from './TeachingIcon';
import './CourseOutlineView.css';

const lessonPercent=lesson=>lesson.status==='completed'?100:Math.min(99,Math.max(0,Number(lesson.progress)||0));
const lessonStatus=lesson=>lesson.status==='completed'?'Completed':lessonPercent(lesson)>0?'In progress':'Planned';

export default function CourseOutlineView({rows, role, busy, loading, error, hasContracts, searching, onCreate, onEdit, onAddLesson, onEditLesson, onToggleLesson, onPublish, onDelete, onMoveChapter, onMoveLesson, onProgress}) {
  const [filter, setFilter] = useState('All');
  const [expanded,setExpanded]=useState({});


  const matchesLesson=(outline,lesson)=>filter==='All'||lessonStatus(lesson)===filter;
  const matchingRows=rows.filter(outline=>filter==='All'||outline.lessons.some(lesson=>matchesLesson(outline,lesson)));

  const errorRef=useRef(null);
  useEffect(()=>{if(error){errorRef.current?.scrollIntoView({behavior:'smooth',block:'center'});errorRef.current?.focus({preventScroll:true});}},[error]);
  const total = rows.reduce((sum, row) => sum + row.lessons.length, 0);
  const completed = rows.reduce((sum, row) => sum + row.lessons.filter(lesson => lesson.status === 'completed').length, 0);

  const progress = total ? Math.round(rows.reduce((sum,o)=>sum+o.lessons.reduce((n,l)=>n+lessonPercent(l),0),0)/total) : 0;
  const teacher = role === 'teacher';
  return <div className="outline-studio planner-reference">
    <header className="outline-studio-heading">
      <div className="planner-heading-identity"><span className="planner-heading-icon"><TeachingIcon name="book" size={32}/></span><div><h2>Course Planner</h2><span className="outline-eyebrow">CHAPTERS &amp; LESSONS</span></div></div>

    </header>
    {error && <p ref={errorRef} tabIndex={-1} className="academy-error" role="alert">{error}</p>}
    {loading ? <p className="outline-empty" role="status">Loading your lesson plan…</p> : <>
      {!!rows.length && <>
        <section className="outline-summary" aria-label="Lesson progress">
          <div className="outline-summary-progress"><div><span>Course progress</span><strong>{progress}%</strong></div><progress value={progress} max={100} aria-label="Course progress"/><small>{completed} of {total} lessons completed</small></div>
          <div className="planner-stat"><span className="planner-stat-label"><span className="planner-metric-icon"><TeachingIcon name="file" size={24}/></span>Total lessons</span><strong>{total}</strong><small>All chapters and lessons</small></div><div className="planner-stat completed"><span className="planner-stat-label"><span className="planner-metric-icon"><TeachingIcon name="check" size={24}/></span>Completed</span><strong>{completed}</strong><small>Lessons finished</small></div><div className="planner-stat remaining"><span className="planner-stat-label"><span className="planner-metric-icon"><TeachingIcon name="clock" size={24}/></span>Remaining</span><strong>{total-completed}</strong><small>Lessons to complete</small></div>
        </section>
        <div className="outline-toolbar">
          <div className="outline-filters" role="group" aria-label="Filter lessons">{['All','Planned','In progress','Completed'].map(item => <button type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}<span className="planner-filter-count">{item==='All'?total:rows.reduce((sum,o)=>sum+o.lessons.filter(l=>lessonStatus(l)===item).length,0)}</span></button>)}</div>{teacher && <button type="button" className="btn btn-primary planner-create-chapter" disabled={busy || loading || !hasContracts} onClick={onCreate}><span aria-hidden="true">＋</span> Create chapter</button>}
        </div>
      </>}
      {!!rows.length&&!matchingRows.length&&<div className="outline-empty" role="status"><h4>No matching chapters or lessons</h4><p>Choose another lesson status.</p></div>}
      {matchingRows.map(outline => {
        const lessons = outline.lessons.filter(lesson => matchesLesson(outline,lesson));
        const done = outline.lessons.filter(lesson => lesson.status === 'completed').length;
        const open=!!expanded[outline._id];
        return <section className="outline-card" key={outline._id}>
          <header className={`outline-accordion-heading ${open?'is-open':''}`}><h3><button type="button" className="outline-chapter-toggle" aria-expanded={open} aria-controls={`chapter-body-${outline._id}`} onClick={()=>setExpanded(current=>({...current,[outline._id]:!current[outline._id]}))}><span className="outline-chapter-number">{String(outline.chapterNumber).padStart(2,'0')}</span><span className="outline-toggle-copy"><span className="outline-toggle-title">Chapter {outline.chapterNumber}: {outline.title}</span><span className="outline-toggle-meta">{outline.lessons.length} lessons · {done} completed</span></span><span className="outline-toggle-percent" style={{'--chapter-progress':`${outline.progress||0}%`}}><span>{outline.progress||0}%</span></span><svg className={`outline-chevron ${open?'is-open':''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></h3></header>
          <div id={`chapter-body-${outline._id}`} className="outline-chapter-body" hidden={!open}>
          <div className="outline-chapter-visibility"><span className={`outline-visibility ${outline.published?'published':''}`}>{outline.published?'Visible to students':'Draft · Staff only'}</span></div>
          <div className="outline-card-actions">
            {teacher && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onAddLesson(outline)}>＋ Add lesson</button>}
            {teacher && <details className="outline-options"><summary>Manage chapter <span aria-hidden="true">⌄</span></summary><div className="outline-options-menu">
              <button type="button" disabled={busy} onClick={event => {event.currentTarget.closest('details').open = false; onEdit(outline);}}>Edit chapter</button><button type="button" disabled={busy||outline.chapterNumber===1} onClick={()=>onMoveChapter(outline,'up')}>↑ Move chapter up</button><button type="button" disabled={busy} onClick={()=>onMoveChapter(outline,'down')}>↓ Move chapter down</button><button type="button" className="outline-delete-chapter" disabled={busy} onClick={event=>{event.currentTarget.closest('details').open=false;onDelete(outline);}}>Delete chapter</button>
              <button type="button" disabled={busy} onClick={event => {event.currentTarget.closest('details').open=false; onPublish(outline);}}>{outline.published ? 'Hide from students' : 'Publish to students'}</button>
            </div></details>}
          </div>
          <div className="outline-lesson-list">
            <div className="outline-list-label"><h4>Chapter {outline.chapterNumber} · Lessons</h4><span>{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}</span></div>
            {lessons.length ? lessons.map(lesson => {
              const status = lessonStatus(lesson);
              return <article className="outline-lesson" key={lesson._id}>
                <span className={`outline-lesson-number ${status === 'Completed' ? 'done' : ''}`} aria-hidden="true">{status === 'Completed' ? '✓' : String(outline.lessons.indexOf(lesson) + 1).padStart(2,'0')}</span>
                <div className="outline-lesson-copy"><h4><span className="outline-lesson-label">Lesson {lesson.lessonNumber||outline.lessons.indexOf(lesson)+1}:</span> {lesson.title}</h4></div>
                <div className="lesson-progress"><span className={`outline-lesson-status ${status.toLowerCase().replace(' ','-')}`}>{status}</span><progress max="100" value={lessonPercent(lesson)} aria-label={`${lesson.title} progress`}/><small>{lessonPercent(lesson)}%</small></div>
                {teacher && <div className="outline-lesson-actions"><button type="button" disabled={busy||outline.lessons.indexOf(lesson)===0} aria-label={`Move ${lesson.title} up`} onClick={()=>onMoveLesson(outline,lesson,'up')}>↑</button><button type="button" disabled={busy||outline.lessons.indexOf(lesson)===outline.lessons.length-1} aria-label={`Move ${lesson.title} down`} onClick={()=>onMoveLesson(outline,lesson,'down')}>↓</button>{status!=='Completed'&&<select aria-label={`Set progress for ${lesson.title}`} value={lessonPercent(lesson)} disabled={busy} onChange={event=>onProgress(outline,lesson,Number(event.target.value))}>{[0,25,50,75,100].map(value=><option key={value} value={value}>{value}%{value===100?" — Completed":""}</option>)}{![0,25,50,75,100].includes(lessonPercent(lesson))&&<option value={lessonPercent(lesson)}>{lessonPercent(lesson)}%</option>}</select>}<button type="button" className="outline-edit-lesson" disabled={busy} onClick={() => onEditLesson(outline,lesson)} aria-label={`Edit ${lesson.title}`}>Edit</button><button type="button" className={`outline-complete-lesson ${status === 'Completed' ? 'completed' : ''}`} disabled={busy} onClick={() => onToggleLesson(outline,lesson)} aria-label={`${status === 'Completed' ? 'Undo completion for' : 'Mark completed:'} ${lesson.title}`}>{status === 'Completed' ? 'Undo completion' : 'Mark completed'}</button></div>}
              </article>;
            }) : <div className="outline-empty"><h4>{outline.lessons.length ? 'No matching lessons' : 'Ready for your first lesson'}</h4><p>{outline.lessons.length ? 'Choose another lesson status.' : 'Add Lesson 1 to begin this chapter.'}</p></div>}
          </div>
          </div>
        </section>;
      })}
      {!rows.length && <div className="outline-start"><span aria-hidden="true">▤</span><h3>{searching ? 'No matching chapters' : 'Build your course plan'}</h3><p>{searching ? 'Try a different search to find your chapters.' : 'Create Chapter 1, give it a title, then add Lesson 1, Lesson 2 and the rest of your teaching plan.'}</p>{teacher && !searching && <button type="button" className="btn btn-primary" disabled={busy || !hasContracts} onClick={onCreate}>＋ Create your first chapter</button>}{teacher && !hasContracts && <p>A teaching contract must be assigned before you can create a chapter.</p>}<ol><li><b>1</b> Create a chapter</li><li><b>2</b> Add lessons</li><li><b>3</b> Mark lessons completed</li></ol></div>}
    </>}
  </div>;
}
