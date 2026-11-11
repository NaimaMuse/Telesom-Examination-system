const TeacherContract = require('../models/TeacherContract');
const TeachingLesson = require('../models/TeachingLesson');
const Internship = require('../models/Internship');
const { calculateBalance, validDate } = require('./teacherContractService');

const nextDay = day => new Date(Date.parse(day) + 86400000).toISOString().slice(0, 10);
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function notice(type, id, day, title, href) {
  return {
    id: `${type}:${id}:${day}`,
    type,
    title,
    href,
    scheduledAt: new Date(`${day}T00:00:00+03:00`).toISOString(),
  };
}

async function contractNotices(teacherId, today, now) {
  const contracts = await TeacherContract.find({ status: 'active', ...(teacherId ? { teacher: teacherId } : {}) })
    .populate({ path: 'teacher', select: 'user', populate: { path: 'user', select: 'name' } })
    .populate('course', 'title name').lean();
  const teachingIds = contracts.filter(contract => contract.dayBasis !== 'calendar').map(contract => contract._id);
  const lessons = teachingIds.length
    ? await TeachingLesson.find({ contract: { $in: teachingIds }, status: 'completed', completedDay: { $ne: null } })
      .select('contract completedDay').lean()
    : [];
  const daysByContract = new Map();
  for (const lesson of lessons) {
    if (!validDate(lesson.completedDay) || lesson.completedDay > today) continue;
    const id = String(lesson.contract);
    if (!daysByContract.has(id)) daysByContract.set(id, []);
    daysByContract.get(id).push(lesson.completedDay);
  }

  return contracts.flatMap(contract => {
    if (!validDate(contract.startDate) || contract.startDate > today || !Number.isInteger(contract.totalDays) ||
        contract.totalDays < 1 || (contract.dayBasis === 'calendar' && contract.totalDays > 36500)) return [];
    const balance = calculateBalance(contract, daysByContract.get(String(contract._id)) || [], now);
    const expiry = validDate(balance.endDate) && today > balance.endDate ? nextDay(balance.endDate) : null;
    const completed = contract.dayBasis !== 'calendar' ? balance.completedDates[contract.totalDays - 1] : null;
    const day = completed && (!expiry || completed < expiry) ? completed : expiry;
    if (!day) return [];
    const course = contract.course?.title || contract.course?.name || 'Teaching contract';
    const teacher = contract.teacher?.user?.name;
    const label = teacherId ? course : [teacher, course].filter(Boolean).join(' · ');
    return [notice('contract-ended', contract._id, day, `Contract ended: ${label}`, teacherId ? '/teacher/contracts' : '/admin/contracts')];
  });
}

function monthAnniversary(start, months) {
  const target = new Date(start);
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months + 1, 0);
  target.setUTCDate(Math.min(start.getUTCDate(), target.getUTCDate()));
  return target.toISOString().slice(0, 10);
}

async function internshipNotices(today) {
  const internships = await Internship.find({ startDate: { $lt: today } })
    .select('studentName startDate endDate monthlyStipendCents').lean();
  return internships.flatMap(internship => {
    const { _id, studentName, startDate, endDate, monthlyStipendCents } = internship;
    if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) return [];
    const end = nextDay(endDate);
    const notices = [];
    if (end <= today) notices.push(notice('internship-ended', _id, end, `Internship ended: ${studentName}`, '/admin/internships'));
    if (!(monthlyStipendCents > 0)) return notices;

    const start = new Date(startDate);
    const cutoff = new Date(end < today ? end : today);
    const months = (cutoff.getUTCFullYear() - start.getUTCFullYear()) * 12 + cutoff.getUTCMonth() - start.getUTCMonth();
    for (let month = months; month >= 1 && notices.length < 60; month--) {
      const due = monthAnniversary(start, month);
      if (due <= today && due <= end) {
        const amount = usd.format(monthlyStipendCents / 100);
        notices.push(notice('internship-stipend-due', _id, due,
          `Pay ${amount} to ${studentName} for internship month ${month}.`, '/admin/internships'));
      }
    }
    return notices;
  });
}

async function getMilestoneNotices(user, teacherId, today, now) {
  if (user.role !== 'admin' && !teacherId) return [];
  const [contracts, internships] = await Promise.all([
    contractNotices(teacherId, today, now),
    user.role === 'admin' ? internshipNotices(today) : [],
  ]);
  return [...contracts, ...internships].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).slice(0, 60);
}

module.exports = { getMilestoneNotices };
