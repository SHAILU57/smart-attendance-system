const SystemSetting = require('../models/SystemSetting');
const { writeLog } = require('../services/logService');

const DEFAULT_SETTINGS = {
  collegeLat: 0,
  collegeLng: 0,
  geofenceRadius: 100,
  rejectOutsideGeoFence: true,
  rejectWrongLocation: true,
  demoIndoorMode: false,
};

// Return the singleton settings doc (create if first run)
async function getSettingsDoc() {
  let settings = await SystemSetting.findOne().sort({ createdAt: -1 });
  if (!settings) {
    settings = await SystemSetting.create(DEFAULT_SETTINGS);
  }
  return settings;
}

// @route  GET /api/settings  (admin)
const getSettings = async (req, res) => {
  const settings = await getSettingsDoc();
  res.json({ success: true, settings });
};

// @route  PUT /api/settings  (admin)
const updateSettings = async (req, res) => {
  const settings = await getSettingsDoc();
  const allowed = [
    'collegeLat',
    'collegeLng',
    'geofenceRadius',
    'rejectOutsideGeoFence',
    'rejectWrongLocation',
    'demoIndoorMode',
  ];
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) settings[f] = req.body[f];
  });
  if (req.body.geofenceRadius !== undefined) {
    settings.geofenceRadius = Math.max(1, Number(req.body.geofenceRadius));
  }
  settings.updatedBy = req.user._id;
  await settings.save();
  await writeLog({
    action: 'SETTINGS_UPDATED',
    message: 'System settings updated by admin',
    userId: req.user._id,
    targetType: 'SystemSetting',
    targetId: settings._id,
  });
  res.json({ success: true, message: 'Settings updated', settings });
};

module.exports = { getSettings, updateSettings, getSettingsDoc };