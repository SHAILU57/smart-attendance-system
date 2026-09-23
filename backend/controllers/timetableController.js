const Timetable = require('../models/Timetable');
const User = require('../models/User');
const { writeLog } = require('../services/logService');

const POP = [
  { path: 'subject', select: 'subjectCode name' },
  { path: 'teacher', select: 'name email teacherId' },
  { path: 'building', select: 'name code' },
  { path: 'floor', select: 'floorNumber' },
  { path: 'room', select: 'roomCode name' },
];

// @route  GET /api/timetable
// Admins/teachers see everything; students only see their own class's timetable.
const getTimetable = async (req, res) => {
  const filter = {};
  const { day, department, year, section, teacherId, subjectId } = req.query;

  if (day) filter.day = day;
  if (department) filter.department = String(department).toUpperCase();
  if (year) filter.year = year;
  if (section) filter.section = String(section).toUpperCase();
  if (subjectId) filter.subject = subjectId;
  if (teacherId) filter.teacher = teacherId;

  // Role-based restriction: a student may only see their own class timetable
  if (req.user.role === 'student') {
    filter.department = req.user.department;
    filter.year = req.user.year;
    filter.section = req.user.section;
  }
  // A teacher sees his/her own classes by default (unless an explicit filter)
  if (req.user.role === 'teacher' && !teacherId) {
    filter.teacher = req.user._id;
  }

  const entries = await Timetable.find(filter)
    .populate(POP)
    .sort({ day: 1, startTime: 1 });
  res.json({ success: true, count: entries.length, timetable: entries });
};

// @route  GET /api/timetable/today
// Returns the timetable entries for the current weekday.
const getTodaysTimetable = async (req, res) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const filter = { day: today, isActive: true };
  if (req.user.role === 'student') {
    filter.department = req.user.department;
    filter.year = req.user.year;
    filter.section = req.user.section;
  } else if (req.user.role === 'teacher') {
    filter.teacher = req.user._id;
  }
  const entries = await Timetable.find(filter)
    .populate(POP)
    .sort({ startTime: 1 });
  res.json({ success: true, day: today, count: entries.length, timetable: entries });
};

// @route  POST /api/timetable  (admin)
const createTimetable = async (req, res) => {
  const { department, year, section, subject, teacher, day, startTime, endTime, building, floor, room } = req.body;
  const created = await Timetable.create({
    department: department.trim().toUpperCase(),
    year: year.trim(),
    section: section.trim().toUpperCase(),
    subject,
    teacher,
    day,
    startTime,
    endTime,
    building,
    floor,
    room,
  });
  await created.populate(POP);
  await writeLog({
    action: 'TIMETABLE_CREATED',
    message: `Timetable slot created: ${day} ${startTime}-${endTime}`,
    userId: req.user._id,
    targetType: 'Timetable',
    targetId: created._id,
  });
  res.status(201).json({ success: true, message: 'Timetable entry created', entry: created });
};

// @route  PUT /api/timetable/:id  (admin)
const updateTimetable = async (req, res) => {
  const entry = await Timetable.findById(req.params.id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'Timetable entry not found' });
  }
  const fields = ['department', 'year', 'section', 'subject', 'teacher', 'day', 'startTime', 'endTime', 'building', 'floor', 'room', 'isActive'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) entry[f] = req.body[f];
  });
  if (entry.department) entry.department = entry.department.trim().toUpperCase();
  if (entry.section) entry.section = entry.section.trim().toUpperCase();
  await entry.save();
  await entry.populate(POP);
  await writeLog({
    action: 'TIMETABLE_UPDATED',
    message: `Timetable entry updated (${entry.day} ${entry.startTime})`,
    userId: req.user._id,
    targetType: 'Timetable',
    targetId: entry._id,
  });
  res.json({ success: true, message: 'Timetable entry updated', entry });
};

// @route  DELETE /api/timetable/:id  (admin)
const deleteTimetable = async (req, res) => {
  const entry = await Timetable.findById(req.params.id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'Timetable entry not found' });
  }
  await entry.deleteOne();
  await writeLog({
    action: 'TIMETABLE_DELETED',
    message: `Timetable entry deleted (${entry.day} ${entry.startTime})`,
    userId: req.user._id,
    targetType: 'Timetable',
    targetId: req.params.id,
  });
  res.json({ success: true, message: 'Timetable entry deleted' });
};

module.exports = { getTimetable, getTodaysTimetable, createTimetable, updateTimetable, deleteTimetable };