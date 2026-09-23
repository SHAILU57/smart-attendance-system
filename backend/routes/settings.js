const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const {
  getSettings,
  updateSettings,
} = require('../controllers/settingsController');

router.get('/', protect, authorize('admin'), getSettings);

router.put(
  '/',
  protect,
  authorize('admin'),
  [
    body('collegeLat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    body('collegeLng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    body('geofenceRadius').optional().isFloat({ min: 1, max: 5000 }).withMessage('Radius must be 1-5000 meters'),
  ],
  validateRequest,
  updateSettings
);

module.exports = router;