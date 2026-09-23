const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} = require('../controllers/subjectController');

router.get('/', protect, getSubjects);

router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('subjectCode').trim().notEmpty().withMessage('Subject code is required'),
    body('name').trim().notEmpty().withMessage('Subject name is required'),
  ],
  validateRequest,
  createSubject
);

router.put('/:id', protect, authorize('admin'), updateSubject);
router.delete('/:id', protect, authorize('admin'), deleteSubject);

module.exports = router;