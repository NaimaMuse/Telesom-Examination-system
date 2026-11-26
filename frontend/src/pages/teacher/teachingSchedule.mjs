export function contractEndDate(start, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !Number.isInteger(Number(days)) || Number(days)<1 || Number(days)>36500) return '';
  const date=new Date(start+'T12:00:00Z');
  if(Number.isNaN(date.getTime()) || date.toISOString().slice(0,10)!==start)return '';
  date.setUTCDate(date.getUTCDate()+Number(days)-1);return date.toISOString().slice(0,10);
}
export function classesOnDate(contracts, key) {
  const date = new Date(key + 'T12:00:00Z');
  return contracts.flatMap(contract => {
    if (contract.activeAssignment === false || contract.status === 'cancelled' || !contract.startDate || key < contract.startDate) return [];
    const endKey = contract.endDate || (contract.dayBasis === 'calendar'
      ? contractEndDate(contract.startDate, contract.totalDays || contract.totalContractDays)
      : null);
    if (endKey && key > endKey) return [];
    const course = contract.course;
    if (!course || (course.cohort && course.cohort !== contract.cohort) || (course.academicYear && course.academicYear !== contract.academicYear)) return [];
    return (course.teachingSchedule || []).filter(slot => slot.day === date.getUTCDay()).map(slot => ({...contract, slot}));
  }).sort((a,b) => a.slot.startTime.localeCompare(b.slot.startTime));
}

export function teachingDateKey(date = new Date()) {
  return new Date(new Date(date).getTime() + 3 * 3600000).toISOString().slice(0, 10);
}

export function studentClassesOnDate(schedules, key) {
  const weekday = new Date(key + 'T12:00:00Z').getUTCDay();
  const weekly = schedules.filter(schedule => schedule.weekly).flatMap(({course}) =>
    course.teachingSchedule.filter(slot => slot.day === weekday).map(slot => ({course, slot}))
  );
  const classes = [...classesOnDate(schedules, key), ...weekly];
  return [...new Map(classes.map(item => [
    [item.course._id, item.slot.startTime, item.slot.endTime].join('/'), item,
  ])).values()].sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
}

export function makeupClassesByDate(classes) {
  const days = new Map();
  for (const makeup of classes) {
    if (makeup.status === 'cancelled') continue;
    const date = makeup.date || teachingDateKey(makeup.start);
    if (!days.has(date)) days.set(date, []);
    days.get(date).push(makeup);
  }
  return days;
}

export function remainingStudentClasses(contract, makeupClasses = [], now = new Date()) {
  if (!contract) return null;
  const end = contract.endDate || (contract.dayBasis === 'calendar'
    ? contractEndDate(contract.startDate, contract.totalContractDays || contract.totalDays)
    : '');
  if (!end) return null;
  const today = teachingDateKey(now);
  const start = today > contract.startDate ? today : contract.startDate;
  const makeupCount = makeupClasses.filter(item =>
    String(item.contract?._id || item.contract) === String(contract._id) &&
    item.status !== 'cancelled' && item.displayStatus === 'Scheduled' &&
    Date.parse(item.end) > now.getTime()
  ).length;
  let count = makeupCount;
  for (const date = new Date(start + 'T12:00:00Z'); Number.isFinite(+date); date.setUTCDate(date.getUTCDate() + 1)) {
    const key = date.toISOString().slice(0, 10);
    if (key > end) break;
    count += studentClassesOnDate([contract], key).filter(({slot}) =>
      key !== today || Date.parse(key + 'T' + slot.endTime + ':00+03:00') > now.getTime()
    ).length;
  }
  return count;
}

export function contractDurationDays(start, duration, unit = 'days') {
  const count = Number(duration);
  if (unit === 'days') return contractEndDate(start, count) ? count : 0;
  if (!contractEndDate(start, 1) || !Number.isInteger(count) || count < 1 || count > 1200) return 0;
  const from = new Date(start + 'T12:00:00Z');
  const next = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + count, 1, 12));
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(from.getUTCDate(), last));
  const days = Math.round((next - from) / 86400000);
  return contractEndDate(start, days) ? days : 0;
}

export function contractDurationLabel(contract) {
  if (contract.dayBasis !== 'calendar') return contract.totalContractDays + ' teaching days';
  if (contract.startDate && contract.endDate) {
    const start = new Date(contract.startDate + 'T12:00:00Z');
    const end = new Date(contract.endDate + 'T12:00:00Z');
    end.setUTCDate(end.getUTCDate() + 1);
    const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
    if (months > 0 && contractDurationDays(contract.startDate, months, 'months') === contract.totalContractDays) {
      return months + (months === 1 ? ' month' : ' months');
    }
  }
  return contract.totalContractDays + ' calendar days';
}
