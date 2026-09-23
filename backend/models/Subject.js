const mongoose = require('mongoose');

// A subject offered by the department, e.g. "Computer Networks" (CSE)
const subjectSchema = new mongoose.Schema(
  {
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    }, // e.g. "CS101"
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    department: { type: String, trim: true }, // e.g. "CSE"
    year: { type: String, trim: true },       // e.g. "3rd Year"
    credits: { type: Number, default: 4 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subject', subjectSchema);