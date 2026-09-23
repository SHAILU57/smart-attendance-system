const Classroom = require('../models/Classroom');
const Building = require('../models/Building');
const Floor = require('../models/Floor');
const { writeLog } = require('../services/logService');

const POP = [
  { path: 'building', select: 'name code' },
  { path: 'floor', select: 'floorNumber' },
];

// @route  GET /api/classrooms
const getClassrooms = async (req, res) => {
  const filter = {};
  if (req.query.buildingId) filter.building = req.query.buildingId;
  if (req.query.floorId) filter.floor = req.query.floorId;
  const classrooms = await Classroom.find(filter).populate(POP).sort({ roomCode: 1 });
  res.json({ success: true, count: classrooms.length, classrooms });
};

// @route  POST /api/classrooms  (admin)
const createClassroom = async (req, res) => {
  const { roomCode, building, floor, name, capacity } = req.body;
  const [buildingDoc, floorDoc] = await Promise.all([
    Building.findById(building),
    Floor.findById(floor),
  ]);
  if (!buildingDoc) return res.status(404).json({ success: false, message: 'Building not found' });
  if (!floorDoc) return res.status(404).json({ success: false, message: 'Floor not found' });

  const classroom = await Classroom.create({
    roomCode: roomCode.trim().toUpperCase(),
    building,
    floor,
    name: name ? name.trim() : '',
    capacity: capacity || 60,
  });

  await writeLog({
    action: 'CLASSROOM_CREATED',
    message: `Classroom ${classroom.roomCode} created`,
    userId: req.user._id,
    targetType: 'Classroom',
    targetId: classroom._id,
  });
  res.status(201).json({ success: true, message: 'Classroom created', classroom });
};

// @route  PUT /api/classrooms/:id  (admin)
const updateClassroom = async (req, res) => {
  const classroom = await Classroom.findById(req.params.id);
  if (!classroom) {
    return res.status(404).json({ success: false, message: 'Classroom not found' });
  }
  const { roomCode, building, floor, name, capacity, isActive } = req.body;
  if (roomCode !== undefined) classroom.roomCode = roomCode.trim().toUpperCase();
  if (building !== undefined) classroom.building = building;
  if (floor !== undefined) classroom.floor = floor;
  if (name !== undefined) classroom.name = name.trim();
  if (capacity !== undefined) classroom.capacity = Number(capacity);
  if (isActive !== undefined) classroom.isActive = Boolean(isActive);
  await classroom.save();
  await writeLog({
    action: 'CLASSROOM_UPDATED',
    message: `Classroom ${classroom.roomCode} updated`,
    userId: req.user._id,
    targetType: 'Classroom',
    targetId: classroom._id,
  });
  res.json({ success: true, message: 'Classroom updated', classroom });
};

// @route  DELETE /api/classrooms/:id  (admin)
const deleteClassroom = async (req, res) => {
  const classroom = await Classroom.findById(req.params.id);
  if (!classroom) {
    return res.status(404).json({ success: false, message: 'Classroom not found' });
  }
  await classroom.deleteOne();
  await writeLog({
    action: 'CLASSROOM_DELETED',
    message: `Classroom ${classroom.roomCode} deleted`,
    userId: req.user._id,
    targetType: 'Classroom',
    targetId: req.params.id,
  });
  res.json({ success: true, message: 'Classroom deleted' });
};

module.exports = { getClassrooms, createClassroom, updateClassroom, deleteClassroom };