const Subject = require('../models/Subject');
const { writeLog } = require('../services/logService');

// @route  GET /api/subjects
const getSubjects = async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = String(req.query.department).toUpperCase();
  const subjects = await Subject.find(filter).sort({ subjectCode: 1 });
  res.json({ success: true, count: subjects.length, subjects });
};

// @route  POST /api/subjects  (admin)
const createSubject = async (req, res) => {
  const { subjectCode, name, department, year, credits } = req.body;
  const subject = await Subject.create({
    subjectCode: subjectCode.trim().toUpperCase(),
    name: name.trim(),
    department: (department || '').trim().toUpperCase(),
    year: (year || '').trim(),
    credits: credits || 4,
  });
  await writeLog({
    action: 'SUBJECT_CREATED',
    message: `Subject ${subject.subjectCode} (${subject.name}) created`,
    userId: req.user._id,
    targetType: 'Subject',
    targetId: subject._id,
  });
  res.status(201).json({ success: true, message: 'Subject created', subject });
};

// @route  PUT /api/subjects/:id  (admin)
const updateSubject = async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found' });
  }
  const { subjectCode, name, department, year, credits, isActive } = req.body;
  if (subjectCode !== undefined) subject.subjectCode = subjectCode.trim().toUpperCase();
  if (name !== undefined) subject.name = name.trim();
  if (department !== undefined) subject.department = department.trim().toUpperCase();
  if (year !== undefined) subject.year = year.trim();
  if (credits !== undefined) subject.credits = Number(credits);
  if (isActive !== undefined) subject.isActive = Boolean(isActive);
  await subject.save();
  await writeLog({
    action: 'SUBJECT_UPDATED',
    message: `Subject ${subject.subjectCode} updated`,
    userId: req.user._id,
    targetType: 'Subject',
    targetId: subject._id,
  });
  res.json({ success: true, message: 'Subject updated', subject });
};

// @route  DELETE /api/subjects/:id  (admin)
const deleteSubject = async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found' });
  }
  await subject.deleteOne();
  await writeLog({
    action: 'SUBJECT_DELETED',
    message: `Subject ${subject.subjectCode} deleted`,
    userId: req.user._id,
    targetType: 'Subject',
    targetId: req.params.id,
  });
  res.json({ success: true, message: 'Subject deleted' });
};

module.exports = { getSubjects, createSubject, updateSubject, deleteSubject };