const normalize = value => String(value ?? '').trim().toLowerCase();

export function findImportCourses(courses, {course, academicYear, cohort}) {
  const reference = normalize(course);
  if (!reference) return [];

  const exactCode = courses.filter(item =>
    normalize(item._id) === reference || normalize(item.courseCode) === reference
  );
  const matches = exactCode.length ? exactCode : courses.filter(item => {
    const abbreviation = /^(?:ta-)?([a-z0-9]+)-\d+$/.exec(normalize(item.courseCode))?.[1];
    return normalize(item.name) === reference || normalize(item.title) === reference || abbreviation === reference;
  });
  if (matches.length <= 1) return matches;

  const year = normalize(academicYear);
  const group = normalize(cohort);
  const scoped = matches.filter(item =>
    (!year || normalize(item.academicYear) === year) &&
    (!group || normalize(item.cohort) === group)
  );
  return scoped.length ? scoped : matches;
}
