/* ============================================================
   student.js - Student dashboard logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn()) return; // main.js redirects
  if (Auth.role() !== 'student') return Auth.goToDashboard();

  initStudent();
});

async function initStudent() {
  const user = Auth.getUser();

  // Sidebar identity
  const sbName = document.getElementById('sbName');
  const sbUid = document.getElementById('sbUid');
  if (sbName) sbName.textContent = user.name;
  if (sbUid) sbUid.textContent = user.studentId || user.email;

  const welcome = document.getElementById('welcomeName');
  if (welcome) welcome.textContent = user.name.split(' ')[0];

  // profile
  document.getElementById('profileName').textContent = user.name;
  const initials = (user.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  document.getElementById('profileAvatar').textContent = initials || '?';
  document.getElementById('profileUid').textContent = user.studentId || 'Student';
  set('pvStudentId', user.studentId);
  set('pvEmail', user.email);
  set('pvPhone', user.phone || '-');
  set('pvDept', user.department || '-');
  set('pvYear', user.year || '-');
  set('pvSection', user.section || '-');

  // Face + attendance stats
  const faceOk = !!user.faceRegistered;
  set('pvFace', faceOk ? 'Registered' : 'Not registered');
  document.getElementById('statFace').innerHTML = faceOk
    ? '<span class="badge badge-success">Registered</span>'
    : '<span class="badge badge-warning">Not registered</span>';

  // Stat defaults (attendance % comes with attendance data in Stage 4)
  document.getElementById('statAtt').textContent = '-';
  document.getElementById('pvAtt').textContent = 'No records yet';

  // Load today's classes
  await loadTodayClasses(user);

  // Load QR code
  await loadQR();
}

function set(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function loadTodayClasses(user) {
  const tbody = document.getElementById('todayBody');
  if (!tbody) return;
  try {
    const data = await API.get('/api/timetable/today');
    document.getElementById('statToday').textContent = data.count;
    if (!data.count) {
      document.getElementById('today').innerHTML =
        '<div class="card-title">Currently Scheduled for Today</div>' +
        '<p class="text-muted">No classes scheduled today.</p>';
      return;
    }
    tbody.innerHTML = data.timetable
      .map(
        (e) => `<tr>
          <td><b>${UI.escapeHtml(e.startTime)} - ${UI.escapeHtml(e.endTime)}</b></td>
          <td>${UI.escapeHtml(e.subject.name)} <span class="badge badge-plain">${UI.escapeHtml(e.subject.subjectCode)}</span></td>
          <td>${UI.escapeHtml(e.teacher.name)}</td>
          <td>${UI.escapeHtml(e.building.name)} / Floor ${UI.escapeHtml(e.floor.floorNumber)}</td>
          <td>${UI.escapeHtml(e.room.roomCode)}</td>
        </tr>`
      )
      .join('');
  } catch (err) {
    UI.toast(err.message, 'error');
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Could not load today's classes.</td></tr>`;
  }
}

async function loadQR() {
  const box = document.getElementById('qrBox');
  try {
    const data = await API.post('/api/qr/generate', {});
    box.innerHTML = `<img src="${data.qr}" alt="Student QR code" />`;
  } catch (err) {
    box.innerHTML = `<span class="text-danger text-sm">${UI.escapeHtml(err.message)}</span>`;
  }
}