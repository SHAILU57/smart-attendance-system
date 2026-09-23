const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const {
  getZones,
  createZone,
  updateZone,
  deleteZone,
  matchZone,
} = require('../controllers/indoorZoneController');

// Any authenticated user can read zones
router.get('/', protect, getZones);
// Match a zone by beaconId / wifiSsid / zoneId (used by indoor positioning)
router.post('/match', protect, matchZone);

router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('zoneId').trim().notEmpty().withMessage('Zone ID is required'),
    body('building').isMongoId().withMessage('Valid building id is required'),
    body('floor').isMongoId().withMessage('Valid floor id is required'),
    body('room').isMongoId().withMessage('Valid classroom id is required'),
  ],
  validateRequest,
  createZone
);

router.put('/:id', protect, authorize('admin'), updateZone);
router.delete('/:id', protect, authorize('admin'), deleteZone);

module.exports = router;