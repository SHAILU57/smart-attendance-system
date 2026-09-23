const mongoose = require('mongoose');

/**
 * AttendanceRecord - one student's result for one attendance session,
 * produced by the full verification pipeline:
 *   QR  -> Face -> GPS (campus geofence) -> Indoor (building/floor/room) -> Timetable
 */
const attendanceRecordSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: [true, 'Attendance session is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    date: { type: String, required: [true, 'Date is required'] }, // YYYY-MM-DD
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    subjectName: { type: String, trim: true },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'REJECTED'],
      default: 'REJECTED',
    },
    // Each verification step and its result
    qrVerified: { type: Boolean, default: false },
    faceVerified: { type: Boolean, default: false },
    gpsVerified: { type: Boolean, default: false },
    indoorVerified: { type: Boolean, default: false },
    timetableVerified: { type: Boolean, default: false },
    faceDistance: { type: Number, default: null },
    gpsDistanceMeters: { type: Number, default: null },
    // Location snapshot from indoor matching (building/floor/room the student was in)
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    room: { type: String, trim: true },
    // Time-table expected values, for the 'REJECTED: wrong classroom' case
    expectedBuilding: { type: String, trim: true },
    expectedFloor: { type: String, trim: true },
    expectedRoom: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    // Was the indoor step simulated? (demo mode only)
    demoIndoor: { type: Boolean, default: false },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkinTime: { type: Date },
  },
  { timestamps: true }
);

// One attendance result per student per session
attendanceRecordSchema.index({ session: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);