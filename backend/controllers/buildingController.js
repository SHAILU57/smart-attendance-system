const Building = require('../models/Building');
const { writeLog } = require('../services/logService');

// @route  GET /api/buildings
const getBuildings = async (req, res) => {
  const buildings = await Building.find().sort({ code: 1 });
  res.json({ success: true, count: buildings.length, buildings });
};

// @route  POST /api/buildings  (admin)
const createBuilding = async (req, res) => {
  const { name, code, description } = req.body;
  const building = await Building.create({
    name: name.trim(),
    code: code.trim().toUpperCase(),
    description: description ? description.trim() : '',
  });
  await writeLog({
    action: 'BUILDING_CREATED',
    message: `Building "${building.name}" (${building.code}) created`,
    userId: req.user._id,
    targetType: 'Building',
    targetId: building._id,
  });
  res.status(201).json({ success: true, message: 'Building created', building });
};

// @route  PUT /api/buildings/:id  (admin)
const updateBuilding = async (req, res) => {
  const building = await Building.findById(req.params.id);
  if (!building) {
    return res.status(404).json({ success: false, message: 'Building not found' });
  }
  const { name, code, description, isActive } = req.body;
  if (name !== undefined) building.name = name.trim();
  if (code !== undefined) building.code = code.trim().toUpperCase();
  if (description !== undefined) building.description = description.trim();
  if (isActive !== undefined) building.isActive = Boolean(isActive);
  await building.save();
  await writeLog({
    action: 'BUILDING_UPDATED',
    message: `Building "${building.code}" updated`,
    userId: req.user._id,
    targetType: 'Building',
    targetId: building._id,
  });
  res.json({ success: true, message: 'Building updated', building });
};

// @route  DELETE /api/buildings/:id  (admin)
const deleteBuilding = async (req, res) => {
  const building = await Building.findById(req.params.id);
  if (!building) {
    return res.status(404).json({ success: false, message: 'Building not found' });
  }
  await building.deleteOne();
  await writeLog({
    action: 'BUILDING_DELETED',
    message: `Building "${building.code}" deleted`,
    userId: req.user._id,
    targetType: 'Building',
    targetId: req.params.id,
  });
  res.json({ success: true, message: 'Building deleted' });
};

module.exports = { getBuildings, createBuilding, updateBuilding, deleteBuilding };