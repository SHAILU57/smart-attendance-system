const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const {
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
} = require('../controllers/buildingController');

router.get('/', protect, getBuildings);

router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Building name is required'),
    body('code').trim().notEmpty().isLength({ min: 1, max: 4 }).withMessage('Building code must be 1-4 characters'),
  ],
  validateRequest,
  createBuilding
);

router.put('/:id', protect, authorize('admin'), updateBuilding);
router.delete('/:id', protect, authorize('admin'), deleteBuilding);

module.exports = router;