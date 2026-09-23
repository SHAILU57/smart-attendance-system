# Smart Attendance System
### QR Code + Face Recognition + GPS Geofencing + Indoor Location

A complete full-stack college project that verifies **who** a student is (QR + Face), **where** they are (GPS campus geofence + indoor building/floor/room zone), and **whether** they are in the correct scheduled class (timetable) before marking attendance.

---

## Project Structure

```
SmartAttendance/
├── backend/                 # Node.js + Express + MongoDB API
│   ├── server.js            # Entry point (mounts API + serves frontend/vendors)
│   ├── .env                 # Your configuration (DO NOT commit)
│   ├── .env.example         # Template for .env
│   ├── package.json
│   ├── config/db.js         # MongoDB connection
│   ├── controllers/         # Route handlers / business logic
│   ├── middleware/          # Auth, validation, error handling
│   ├── models/              # Mongoose schemas (incl. FaceTemplate)
│   ├── routes/              # Express routers (incl. face, location, qr)
│   ├── services/            # QR, face, location services
│   ├── public/models/       # face-api.js model weights (offline ready)
│   └── utils/               # QR token generator, Haversine, face similarity
├── frontend/                # HTML / CSS / JavaScript UI
│   ├── index.html           # Landing page
│   ├── login.html
│   ├── register.html
│   ├── qr-scanner.html      # Camera QR scanning (jsQR)
│   ├── face-register.html   # Capture + store face embedding
│   ├── face-verify.html     # Verify live face vs template
│   ├── location-check.html  # GPS geofence + indoor location checks
│   ├── student-dashboard.html / teacher-dashboard.html / admin-dashboard.html
│   ├── timetable.html / attendance-history.html / reports.html
│   ├── css/style.css
│   └── js/ (api.js, auth.js, main.js, student.js, teacher.js, admin.js,
│            timetable.js, history.js, reports.js, student-nav.js,
│            qr-scanner.js, face-camera.js, face-register.js,
│            face-verify.js, location-check.js)
└── README.md
```

---

## 1. Prerequisites

| Software  | Required | Where to get it |
|-----------|----------|-----------------|
| Node.js   | v18+     | https://nodejs.org |
| MongoDB   | v6+ (local) OR a free MongoDB Atlas cloud cluster | https://www.mongodb.com/try/download/community or https://www.mongodb.com/atlas |

Check your installed versions with:

```
node --version
npm --version
```

MongoDB (local install) should be running as a Windows service called **MongoDB**.  
If you do not want to install MongoDB locally, create a **free Atlas cluster** and copy its connection string into `MONGO_URI`.

---

## 2. Install backend dependencies

Open a terminal in the **SmartAttendance** folder, then:

```
cd backend
npm install
```

> Note: `cd backend` — because that is where `package.json` lives.

---

## 3. Configure environment

1. Open `backend/.env`.
2. Set `MONGO_URI`:
   - **Local MongoDB:** keep the default `mongodb://127.0.0.1:27017/smart_attendance`
   - **MongoDB Atlas:** replace with your own `mongodb+srv://USER:PASSWORD@cluster.../smart_attendance`
3. Change `JWT_SECRET` to a long random string (never share it).
4. Leave `PORT=5000`.

---

## 4. Run the server

```
npm run dev        # auto-restarts on code changes (uses nodemon)
```

or

```
npm start          # plain start
```

Expected output:

```
MongoDB connected: 127.0.0.1
Database name: smart_attendance
==============================================
  SMART ATTENDANCE SYSTEM - STAGE 1
  Server running on: http://localhost:5000
==============================================
```

Open http://localhost:5000 in your browser — you should see the landing page.

---

## 5. Test the Stage 1 features

| Test | How | Expected |
|------|-----|----------|
| Landing page | http://localhost:5000 | Beautiful landing page with features |
| API health | http://localhost:5000/api/health | JSON `{ success: true, ... }` |
| Register | Open **Register**, fill the form | Account created, redirected to dashboard |
| Duplicate student ID | Register `STU001` twice | Clean error: "Student ID is already registered" |
| Duplicate email | Register with same email twice | Clean error: "Email is already registered" |
| Weak password | Try `123` as password | Field highlighted, form not submitted |
| Login | Open **Login**, use the registered email | Redirected to student dashboard (Stage 2) |

You can also test the API directly with **Postman** or **curl**:

