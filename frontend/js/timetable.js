/* ============================================================
   timetable.js - Shared timetable page (student / teacher)
   ============================================================ */

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) return;
  const user = Auth.getUser();

  buildSidebar(user);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dayEl = document.getElementById('ttDay');
  if (dayEl) dayEl.textContent = `Showing classes for ${today}.`;

  const tbody = document.getElementById('ttBody');
  try {
    const data = await API.get('/api/timetable');
    const entries = [...data.timetable].sort(
      (a, b) =>
        DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) ||
        a.startTime.localeCompare(b.startTime)
    );

    tbody.innerHTML = entries.length
      ? entries
          .map(
            (e) => `<tr>
              <td><b>${UI.escapeHtml(e.day)}</b>${e.day === today ? ' <span class="badge badge-info">Today</span>' : ''}</td>
              <td>${UI.escapeHtml(e.startTime)} - ${UI.escapeHtml(e.endTime)}</td>
              <td>${UI.escapeHtml(e.subject.name)} <span class="badge badge-plain">${UI.escapeHtml(e.subject.subjectCode)}</span></td>
              <td>${UI.escapeHtml(e.teacher.name)}</td>
              <td>${UI.escapeHtml(e.building.name)}</td>
              <td>Floor ${UI.escapeHtml(e.floor.floorNumber)}</td>
              <td><b>${UI.escapeHtml(e.room.roomCode)}</b></td>
            </tr>`
          )
          .join('')
      : `<tr class="empty-row"><td colspan="7">No timetable entries found.</td></tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${UI.escapeHtml(err.message)}</td></tr>`;
  }
});

function buildSidebar(user) {
  const sidebar = document.getElementById('studentSidebar');
  if (!sidebar) return;
  const common = `<div class="s-brand"><span class="brand-icon">&#9672;</span>SmartAttendance</div>`;
  let links = '';
  let footName = user.name;
  let footUid = user.studentId || user.email;

  if (user.role === 'student') {
    links = `
      <a class="s-link" href="student-dashboard.html">&#9967; Dashboard</a>
      <a class="s-link active" href="timetable.html">&#128197; Timetable</a>
      <a class="s-link" href="attendance-history.html">&#128202; Attendance History</a>`;
  } else if (user.role === 'teacher') {
    links = `
      <a class="s-link" href="teacher-dashboard.html">&#9967; Dashboard</a>
      <a class="s-link active" href="timetable.html">&#128197; Timetable</a>`;
    footUid = user.teacherId || user.email;
  } else {
    links = `<a class="s-link" href="admin-dashboard.html">&#9967; Admin Dashboard</a>
             <a class="s-link active" href="timetable.html">&#128197; Timetable</a>`;
    footUid = user.email;
  }

  sidebar.innerHTML = `${common}${links}
    <div class="s-foot">
      <div class="s-user"><b>${UI.escapeHtml(footName)}</b><span>${UI.escapeHtml(footUid)}</span></div>
      <button class="btn btn-danger btn-sm" data-logout>Log out</button>
    </div>`;

  document.querySelectorAll('[data-logout]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.clearSession();
      UI.toast('Logged out successfully', 'info');
      setTimeout(() => (window.location.href = 'login.html'), 500);
    });
  });
}