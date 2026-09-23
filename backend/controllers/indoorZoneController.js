const IndoorZone = require('../models/IndoorZone');
const Building = require('../models/Building');
const Floor = require('../models/Floor');
const Classroom = require('../models/Classroom');
const { writeLog } = require('../services/logService');

const POP = [
  { path: 'building', select: 'name code' },
  { path: 'floor', select: 'floorNumber' },
  { path: 'room', select: 'roomCode name' },
];

// @route  GET /api/zones
const getZones = async (req, res) => {
  const zones = await IndoorZone.find().populate(POP).sort({ zoneId: 1 });
  res.json({ success: true, count: zones.length, zones });
};

// @route  POST /api/zones  (admin)
const createZone = async (req, res) => {
  const { zoneId, building, floor, room, beaconId, wifiSsid, wifiBssid, description } = req.body;
  const [buildingDoc, floorDoc, roomDoc] = await Promise.all([
    Building.findById(building),
    Floor.findById(floor),
    Classroom.findById(room),
  ]);
  if (!buildingDoc) return res.status(404).json({ success: false, message: 'Building not found' });
  if (!floorDoc) return res.status(404).json({ success: false, message: 'Floor not found' });
  if (!roomDoc) return res.status(404).json({ success: false, message: 'Classroom not found' });

  const zone = await IndoorZone.create({
    zoneId: zoneId.trim().toUpperCase(),
    building,
    floor,
    room,
    beaconId: (beaconId || '').trim().toUpperCase(),
    wifiSsid: (wifiSsid || '').trim(),
    wifiBssid: (wifiBssid || '').trim(),
    description: description ? description.trim() : '',
  });

  await writeLog({
    action: 'ZONE_CREATED',
    message: `Indoor zone ${zone.zoneId} created`,
    userId: req.user._id,
    targetType: 'IndoorZone',
    targetId: zone._id,
  });
  res.status(201).json({ success: true, message: 'Indoor zone created', zone });
};

// @route  PUT /api/zones/:id  (admin)
const updateZone = async (req, res) => {
  const zone = await IndoorZone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Indoor zone not found' });
  }
  const { zoneId, building, floor, room, beaconId, wifiSsid, wifiBssid, description, isActive } = req.body;
  if (zoneId !== undefined) zone.zoneId = zoneId.trim().toUpperCase();
  if (building !== undefined) zone.building = building;
  if (floor !== undefined) zone.floor = floor;
  if (room !== undefined) zone.room = room;
  if (beaconId !== undefined) zone.beaconId = beaconId.trim().toUpperCase();
  if (wifiSsid !== undefined) zone.wifiSsid = wifiSsid.trim();
  if (wifiBssid !== undefined) zone.wifiBssid = wifiBssid.trim();
  if (description !== undefined) zone.description = description.trim();
  if (isActive !== undefined) zone.isActive = Boolean(isActive);
  await zone.save();
  await writeLog({
    action: 'ZONE_UPDATED',
    message: `Indoor zone ${zone.zoneId} updated`,
    userId: req.user._id,
    targetType: 'IndoorZone',
    targetId: zone._id,
  });
  res.json({ success: true, message: 'Indoor zone updated', zone });
};

// @route  DELETE /api/zones/:id  (admin)
const deleteZone = async (req, res) => {
  const zone = await IndoorZone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Indoor zone not found' });
  }
  await zone.deleteOne();
  await writeLog({
    action: 'ZONE_DELETED',
    message: `Indoor zone ${zone.zoneId} deleted`,
    userId: req.user._id,
    targetType: 'IndoorZone',
    targetId: req.params.id,
  });
  res.json({ success: true, message: 'Indoor zone deleted' });
};

// @route  POST /api/zones/match  (authenticated)
// Given a beaconId OR wifiSsid OR zoneId, find the matching zone.
// Used by the indoor positioning service in Stage 3.
const matchZone = async (req, res) => {
  const { beaconId, wifiSsid, zoneId } = req.body;
  const query = {};
  if (zoneId) query.zoneId = String(zoneId).trim().toUpperCase();
  else if (beaconId) query.beaconId = String(beaconId).trim().toUpperCase();
  else if (wifiSsid) query.wifiSsid = String(wifiSsid).trim();
  else {
    return res.status(400).json({
      success: false,
      message: 'Provide zoneId, beaconId or wifiSsid to match an indoor zone',
    });
  }

  const zone = await IndoorZone.findOne(query).populate(POP);
  if (!zone) {
    return res.status(404).json({
      success: false,
      message: 'No indoor zone matches the provided identifier',
    });
  }
  res.json({ success: true, zone });
};

module.exports = { getZones, createZone, updateZone, deleteZone, matchZone };