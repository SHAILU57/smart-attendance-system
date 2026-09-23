# Data Flow Diagrams (DFD)

## Level 0 (Context diagram)

```
        Student                Teacher                 Admin
           │                     │                      │
           │ register / login /  │ login / manage       │ login / manage
           │ mark attendance     │ sessions / reports   │ students, buildings,
           │ check own QR, face, │                      │ zones, timetable,
           │ location, history   │                      │ settings, logs, reports
           ▼                     ▼                      ▼
       ┌───────────────────────────────────────────────────────┐
       │              SMART ATTENDANCE SYSTEM                  │
       │        (Web app: browser + API + MongoDB)             │
       └──────┬──────────────────────────────┬─────────────────┘
              │  (device GPS / camera /       │  (indoor identifier:
              │   BLE / Wi-Fi evidence)        │     beacon / wifi / demo)
              ▼                              ▼
        Geographic signal              Zone knowledge
```

## Level 1

```
          ┌────────────────────────────┐
          │            AUTH            │  User DB
          │ register, login, logout    │──────────▶
          └──────────────┬─────────────┘  create JWT, hash pwd
                         │ JWT token in browser (Authorization header)
        ┌────────────────▼────────────────┐
        │  1. IDENTITY VERIFICATION       │
        │  ├ QR: token → student record   │
        │  └ Face: embedding distance     │  FaceTemplate DB
        └────────────────┬────────────────┘
        ┌────────────────▼────────────────┐
        │  2. LOCATION VERIFICATION       │  Settings DB (geofence)
        │  ├ GPS: Haversine vs campus     │  IndoorZone DB
        │  └ Indoor: beacon/wifi/zone     │
        └────────────────┬────────────────┘
        ┌────────────────▼────────────────┐
        │  3. TIMETABLE VERIFICATION      │  Timetable DB
        │  expected room == actual room   │
        └────────────────┬────────────────┘
        ┌────────────────▼────────────────┐
        │  4. RECORD ATTENDANCE           │  AttendanceRecord DB
        │  PRESENT / REJECTED (+ reason)  │  AttendanceSession DB
        └────────────────┬────────────────┘
                         │ summary per student/subject
        ┌────────────────▼────────────────┐
        │  5. REPORTS / LOGS              │  SystemLog DB
        │  filterable report + CSV        │
        └─────────────────────────────────┘

   Read/inform flows (no write):
   - Student: own timetable, own QR, own records, own summary, face status
   - Teacher: roster, own sessions + records, reports of own sessions
   - Admin:  all CRUD (buildings, floors, classrooms, zones, subjects,
             timetable, students, teachers), settings, logs, reports
```

## Key decisions stored in records

- Each **AttendanceRecord** keeps the outcome of every verification step as boolean
  flags (`qrVerified`, `faceVerified`, `gpsVerified`, `indoorVerified`,
  `timetableVerified`), the measured values (`faceDistance`, `gpsDistanceMeters`), the
  **actual room** (from indoor) versus the **expected room** (from timetable), and the
  **rejection reason**. This makes every decision auditable.