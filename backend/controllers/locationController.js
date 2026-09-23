const IndoorZone = require('../models/IndoorZone');
const { getSettingsDoc } = require('../controllers/settingsController');
const { haversineDistanceMeters } = require('../utils/haversine');
const { writeLog } = require('../services/logService');

/**
 * POST /api/location/gps  (any authenticated user)
 * Body: { lat, lng }
 *
 * Checks the user's GPS point against the configured college geofence.
 * IMPORTANT: this is a CAMPUS-AREA check only. It never claims to
 * detect an exact building, floor or classroom.
 */
const gpsCheck = async (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({ success: false, message: 'A valid latitude (-90 to 90) is required.' });
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, message: 'A valid longitude (-180 to 180) is required.' });
  }

  const settings = await getSettingsDoc();

  if (!settings.collegeLat || !settings.collegeLng) {
    return res.status(400).json({
      success: false,
      message:
        'College GPS location is not configured yet. Ask the admin to set the college latitude and longitude.',
    });
  }

  const distance = haversineDistanceMeters(
    settings.collegeLat,
    settings.collegeLng,
    lat,
    lng
  );
  const inside = distance <= settings.geofenceRadius;

  await writeLog({
    action: 'GPS_CHECK',
    message: `GPS check: ${distance.toFixed(1)}m from college center -> ${inside ? 'INSIDE' : 'OUTSIDE'} geofence`,
    userId: req.user._id,
    meta: { distance, inside, radius: settings.geofenceRadius },
  });

  res.json({
    success: true,
    inside,
    distanceMeters: +distance.toFixed(1),
    geofenceRadiusMeters: settings.geofenceRadius,
    method: 'GPS / Haversine',
    note: 'GPS verifies the college campus area only. It does NOT determine your exact building, floor or room.',
    usedLocation: { lat, lng },
    college: { lat: settings.collegeLat, lng: settings.collegeLng },
  });
};

/**
 * POST /api/location/indoor  (any authenticated user)
 * Body: { beaconId } OR { wifiSsid } OR { zoneId }
 *
 * Matches a BLE beacon / Wi-Fi identifier / zone id against the
 * admin-configured indoor zones. The frontend clearly separates:
 *  1. REAL positioning from an authorized BLE/Wi-Fi device or gateway,
 *  2. DEMO mode (a selected zone) - visibly labelled as NOT real.
 */
const indoorCheck = async (req, res) => {
  const { beaconId, wifiSsid, zoneId, mode } = req.body;

  const query = {};
  if (zoneId) query.zoneId = String(zoneId).trim().toUpperCase();
  else if (beaconId) query.beaconId = String(beaconId).trim().toUpperCase();
  else if (wifiSsid) query.wifiSsid = String(wifiSsid).trim();
  else {
    return res.status(400).json({
      success: false,
      message: 'Provide one of: beaconId, wifiSsid or zoneId.',
    });
  }

  const zone = await IndoorZone.findOne({
    ...query,
    isActive: true,
  }).populate('building floor room');

  if (!zone) {
    await writeLog({
      level: 'warn',
      action: 'INDOOR_UNKNOWN',
      message: `No indoor zone matched for ${JSON.stringify(query)}`,
      userId: req.user._id,
    });
    return res.status(404).json({
      success: false,
      message: 'Indoor verification unavailable: no zone matches the provided identifier.',
    });
  }

  const demo = mode === 'demo';
  await writeLog({
    action: 'INDOOR_CHECK',
    message: `Indoor zone ${zone.zoneId} matched (${demo ? 'DEMO mode' : 'beacon/wifi'})`,
    userId: req.user._id,
    targetType: 'IndoorZone',
    targetId: zone._id,
    meta: { demo, zoneId: zone.zoneId },
  });

  res.json({
    success: true,
    zone: {
      zoneId: zone.zoneId,
      building: zone.building.name,
      floor: zone.floor.floorNumber,
      room: zone.room.roomCode,
      beaconId: zone.beaconId,
      wifiSsid: zone.wifiSsid,
    },
    isDemo: demo,
    message: demo
      ? 'DEMO INDOOR LOCATION - selected test zone. This is NOT real physical positioning.'
      : 'Indoor location matched from authorized identifier.',
  });
};

/**
 * GET /api/location/config  (any authenticated user)
 * Returns the geofence/demo config needed to display the location check page.
 * Exposes only what a student needs to see; the settings page remains admin-only.
 */
const locationConfig = async (req, res) => {
  const settings = await getSettingsDoc();
  res.json({
    success: true,
    gpsConfigured: !!(settings.collegeLat && settings.collegeLng),
    collegeLat: settings.collegeLat,
    collegeLng: settings.collegeLng,
    geofenceRadiusMeters: settings.geofenceRadius,
    demoIndoorMode: settings.demoIndoorMode,
    rejectOutsideGeoFence: settings.rejectOutsideGeoFence,
    rejectWrongLocation: settings.rejectWrongLocation,
  });
};

module.exports = { gpsCheck, indoorCheck, locationConfig };