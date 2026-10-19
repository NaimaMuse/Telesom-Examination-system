const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');
const Attendance = require('../models/Attendance');
const AttendanceImport = require('../models/AttendanceImport');
const Course = require('../models/Course');
const Student = require('../models/Student');
const { asyncHandler } = require('./resourceController');
const { parseAttendanceCsv } = require('../services/attendanceImportService');

const requireId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`A valid ${label} ID is required`);
    error.statusCode = 400;
    throw error;
  }
};

const requireUser = (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error('Authentication is required');
  }
  return req.user;
};

const importAttendance = asyncHandler(async (req, res) => {
  let keepUploadedFile = false;
  try {
    const {
      course,
      attendanceMonth,
      academicYear,
      originalFileName: bodyFileName,
      records: bodyRecords,
    } = req.body || {};
    const user = requireUser(req, res);
    if (user.role !== 'admin') {
      res.status(403);
      throw new Error('Only administrators can import attendance');
    }
    if (!(await Course.exists({ _id: course }))) {
      res.status(404);
      throw new Error('Course not found');
    }

    let records = bodyRecords;
    if (req.file) {
      const fileContents = await fs.readFile(req.file.path, 'utf8');
      records = parseAttendanceCsv(fileContents);
    }
    const originalFileName = req.file
      ? req.file.originalname
      : bodyFileName || 'attendance-import.json';
    const backendDirectory = path.join(__dirname, '..');
    const batch = await AttendanceImport.create({
      originalFileName,
      fileStoragePath: req.file
        ? path.relative(backendDirectory, req.file.path)
        : undefined,
      importedBy: user._id,
      course,
      attendanceMonth,
      academicYear,
      status: 'processing',
      summary: { totalRows: records.length },
    });
    keepUploadedFile = Boolean(req.file);

    const errorLogs = [];
    let successfulRecords = 0;
    let duplicateRecords = 0;

    for (let index = 0; index < records.length; index += 1) {
      const row = records[index];
      try {
        const student = row && row.studentId
          ? await Student.findOne({
              studentId: String(row.studentId).trim().toUpperCase(),
            })
          : null;
        const studentId = (student && student._id) || (row && row.student);
        if (!studentId || !row.date || !row.status) {
          throw new Error('Student ID, date, and status are required');
        }
        const attendanceDate = new Date(row.date);
        if (
          Number.isNaN(attendanceDate.getTime()) ||
          attendanceDate.toISOString().slice(0, 7) !== attendanceMonth
        ) {
          throw new Error(
            `Attendance date must be valid and within ${attendanceMonth}`
          );
        }
        requireId(studentId, 'student');
        if (!student && !(await Student.exists({ _id: studentId }))) {
          throw new Error('Student not found');
        }
        await Attendance.create({
          student: studentId,
          course,
          date: attendanceDate,
          status: row.status,
          remarks: row.remarks,
          recordedBy: user._id,
          importBatch: batch._id,
        });
        successfulRecords += 1;
      } catch (error) {
        if (error.code === 11000) {
          duplicateRecords += 1;
        }
        errorLogs.push({
          row: index + 1,
          reason:
            error.name === 'ValidationError'
              ? Object.values(error.errors)
                  .map((validationError) => validationError.message)
                  .join(', ')
              : error.message,
        });
      }
    }

    batch.status =
      successfulRecords === 0 && errorLogs.length > 0 ? 'failed' : 'completed';
    batch.summary = {
      totalRows: records.length,
      successfulRecords,
      failedRecords: errorLogs.length - duplicateRecords,
      duplicateRecords,
    };
    batch.errorLogs = errorLogs;
    await batch.save();

    return res.status(201).json({
      success: true,
      message: 'Attendance import completed',
      data: batch,
    });
  } finally {
    if (req.file && !keepUploadedFile) {
      await fs.unlink(req.file.path).catch((error) => {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      });
    }
  }
});

const listAttendanceImports = asyncHandler(async (req, res) => {
  const user = requireUser(req, res);
  const filters = {};
  for (const field of ['course', 'attendanceMonth', 'academicYear', 'status']) {
    if (req.query && req.query[field] !== undefined) {
      filters[field] = req.query[field];
    }
  }
  if (user.role !== 'admin') {
    filters.importedBy = user._id;
  }
  const batches = await AttendanceImport.find(filters)
    .populate('course', 'courseCode title')
    .populate('importedBy', 'name email')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: batches });
});

const getAttendanceImportById = asyncHandler(async (req, res) => {
  const user = requireUser(req, res);
  requireId(req.params.id, 'import');
  const filters = { _id: req.params.id };
  if (user.role !== 'admin') {
    filters.importedBy = user._id;
  }
  const batch = await AttendanceImport.findOne(filters)
    .populate('course', 'courseCode title')
    .populate('importedBy', 'name email');
  if (!batch) {
    res.status(404);
    throw new Error('Attendance import not found');
  }
  res.status(200).json({ success: true, data: batch });
});

module.exports = {
  importAttendance,
  listAttendanceImports,
  getAttendanceImportById,
};
