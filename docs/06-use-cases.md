# Use-Case Descriptions

Actors: **Student**, **Teacher**, **Admin** (all must log in first).

| UC | Actor(s) | Title | Main flow | Success | Alternative / exception |
|----|----------|-------|-----------|---------|------------------------|
| UC-01 | All | Register / Login | Enter email + password (± student details at register) | JWT session created, redirected to role dashboard | Weak password or duplicate email/studentId rejected; rate limit after too many attempts |
| UC-02 | Student | View my QR | Dashboard → "My QR Code" | QR image drawn from the private token | Token missing → message to contact admin |
| UC-03 | Teacher/Admin | Open attendance session | Pick subject, classroom, date, time window | Session created with a code; students can check in during the window | End time not after start → error |
| UC-04 | Student | Mark attendance | Pick open session; provide QR + face + GPS + indoor evidence; submit | `PRESENT` if every check passes | Any failed check → `REJECTED` with stored reason; session closed → rejected; duplicate attempt → "already recorded" |
| UC-05 | Teacher/Admin | View session records | Open a session → "View records" | PRESENT/REJECTED list with reasons | No check-ins yet → empty message |
| UC-06 | Student | Check location | Location Check page → GPS / indoor buttons | Shows campus geofence result and/or building/floor/room | GPS denied/unsupported → clear message; unknown identifier → rejected |
| UC-07 | Student | Register face | Camera capture → embedding saved | Template (embedding only) stored; `faceRegistered=true` | Camera denied → guidance shown; <128 dims → 400 |
| UC-08 | Student | Verify face | Live capture → server distance compare | Match/non-match with distance shown | No template → "register first" |
| UC-09 | Student | View my attendance | History page / dashboard % | Own records + per-subject percentage | No records → clean empty state |
| UC-10 | Student | View timetable | Timetable page shows own schedule | Monday–Sunday sorted list | — |
| UC-11 | Teacher/Admin | Reports + CSV | Filter (date, dept, year, section, subject) → Generate → Export CSV | Aggregated records; teacher sees only own sessions; CSV downloads | No matching data → empty table |
| UC-12 | Admin | Manage master data | Students, Teachers, Buildings, Floors, Classrooms, Indoor Zones, Subjects, Timetable | CRUD persisted and logged | Validation errors highlighted |
| UC-13 | Admin | Configure settings | Settings tab: college GPS, geofence radius, reject-outside/wrong-location toggles, demo indoor mode | Singleton settings updated | GPS not configured → location page warns |
| UC-14 | Admin | View audit log | Logs tab (level/action filters) | History of system events | — |
| UC-15 | Admin | Dean/QR for students | Toggle student active state | Students marked inactive cannot check in | — |

## Cross-cutting rules (all use cases)

- Students may only read/write **their own** face, QR, records and location evidence.
- Teachers act on **their own** sessions/timetable entries; admins on everything.
- A student can never view another student's location or attendance details.
- Every sensitive mutation writes an entry to the **SystemLog**.