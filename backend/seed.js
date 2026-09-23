/* ============================================================
   seed.js - Demo data for the Smart Attendance System
   Run:  npm run seed   (from backend folder)
   This DELETES existing demo entries for the seeded roles/entities
   and recreates a fresh, consistent data set.
   ============================================================ */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Building = require('./models/Building');
const Floor = require('./models/Floor');
const Classroom = require('./models/Classroom');
const IndoorZone = require('./models/IndoorZone');
const Subject = require('./models/Subject');
const Timetable = require('./models/Timetable');
const SystemSetting = require('./models/SystemSetting');
const SystemLog = require('./models/SystemLog');
const connectDB = require('./config/db');
const { generateQRToken } = require('./utils/qrToken');

const DEMO_PASSWORD = 'demo123';

async function seed() {
  await connectDB();

  console.log('\n=== Cleaning demo data ===');

  // Remove previously seeded demo users (never remove real registrations blindly,
  // but for a demo project we clear the standard collections).
  await User.deleteMany({ role: { $in: ['admin', 'teacher'] } });
  await User.deleteMany({ studentId: { $in: ['STU001', 'STU002', 'STU003', 'STU004'] } });

  await Building.deleteMany({});
  await Floor.deleteMany({});
  await Classroom.deleteMany({});
  await IndoorZone.deleteMany({});
  await Subject.deleteMany({});
  await Timetable.deleteMany({});
  await SystemSetting.deleteMany({});
  await SystemLog.deleteMany({});

  console.log('=== Creating admin & teacher ===');

  const admin = await User.create({
    role: 'admin',
    name: 'System Administrator',
    email: 'admin@college.edu',
    password: DEMO_PASSWORD,
  });

  const teacher1 = await User.create({
    role: 'teacher',
    teacherId: 'TCH001',
    name: 'Dr. Rajesh',
    email: 'teacher@college.edu',
    phone: '9123456780',
    department: 'CSE',
    password: DEMO_PASSWORD,
  });

  const teacher2 = await User.create({
    role: 'teacher',
    teacherId: 'TCH002',
    name: 'Prof. Meena',
    email: 'meena@college.edu',
    phone: '9123456781',
    department: 'ECE',
    password: DEMO_PASSWORD,
  });

  console.log('=== Creating students ===');

  const students = await User.create([
    {
      role: 'student',
      studentId: 'STU001',
      name: 'Lakshmi',
      email: 'lakshmi@college.edu',
      phone: '9876543210',
      department: 'CSE',
      year: '3rd Year',
      section: 'A',
      password: DEMO_PASSWORD,
      qrToken: generateQRToken(),
    },
    {
      role: 'student',
      studentId: 'STU002',
      name: 'Student2',
      email: 'stu2@college.edu',
      phone: '9876543211',
      department: 'CSE',
      year: '3rd Year',
      section: 'A',
      password: DEMO_PASSWORD,
      qrToken: generateQRToken(),
    },
    {
      role: 'student',
      studentId: 'STU003',
      name: 'Student3',
      email: 'stu3@college.edu',
      phone: '9876543212',
      department: 'ECE',
      year: '3rd Year',
      section: 'A',
      password: DEMO_PASSWORD,
      qrToken: generateQRToken(),
    },
    {
      role: 'student',
      studentId: 'STU004',
      name: 'Anjali',
      email: 'stu4@college.edu',
      phone: '9876543213',
      department: 'CSE',
      year: '3rd Year',
      section: 'A',
      password: DEMO_PASSWORD,
      qrToken: generateQRToken(),
    },
  ]);

  console.log('=== Creating buildings / floors / classrooms ===');

  const blockA = await Building.create({ name: 'Block A', code: 'A', description: 'Main academic block' });
  const blockB = await Building.create({ name: 'Block B', code: 'B', description: 'Engineering annex' });

  const aF1 = await Floor.create({ building: blockA._id, floorNumber: '1' });
  const aF2 = await Floor.create({ building: blockA._id, floorNumber: '2' });
  const aF3 = await Floor.create({ building: blockA._id, floorNumber: '3' });
  const bF1 = await Floor.create({ building: blockB._id, floorNumber: '1' });
  const bF2 = await Floor.create({ building: blockB._id, floorNumber: '2' });

  const cA101 = await Classroom.create({ roomCode: 'A101', building: blockA._id, floor: aF1._id, name: 'Room 101' });
  const cA102 = await Classroom.create({ roomCode: 'A102', building: blockA._id, floor: aF1._id, name: 'Room 102' });
  const cA204 = await Classroom.create({ roomCode: 'A204', building: blockA._id, floor: aF2._id, name: 'Computer Networks Lab' });
  const cA201 = await Classroom.create({ roomCode: 'A201', building: blockA._id, floor: aF2._id, name: 'Room 201' });
  const cA305 = await Classroom.create({ roomCode: 'A305', building: blockA._id, floor: aF3._id, name: 'Seminar Hall A' });
  const cB105 = await Classroom.create({ roomCode: 'B105', building: blockB._id, floor: bF1._id, name: 'Electronics Lab' });

  console.log('=== Creating indoor zones (BLE/Wi-Fi mappings) ===');

  await IndoorZone.create([
    {
      zoneId: 'ZONE_A101',
      building: blockA._id,
      floor: aF1._id,
      room: cA101._id,
      beaconId: 'BEACON_A1',
      wifiSsid: 'COL-WIFI-A1',
      description: 'Block A - Floor 1 - Room 101',
    },
    {
      zoneId: 'ZONE_A204',
      building: blockA._id,
      floor: aF2._id,
      room: cA204._id,
      beaconId: 'BEACON_A2',
      wifiSsid: 'COL-WIFI-A2',
      description: 'Block A - Floor 2 - Room 204',
    },
    {
      zoneId: 'ZONE_A305',
      building: blockA._id,
      floor: aF3._id,
      room: cA305._id,
      beaconId: 'BEACON_A3',
      wifiSsid: 'COL-WIFI-A3',
      description: 'Block A - Floor 3 - Room 305',
    },
    {
      zoneId: 'ZONE_B105',
      building: blockB._id,
      floor: bF1._id,
      room: cB105._id,
      beaconId: 'BEACON_B1',
      wifiSsid: 'COL-WIFI-B1',
      description: 'Block B - Floor 1 - Room 105',
    },
  ]);

  console.log('=== Creating subjects ===');

  const subjects = await Subject.create([
    { subjectCode: 'CS101', name: 'Computer Networks', department: 'CSE', year: '3rd Year', credits: 4 },
    { subjectCode: 'CS102', name: 'Operating Systems', department: 'CSE', year: '3rd Year', credits: 4 },
    { subjectCode: 'CS103', name: 'DBMS', department: 'CSE', year: '3rd Year', credits: 4 },
    { subjectCode: 'EC101', name: 'Digital Electronics', department: 'ECE', year: '3rd Year', credits: 3 },
  ]);

  console.log('=== Creating timetable ===');

  await Timetable.create([
    {
      department: 'CSE', year: '3rd Year', section: 'A',
      subject: subjects[0]._id, teacher: teacher1._id,
      day: 'Monday', startTime: '10:00', endTime: '11:00',
      building: blockA._id, floor: aF2._id, room: cA204._id,
    },
    {
      department: 'CSE', year: '3rd Year', section: 'A',
      subject: subjects[1]._id, teacher: teacher1._id,
      day: 'Monday', startTime: '11:15', endTime: '12:15',
      building: blockA._id, floor: aF1._id, room: cA101._id,
    },
    {
      department: 'CSE', year: '3rd Year', section: 'A',
      subject: subjects[2]._id, teacher: teacher1._id,
      day: 'Tuesday', startTime: '10:00', endTime: '11:00',
      building: blockA._id, floor: aF3._id, room: cA305._id,
    },
    {
      department: 'CSE', year: '3rd Year', section: 'A',
      subject: subjects[0]._id, teacher: teacher1._id,
      day: 'Wednesday', startTime: '14:00', endTime: '15:00',
      building: blockA._id, floor: aF2._id, room: cA204._id,
    },
    {
      department: 'CSE', year: '3rd Year', section: 'A',
      subject: subjects[1]._id, teacher: teacher1._id,
      day: 'Thursday', startTime: '09:00', endTime: '10:00',
      building: blockA._id, floor: aF2._id, room: cA201._id,
    },
    {
      department: 'ECE', year: '3rd Year', section: 'A',
      subject: subjects[3]._id, teacher: teacher2._id,
      day: 'Monday', startTime: '10:00', endTime: '11:00',
      building: blockB._id, floor: bF1._id, room: cB105._id,
    },
  ]);

  // College GPS - example values (Visakhapatnam campus area)
  const settings = await SystemSetting.create({
    collegeLat: 17.686815,
    collegeLng: 83.218482,
    geofenceRadius: 150,
    rejectOutsideGeoFence: true,
    rejectWrongLocation: true,
    demoIndoorMode: false,
    updatedBy: admin._id,
  });

  console.log('=== Writing startup log ===');

  await SystemLog.create({
    level: 'info',
    action: 'SEED_COMPLETED',
    message: 'Demo data seeded successfully',
    userId: admin._id,
    targetType: 'System',
    meta: { settings: settings._id },
  });

  console.log('\n============================================');
  console.log('DEMO DATA READY');
  console.log('============================================');
  console.log('ADMIN   -> admin@college.edu / demo123');
  console.log('TEACHER -> teacher@college.edu / demo123   (Dr. Rajesh, TCH001)');
  console.log('         meena@college.edu / demo123       (Prof. Meena, TCH002)');
  console.log('STUDENT -> lakshmi@college.edu / demo123   (STU001, CSE 3-A)');
  console.log('         stu2@college.edu / demo123        (STU002, CSE 3-A)');
  console.log('         stu3@college.edu / demo123        (STU003, ECE 3-A)');
  console.log('         stu4@college.edu / demo123        (STU004, CSE 3-A)');
  console.log('============================================');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});