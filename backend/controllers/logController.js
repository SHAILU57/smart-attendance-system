const SystemLog = require('../models/SystemLog');

// @route  GET /api/logs  (admin)
const getLogs = async (req, res) => {
  const { level, action, limit } = req.query;
  const filter = {};
  if (level) filter.level = level;
  if (action) filter.action = action;
  const l = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const logs = await SystemLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(l)
    .populate('userId', 'name email role');
  res.json({ success: true, count: logs.length, logs });
};

module.exports = { getLogs };