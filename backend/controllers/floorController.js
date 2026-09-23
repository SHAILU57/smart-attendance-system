const Floor = require('../models/Floor');
const Building = require('../models/Building');
const { writeLog } = require('../services/logService');

// Populate building for readable output
const POP = [{ path: 'building', select: 'name code' }];

// @route  GET /api/floors
const getFloors = async (req, res) => {
  const filter = {};
  if (req.query.buildingId) filter.building = req.query.buildingId;
  const floors = await Floor.find(filter).populate(POP).sort({ floorNumber: 1 });
  res.json({ success: true, count: floors.length, floors });
};

// @route  POST /api/floors  (admin)
const createFloor = async (req, res) => {
  const { building, floorNumber } = req.body;
  const buildingDoc = await Building.findById(building);
  if (!buildingDoc) {
    return res.status(404).json({ success: false, message: 'Building not found' });
  }
  const floor = await Floor.create({ building, floorNumber: String(floorNumber).trim() });
  await writeLog({
    action: 'FLOOR_CREATED',
    message: `Floor ${floor.floorNumber} added to "${buildingDoc.name}"`,
    userId: req.user._id,
    targetType: 'Floor',
    targetId: floor._id,
  });
  res.status(201).json({ success: true, message: 'Floor created', floor });
};

// @route  PUT /api/floors/:id  (admin)
const updateFloor = async (req, res) => {
  const floor = await Floor.findById(req.params.id);
  if (!floor) {
    return res.status(404).json({ success: false, message: 'Floor not found' });
  }
  if (req.body.floorNumber !== undefined) floor.floorNumber = String(req.body.floorNumber).trim();
  if (req.body.isActive !== undefined) floor.isActive = Boolean(req.body.isActive);
  await floor.save();
  await writeLog({
    action: 'FLOOR_UPDATED',
    message: `Floor ${floor.floorNumber} updated`,
    userId: req.user._id,
    targetType: 'Floor',
    targetId: floor._id,
  });
  res.json({ success: true, message: 'Floor updated', floor });
};

// @route  DELETE /api/floors/:id  (admin)
const deleteFloor = async (req, res) => {
  const floor = await Floor.findById(req.params.id);
  if (!floor) {
    return res.status(404).json({ success: false, message: 'Floor not found' });
  }
  await floor.deleteOne();
  await writeLog({
    action: 'FLOOR_DELETED',
    message: `Floor ${floor.floorNumber} deleted`,
    userId: req.user._id,
    targetType: 'Floor',
    targetId: req.params.id,
  });
  res.json({ success: true, message: 'Floor deleted' });
};

module.exports = { getFloors, createFloor, updateFloor, deleteFloor };