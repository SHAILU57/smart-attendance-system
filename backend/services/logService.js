const SystemLog = require('../models/SystemLog');

/**
 * Write an audit entry to the system log collection.
 * Used by controllers for important actions (registrations, CRUD, logins...).
 */
async function writeLog({ level = 'info', action, message = '', userId = null, targetType = null, targetId = null, meta = {} }) {
  try {
    await SystemLog.create({ level, action, message, userId, targetType, targetId, meta });
  } catch (err) {
    // Logging must never break the main request
    console.error('writeLog failed:', err.message);
  }
}

module.exports = { writeLog };