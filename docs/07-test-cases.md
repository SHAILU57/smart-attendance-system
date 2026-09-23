# Test Cases

Test setup: seed demo data (`cd backend && npm run seed`), server on `http://localhost:5000`.
Demo accounts: `admin@college.edu`, `teacher@college.edu`, `meena@college.edu`,
`lakshmi@college.edu`, `stu2@college.edu`, `stu3@college.edu`, `stu4@college.edu` — password `demo123`.
Open sessions: **LIVE1** (CSE, A204), **LIVE2** (ECE, B105).

## A. Authentication & authorisation

| # | Test | Steps | Expected |
|---|------|-------|----------|
| A1 | Valid login | Login any demo account | Redirected to role dashboard |
| A2 | Invalid password | Login with wrong password | 401 "Invalid credentials" |
| A3 | Duplicate email | Register twice with same email | "Email is already registered" |
| A4 | Duplicate studentId | Register same studentId twice | "Student ID is already registered" |
| A5 | Weak password | Try password `123` | Validation error, not submitted |
| A6 | Student vs teacher API | Student token calls `/api/teachers` | 403 Forbidden |
| A7 | Expired/invalid token | Call `/api/auth/me` with garbage token | 401, token cleared |-
| A8 | Protected page w/o login | Open `student-dashboard.html` logged out | Redirect to `login.html` |

## B. Face registration & verification

| # | Test | Steps | Expected |
|---|------|-------|----------|
| B1 | Register face | Student dashboard → Register Face → capture | Embedding (128 dims) saved; `faceRegistered=true`; no photo stored |
| B2 | Same person verify | Verify Face page with same face | Distance ≈ 0.0–0.5 → match |
| B3 | Different person verify | Verify while a different person is at the camera | Distance > 0.55 → no match |
| B4 | Wrong descriptor length | API: `descriptor:[1,2,3]` | 400 "Expected a 128-dimension face descriptor" |
| B5 | Verify without template | Fresh student (no face) verifies | "has not registered a face yet" |
| B6 | Student verifies another | API with `studentId` of another student | 403 self-only |

## C. QR

| # | Test | Steps | Expected |
|---|------|-------|----------|
| C1 | Scan my QR | QR Scanner page → camera | Student identified (name, ID, dept) |
| C2 | Manual token | Paste token from My QR Code | Same identification |
| C3 | Invalid token | Paste a fake token | "Invalid QR code" rejected |
| C4 | Tampered payload | Modify the JSON QR content | Rejected (token lookup fails) |

## D. Location

| # | Test | Steps | Expected |
|---|------|-------|----------|
| D1 | GPS inside | Location Check (on campus coords) | "INSIDE campus geofence" + distance m |
| D2 | GPS outside | Run from a remote location | "OUTSIDE campus geofence" |
| D3 | Indoor real | Enter `BEACON_A2` | Matched Block A / Floor 2 / A204 (real) |
| D4 | Indoor unknown | Enter `BEACON_XYZ` | "no zone matches" |
| D5 | Indoor demo | Admin enables demo mode; pick a zone | Result flagged "DEMO - not real positioning" |

## E. Attendance pipeline (the heart of the system)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| E1 | Happy path | LIVE1 + QR + face + GPS(campus) + indoor `ZONE_A204` | **PRESENT**; all five checks OK |
| E2 | Wrong room | Same but indoor `ZONE_B105` | **REJECTED**: "wrong classroom: timetable expects A204, you are in B105" |
| E3 | Outside geofence | Same but GPS far away | **REJECTED**: "gps: outside campus geofence" |
| E4 | Face mismatch | Same but a different face descriptor | **REJECTED**: "face: no match" |
| E5 | No face registered | Student without template joins session | **REJECTED**: register face first |
| E6 | Wrong subject session | CSE student uses ECE session LIVE2 | **REJECTED**: timetable mismatch |
| E7 | Closed / off-window session | Try a session outside its time | "session is not open now" |
| E8 | Duplicate | Check in twice for the same session | Second attempt: "already recorded: PRESENT" |
| E9 | Demo indoor via checkin | Use demo zone in checkin | PRESENT possible but record flagged `demoIndoor=true` |

## F. History, summary & reports

| # | Test | Steps | Expected |
|---|------|-------|----------|
| F1 | My history | Student → Attendance History | Own records, status badges, verification ticks |
| F2 | Percentages | Student dashboard | Overall % + per-subject % |
| F3 | Report (admin) | Reports → Generate | All records; filters respected |
| F4 | Report (teacher) | Same page as teacher | Only records of the teacher's sessions |
| F5 | Filter by dept | Reports, filter `CSE` | Only CSE students |
| F6 | CSV export | Export CSV | File downloads with the matching rows |

## G. Admin configuration

| # | Test | Steps | Expected |
|---|------|-------|----------|
| G1 | Geofence change | Settings: radius 150 → 500 | GPS check uses new radius (re-verify) |
| G2 | Demo mode toggle | Enable `demoIndoorMode` | Demo zones appear in Location/Attendance pages |
| G3 | Deactivate student | Toggle student inactive | Their check-in → "account is deactivated" |
| G4 | Logs | Admin → Logs | Recent actions listed with actor + detail |
| G5 | Invalid room session | Create session end ≤ start | "End time must be after start" |

## H. Security & robustness

| # | Test | Steps | Expected |
|---|------|-------|----------|
| H1 | XSS in names | Set a student name containing `<script>` | Rendered escaped (no execution) |
| H2 | Rate limit | Many rapid login failures | 429 after threshold |
| H3 | Malformed JSON body | POST malformed JSON | 400 handled centrally, no crash |
| H4 | Unknown API route | GET `/api/nope` | JSON 404, not HTML crash |