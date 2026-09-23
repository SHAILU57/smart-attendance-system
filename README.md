# Smart Attendance System
### QR Code + Face Recognition + GPS Geofencing + Indoor Location

A complete full-stack college project that verifies **who** a student is (QR + Face), **where** they are (GPS campus geofence + indoor building/floor/room zone), and **whether** they are in the correct scheduled class (timetable) before marking attendance.

---

## Project Structure

```
SmartAttendance/
├── backend/                 # Node.js + Express + MongoDB API
│   ├── server.js            # Entry point
│   ├── .env                 # Your configuration (DO NOT commit)
│   ├── .env.example         # Template for .env
│   ├── package.json
│   ├── config/db.js         # MongoDB connection
│   ├── controllers/         # Route handlers / business logic
│   ├── middleware/          # Auth, validation, error handling
│   ├── models/              # Mongoose schemas
│   ├── routes/              # Express routers
│   ├── services/            # QR, face, location services (later stages)
│   └── utils/               # Helpers (QR token generator)
├── frontend/                # HTML / CSS / JavaScript UI
│   ├── index.html           # Landing page
│   ├── login.html
│   ├── register.html
│   ├── css/style.css
│   └── js/ (api.js, auth.js, main.js)
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

## Coming in the next stages

- **Stage 2:** Full dashboards (student / teacher / admin), buildings, floors, classrooms, indoor zones, timetables, seed sample data
- **Stage 3:** QR generation & scanning, face registration & verification, GPS geofencing, indoor location (real + demo mode)
- **Stage 4:** Attendance sessions, the full verification pipeline, marking + history + percentages, teacher reports
- **Stage 5:** Reports + CSV export, system settings, logs, final documentation (abstract, architecture, test cases, user manual)