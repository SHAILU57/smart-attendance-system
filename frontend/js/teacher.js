/* ============================================================
   teacher.js - Teacher dashboard logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn()) return;
  const user = Auth.getUser();
  if (!['teacher', 'admin'].includes(user.role)) return Auth.goToDashboard();
  initTeacher(user);
});

async function initTeacher(user) {
  document.getElementById('sbName').textContent = user.name;
  document.getElementById('sbUid').textContent = user.teacherId || user.email;
  document.getElementById('teacherName').textContent = user.name;

  // Today's classes
  let todayEntries = [];
  try {
    const data = await API.get('/api/timetable/today');
    todayEntries = data.timetable;
    document.getElementById('tToday').textContent = todayEntries.length;
  } catch (err) {
    UI.toast(err.message, 'error');
  }

  renderToday(todayEntries, user);

  // Weekly schedule + subject count
  try {
    const data = await API.get('/api/timetable');
    document.getElementById('tWeek').textContent = data.count;
    const subjects = new Set(data.timetable.map((e) => e.subject.subjectCode));
    document.getElementById('tSubjects').textContent = subjects.size;
    renderWeek(data.timetable);
  } catch (err) {
    /* ignore */
  }

  // Roster
  await loadRoster('');

  document.getElementById('searchBtn').addEventListener('click', () => {
    loadRoster(document.getElementById('searchStudents').value.trim());
  });
  document.getElementById('searchStudents').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadRoster(document.getElementById('searchStudents').value.trim());
  });

  // Attendance sessions
  await loadSessions();
  await loadSessionFormData();
  document.getElementById('sessCreate').addEventListener('click', createSession);
}

async function loadSessionFormData() {
  try {
    const [subjData, roomData] = await Promise.all([
      API.get('/api/subjects'),
      API.get('/api/classrooms'),
    ]);
    UI.fillSelect(document.getElementById('sessSubject'), subjData.subjects.map((s) => ({
      value: s._id,
      label: `${s.name} (${s.subjectCode})`,
    })), '');
    UI.fillSelect(document.getElementById('sessRoom'), roomData.classrooms.map((r) => ({
      value: r._id,
      label: `${r.roomCode} - ${r.building ? r.building.name : ''}/Floor ${r.floor ? r.floor.floorNumber : ''}`,
    })), '');
    document.getElementById('sessDate').value = new Date().toISOString().slice(0, 10);
  } catch (err) {
    UI.toast('Could not load form data: ' + err.message, 'error');
  }
}

async function loadSessions() {
  const tbody = document.getElementById('sessionBody');
  if (!tbody) return;
  try {
    const data = await API.get('/api/attendance/sessions?all=true');
    document.getElementById('sessionCount').textContent = data.sessions.length;
    tbody.innerHTML = data.sessions.length
      ? data.sessions
          .map(
            (s) => `<tr>
              <td><b>${UI.escapeHtml(s.code)}</b></td>
              <td>${UI.escapeHtml(s.subject ? s.subject.name : '')}</td>
              <td>${UI.escapeHtml(s.date)}</td>
              <td>${UI.escapeHtml(s.startTime)} - ${UI.escapeHtml(s.endTime)}</td>
              <td>${UI.escapeHtml(s.room ? s.room.roomCode : '')}</td>
              <td>${UI.badge(s.liveStatus)}</td>
              <td id="sessCount_${s._id}">-</td>
              <td><button class="btn btn-sm" data-view="${s._id}">View records</button></td>
            </tr>`
          )
          .join('')
      : `<tr class="empty-row"><td colspan="8">No attendance sessions yet.</td></tr>`;

    // Fill record counts
    data.sessions.forEach(async (s) => {
      const el = document.getElementById('sessCount_' + s._id);
      if (!el) return;
      try {
        const rec = await API.get('/api/attendance/session/' + s._id);
        const present = rec.records.filter((r) => r.status === 'PRESENT').length;
        el.textContent = `${present}/${rec.count}`;
      } catch (err) {
        el.textContent = '-';
      }
    });

    tbody.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => viewSessionRecords(btn.dataset.view));
    });
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">${UI.escapeHtml(err.message)}</td></tr>`;
  }
}

async function createSession() {
  const subject = document.getElementById('sessSubject').value;
  const room = document.getElementById('sessRoom').value;
  const date = document.getElementById('sessDate').value;
  const startTime = document.getElementById('sessStart').value;
  const endTime = document.getElementById('sessEnd').value;

  if (!subject || !room || !date) return UI.toast('Subject, classroom and date are required', 'warning');

  // Resolve the room's building + floor
  let building, floor;
  try {
    const rooms = await API.get('/api/classrooms');
    const r = rooms.classrooms.find((c) => c._id === room);
    building = r.building._id;
    floor = r.floor._id;
  } catch (err) {
    return UI.toast('Could not resolve classroom: ' + err.message, 'error');
  }

  const subm = document.getElementById('sessCreate');
  subm.disabled = true;
  try {
    const data = await API.post('/api/attendance/sessions', {
      subject, building, floor, room, date, startTime, endTime,
    });
    UI.toast(`Session ${data.session.code} created`, 'success');
    document.getElementById('sessCreate').textContent = 'Open session';
    await loadSessions();
  } catch (err) {
    UI.toast(err.message, 'error');
  } finally {
    subm.disabled = false;
  }
}

