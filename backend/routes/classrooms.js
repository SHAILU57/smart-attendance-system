const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const {
  getClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
} = require('../controllers/classroomController');

router.get('/', protect, getClassrooms);

router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('roomCode').trim().notEmpty().withMessage('Room code is required'),
    body('building').isMongoId().withMessage('Valid building id is required'),
    body('floor').isMongoId().withMessage('Valid floor id is required'),
  ],
  validateRequest,
  createClassroom
);

router.put('/:id', protect, authorize('admin'), updateClassroom);
router.delete('/:id', protect, authorize('admin'), deleteClassroom);

module.exports = router;