const User = require('../models/User');
const FaceTemplate = require('../models/FaceTemplate');
const { writeLog } = require('../services/logService');
const {
  euclideanDistance,
  validateDescriptor,
  DEFAULT_THRESHOLD,
} = require('../utils/faceSimilarity');

/**
 * POST /api/face/register  (student, self only)
 * Body: { descriptor: [128 numbers], detectionScore?: number }
 *
 * Stores ONLY the embedding. No photos are saved.
 */
const registerFace = async (req, res) => {
  const { descriptor, detectionScore } = req.body;

  const check = validateDescriptor(descriptor);
  if (!check.valid) {
    return res.status(400).json({ success: false, message: check.message });
  }
  if (descriptor.length !== 128) {
    return res.status(400).json({
      success: false,
      message: `Expected a 128-dimension face descriptor, got ${descriptor.length}.`,
    });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }

  const clean = descriptor.map(Number);

  // Upsert the template for this user
  const template = await FaceTemplate.findOneAndUpdate(
    { user: user._id },
    {
      user: user._id,
      descriptor: clean,
      descriptorLength: clean.length,
      detectionScore: Number(detectionScore) || 0,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  user.faceRegistered = true;
  await user.save();

  await writeLog({
    action: 'FACE_REGISTERED',
    message: `Face template registered for ${user.name} (${user.studentId})`,
    userId: user._id,
    targetType: 'FaceTemplate',
    targetId: template._id,
  });

  res.json({
    success: true,
    message:
      'Face registered successfully. Your face template (embedding only, no photo) is stored for future verification.',
    templateId: template._id,
    descriptorLength: template.descriptorLength,
    detectionScore: template.detectionScore,
  });
};

/**
 * POST /api/face/verify
 * Body: { descriptor: [128 numbers], student?: studentId | user.teacherId }
 *
 * Permissions:
 *  - admin/teacher: may verify against any student (student id or the token-identified student).
 *  - student: may verify ONLY their own face.
 *
 * If no target is given, a student verifies themselves.
 */
const verifyFace = async (req, res) => {
  const { descriptor, studentId } = req.body;

  const check = validateDescriptor(descriptor);
  if (!check.valid) {
    return res.status(400).json({ success: false, message: check.message });
  }

  // Determine who we are comparing against
  let target = null;
  if (req.user.role === 'student') {
    target = await User.findById(req.user._id);
  } else {
    if (studentId) {
      target = await User.findOne({
        $or: [{ studentId: String(studentId).trim().toUpperCase() }],
        role: 'student',
      });
    } else {
      target = await User.findById(req.user._id);
    }
  }

  if (!target) {
    return res.status(404).json({ success: false, message: 'Target student not found' });
  }

  if (req.user.role === 'student' && String(target._id) !== String(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: 'Students may only verify their own face.',
    });
  }

  const template = await FaceTemplate.findOne({ user: target._id });
  if (!template) {
    return res.status(404).json({
      success: false,
      message: `${target.name} has not registered a face yet. Register the face first.`,
      student: publicStudent(target),
    });
  }

  const distance = euclideanDistance(descriptor.map(Number), template.descriptor);
  const threshold = Math.min(
    Math.max(Number(req.body.threshold) || DEFAULT_THRESHOLD, 0.3),
    0.8
  );
  const matched = distance <= threshold;

  await writeLog({
    level: matched ? 'info' : 'warn',
    action: matched ? 'FACE_VERIFIED' : 'FACE_REJECTED',
    message: `Face verification for ${target.name} (${target.studentId}): distance ${distance.toFixed(4)} ${matched ? 'MATCH' : 'NO MATCH'}`,
    userId: req.user._id,
    targetType: 'User',
    targetId: target._id,
    meta: { distance, threshold, matched },
  });

  res.json({
    success: matched,
    matched,
    distance: +distance.toFixed(4),
    threshold,
    message: matched
      ? 'Face verification passed. The person matches the registered student.'
      : 'Face verification failed. The person does NOT match the registered student.',
    student: publicStudent(target),
  });
};

/**
 * GET /api/face/status  (auth)
 * Returns whether the current student has a registered face template.
 */
const faceStatus = async (req, res) => {
  const template = await FaceTemplate.findOne({ user: req.user._id });
  const user = await User.findById(req.user._id);
  res.json({
    success: true,
    faceRegistered: !!template,
    model: template ? template.model : null,
    registeredAt: template ? template.createdAt : null,
    userStatus: user ? !!user.faceRegistered : false,
  });
};

function publicStudent(user) {
  return {
    studentId: user.studentId,
    name: user.name,
    department: user.department,
    year: user.year,
    section: user.section,
    faceRegistered: user.faceRegistered,
  };
}

module.exports = { registerFace, verifyFace, faceStatus };