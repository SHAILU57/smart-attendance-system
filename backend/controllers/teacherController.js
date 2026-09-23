const User = require('../models/User');
const { writeLog } = require('../services/logService');

// @route  GET /api/teachers  (admin)
const getTeachers = async (req, res) => {
  const filter = { role: 'teacher' };
  const { search, department } = req.query;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { teacherId: rx }, { email: rx }];
  }
  if (department) filter.department = String(department).toUpperCase();
  const teachers = await User.find(filter).select('-qrToken -settings').sort({ teacherId: 1 });
  res.json({ success: true, count: teachers.length, teachers });
};

// @route  POST /api/teachers  (admin)
const createTeacher = async (req, res) => {
  const { teacherId, name, email, phone, department, password } = req.body;
  const user = await User.create({
    role: 'teacher',
    teacherId: teacherId.trim().toUpperCase(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : '',
    department: (department || '').trim().toUpperCase(),
    password: password || 'demo123',
  });
  await writeLog({
    action: 'TEACHER_CREATED',
    message: `Teacher ${user.name} (${user.teacherId}) created by admin`,
    userId: req.user._id,
    targetType: 'User',
    targetId: user._id,
  });
  res.status(201).json({ success: true, message: 'Teacher created', teacher: user.toJSON() });
};

// @route  PUT /api/teachers/:id  (admin)
const updateTeacher = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'teacher' });
  if (!user) {
    return res.status(404).json({ success: false, message: 'Teacher not found' });
  }
  const allowed = ['name', 'email', 'phone', 'department', 'password', 'isActive'];
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) user[f] = req.body[f];
  });
  if (req.body.department) user.department = req.body.department.trim().toUpperCase();
  await user.save();
  await writeLog({
    action: 'TEACHER_UPDATED',
    message: `Teacher ${user.teacherId} updated`,
    userId: req.user._id,
    targetType: 'User',
    targetId: user._id,
  });
  res.json({ success: true, message: 'Teacher updated', teacher: user.toJSON() });
};

// @route  DELETE /api/teachers/:id  (admin)
const deleteTeacher = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'teacher' });
  if (!user) {
    return res.status(404).json({ success: false, message: 'Teacher not found' });
  }
  await user.deleteOne();
  await writeLog({
    action: 'TEACHER_DELETED',
    message: `Teacher ${user.teacherId} deleted`,
    userId: req.user._id,
    targetType: 'User',
    targetId: req.params.id,
  });
  res.json({ success: true, message: 'Teacher deleted' });
};

module.exports = { getTeachers, createTeacher, updateTeacher, deleteTeacher };