const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const FaceTemplate = require('../models/FaceTemplate');
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const IndoorZone = require('../models/IndoorZone');
const { getSettingsDoc } = require('../controllers/settingsController');
const { haversineDistanceMeters } = require('../utils/haversine');
const { euclideanDistance, DEFAULT_THRESHOLD } = require('../utils/faceSimilarity');
const { writeLog } = require('../services/logService');

const POP = [
  { path: 'subject', select: 'name subjectCode' },
  { path: 'teacher', select: 'name email' },
  { path: 'building', select: 'name code' },
  { path: 'floor', select: 'floorNumber' },
  { path: 'room', select: 'roomCode name' },
];

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function localWeekday() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}
function nowHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return h * 60 + m;
}

/* --------------------------------------------------------------
   GET /api/attendance/sessions
   Students see today's sessions; teachers see their own; admin sees all.
   -------------------------------------------------------------- */
const getSessions = async (req, res) => {
  const filter = {};
  if (req.query.all !== 'true' && req.user.role === 'teacher') {
    filter.teacher = req.user._id;
  }
  const sessions = await AttendanceSession.find(filter)
    .populate(POP)
    .sort({ date: -1, startTime: -1 });

  // Auto-status refresh for display
  const out = sessions.map((s) => {
    const o = s.toObject();
    const live = s.isToday() && s.isInWindow();
    o.liveStatus = s.status === 'CLOSED' ? 'CLOSED' : live ? 'ONGOING' : s.isToday() ? 'SCHEDULED' : 'PAST';
    return o;
  });
  res.json({ success: true, count: out.length, sessions: out });
};

/* --------------------------------------------------------------
   POST /api/attendance/sessions  (teacher / admin)
   -------------------------------------------------------------- */
