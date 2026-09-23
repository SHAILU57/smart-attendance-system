# Problem Statement

Most colleges still record attendance manually:

- Teachers call out names or pass a paper register; **proxy attendance** (signing for
  an absent friend) is easy.
- Writing and later entering records takes significant teaching time every single day.
- Paper registers are lost or damaged, and errors occur while transcribing.
- Student attendance percentages are hard to compute and verify per subject; data is
  rarely available to parents or to the administration in a timely way.
- There is no reliable, tamper-resistant proof that a student was actually **present in
  the right classroom** at the right time.

## Desired solution

A system that, at the moment of marking attendance, automatically verifies:

| Question | Technology |
|----------|------------|
| Who is this student? | QR token + live face recognition (embedding comparison) |
| Is the student on campus? | GPS geofencing (Haversine distance) |
| Which building / floor / room is the student in? | Indoor positioning (BLE beacon / Wi-Fi / zone id) |
| Is that the scheduled class and correct room right now? | Timetable comparison |

The system must:

- Mark **PRESENT only when all required checks pass**; otherwise mark **REJECTED** with
  the stored reason (e.g. "wrong classroom", "outside geofence", "face did not match").
- **Prevent duplicates** (one record per student per attendance session).
- Respect **privacy**: store only face embeddings (never photos), collect location only
  at check-in time (no continuous tracking), and never expose any student's location to
  another student.
- Provide secure role-based access: students see only their own data; teachers manage
  their sessions and see their own classes; admins configure the college, timetables,
  zones, settings and logs.
- Produce **reports and percentages** per student and per subject, exportable to CSV.

## Scope

The project covers all of the above as a complete web application, including demo data
and a demo indoor-location mode so the full flow can be tested without physical
hardware.