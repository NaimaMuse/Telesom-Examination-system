const mongoose = require('mongoose');
const weeklySchedule = require('./weeklySchedule');
const Sequence = require('./Sequence');

function courseCodePrefix(name) {
  const words = name.normalize('NFKD').replace(/\p{Mark}/gu, '').match(/[A-Za-z0-9]+/g) || [];
  const firstWord = words[0] || 'CRS';
  let abbreviation = firstWord.slice(0, 4);
  if (/^[A-Z][A-Z0-9]{1,7}$/.test(firstWord)) {
    abbreviation = firstWord;
  } else if (words.length > 1) {
    abbreviation = words.map(word => word[0]).join('').slice(0, 8);
  }
  return `TA-${abbreviation.toUpperCase()}-`;
}

async function nextCourseCode(Course, name) {
  const prefix = courseCodePrefix(name);
  const key = 'course-code:TA';
  if (!await Sequence.exists({_id:key})) {
    const [existing, previousCounter] = await Promise.all([
      Course.find({courseCode:/^TA-[A-Z0-9]+-[0-9]+$/}).select('courseCode').lean(),
      Sequence.findOne({_id:/^course-code:TA-/}).sort({value:-1}).select('value').lean(),
    ]);
    const lastNumber = existing.reduce((max, row) => {
      const suffix = Number(row.courseCode.slice(row.courseCode.lastIndexOf('-') + 1));
      return Number.isSafeInteger(suffix) ? Math.max(max, suffix) : max;
    }, Math.max(100, previousCounter?.value ?? 0));
    try {
      await Sequence.updateOne({_id:key}, {$max:{value:lastNumber}}, {upsert:true});
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }

  // Atomic increments reserve a different suffix for concurrent saves.
  for (;;) {
    const counter = await Sequence.findOneAndUpdate({_id:key}, {$inc:{value:1}}, {new:true});
    if (!Number.isSafeInteger(counter?.value)) throw new Error('Course code counter is unavailable.');
    const suffixInUse = await Course.exists({courseCode:{$regex:`^TA-[A-Z0-9]+-${counter.value}$`}});
    if (!suffixInUse) return prefix + counter.value;
  }
}

const courseSchema = new mongoose.Schema(
  {
    teachingSchedule: { ...weeklySchedule, default: [] },
    durationWeeks: { type: Number, min: 1, validate: Number.isSafeInteger, default: null },
    performanceWriteLock: { token: String, expiresAt: Date },
    courseCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: [1, 'Credits must be at least 1'],
      default: 3,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'archived'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
    },
    department: {
      type: String,
      trim: true,
    },
    semester: {
      type: String,
      trim: true,
    },
    batch: { type: String, trim: true, default: '' },
    academicYear: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

courseSchema.pre('validate', function (next) {
  if (!this.title && this.name) {
    this.title = this.name;
  }
  if (!this.name && this.title) {
    this.name = this.title;
  }
  if (this.status) {
    this.isActive = this.status === 'active';
  }
  next();
});

courseSchema.pre('save', async function () {
  if (!this.courseCode) this.courseCode = await nextCourseCode(this.constructor, this.name || this.title || '');
});

// Indexes
courseSchema.index({ department: 1 });
courseSchema.index({ courseCode: 1 });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
