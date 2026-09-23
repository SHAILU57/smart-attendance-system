const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const {
  getTimetable,
  getTodaysTimetable,
  createTimetable,
  updateTimetable,
  deleteTimetable,
} = require('../controllers/timetableController');

router.get('/', protect, getTimetable);
router.get('/today', protect, getTodaysTimetable);

router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('year').trim().notEmpty().withMessage('Year is required'),
    body('section').trim().notEmpty().withMessage('Section is required'),
    body('subject').isMongoId().withMessage('Valid subject id is required'),
    body('teacher').isMongoId().withMessage('Valid teacher id is required'),
    body('day').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).withMessage('Invalid day'),
    body('startTime').notEmpty().withMessage('Start time is required'),
    body('endTime').notEmpty().withMessage('End time is required'),
    body('building').isMongoId().withMessage('Valid building id is required'),
    body('floor').isMongoId().withMessage('Valid floor id is required'),
    body('room').isMongoId().withMessage('Valid room id is required'),
  ],
  validateRequest,
  createTimetable
);

router.put('/:id', protect, authorize('admin'), updateTimetable);
router.delete('/:id', protect, authorize('admin'), deleteTimetable);

module.exports = router;