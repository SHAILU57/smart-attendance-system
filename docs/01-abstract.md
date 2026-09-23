# Smart Attendance System — Abstract

Manual attendance tracking in colleges is time-consuming, error-prone, and easy to
circumvent. Students can sign for friends, proxy attendance is common, and paper
registers produce unreliable records that are hard to analyse.

The **Smart Attendance System** solves this with a web application that automatically
verifies *who* a student is and *where* they are **at the moment attendance is marked**.
It combines four complementary technologies:

1. **QR code** — each student has a private QR token that identifies them instantly.
2. **Face recognition** — a live webcam capture is compared against the student's
   stored face *embedding* (a mathematical descriptor). No photos are stored.
3. **GPS geofencing** — the device GPS confirms the student is inside the college
   campus area.
4. **Indoor positioning** — BLE beacon / Wi-Fi identifiers map the student to a
   specific building, floor and classroom.

Finally, the **timetable** verifies that the room the student is standing in is the
correct classroom for the scheduled subject at that moment. Attendance is marked
**PRESENT** only when every check passes; otherwise it is marked **REJECTED** with the
exact reason stored alongside the record.

The system is built as a responsive full-stack web application
(Node.js + Express + MongoDB + vanilla JavaScript) with three roles — **student,
teacher and admin** — JWT role-based access control, server-side validation,
rate-limiting, duplicate-attendance prevention, per-student and per-subject
attendance percentages, filterable **reports with CSV export**, a full **audit log**,
and an admin-controlled **system settings** page.

A demo mode is provided for indoor positioning so the complete pipeline can be
demonstrated in any room without physical beacons; demo results are always visibly
labelled as **"DEMO - not real positioning"** so they can never be mistaken for real
physical measurements.