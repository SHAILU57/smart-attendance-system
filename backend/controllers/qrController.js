const QRCode = require('qrcode');
const User = require('../models/User');
const { writeLog } = require('../services/logService');

/**
 * POST /api/qr/generate  (student's own QR)
 * Returns a base64 data-URL of a QR code containing ONLY the student's private QR token.
 * No password or personal data is embedded.
 */
const generateQR = async (req, res) => {
  const qrToken = req.user.qrToken;
  if (!qrToken) {
    return res.status(404).json({
      success: false,
      message: 'No QR token found for this account. Contact the admin.',
    });
  }

  const payload = JSON.stringify({ t: qrToken, v: 1 });
  const dataUrl = await QRCode.toDataURL(payload, {
    width: 600,
    margin: 2,
    color: { dark: '#1e1b4b', light: '#ffffff' },
  });

  await writeLog({
    action: 'QR_GENERATED',
    message: `QR code generated for ${req.user.name}`,
    userId: req.user._id,
    targetType: 'User',
    targetId: req.user._id,
  });

  res.json({
    success: true,
    qr: dataUrl,
    note: 'QR contains only a private identifier token, no sensitive personal data.',
  });
};

/**
 * POST /api/qr/verify  (any authenticated user with a QR scan)
 * Body: { token } OR { payload } (the text read/decoded from a scanned QR).
 *
 * Looks up the student by their private QR token.
 * Rejects invalid, tampered and unknown tokens.
 */
const verifyQR = async (req, res) => {
  const raw = req.body.token || req.body.payload || req.body.qrData;
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'QR payload is required.',
    });
  }

  // Decoding: our own QRs store JSON {"t":"SAT...","v":1}.
  // Also accept scanning the raw token directly.
  let token = raw.trim();
  try {
    const parsed = JSON.parse(token);
    if (parsed && parsed.t) token = parsed.t;
  } catch (err) {
    // not JSON - treat the whole string as the token
  }

  const student = await User.findOne({ qrToken: token, role: 'student' });

  if (!student) {
    await writeLog({
      level: 'warn',
      action: 'QR_REJECTED',
      message: `QR verification rejected (unknown/tampered token starting with "${token.slice(0, 8)}...")`,
      userId: req.user ? req.user._id : null,
    });
    return res.status(400).json({
      success: false,
      message: 'Invalid QR code. The token is not recognised.',
    });
  }

  if (!student.isActive) {
    return res.status(403).json({
      success: false,
      message: 'This student account is deactivated.',
    });
  }

  await writeLog({
    action: 'QR_VERIFIED',
    message: `QR verified for student ${student.name} (${student.studentId})`,
    userId: req.user ? req.user._id : student._id,
    targetType: 'User',
    targetId: student._id,
  });

  res.json({
    success: true,
    message: 'QR verified. Student identified.',
    student: {
      _id: student._id,
      studentId: student.studentId,
      name: student.name,
      department: student.department,
      year: student.year,
      section: student.section,
      faceRegistered: student.faceRegistered,
      hasQr: !!student.qrToken,
    },
  });
};

module.exports = { generateQR, verifyQR };