import assert from 'node:assert/strict';
import {matchesPageSearch} from '../src/utils/pageSearch.mjs';

const records = [
  {name: 'Ahmed Hassan', studentId: 'TL-2026-02', course: {title: 'Cisco Networking'}, cohort: 'Cohort 6'},
  {name: 'Amina Ali', studentId: 'TL-2026-03', course: {title: 'Web Development'}, cohort: 'Batch-06'},
];
const find = query => records.filter(row => matchesPageSearch(query, row));
assert.equal(find(' AHMED   2026-02 ').length, 1);
assert.equal(find('cisco cohort 6')[0].name, 'Ahmed Hassan');
assert.equal(find('batch-06')[0].name, 'Amina Ali');
assert.equal(find('not-a-student').length, 0);
assert.equal(find('.*').length, 0, 'Search treats regex syntax literally');
assert.equal(find('   ').length, 2);
assert.equal(find('').length, 2, 'Clearing restores all rows');
assert.equal(matchesPageSearch('0', null, undefined, 0), true);
assert.equal(matchesPageSearch('ahmed', 'ＡＨＭＥＤ'), true);
console.log('Page search passed: nested fields, multiple words, IDs, case, whitespace, no matches and clearing.');
