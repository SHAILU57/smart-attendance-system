const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const {
  getSessions,
  createSession,
  updateSession,
  checkin,
  myRecords,
  mySummary,
  getSessionRecords,
} = require('../controllers/attendanceController');

// List sessions (role-aware)
router.get('/sessions', protect, getSessions);

// Create a session (teacher / admin)
router.post(
  '/sessions',
  protect,
  authorize('teacher', 'admin'),
  [
    body('subject').isMongoId().withMessage('Valid subject id is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('startTime').optional().isString(),
    body('endTime').optional().isString(),
    body('building').isMongoId().withMessage('Valid building id is required'),
    body('floor').isMongoId().withMessage('Valid floor id is required'),
    body('room').isMongoId().withMessage('Valid classroom id is required'),
  ],
  validateRequest,
  createSession
);

// Update session status (teacher / admin)
router.put('/sessions/:id', protect, authorize('teacher', 'admin'), updateSession);

// Full chained verification + checkin
router.post(
  '/checkin',
  protect,
  [
    body('sessionCode').optional().isString(),
    body('sessionId').optional().isMongoId(),
    body('qrToken').isString().withMessage('QR token is required'),
    body('faceDescriptor').optional().isArray().withMessage('faceDescriptor must be an array'),
  ],
  validateRequest,
  checkin
);

// Student's own attendance records
router.get('/student/me', protect, myRecords);

// Student's own summary / percentages
router.get('/summary/me', protect, mySummary);

// Session detail + records (teacher / admin)
router.get('/session/:id', protect, authorize('teacher', 'admin'), getSessionRecords);

module.exports = router;