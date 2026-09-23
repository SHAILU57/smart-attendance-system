# Entity-Relationship Diagram (description)

```
                       ┌──────────────┐
                       │    User      │
                       ├──────────────┤  role: student | teacher | admin
                       │ email (uniq) │  studentId / teacherId (unique)
                       │ passwordHash │  qrToken (student, unique)
                       │ department   │  faceRegistered: bool
                       │ year, section│
                       └──────┬───────┘
                              │
           1 ─────────── 0/1  │  "has one face template"
                              ▼
                       ┌──────────────┐
                       │ FaceTemplate │  user (uniq), descriptor[128],
                       └──────────────┘  detectionScore

Building 1 ──< Floor N     Floor 1 ──< Classroom N
Building 1 ──< Classroom N (building field)
Building 1 ──< IndoorZone N
Floor    1 ──< IndoorZone N
Classroom1 ──< IndoorZone N     IndoorZone: zoneId, beaconId, wifiSsid

Subject 1 ──< Timetable N ──> 1 User (teacher)
Building 1 ──< Timetable N      Timetable: dept, year, section, day,
Floor    1 ──< Timetable N      startTime, endTime, building, floor, room
Classroom1 ──< Timetable N

Subject 1 ──< AttendanceSession N
User(teacher)1 ──< AttendanceSession N
Building/Floor/Classroom ──< AttendanceSession N
AttendanceSession 1 ──< AttendanceRecord N ──> 1 User (student)
AttendanceRecord: status, qr/face/gps/indoor/timetable flags,
                  faceDistance, gpsDistance, room, expectedRoom, reason,
                  demoIndoor flag  (UNIQUE: session + student)

SystemSetting  (singleton): collegeLat, collegeLng, geofenceRadius,
                            rejectOutsideGeoFence, rejectWrongLocation,
                            demoIndoorMode
SystemLog: level, action, message, userId, targetType, targetId, meta
```

## Relationships in words

- A **User** (student) has **zero or one** FaceTemplate.
- A **Building** contains many **Floors** (1:*) and many **Classrooms** (1:*).
- A **Floor** contains many **Classrooms** (1:*).
- An **IndoorZone** links exactly one **Building**, one **Floor** and one **Classroom**
  to a physical identifier (beacon id / Wi-Fi SSID / zone id).
- A **Subject** appears in many **Timetable** entries; each entry has exactly one
  **teacher** (User), **Building**, **Floor** and **Classroom**.
- An **AttendanceSession** references one Subject, one teacher, and its expected
  location (Building / Floor / Classroom), plus an open time window.
- An **AttendanceSession** has many **AttendanceRecord** rows; each row belongs to one
  **student** (User). The pair (session, student) is unique — a student cannot check in
  twice for the same session.
- **SystemSetting** is a singleton document holding the campus geofence and policy flags.
- **SystemLog** stores an audit trail; every entry optionally references the acting user
  and the affected record.