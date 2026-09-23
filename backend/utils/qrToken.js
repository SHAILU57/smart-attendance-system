const crypto = require('crypto');

/**
 * Generate a unique, non-guessable QR token for a student.
 * This token is what is actually encoded inside the QR code image.
 * It contains NO personal data and is NOT a password.
 * Format: "SAT" + 32 random hex chars  -> e.g. SAT9f2c7a... 
 */
const generateQRToken = () =>
  'SAT' + crypto.randomBytes(16).toString('hex').toUpperCase();

module.exports = { generateQRToken };