# System Architecture

The project uses a **three-tier web architecture**: presentation (browser),
application (API server), and data (MongoDB).

```
                     BROWSER (Presentation tier)
   ┌──────────────────────────────────────────────────────┐
   │  Landing / Login / Register  →  Dashboards            │
   │  Student: Mark Attendance, QR Scanner, Face Register, │
   │           Face Verify, Location Check, Timetable,     │
   │           Attendance History                          │
   │  Teacher: Dashboard, Attendance Sessions, Reports,    │
   │           Timetable                                   │
   │  Admin:   Dashboard, Students, Teachers, Buildings,   │
   │           Floors, Classrooms, Zones, Subjects,        │
   │           Timetable, Reports, Settings, Logs          │
   │  Shared:  api.js (fetch + JWT), main.js, style.css    │
   │  Camera libs: jsQR, face-api.js (loaded locally)      │
   └──────────────┬────────────────────────────────────────┘
                  │ HTTP (same origin, JWT in Authorization header)
┌─────────────────▼─────────────────────────────────────────┐
│            APPLICATION TIER (Node.js + Express)           │
│                                                           │
│  Middleware: rate limit → CORS → logger → JWT protect →   │
│              role authorize → express-validator           │
│                                                           │
│  Routes / Controllers:                                    │
│    /api/auth       register, login, logout, me, demos     │
│    /api/buildings /floors /classrooms /zones /subjects    │
│    /api/timetable  CRUD + today                           │
│    /api/students /teachers /settings /logs                │
│    /api/qr         generate, verify                       │
│    /api/face       register, verify, status               │
│    /api/location   config, gps, indoor                    │
│    /api/attendance sessions, checkin, records, summary    │
│    /api/reports    attendance report + filters            │
│                                                           │
│  Services: logService writes SystemLog entries            │
│  Utils: qrToken, haversine, faceSimilarity               │
│  Static: /frontend, /vendor/jsqr, /vendor/face-api,       │
│          /models/face-api (weights, offline)              │
└──────────────────────────┬────────────────────────────────┘
                           │ MongoDB driver (Mongoose ODM)
┌──────────────────────────▼────────────────────────────────┐
│            DATA TIER (MongoDB - smart_attendance)         │
│  User, FaceTemplate, Building, Floor, Classroom,          │
│  IndoorZone, Subject, Timetable, AttendanceSession,       │
│  AttendanceRecord, SystemSetting, SystemLog               │
└────────────────────────────────────────────────────────────┘
```

## Key flows

### 1. Check-in pipeline (student marks attendance)
1. Pick an **open attendance session** (code, e.g. `LIVE1`).
2. Provide the **QR token** (scanned via jsQR or pasted).
3. **Capture face** → `face-api.js` computes a 128-dimension embedding in the browser.
4. **GPS** coordinates obtained from the device.
5. **Indoor** identifier (beacon / Wi-Fi / demo zone).
6. `POST /api/attendance/checkin` runs, server-side, in this order:
   Session open → **QR** identifies student → **Face** distance ≤ 0.55 →
   **GPS** Haversine ≤ geofence radius → **Indoor** zone → **Timetable** expected room
   equals actual room → decides `PRESENT` or `REJECTED` (reason stored).

### 2. Session lifecycle (teacher / admin)
Create session (subject, classroom, date, time window) → students must check in within
the window → teacher/admin views who is PRESENT / REJECTED per session.

## Security design

- Passwords hashed with **bcrypt**; sessions use **JWT** with role-based middleware.
- All inputs validated with **express-validator**; **rate limiting** on auth routes.
- `.env` holds secrets (`MONGO_URI`, `JWT_SECRET`); never served to the browser.
- Frontend only ever sends: QR token, face embedding, and one-time location samples.

## Privacy design

- **Face:** only the 128-number embedding is stored (`FaceTemplate`). Photos are never
  uploaded or stored.
- **Location:** GPS/indoor is used only at check-in for verification; there is no
  continuous tracking endpoint. No API returns one student's location to another.
- **Demo indoor mode** is opt-in (admin setting) and every demo result is labelled
  "DEMO - not real positioning".