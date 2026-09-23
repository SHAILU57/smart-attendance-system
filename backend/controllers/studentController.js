const User = require('../models/User');
const { writeLog } = require('../services/logService');
const { generateQRToken } = require('../utils/qrToken');

// @route  GET /api/students  (admin / teacher)
// Teacher can view student basic info; no other student's location exposure yet.
const getStudents = async (req, res) => {
  const filter = { role: 'student' };
  const { search, department, year, section } = req.query;

  // Prevent exposing other students' private tokens downward
  const select = '-qrToken -settings';

  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { studentId: rx }, { email: rx }];
  }
  if (department) filter.department = String(department).toUpperCase();
  if (year) filter.year = year;
  if (section) filter.section = String(section).toUpperCase();

  const students = await User.find(filter).select(select).sort({ studentId: 1 });
  res.json({ success: true, count: students.length, students });
};

// @route  GET /api/students/:id  (admin / teacher / that student)
const getStudentById = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'student' });

  // A student may only view themselves; teachers/admins may view students
  if (req.user.role === 'student' && String(req.user._id) !== String(user?._id)) {
    return res.status(403).json({ success: false, message: 'You may only view your own profile' });
  }
  if (!user) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  // Include qrToken ONLY for the student themselves
  let doc = user;
  if (req.user.role !== 'student' || String(req.user._id) === String(user._id)) {
    doc = await User.findById(user._id);
  }
  res.json({ success: true, student: doc.toJSON() });
};

// @route  POST /api/students  (admin)
const createStudent = async (req, res) => {
  const { studentId, name, email, phone, department, year, section, password } = req.body;
  const user = await User.create({
    role: 'student',
    studentId: studentId.trim().toUpperCase(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : '',
    department: department.trim().toUpperCase(),
    year: year.trim(),
    section: section.trim().toUpperCase(),
    password: password || 'demo123',
    qrToken: generateQRToken(),
  });
  await writeLog({
    action: 'STUDENT_CREATED_BY_ADMIN',
    message: `Student ${user.name} (${user.studentId}) created by admin`,
    userId: req.user._id,
    targetType: 'User',
    targetId: user._id,
  });
  res.status(201).json({ success: true, message: 'Student created', student: user.toJSON() });
};

// @route  PUT /api/students/:id  (admin / self)
const updateStudent = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!user) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }
  // Student may update only some of their own fields
  if (req.user.role === 'student') {
    if (String(req.user._id) !== String(user._id)) {
      return res.status(403).json({ success: false, message: 'You may only update your own profile' });
    }
    const allowed = ['name', 'phone', 'password'];
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) user[f] = req.body[f];
    });
  } else if (req.user.role === 'admin') {
    const allowed = ['name', 'email', 'phone', 'department', 'year', 'section', 'password', 'isActive'];
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) user[f] = req.body[f];
    });
    if (req.body.department) user.department = req.body.department.trim().toUpperCase();
    if (req.body.section) user.section = req.body.section.trim().toUpperCase();
  } else {
    return res.status(403).json({ success: false, message: 'Not allowed to edit students' });
  }

  if (user.isModified('password')) {
    // middleware re-hashes because password changed
  }
  await user.save();
  await writeLog({
    action: 'STUDENT_UPDATED',
    message: `Student ${user.studentId} updated by ${req.user.role}`,
    userId: req.user._id,
    targetType: 'User',
    targetId: user._id,
  });
  res.json({ success: true, message: 'Student updated', student: user.toJSON() });
};

// @route  DELETE /api/students/:id  (admin)
const deleteStudent = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!user) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }
  await user.deleteOne();
  await writeLog({
    action: 'STUDENT_DELETED',
    message: `Student ${user.studentId} deleted`,
    userId: req.user._id,
    targetType: 'User',
    targetId: req.params.id,
  });
  res.json({ success: true, message: 'Student deleted' });
};

module.exports = { getStudents, getStudentById, createStudent, updateStudent, deleteStudent };