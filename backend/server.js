const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load env vars FIRST, before anything uses them
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// ---- Routes ----
const authRoutes = require('./routes/auth');
const buildingRoutes = require('./routes/buildings');
const floorRoutes = require('./routes/floors');
const classroomRoutes = require('./routes/classrooms');
const zoneRoutes = require('./routes/zones');
const subjectRoutes = require('./routes/subjects');
const timetableRoutes = require('./routes/timetable');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const settingsRoutes = require('./routes/settings');
const qrRoutes = require('./routes/qr');
const logRoutes = require('./routes/logs');

// ---- Connect database (exits the process if it fails) ----
connectDB();

const app = express();

// ---- CORS: allow the frontend origin ----
const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5000')
  .split(',')
  .map((s) => s.trim());
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);

// ---- Body parsing ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Simple request logger ----
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`
    );
  });
  next();
});

// ---- Rate limiting: protect auth endpoints from brute force ----
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again in 15 minutes.',
  },
});
app.use('/api/auth', authLimiter);

// ---- API routes ----
app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/floors', floorRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/logs', logRoutes);

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Attendance API is running',
    time: new Date().toISOString(),
  });
});

// ---- Serve frontend static files (in production / local dev) ----
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// ---- 404 + error handler ----
app.use(notFound);
app.use(errorHandler);

// ---- Start server ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('==============================================');
  console.log('  SMART ATTENDANCE SYSTEM - STAGE 2');
  console.log('  Server running on: http://localhost:' + PORT);
  console.log('  Landing page:     http://localhost:' + PORT + '/');
  console.log('  API health:       http://localhost:' + PORT + '/api/health');
  console.log('==============================================');
});

module.exports = app;