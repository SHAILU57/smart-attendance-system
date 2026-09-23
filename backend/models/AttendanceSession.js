const mongoose = require('mongoose');

/**
 * AttendanceSession - a teacher/admin opens a session for one class slot.
 * Students check in while the session is ONGOING (within its time window).
 */
const attendanceSessionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Session code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    }, // e.g. "SAT-01"
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
    department: { type: String, trim: true, uppercase: true },
    date: { type: String, required: [true, 'Date is required'] }, // YYYY-MM-DD (day of the class)
    startTime: { type: String, required: [true, 'Start time is required'] }, // "HH:MM"
    endTime: { type: String, required: [true, 'End time is required'] },     // "HH:MM"
    // Expected location for this session (building/floor/room)
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
    status: {
      type: String,
      enum: ['SCHEDULED', 'ONGOING', 'CLOSED'],
      default: 'SCHEDULED',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Local date (YYYY-MM-DD) to avoid timezone drift near midnight
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

attendanceSessionSchema.methods.isInWindow = function () {
  const today = localToday();
  const [sh, sm] = (this.startTime || '00:00').split(':').map(Number);
  const [eh, em] = (this.endTime || '00:00').split(':').map(Number);
  const start = new Date(`${today}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`);
  const end = new Date(`${today}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:59`);
  return new Date() >= start && new Date() <= end;
};

attendanceSessionSchema.methods.isToday = function () {
  return this.date === localToday();
};

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);