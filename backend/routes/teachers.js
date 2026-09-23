const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} = require('../controllers/teacherController');

router.get('/', protect, authorize('admin'), getTeachers);

router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('teacherId').trim().notEmpty().withMessage('Teacher ID is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
  ],
  validateRequest,
  createTeacher
);

router.put('/:id', protect, authorize('admin'), updateTeacher);
router.delete('/:id', protect, authorize('admin'), deleteTeacher);

module.exports = router;