const User = require('../models/User');
const { generateQRToken } = require('../utils/qrToken');
const { writeLog } = require('../services/logService');
const crypto = require('crypto');

/**
 * POST /api/auth/register  (public)
 * Registers a new STUDENT and generates their unique private QR token.
 * Teacher and Admin accounts are created by the Admin, never via public registration.
 */
const register = async (req, res) => {
  const { studentId, name, email, phone, department, year, section, password } =
    req.body;

  // Confirm the studentId is not already taken
  const existingStudent = await User.findOne({
    $or: [{ studentId: studentId.trim().toUpperCase() }, { email: email.toLowerCase() }],
  });

  if (existingStudent) {
    const field =
      existingStudent.studentId?.toUpperCase() === studentId.trim().toUpperCase()
        ? 'Student ID'
        : 'Email';
    return res.status(400).json({
      success: false,
      message: `${field} is already registered. Please log in instead.`,
    });
  }

  const user = await User.create({
    role: 'student',
    studentId: studentId.trim().toUpperCase(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : '',
    department: department.trim().toUpperCase(),
    year: year.trim(),
    section: section.trim().toUpperCase(),
    password,
    qrToken: generateQRToken(),
  });

  await writeLog({
    action: 'STUDENT_REGISTERED',
    message: `Student ${user.name} (${user.studentId}) registered`,
    userId: user._id,
    targetType: 'User',
    targetId: user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful! Your account and QR code are ready.',
    token: user.generateToken(),
    user: user.toJSON(),
  });
};

/**
 * POST /api/auth/login  (public)
 * Logs in any role using email + password.
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    '+password'
  );

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  await writeLog({
    action: 'USER_LOGIN',
    message: `${user.name} (${user.role}) logged in`,
    userId: user._id,
    targetType: 'User',
    targetId: user._id,
  });

  res.json({
    success: true,
    message: `Welcome back, ${user.name}!`,
    token: user.generateToken(),
    user: user.toJSON(),
  });
};

/**
 * POST /api/auth/logout  (protected)
 * JWT is stateless, so logout is handled client-side by deleting the token.
 * We still expose this endpoint for frontend consistency.
 */
const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully. Token discarded on the client.',
  });
};

/**
 * GET /api/auth/me  (protected)
 * Returns the currently logged-in user.
 */
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user: user.toJSON() });
};

/**
 * POST /api/auth/demo  (public, DEMO only)
 * Returns login credentials for the seeded demo accounts.
 * NEVER do this in production.
 */
const getDemoCredentials = async (req, res) => {
  const [student, teacher, admin] = await Promise.all([
    User.findOne({ role: 'student' }),
    User.findOne({ role: 'teacher' }),
    User.findOne({ role: 'admin' }),
  ]);

  res.json({
    success: true,
    isDemo: true,
    note: 'These are ONLY demo credentials for local testing.',
    demo: {
      student: student
        ? { email: student.email, password: 'demo123' }
        : null,
      teacher: teacher
        ? { email: teacher.email, password: 'demo123' }
        : null,
      admin: admin ? { email: admin.email, password: 'demo123' } : null,
    },
  });
};

module.exports = { register, login, logout, getMe, getDemoCredentials };