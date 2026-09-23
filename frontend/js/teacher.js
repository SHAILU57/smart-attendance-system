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