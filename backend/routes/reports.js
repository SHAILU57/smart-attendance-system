const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAttendanceReport } = require('../controllers/reportController');

// Attendance report (teacher / admin)
router.get('/attendance', protect, authorize('teacher', 'admin'), getAttendanceReport);

module.exports = router;