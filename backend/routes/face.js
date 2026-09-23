const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  registerFace,
  verifyFace,
  faceStatus,
} = require('../controllers/faceController');

// A student registers their own face embedding
router.post('/register', protect, registerFace);

// Verify a captured descriptor against the registered template
router.post('/verify', protect, verifyFace);

// Current face registration status
router.get('/status', protect, faceStatus);

module.exports = router;