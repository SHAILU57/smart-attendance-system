const mongoose = require('mongoose');

// Timetable entry: who teaches what, where and when.
// Used during attendance to check the EXPECTED location.
const timetableSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      uppercase: true,
    },
    year: { type: String, required: [true, 'Year is required'], trim: true },
    section: {
      type: String,
      required: [true, 'Section is required'],
      trim: true,
      uppercase: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher is required'],
    },
    day: {
      type: String,
      required: [true, 'Day is required'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    startTime: { type: String, required: [true, 'Start time is required'] }, // "10:00"
    endTime: { type: String, required: [true, 'End time is required'] },     // "11:00"
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
      required: [true, 'Building is required'],
    },
    floor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Floor',
      required: [true, 'Floor is required'],
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: [true, 'Room is required'],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent two entries for the same class slot
timetableSchema.index(
  { department: 1, year: 1, section: 1, day: 1, startTime: 1 },
  { unique: true }
);

module.exports = mongoose.model('Timetable', timetableSchema);