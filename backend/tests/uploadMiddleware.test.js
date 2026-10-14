const assert = require('assert');
const fs = require('fs/promises');
const express = require('express');
const { uploadAttendanceFile } = require('../middleware/uploadMiddleware');

const run = async () => {
  const app = express();
  let uploadedPath = null;
  app.post('/upload', uploadAttendanceFile, (req, res) => {
    uploadedPath = req.file && req.file.path;
    res.status(200).json({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
    });
  });
  app.use((error, req, res, next) => {
    res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
      message: error.message,
    });
  });

  const server = await new Promise((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });
  const url = `http://127.0.0.1:${server.address().port}/upload`;

  try {
    const acceptedForm = new FormData();
    acceptedForm.append(
      'file',
      new Blob(['student,date,status\nS-1,2026-10-01,present'], {
        type: 'text/csv',
      }),
      'attendance.csv'
    );
    const accepted = await fetch(url, { method: 'POST', body: acceptedForm });
    const acceptedBody = await accepted.json();
    assert.strictEqual(accepted.status, 200);
    assert.strictEqual(acceptedBody.originalName, 'attendance.csv');
    assert.notStrictEqual(acceptedBody.storedName, 'attendance.csv');
    assert(uploadedPath);
    assert.strictEqual(
      await fs.readFile(uploadedPath, 'utf8'),
      'student,date,status\nS-1,2026-10-01,present'
    );

    const rejectedForm = new FormData();
    rejectedForm.append(
      'file',
      new Blob(['no'], { type: 'text/plain' }),
      'notes.txt'
    );
    const rejected = await fetch(url, { method: 'POST', body: rejectedForm });
    assert.strictEqual(rejected.status, 400);
    assert.match((await rejected.json()).message, /Only CSV files/);

    const oversizedForm = new FormData();
    oversizedForm.append(
      'file',
      new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'text/csv' }),
      'large.csv'
    );
    const oversized = await fetch(url, {
      method: 'POST',
      body: oversizedForm,
    });
    assert.strictEqual(oversized.status, 413);
    assert.match((await oversized.json()).message, /5 MB limit/);

    console.log('Upload middleware tests passed.');
  } finally {
    if (uploadedPath) {
      await fs.unlink(uploadedPath).catch((error) => {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      });
    }
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
