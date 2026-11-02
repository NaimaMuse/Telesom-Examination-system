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
    const end = new Date(contract.startDate + 'T12:00:00Z');
    end.setUTCDate(end.getUTCDate() + Number(contract.totalDays || contract.totalContractDays) - 1);
    const durationEnd = Number.isNaN(end.getTime()) ? null : end.toISOString().slice(0,10);
    const endKey = contract.dayBasis === 'teaching' ? contract.endDate : contract.endDate || durationEnd;
    if (endKey && key > endKey) return [];
    const course = contract.course;
    if (!course || (course.batch && course.batch !== contract.batch) || (course.academicYear && course.academicYear !== contract.academicYear)) return [];
    return (course.teachingSchedule || []).filter(slot => slot.day === date.getUTCDay()).map(slot => ({...contract, slot}));
  }).sort((a,b) => a.slot.startTime.localeCompare(b.slot.startTime));
}
