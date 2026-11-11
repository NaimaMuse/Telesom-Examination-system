import { useState } from 'react';
import './WeeklySchedule.css';
export const WEEK_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export function WeeklySchedulePreview({schedule = [], title = 'Weekly teaching schedule', emptyMessage = 'No weekly schedule configured. Add teaching days in Edit course.'}) {
  const hours = schedule.reduce((sum,row) => { const minutes = value => Number(value.slice(0,2))*60+Number(value.slice(3)); return sum + (minutes(row.endTime)-minutes(row.startTime))/60; },0);
  return <section className="weekly-preview"><div className="weekly-schedule-heading"><div><h3>{title}</h3><p>Nairobi time · {schedule.length} days / week · {Number(hours.toFixed(2))} hours / week</p></div></div>{schedule.length ? <div className="weekly-preview-slots">{[...schedule].sort((a,b)=>a.day-b.day).map(row=><span key={row.day}><strong>{WEEK_DAYS[row.day]}</strong>{row.startTime}–{row.endTime}</span>)}</div> : <p className="weekly-schedule-empty">{emptyMessage}</p>}</section>;
}
export default function WeeklySchedule({
  value = [], onChange, title = 'Weekly teaching schedule',
  description = 'Choose teaching days and class times.', daysLabel = 'Teaching days', emptyMessage,
  compact = false,
}) {
  const [sameTime, setSameTime] = useState(() => value.every(row => row.startTime === value[0]?.startTime && row.endTime === value[0]?.endTime));
  const [sharedTime, setSharedTime] = useState(() => ({startTime:value[0]?.startTime || '08:00', endTime:value[0]?.endTime || '10:00'}));
  const updateSharedTime = (key, next) => {
    const times = {...sharedTime, [key]:next};
    setSharedTime(times);
    onChange(value.map(row => ({...row, ...times})));
  };
  return (
    <section className="weekly-schedule" aria-label={title}>
      <div className="weekly-schedule-heading">
        <div><h3>{title}</h3>{!compact && <p>{description}</p>}</div>
        <span className="weekly-timezone">Nairobi · UTC+3</span>
      </div>
      <div className="weekly-day-picker" role="group" aria-label={daysLabel}>
        {WEEK_DAYS.map((day, index) => {
          const selected = value.some(row => row.day === index);
          return <button type="button" key={day} className={'weekly-day-chip' + (selected ? ' is-selected' : '')} aria-label={day} aria-pressed={selected} onClick={() => onChange(selected ? value.filter(row => row.day !== index) : [...value, {day:index, ...(sameTime ? sharedTime : {startTime:'08:00', endTime:'10:00'})}])}>{day.slice(0,3)}</button>;
        })}
      </div>
      <label className="weekly-same-time"><input type="checkbox" checked={sameTime} onChange={event => {
        const checked=event.target.checked;
        setSameTime(checked);
        if (checked) {
          const times={startTime:value[0]?.startTime || sharedTime.startTime,endTime:value[0]?.endTime || sharedTime.endTime};
          setSharedTime(times);
          onChange(value.map(row => ({...row,...times})));
        }
      }} /> Same time for all days</label>
      <div className="weekly-schedule-rows">
        {sameTime && <div className="weekly-schedule-row is-enabled">{!compact && <span className="weekly-selected-day">All selected days</span>}<div className="weekly-time-range">
          <label><span>From</span><input type="time" required aria-label="All days start time" value={sharedTime.startTime} onChange={event => updateSharedTime('startTime',event.target.value)}/></label>
          <span className="weekly-time-divider">–</span>
          <label><span>To</span><input type="time" required aria-label="All days end time" value={sharedTime.endTime} onChange={event => updateSharedTime('endTime',event.target.value)}/></label>
        </div></div>}
        {!sameTime && [...value].sort((a,b) => a.day-b.day).map(slot => {
          const day = WEEK_DAYS[slot.day];
          const update = (key, next) => onChange(value.map(row => row.day === slot.day ? {...row, [key]:next} : row));
          return <div key={slot.day} className="weekly-schedule-row is-enabled">
            <span className="weekly-selected-day">{day}</span>
            <div className="weekly-time-range">
              <label><span>From</span><input type="time" required aria-label={day+' start time'} value={slot.startTime} onChange={event => update('startTime',event.target.value)}/></label>
              <span className="weekly-time-divider">–</span>
              <label><span>To</span><input type="time" required aria-label={day+' end time'} value={slot.endTime} onChange={event => update('endTime',event.target.value)}/></label>
            </div>
          </div>;
        })}
      </div>
      {!compact && <WeeklySchedulePreview schedule={value} title="Schedule summary" emptyMessage={emptyMessage}/>}
    </section>
  );
}
