const timeFormat = /^([01]\d|2[0-3]):[0-5]\d$/;

module.exports = {
  type: [{
    _id: false,
    day: { type: Number, required: true, min: 0, max: 6, validate: Number.isInteger },
    startTime: { type: String, required: true, match: timeFormat },
    endTime: { type: String, required: true, match: timeFormat },
  }],
  validate: {
    validator: rows => rows.every(row => row.endTime > row.startTime) && new Set(rows.map(row => row.day)).size === rows.length,
    message: 'Select each day once and an end time after its start time.',
  },
};
