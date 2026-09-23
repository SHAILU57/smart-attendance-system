const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');

// All authenticated users can list students (teachers/admin heavily; students see their own)
router.get('/', protect, authorize('teacher', 'admin'), getStudents);
router.get('/:id', protect, getStudentById);

router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('studentId').trim().notEmpty().withMessage('Student ID is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('year').trim().notEmpty().withMessage('Year is required'),
    body('section').trim().notEmpty().withMessage('Section is required'),
  ],
  validateRequest,
  createStudent
);

router.put('/:id', protect, updateStudent);
router.delete('/:id', protect, authorize('admin'), deleteStudent);

module.exports = router;