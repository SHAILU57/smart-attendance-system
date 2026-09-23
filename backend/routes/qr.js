const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const { generateQR, verifyQR } = require('../controllers/qrController');

// Students generate only their own QR
router.post('/generate', protect, generateQR);

// Verify a scanned QR token (identifies the student)
router.post(
  '/verify',
  protect,
  [body('token').optional({ checkFalsy: true }).isString().withMessage('Invalid token'),
   body('payload').optional({ checkFalsy: true }).isString().withMessage('Invalid payload')],
  validateRequest,
  verifyQR
);

module.exports = router;