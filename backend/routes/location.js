const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  gpsCheck,
  indoorCheck,
  locationConfig,
} = require('../controllers/locationController');

// Public-facing location config (geofence + demo flags)
router.get('/config', protect, locationConfig);

// GPS / geofence check (campus area only)
router.post('/gps', protect, gpsCheck);

// Indoor positioning: BLE beacon / Wi-Fi / zone id match
router.post('/indoor', protect, indoorCheck);

module.exports = router;