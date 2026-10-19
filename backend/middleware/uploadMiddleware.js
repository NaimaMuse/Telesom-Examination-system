const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const uploadDirectory = path.join(__dirname, '..', 'uploads', 'attendance');
const acceptedMimeTypes = {
  '.csv': [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'text/plain',
  ],
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdir(uploadDirectory, { recursive: true }, (error) => {
      callback(error, uploadDirectory);
    });
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const fileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeTypes = acceptedMimeTypes[extension];

  if (!mimeTypes || !mimeTypes.includes(file.mimetype.toLowerCase())) {
    const error = new Error('Only CSV files are allowed');
    error.statusCode = 400;
    return callback(error);
  }

  return callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

const uploadAttendanceFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
      return next(
        new Error(
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Uploaded file exceeds the 5 MB limit'
            : error.message
        )
      );
    }

    if (error.statusCode) {
      res.status(error.statusCode);
    }
    return next(error);
  });
};

module.exports = {
  upload,
  uploadAttendanceFile,
  MAX_FILE_SIZE,
};
