# User Manual

## 1. Starting the project

1. Open a terminal in the project folder.
2. Start MongoDB (Windows service "MongoDB" if installed locally).
3. `cd backend`
4. `npm install`
5. Ensure `backend/.env` has your `MONGO_URI` and `JWT_SECRET` (see `README.md`).
6. (Optional, resets demo data) `npm run seed`
7. Start: `npm start` (or `npm run dev` for auto-restart).
8. Open **http://localhost:5000** in your browser.

Demo logins (password `demo123`):

| Role | Email | Notes |
|------|-------|-------|
| Admin | admin@college.edu | full control |
| Teacher | teacher@college.edu | Dr. Rajesh (TCH001) |
| Teacher | meena@college.edu | Prof. Meena (TCH002) |
| Student | lakshmi@college.edu | STU001 (CSE 3-A) |
| Student | stu2@college.edu | STU002 (CSE 3-A) |
| Student | stu3@college.edu | STU003 (ECE 3-A) |
| Student | stu4@college.edu | STU004 (CSE 3-A) |

---

## 2. Student guide

### 2.1 Mark attendance (main task)
1. Log in → **Mark Attendance**.
2. Choose the open session (e.g. `LIVE1`).
3. Complete the evidence steps (order doesn't matter):
   - **QR** — click "Start QR camera", scan the QR shown on your dashboard's
     *My QR Code*, or paste the token manually.
   - **Face** — "Start camera", look straight at the camera, wait for the green box,
     click "Capture my face".
   - **GPS** — click "Detect my GPS location" (allow location permission).
   - **Indoor** — turn on the room's Bluetooth and enter the Beacon ID, *or* the Wi-Fi
     SSID you are connected to. If the admin enabled demo mode, a clearly-labelled
     *Demo zone* dropdown is available for simulation only.
4. Click **Record my attendance**.
5. Result: **PRESENT** (all checks OK) or **REJECTED** with the exact reason
   (e.g. wrong room), shown in the result table.

> Camera permission must be allowed once. Face data is always a numeric embedding —
> no photo is stored. If there is no class scheduled for your section at that time, the
> timetable check fails and attendance is rejected.

### 2.2 Other student pages
- **My QR Code** — your private QR image (also in *My QR Code* on the dashboard).
- **QR Scanner** — practice scanning any student QR or verify a token (does not mark attendance).
- **Register Face** — one-time face enrolment.
- **Verify Face** — try a live match and see the distance.
- **Location Check** — GPS campus check + indoor building/floor/room demo.
- **Timetable** — your weekly schedule.
- **Attendance History** — your records with per-check ticks.

---

## 3. Teacher guide

1. Log in → dashboard shows today's classes, weekly schedule, student roster.
2. **Attendance Sessions**:
   - *+ Open a new attendance session*: subject, classroom, date, start/end. A code is
     generated. Students must check in **only between start and end**.
   - Share the code (e.g. `LIVE1`) with students.
   - Each session row lists *marked/total*; **View records** shows who is PRESENT and
     REJECTED (with reasons).
3. **Reports** — filter by date/department/year/section/subject, Generate, Export CSV.

---

## 4. Admin guide

1. Log in → **Admin Dashboard** with tabs:
   - **Students / Teachers** — add, edit, deactivate.
   - **Buildings / Floors / Classrooms** — master data.
   - **Indoor Zones** — map a zone id + beacon id + Wi-Fi SSID to a building/floor/room.
   - **Subjects / Timetable** — schedule classes.
   - **Reports** — global reports + CSV.
   - **System Settings** — college latitude/longitude, geofence radius, toggles for
     "reject outside geofence", "reject wrong location", and **demo indoor mode**.
   - **Logs** — full audit trail.
2. Common setup order: Buildings → Floors → Classrooms → Indoor Zones → Subjects →
   Timetable → set GPS in Settings → open an Attendance Session → done.

---

## 5. Demo indoor mode (where to see it)

- Admin enables **demoIndoorMode** in System Settings.
- Students then see a *Demo zone* dropdown on **Location Check** and **Mark Attendance**.
- Every demo result displays the banner:
  **"DEMO - selection is NOT real positioning"** and the stored record has
  `demoIndoor = true`. A real deployment replaces this with actual beacons/Wi-Fi.

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Could not reach the server" | Start the backend (`npm start`) |
| Page redirects to login | New/expired session — log in again |
| Camera permission blocked | Allow camera in site settings; on `file://` open the pages from http://localhost:5000 |
| Face says "no template" | Register Face first |
| GPS error / denied | Use an https/localhost page; allow location; try outdoors |
| Indoor "no zone matches" | Enter the exact seeded value, e.g. `BEACON_A2` or `COL-WIFI-A2` |
| Port 5000 busy | Change `PORT` in `.env` and reopen |
| Demo data changed | Re-run `npm run seed` (restarts data)