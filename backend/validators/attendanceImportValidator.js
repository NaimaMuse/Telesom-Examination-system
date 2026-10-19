const mongoose = require('mongoose');
const fs = require('fs');
const { MAX_IMPORT_ROWS } = require('../services/attendanceImportService');

const rejectRequest = (req, res, next, statusCode, message) => {
  res.status(statusCode);
  if (!req.file) {
    return next(new Error(message));
  }
  return fs.unlink(req.file.path, (error) => {
    if (error && error.code !== 'ENOENT') {
      return next(error);
    }
    return next(new Error(message));
  });
};

const validateAttendanceImportRequest = (req, res, next) => {
  const { course, attendanceMonth, records, originalFileName } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(course)) {
    return rejectRequest(req, res, next, 400, 'A valid course ID is required');
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(attendanceMonth || ''))) {
    return rejectRequest(
      req,
      res,
      next,
      400,
      'Attendance month must use YYYY-MM format'
    );
  }
  if (req.file) {
    if (records !== undefined) {
      return rejectRequest(
        req,
        res,
        next,
        400,
        'Provide an attendance CSV file or JSON records, not both'
      );
    }
    return next();
  }
  if (!Array.isArray(records)) {
    return rejectRequest(
      req,
      res,
      next,
      400,
      'Upload a CSV file or provide attendance records as an array'
    );
  }
  if (records.length > MAX_IMPORT_ROWS) {
    return rejectRequest(
      req,
      res,
      next,
      400,
      `Attendance import cannot exceed ${MAX_IMPORT_ROWS} rows`
    );
  }
  if (originalFileName !== undefined && typeof originalFileName !== 'string') {
    return rejectRequest(
      req,
      res,
      next,
      400,
      'Original file name must be a string'
    );
  }
  return next();
};

module.exports = {
  validateAttendanceImportRequest,
};
