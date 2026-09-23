const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { generateQR } = require('../controllers/qrController');

// Students generate only their own QR; admins/teachers can fetch any student's later.
router.post('/generate', protect, generateQR);

module.exports = router;