```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "studentId": "STU999",
  "name": "Test Student",
  "email": "test@college.edu",
  "phone": "9876543210",
  "department": "CSE",
  "year": "3rd Year",
  "section": "A",
  "password": "pass123"
}
```

---

## 6. Common errors & fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `The uri parameter to openUri() must be a string, got undefined` | `MONGO_URI` missing | Fill `backend/.env` (copy from `.env.example`) |
| `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB not running | Start the **MongoDB** Windows service, or use an Atlas URI |
| `Cannot find module 'express'` | Dependencies not installed | Run `npm install` in the `backend` folder |
| `EADDRINUSE: port 5000` | Port already used | Change `PORT` in `.env` (e.g. `5001`) |

---

## What's in Stage 1

- Working Express server serving the frontend
- MongoDB connection with friendly error messages
- **User model** (role: student / teacher / admin), bcrypt password hashing
- **JWT** register/login/logout with role middleware
- Server-side validation (express-validator) + duplicate prevention
- Rate limiting, CORS, central error handler, request logger
- Professional responsive landing page, login and register pages
- Student QR token generator (used by the QR system in Stage 3)

## What's in Stage 2

- Models: Building, Floor, Classroom, IndoorZone, Subject, Timetable, SystemSetting, SystemLog
- CRUD APIs + admin dashboard (`admin-dashboard.html`) with 11 tabs
- Teacher & student dashboards, my QR code, timetable page, attendance history, reports + CSV export
- `seed.js` demo data (run with `npm run seed`)

## What's in Stage 3 (verification checks)

- **QR scanning** — `qr-scanner.html` scans a QR with the camera (jsQR) or a manual token entry, then `POST /api/qr/verify` identifies the student. In Stage 4 this feeds the attendance pipeline.
- **Face registration & verification** — `face-register.html` and `face-verify.html`. Only the numeric 128-dimension **embedding** is stored in the `FaceTemplate` model (no photos). Comparison uses Euclidean distance server-side (threshold ~0.55). This is recognition (embedding comparison), not mere detection.
- **GPS campus check** — `location-check.html` uses your device GPS and the server computes distance (Haversine) to the college center vs the geofence radius. GPS verifies the **campus area only**, never an exact building/floor/room.
- **Indoor location** — `location-check.html` matches a Beacon ID / Wi-Fi SSID / Zone ID against configured zones to determine **building / floor / room**. Real mode uses the authorized identifier or Web Bluetooth (experimental); **demo mode** (enabled by the admin) is always visually flagged as *"DEMO ONLY - not real positioning"*.
- Vendors `jsqr` + `face-api.js` and model weights are served locally (offline-capable).

### Stage 3 test table

| Test | How | Expected |
|------|-----|----------|
| Face register | Student dashboard → **Register Face** → camera → capture | Success message, 128-dim template stored, `faceRegistered` true |
| Face verify (same person) | **Verify Face** with the same face | Distance ~0.05–0.5 → **match** |
| Face verify (different/unknown) | Login as another student and verify | Distance > threshold → **no match** |
| Wrong-length descriptor | `curl` POST a 3-number descriptor | 400 "Expected a 128-dimension face descriptor" |
| QR verify | Scan your QR from the student dashboard | Student identified (name, ID, dept) |
| Invalid QR | Scan/edit a fake token | "Invalid QR code" rejected |
| GPS inside | Location Check where the campus is | "INSIDE campus geofence" + distance in meters |
| GPS outside | Run the check far from campus | "OUTSIDE campus geofence" |
| Indoor match | Location Check → enter `BEACON_A2` | Building/Floor/Room A204 matched, real mode |
| Indoor unknown | Enter `BEACON_XYZ` | No zone matches (rejected) |
| Demo mode | Admin sets demoIndoorMode ON, pick a zone | Result flagged "DEMO - NOT real positioning" |

### Stage 3 demo/sample data

Seeded zones (`npm run seed`): `ZONE_A204` (Block A / Floor 2 / room **A204**, beacon `BEACON_A2`, Wi-Fi `COL-WIFI-A2`), plus others — see the seed file.

## Coming in the next stages

- **Stage 4:** Attendance sessions, the full verification pipeline (QR → Face → GPS → Indoor → Timetable), marking + history + percentages, teacher reports
- **Stage 5:** Reports + CSV export, system settings, logs, final documentation (abstract, architecture, test cases, user manual)