async function viewSessionRecords(id) {
  const box = document.getElementById('sessionRecords');
  box.innerHTML = '<div class="muted text-sm">Loading records...</div>';
  try {
    const data = await API.get('/api/attendance/session/' + id);
    const present = data.records.filter((r) => r.status === 'PRESENT').length;
    box.innerHTML = `
      <div class="card-title" style="margin-top:8px;">
        Records for session <b>${UI.escapeHtml(data.session.code)}</b>
        &nbsp;${present}/${data.count} present
        <button class="btn btn-sm" style="margin-left:8px;" id="closeRecBox">Close</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>ID</th><th>Status</th><th>Room</th><th>Reason</th></tr></thead>
          <tbody>
            ${data.records.length
              ? data.records
                  .map(
                    (r) => `<tr>
                      <td>${UI.escapeHtml(r.student ? r.student.name : '-')}</td>
                      <td>${UI.escapeHtml(r.student ? r.student.studentId : '-')}</td>
                      <td>${UI.badge(r.status)}</td>
                      <td>${UI.escapeHtml(r.room || '-')}</td>
                      <td class="text-sm">${UI.escapeHtml(r.rejectionReason || '')}</td>
                    </tr>`
                  )
                  .join('')
              : '<tr class="empty-row"><td colspan="5">No students have checked in yet.</td></tr>'}
          </tbody>
        </table>
      </div>`;
    document.getElementById('closeRecBox').addEventListener('click', () => (box.innerHTML = ''));
  } catch (err) {
    box.innerHTML = `<div class="result-banner bad">${UI.escapeHtml(err.message)}</div>`;
  }
}

function renderToday(entries, user) {
  const empty = document.getElementById('todayClassesEmpty');
  const table = document.getElementById('todayTable');
  const tbody = document.getElementById('todayBody');

  if (!entries.length) {
    empty.style.display = 'block';
    empty.textContent = 'No classes scheduled for today.';
    table.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  table.style.display = 'table';
  tbody.innerHTML = entries
    .map(
      (e) => `<tr>
        <td><b>${UI.escapeHtml(e.startTime)} - ${UI.escapeHtml(e.endTime)}</b></td>
        <td>${UI.escapeHtml(e.subject.name)} <span class="badge badge-plain">${UI.escapeHtml(e.subject.subjectCode)}</span></td>
        <td>${UI.escapeHtml(e.department)} ${UI.escapeHtml(e.year)} ${UI.escapeHtml(e.section)}</td>
        <td>${UI.escapeHtml(e.building.name)} / Floor ${UI.escapeHtml(e.floor.floorNumber)} / <b>${UI.escapeHtml(e.room.roomCode)}</b></td>
      </tr>`
    )
    .join('');
}

function renderWeek(entries) {
  const box = document.getElementById('weekBody');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const byDay = {};
  entries.forEach((e) => {
    (byDay[e.day] = byDay[e.day] || []).push(e);
  });
  box.innerHTML = days
    .filter((d) => byDay[d])
    .map((d) => {
      const list = byDay[d]
        .map(
          (e) =>
            `<div class="log-line" style="border:none;padding:2px 0 ${
              d === today ? ';font-weight:600' : ''
            }"><b>${UI.escapeHtml(e.startTime)}</b> ${UI.escapeHtml(e.subject.name)} &middot; ${
              UI.escapeHtml(e.room.roomCode)
            }${d === today ? ' <span class="badge badge-info">Today</span>' : ''}</div>`
        )
        .join('');
      return `<div class="mini-stat mb-16"><b>${UI.escapeHtml(d)}</b>${list}</div>`;
    })
    .join('');
}

async function loadRoster(search) {
  const tbody = document.getElementById('rosterBody');
  try {
    const q = search ? '?search=' + encodeURIComponent(search) : '';
    const data = await API.get('/api/students' + q);
    tbody.innerHTML = data.students.length
      ? data.students
          .map(
            (s) => `<tr>
              <td><b>${UI.escapeHtml(s.studentId)}</b></td>
              <td>${UI.escapeHtml(s.name)}</td>
              <td>${UI.escapeHtml(s.department)}</td>
              <td>${UI.escapeHtml(s.year)}</td>
              <td>${UI.escapeHtml(s.section)}</td>
            </tr>`
          )
          .join('')
      : `<tr class="empty-row"><td colspan="5">No students found.</td></tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">${UI.escapeHtml(err.message)}</td></tr>`;
  }
}