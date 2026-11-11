import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AnnouncementRecipients({ draft, setDraft, disabled }) {
  const [directory, setDirectory] = useState(null);
  const [roster, setRoster] = useState(null);
  const {teacherId, includeTeacher, studentIds} = draft;

  useEffect(() => {
    const request = new AbortController();
    api.get('/announcements/recipients/teachers', {signal:request.signal})
      .then(({data}) => {
        if (!request.signal.aborted) setDirectory({teachers:data.teachers});
      })
      .catch(() => {
        if (!request.signal.aborted) setDirectory({error:'Could not load teachers.'});
      });
    return () => request.abort();
  }, []);

  useEffect(() => {
    if (!teacherId) return;
    const request = new AbortController();
    api.get(`/announcements/recipients/teachers/${teacherId}/students`, {signal:request.signal})
      .then(({data}) => {
        if (!request.signal.aborted) setRoster({teacherId, students:data.students});
      })
      .catch(() => {
        if (!request.signal.aborted) setRoster({teacherId, error:'Could not load students for this teacher.'});
      });
    return () => request.abort();
  }, [teacherId]);

  const currentRoster = roster?.teacherId === teacherId ? roster : null;
  const students = currentRoster?.students ?? [];
  const selectedIds = new Set(studentIds);
  const allSelected = students.length > 0 && students.every(student => selectedIds.has(student.id));
  const partiallySelected = !allSelected && students.some(student => selectedIds.has(student.id));
  return (
    <fieldset className="announcement-targets" disabled={disabled}>
      <legend>Choose recipients</legend>
      <label className="announcement-teacher-select">
        Teacher
        <select className="form-control" required disabled={!directory?.teachers?.length} value={teacherId}
          onChange={event => {
            const id = event.target.value;
            setRoster(null);
            setDraft(current => ({...current, teacherId:id, studentIds:[]}));
          }}>
          <option value="">{directory?.teachers?.length ? 'Select a teacher' : directory ? 'No teachers available' : 'Loading teachers…'}</option>
          {directory?.teachers?.map(teacher => (
            <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.teacherId}</option>
          ))}
        </select>
      </label>
      {directory?.error && <p className="announcement-error" role="alert">{directory.error}</p>}
      {teacherId && (
        <>
          <label className="announcement-recipient-option">
            <input type="checkbox" checked={includeTeacher}
              onChange={event => setDraft(current => ({...current, includeTeacher:event.target.checked}))}/>
            Send to this teacher
          </label>
          <div className="announcement-roster" role="group" aria-label="Students in this teacher’s courses">
            <div className="announcement-roster-heading"><strong>Students</strong><span>{studentIds.length} selected</span></div>
            {!currentRoster && <p role="status">Loading students…</p>}
            {currentRoster?.error && <p className="announcement-error" role="alert">{currentRoster.error}</p>}
            {currentRoster?.students?.length === 0 && <p>No active students in this teacher’s courses.</p>}
            {students.length > 0 && (
              <label className="announcement-recipient-option announcement-select-all">
                <input type="checkbox" checked={allSelected}
                  ref={input => { if (input) input.indeterminate = partiallySelected; }}
                  onChange={event => {
                    const ids = event.target.checked ? students.map(student => student.id) : [];
                    setDraft(current => ({...current, studentIds:ids}));
                  }}/>
                Select all students
              </label>
            )}
            {students.map(student => (
              <label className="announcement-recipient-option" key={student.id}>
                <input type="checkbox" checked={selectedIds.has(student.id)} onChange={event => {
                  const selected = event.target.checked;
                  setDraft(current => ({
                    ...current,
                    studentIds:selected ? [...current.studentIds, student.id] : current.studentIds.filter(id => id !== student.id),
                  }));
                }}/>
                <span>{student.name} <small>{student.studentId}</small></span>
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}
