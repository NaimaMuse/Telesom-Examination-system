const assert = require('node:assert/strict');
const {textSearchFilter} = require('../services/pageSearch');
const matches = (row, query) => {
  const filter = textSearchFilter(query, ['name', 'course']);
  return (filter.$and || []).every(term => term.$or.some(condition => {
    const [key, expression] = Object.entries(condition)[0];
    return new RegExp(expression.$regex, expression.$options).test(row[key] || '');
  }));
};
const rows = Array.from({length: 125}, (_, i) => ({name: `Student ${i}`, course: i === 124 ? 'C++ [Advanced]' : 'Networking'}));
assert.equal(rows.filter(row => matches(row, 'student 124 advanced')).length, 1);
assert.equal(rows.filter(row => matches(row, 'C++ [Advanced]')).length, 1);
assert.equal(rows.filter(row => matches(row, '.*')).length, 0);
assert.equal(rows.filter(row => matches(row, '   ')).length, 125);
assert.equal(rows.filter(row => matches(row, 'missing')).length, 0);
assert.throws(() => textSearchFilter({$ne: ''}, ['name']), /search/);
assert.throws(() => textSearchFilter('x'.repeat(201), ['name']), /200/);
console.log('Server search passed: cross-field terms, literal regex characters and input validation.');