const createSession = async (req, res) => {
  const { subject, date, startTime, endTime, building, floor, room, department, code } = req.body;

  if (!subject || !date || !startTime || !endTime || !building || !floor || !room) {
    return res.status(400).json({
      success: false,
      message: 'subject, date, startTime, endTime, building, floor and room are all required.',
    });
  }
  if (toMinutes(endTime) <= toMinutes(startTime)) {
    return res.status(400).json({ success: false, message: 'End time must be after start time.' });
  }

  const finalCode = code || `SAT-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const session = await AttendanceSession.create({
    code: finalCode,
    subject,
    teacher: req.user.role === 'teacher' ? req.user._id : req.body.teacher || req.user._id,
    department: department || req.user.department || '',
    date,
    startTime,
    endTime,
    building,
    floor,
    room,
    status: 'SCHEDULED',
    createdBy: req.user._id,
  });

  await writeLog({
    action: 'SESSION_CREATED',
    message: `Attendance session ${session.code} created`,
    userId: req.user._id,
    targetType: 'AttendanceSession',
    targetId: session._id,
  });

  const populated = await AttendanceSession.findById(session._id).populate(POP);
  res.status(201).json({ success: true, message: 'Session created', session: populated });
};

/* --------------------------------------------------------------
   PUT /api/attendance/sessions/:id  (teacher / admin) - status changes
   -------------------------------------------------------------- */
const updateSession = async (req, res) => {
  const session = await AttendanceSession.findById(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

  if (req.body.status !== undefined) {
    const allowed = ['SCHEDULED', 'ONGOING', 'CLOSED'];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    session.status = req.body.status;
  }
  await session.save();

  await writeLog({
    action: 'SESSION_UPDATED',
    message: `Attendance session ${session.code} set to ${session.status}`,
    userId: req.user._id,
    targetType: 'AttendanceSession',
    targetId: session._id,
  });

  const populated = await AttendanceSession.findById(session._id).populate(POP);
  res.json({ success: true, message: 'Session updated', session: populated });
};

/* --------------------------------------------------------------
   POST /api/attendance/checkin  (student self, or teacher/admin scanning)
   Body: { sessionCode, qrToken, faceDescriptor, gps:{lat,lng},
           indoor:{ zoneId|beaconId|wifiSsid, mode:'real'|'demo' } }
   Runs the full chained verification and marks PRESENT or REJECTED.
   -------------------------------------------------------------- */
const checkin = async (req, res) => {
  const { sessionCode, sessionId, qrToken, faceDescriptor, gps, indoor } = req.body;
  const settings = await getSettingsDoc();

  // ---------- 1. SESSION ----------
  const session = sessionId
    ? await AttendanceSession.findById(sessionId).populate(POP)
    : await AttendanceSession.findOne({ code: String(sessionCode || '').trim().toUpperCase() }).populate(POP);

  if (!session) {
    return res.status(404).json({ success: false, message: 'Attendance session not found.' });
  }
  if (session.status === 'CLOSED') {
    return res.status(400).json({ success: false, message: 'This session is closed.' });
  }
  if (!session.isToday() || !session.isInWindow()) {
    return res.status(400).json({
      success: false,
      message: `Session ${session.code} is not open now (valid ${session.startTime}-${session.endTime} on ${session.date}).`,
    });
  }

  // ---------- 2. QR: identify student ----------
  if (!qrToken || typeof qrToken !== 'string') {
    return res.status(400).json({ success: false, message: 'QR token is required.' });
  }
  let token = qrToken.trim();
  try {
    const parsed = JSON.parse(token);
    if (parsed && parsed.t) token = parsed.t;
  } catch (e) {
    /* not JSON - use raw token */
  }

  const student = await User.findOne({ qrToken: token, role: 'student' });
  if (!student) {
    await writeLog({
      level: 'warn',
      action: 'CHECKIN_QR_REJECTED',
      message: 'Check-in rejected: unknown QR token',
      userId: req.user._id,
    });
    return res.status(400).json({
      success: false,
      qr: false,
      message: 'QR verification failed: unknown QR token.',
      record: null,
    });
  }

  // A student can only check themselves in; teacher/admin may scan any student's QR
  if (req.user.role === 'student' && String(student._id) !== String(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: 'You can only check in with your own QR code.',
    });
  }

  // Already marked for this session?
  const existing = await AttendanceRecord.findOne({ session: session._id, student: student._id });
  if (existing) {
    return res.json({
      success: existing.status === 'PRESENT',
      alreadyMarked: true,
      message: `Attendance already recorded for this session: ${existing.status}.`,
      record: await AttendanceRecord.findById(existing._id).populate('session'),
      checks: buildChecksFromRecord(existing),
    });
  }

  const checks = {
    qr: { ok: true, label: 'QR token verified', detail: `Identified ${student.name} (${student.studentId})` },
    face: { ok: false, label: 'Face verification', detail: '' },
    gps: { ok: false, label: 'GPS campus geofence', detail: '' },
    indoor: { ok: false, label: 'Indoor location', detail: '' },
    timetable: { ok: false, label: 'Timetable & classroom', detail: '' },
  };
  const reasons = [];

  // ---------- 3. FACE ----------
  const template = await FaceTemplate.findOne({ user: student._id });
  if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
    checks.face.detail = 'No face descriptor supplied.';
    reasons.push('face: a 128-dimension face descriptor is required');
  } else if (!template) {
    checks.face.detail = `${student.name} has not registered a face yet.`;
    reasons.push('face: no registered face template - register your face first');
  } else {
    try {
      const distance = euclideanDistance(faceDescriptor.map(Number), template.descriptor);
      const ok = distance <= DEFAULT_THRESHOLD;
      checks.face.ok = ok;
      checks.face.detail = `Distance ${distance.toFixed(4)} (threshold ${DEFAULT_THRESHOLD})`;
      checks.face.distance = +distance.toFixed(4);
      if (!ok) reasons.push(`face: no match (distance ${distance.toFixed(4)})`);
    } catch (e) {
      checks.face.detail = 'Descriptor comparison failed.';
      reasons.push('face: descriptor comparison error');
    }
  }

  // ---------- 4. GPS ----------
  const gpsConfigured = !!(settings.collegeLat && settings.collegeLng);
  if (!gpsConfigured) {
    checks.gps.ok = true;
    checks.gps.detail = 'Campus GPS not configured - geofence check skipped.';
  } else if (!gps || !Number.isFinite(Number(gps.lat)) || !Number.isFinite(Number(gps.lng))) {
    checks.gps.detail = 'No GPS coordinates supplied.';
    if (settings.rejectOutsideGeoFence) reasons.push('gps: location was not supplied');
  } else {
    const dist = haversineDistanceMeters(
      settings.collegeLat,
      settings.collegeLng,
      Number(gps.lat),
      Number(gps.lng)
    );
    const inside = dist <= settings.geofenceRadius;
    checks.gps.ok = inside;
    checks.gps.distanceMeters = +dist.toFixed(1);
    checks.gps.detail = `${dist.toFixed(1)} m from campus center (limit ${settings.geofenceRadius} m)`;
    if (!inside && settings.rejectOutsideGeoFence) {
      reasons.push(`gps: outside campus geofence (${dist.toFixed(1)} m away)`);
    }
  }

  // ---------- 5. INDOOR (building / floor / room) ----------
  let actualRoom = null; // { building, floor, room }
  const demoMode = !!(indoor && indoor.mode === 'demo');
  if (demoMode && !settings.demoIndoorMode) {
    checks.indoor.detail = 'Demo indoor mode is disabled by the admin.';
    if (settings.rejectWrongLocation) reasons.push('indoor: demo mode disabled - use a real identifier');
  } else {
    const q = {};
    if (indoor && indoor.zoneId) q.zoneId = String(indoor.zoneId).trim().toUpperCase();
    else if (indoor && indoor.beaconId) q.beaconId = String(indoor.beaconId).trim().toUpperCase();
    else if (indoor && indoor.wifiSsid) q.wifiSsid = String(indoor.wifiSsid).trim();

    if (Object.keys(q).length === 0) {
      checks.indoor.detail = 'No indoor identifier supplied.';
      if (settings.rejectWrongLocation) reasons.push('indoor: building/floor/room could not be verified');
    } else {
      const zone = await IndoorZone.findOne({ ...q, isActive: true })
        .populate('building floor room');
      if (!zone) {
        checks.indoor.detail = 'No indoor zone matches the identifier.';
        if (settings.rejectWrongLocation) reasons.push('indoor: unknown beacon/wifi/zone');
      } else {
        actualRoom = {
          building: zone.building ? zone.building.name : '',
          floor: zone.floor ? zone.floor.floorNumber : '',
          room: zone.room ? zone.room.roomCode : '',
        };
        checks.indoor.ok = true;
        checks.indoor.demo = demoMode;
        checks.indoor.detail = `${actualRoom.building} / Floor ${actualRoom.floor} / ${actualRoom.room}${demoMode ? ' (DEMO - not real)' : ''}`;
      }
    }
  }

  // ---------- 6. TIMETABLE + expected classroom ----------
  let expectedRoom = null; // { building, floor, room }
  if (student.department && student.year && student.section) {
    const day = localWeekday();
    const nowMin = toMinutes(nowHHMM());
    const entries = await Timetable.find({
      department: student.department,
      year: student.year,
      section: student.section,
      day,
      isActive: true,
    })
      .populate('subject building floor room')
      .populate('teacher', 'name');

    const active = entries.filter(
      (e) => nowMin >= toMinutes(e.startTime) && nowMin <= toMinutes(e.endTime)
    );

    if (!active.length) {
      checks.timetable.detail = `No class is scheduled for your section right now (${day} ${nowHHMM()}).`;
      reasons.push('timetable: no class scheduled at this time for your section');
    } else {
      // The session's subject must be the subject actually scheduled now
      const match = active.find(
        (e) => String(e.subject && e.subject._id) === String(session.subject && session.subject._id)
      );
      const slot = match || active[0];
      expectedRoom = {
        building: slot.building ? slot.building.name : '',
        floor: slot.floor ? slot.floor.floorNumber : '',
        room: slot.room ? slot.room.roomCode : '',
      };

      if (!match) {
        checks.timetable.detail = `Now is ${slot.subject ? slot.subject.name : '?'} (${slot.startTime}-${slot.endTime}), not ${session.subject ? session.subject.name : session.code}.`;
        reasons.push(`timetable: session subject does not match the current class (${slot.subject ? slot.subject.name : 'unknown'})`);
      } else {
        checks.timetable.ok = true;
        checks.timetable.detail = `${slot.subject.name} ${slot.startTime}-${slot.endTime} in ${expectedRoom.room}`;

        // Wrong classroom check (actual vs expected)
        if (actualRoom && settings.rejectWrongLocation) {
          const rightRoom =
            actualRoom.room === expectedRoom.room &&
            actualRoom.building === expectedRoom.building &&
            actualRoom.floor === expectedRoom.floor;
          if (!rightRoom) {
            checks.timetable.ok = false;
            checks.timetable.detail = `Expected ${expectedRoom.building}/Floor ${expectedRoom.floor}/${expectedRoom.room} but found ${actualRoom.building}/Floor ${actualRoom.floor}/${actualRoom.room}.`;
            reasons.push(
              `wrong classroom: timetable expects ${expectedRoom.room}, you are in ${actualRoom.room}`
            );
          }
        }
      }
    }
  } else {
    checks.timetable.detail = 'Your department/year/section is not set - cannot verify timetable.';
    reasons.push('timetable: student section info missing');
  }

  // ---------- 7. DECISION ----------
  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 'PRESENT' : 'REJECTED';
  const rejectionReason = allOk ? '' : reasons.join('; ');

  const record = await AttendanceRecord.create({
    session: session._id,
    student: student._id,
    date: localToday(),
    subject: session.subject && session.subject._id,
    subjectName: session.subject ? session.subject.name : '',
    status,
    qrVerified: checks.qr.ok,
    faceVerified: checks.face.ok,
    gpsVerified: checks.gps.ok,
    indoorVerified: checks.indoor.ok,
    timetableVerified: checks.timetable.ok,
    faceDistance: checks.face.distance !== undefined ? checks.face.distance : null,
    gpsDistanceMeters: checks.gps.distanceMeters !== undefined ? checks.gps.distanceMeters : null,
    building: actualRoom ? actualRoom.building : '',
    floor: actualRoom ? actualRoom.floor : '',
    room: actualRoom ? actualRoom.room : '',
    expectedBuilding: expectedRoom ? expectedRoom.building : '',
    expectedFloor: expectedRoom ? expectedRoom.floor : '',
    expectedRoom: expectedRoom ? expectedRoom.room : '',
    rejectionReason,
    demoIndoor: demoMode && checks.indoor.ok,
    markedBy: req.user._id,
    checkinTime: new Date(),
  });

  await writeLog({
    level: status === 'PRESENT' ? 'info' : 'warn',
    action: status === 'PRESENT' ? 'ATTENDANCE_PRESENT' : 'ATTENDANCE_REJECTED',
    message: `${student.name} (${student.studentId}) -> ${status} for session ${session.code}${rejectionReason ? ' - ' + rejectionReason : ''}`,
    userId: req.user._id,
    targetType: 'AttendanceRecord',
    targetId: record._id,
    meta: { checks, sessionCode: session.code },
  });

  res.status(status === 'PRESENT' ? 201 : 200).json({
    success: status === 'PRESENT',
    marked: true,
    status,
    message:
      status === 'PRESENT'
        ? `Attendance marked PRESENT for ${student.name} in ${session.subject ? session.subject.name : session.code}.`
        : `Attendance REJECTED: ${rejectionReason}`,
    reason: rejectionReason,
    student: {
      studentId: student.studentId,
      name: student.name,
      department: student.department,
      year: student.year,
      section: student.section,
    },
    session: {
      code: session.code,
      subject: session.subject ? session.subject.name : '',
      room: session.room ? session.room.roomCode : '',
      startTime: session.startTime,
      endTime: session.endTime,
      date: session.date,
    },
    checks,
    record,
  });
};

function buildChecksFromRecord(r) {
  return {
    qr: { ok: r.qrVerified, label: 'QR token verified', detail: 'Already verified earlier' },
    face: { ok: r.faceVerified, label: 'Face verification', detail: r.faceDistance !== null ? `Distance ${r.faceDistance}` : '' },
    gps: { ok: r.gpsVerified, label: 'GPS campus geofence', detail: r.gpsDistanceMeters !== null ? `${r.gpsDistanceMeters} m` : '' },
    indoor: { ok: r.indoorVerified, label: 'Indoor location', detail: r.room ? `${r.building}/Floor ${r.floor}/${r.room}` : '' },
    timetable: { ok: r.timetableVerified, label: 'Timetable & classroom', detail: r.expectedRoom ? `Expected ${r.expectedRoom}` : '' },
  };
}

/* --------------------------------------------------------------
   GET /api/attendance/student/me - the current student's records
   (used by attendance-history.html)
   -------------------------------------------------------------- */
const myRecords = async (req, res) => {
  const studentId =
    req.user.role === 'student'
      ? req.user._id
      : req.query.studentId
      ? (await User.findOne({ studentId: req.query.studentId }))._id
      : null;
  if (!studentId) return res.status(400).json({ success: false, message: 'studentId is required' });

  const records = await AttendanceRecord.find({ student: studentId })
    .populate({ path: 'session', select: 'code startTime endTime date status' })
    .sort({ createdAt: -1 });

  res.json({ success: true, count: records.length, records });
};

/* --------------------------------------------------------------
   GET /api/attendance/summary/me - attendance % for the dashboard
   -------------------------------------------------------------- */
const mySummary = async (req, res) => {
  const records = await AttendanceRecord.find({ student: req.user._id })
    .populate('subject', 'name subjectCode');

  const total = records.length;
  const present = records.filter((r) => r.status === 'PRESENT').length;
  const rejected = records.filter((r) => r.status === 'REJECTED').length;
  const pct = total ? Math.round((present / total) * 100) : 0;

  const bySubject = {};
  records.forEach((r) => {
    const key = r.subjectName || 'Unknown';
    if (!bySubject[key]) bySubject[key] = { subject: key, present: 0, total: 0 };
    bySubject[key].total += 1;
    if (r.status === 'PRESENT') bySubject[key].present += 1;
  });
  const subjects = Object.values(bySubject).map((s) => ({
    ...s,
    pct: s.total ? Math.round((s.present / s.total) * 100) : 0,
  }));

  res.json({
    success: true,
    overall: { total, present, rejected, pct },
    subjects,
  });
};

/* --------------------------------------------------------------
   GET /api/attendance/session/:id - one session with its records
   (teacher / admin)
   -------------------------------------------------------------- */
const getSessionRecords = async (req, res) => {
  const session = await AttendanceSession.findById(req.params.id).populate(POP);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

  const records = await AttendanceRecord.find({ session: session._id })
    .populate('student', 'name studentId department year section')
    .sort({ checkinTime: 1 });

  res.json({ success: true, session, count: records.length, records });
};

module.exports = {
  getSessions,
  createSession,
  updateSession,
  checkin,
  myRecords,
  mySummary,
  getSessionRecords,
};