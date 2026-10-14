const REQUIRED_COLUMNS = ['studentid', 'date', 'status'];
const MAX_IMPORT_ROWS = 10000;

const parseCsvRows = (input) => {
  const text = input.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      row.push(field);
      if (row.some((value) => value.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      field = '';
      if (character === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error('Attendance CSV contains an unterminated quoted field');
  }
  row.push(field);
  if (row.some((value) => value.trim() !== '')) {
    rows.push(row);
  }
  return rows;
};

const normalizeHeader = (header) =>
  header.trim().toLowerCase().replace(/[\s_-]+/g, '');

const parseAttendanceCsv = (input) => {
  const rows = parseCsvRows(input);
  if (rows.length < 2) {
    throw new Error('Attendance CSV must include a header and at least one row');
  }

  const headers = rows[0].map(normalizeHeader);
  const indexes = {};
  for (const column of REQUIRED_COLUMNS) {
    indexes[column] = headers.indexOf(column);
    if (indexes[column] === -1) {
      throw new Error(
        `Attendance CSV is missing the required "${column}" column`
      );
    }
  }
  indexes.remarks = headers.indexOf('remarks');

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Attendance CSV cannot exceed ${MAX_IMPORT_ROWS} rows`);
  }

  return dataRows.map((values) => ({
    studentId: (values[indexes.studentid] || '').trim(),
    date: (values[indexes.date] || '').trim(),
    status: (values[indexes.status] || '').trim().toLowerCase(),
    remarks:
      indexes.remarks === -1
        ? undefined
        : (values[indexes.remarks] || '').trim(),
  }));
};

module.exports = {
  parseAttendanceCsv,
  MAX_IMPORT_ROWS,
};
