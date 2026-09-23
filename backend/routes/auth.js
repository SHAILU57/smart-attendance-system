const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  register,
  login,
  logout,
  getMe,
  getDemoCredentials,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');

// POST /api/auth/register
router.post(
  '/register',
  [
    body('studentId')
      .trim()
      .notEmpty().withMessage('Student ID is required')
      .isLength({ min: 3, max: 20 }).withMessage('Student ID must be 3-20 characters'),
    body('name')
      .trim()
      .notEmpty().withMessage('Full name is required')
      .isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address'),
    body('phone')
      .trim()
      .optional({ checkFalsy: true })
      .matches(/^[0-9+\-\s]{10,15}$/).withMessage('Phone must be 10-15 digits'),
    body('department')
      .trim()
      .notEmpty().withMessage('Department is required'),
    body('year')
      .trim()
      .notEmpty().withMessage('Year is required'),
    body('section')
      .trim()
      .notEmpty().withMessage('Section is required'),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  ],
  validateRequest,
  register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').trim().notEmpty().isEmail().withMessage('Provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  login
);

// POST /api/auth/logout
router.post('/logout', protect, logout);

// GET /api/auth/me
router.get('/me', protect, getMe);

// GET /api/auth/demo  (demo helper)
router.get('/demo', getDemoCredentials);

module.exports = router;