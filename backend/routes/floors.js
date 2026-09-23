const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const {
  getFloors,
  createFloor,
  updateFloor,
  deleteFloor,
} = require('../controllers/floorController');

router.get('/', protect, getFloors);

router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('building').isMongoId().withMessage('Valid building id is required'),
    body('floorNumber').trim().notEmpty().withMessage('Floor number is required'),
  ],
  validateRequest,
  createFloor
);

router.put('/:id', protect, authorize('admin'), updateFloor);
router.delete('/:id', protect, authorize('admin'), deleteFloor);

module.exports = router;