const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const User = require('../models/User');
const { writeLog } = require('../services/logService');

/**
 * GET /api/reports/attendance
 * Role-aware, filterable attendance report for teachers and admins.
 *
 * Query params:
 *  - date        (YYYY-MM-DD)   exact attendance day
 *  - department  (e.g. CSE)
 *  - year        (e.g. 3rd Year)
 *  - section     (e.g. A)
 *  - subjectId   subject ObjectId
 */
const getAttendanceReport = async (req, res) => {
  const { date, department, year, section, subjectId } = req.query;

  // ---- Restrict to the teacher's own sessions unless admin ----
  if (req.user.role === 'teacher') {
    const mine = await AttendanceSession.find({ teacher: req.user._id }).select('_id');
    if (!mine.length) {
      await writeLog({
        action: 'REPORT_GENERATED',
        message: `${req.user.name} generated an attendance report (0 sessions)`,
        userId: req.user._id,
      });
      return res.json({ success: true, count: 0, records: [] });
    }
    req.sessionIds = mine.map((s) => s._id);
  }

  // ---- Resolve student ids matching department/year/section filters ----
  const studentFilter = { role: 'student' };
  if (department) studentFilter.department = String(department).trim().toUpperCase();
  if (year) studentFilter.year = String(year).trim();
  if (section) studentFilter.section = String(section).trim().toUpperCase();

  const hasStudentFilters = department || year || section;

  const match = {};
  if (req.sessionIds) match.session = { $in: req.sessionIds };
  if (subjectId) match.subject = subjectId;
  if (date) match.date = date;
  if (hasStudentFilters) {
    const students = await User.find(studentFilter).select('_id');
    match.student = { $in: students.map((s) => s._id) };
    if (!students.length) {
      return res.json({ success: true, count: 0, records: [] });
    }
  }

  const records = await AttendanceRecord.find(match)
    .populate({ path: 'student', select: 'studentId name department year section' })
    .populate({ path: 'subject', select: 'name subjectCode' })
    .sort({ createdAt: -1 });

  const flat = records.map((r) => ({
    id: r._id,
    studentId: r.student ? r.student.studentId : '',
    studentName: r.student ? r.student.name : '',
    department: r.student ? r.student.department : '',
    year: r.student ? r.student.year : '',
    section: r.student ? r.student.section : '',
    date: r.date,
    createdAt: r.createdAt,
    subjectName: r.subjectName || (r.subject ? r.subject.name : ''),
    status: r.status,
    room: r.room,
    expectedRoom: r.expectedRoom,
    rejectionReason: r.rejectionReason || '',
    qrVerified: r.qrVerified,
    faceVerified: r.faceVerified,
    gpsVerified: r.gpsVerified,
    indoorVerified: r.indoorVerified,
    timetableVerified: r.timetableVerified,
    checkinTime: r.checkinTime,
  }));

  await writeLog({
    action: 'REPORT_GENERATED',
    message: `${req.user.name} generated an attendance report (${flat.length} records)`,
    userId: req.user._id,
    meta: { filters: req.query },
  });

  res.json({
    success: true,
    count: flat.length,
    filters: req.query,
    records: flat,
  });
};

module.exports = { getAttendanceReport };