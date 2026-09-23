const QRCode = require('qrcode');
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

module.exports = { generateQR };