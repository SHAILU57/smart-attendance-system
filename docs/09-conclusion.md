# Conclusion & Future Scope

## Conclusion

The **Smart Attendance System** successfully demonstrates how identity verification and
location-based checks can be combined to make attendance reliable, fast and auditable.

The project achieves its goal: attendance is marked only after the system independently
verifies **who** the student is (QR + face embedding comparison), **that** they are on
the college campus (GPS geofence), **which exact building/floor/room** they are in
(indoor positioning), and **whether** that is the scheduled classroom at that moment
(timetable). Any gap produces a rejection whose reason is stored and visible to the
teacher.

Implemented and verified end-to-end:

- Role-based web app (student / teacher / admin) with JWT security, bcrypt password
  hashing, input validation and rate limiting.
- QR generation and camera scanning (jsQR).
- Real face recognition via 128-dimension embeddings computed with face-api.js and
  compared server-side (Euclidean distance); only embeddings are stored, never photos.
- GPS geofencing using the Haversine formula and a configurable campus radius.
- Indoor positioning via BLE beacon / Wi-Fi identifiers, plus an explicitly-labelled
  demo mode so the whole flow works without hardware.
- Attendance sessions, a chained check-in pipeline, duplicate prevention, audit-logged
  decisions, per-student and per-subject percentages, filterable reports with CSV export,
  settings and logs.

All documented behaviours were exercised in the test cases (see `docs/07-test-cases.md`),
including happy paths and every rejection path.

## Limitations

- Face recognition is statistical, not absolute; the threshold is configurable and the
  distance is always recorded.
- GPS precision indoors is poor — that is exactly why indoor positioning uses BLE/Wi-Fi
  identifiers instead of GPS.
- Demo indoor mode must be clearly labelled (it is) and is intended only for testing.

## Future scope

1. **Real hardware integration** — native mobile app or gateway that reads BLE beacons
   directly and reports verified indoor positions instead of the demo mode.
2. **Liveness detection** — detect spoofing (photo/video replay) before accepting a
   face capture.
3. **Offline attendance** — support check-ins when the network or server is unavailable,
   with later synchronisation.
4. **SMS / email alerts** — notify students and parents when attendance is rejected or
   percentage drops below a threshold.
5. **Analytics & visualisations** — charts per subject/department, per-day heatmaps,
   trend reports.
6. **Mobile responsive app / PWA** — installable offline-first experience with camera
   scanning on phones.
7. **Anti-fraud hardening** — anomaly detection (e.g. impossible simultaneous location)
   and stronger device attestation.