/* ============================================================
   student-nav.js - shared sidebar builder for student pages
   ============================================================ */

function buildStudentSidebar(activePage) {
  const sidebar = document.getElementById('studentSidebar');
  if (!sidebar) return;
  const user = Auth.getUser();
  if (!user) return;

  const links = [
    ['student-dashboard.html', '&#9967;', 'Dashboard'],
    ['student-dashboard.html#qr', '&#128274;', 'My QR Code'],
    ['qr-scanner.html', '&#128247;', 'QR Scanner'],
    ['face-register.html', '&#128100;', 'Register Face'],
    ['face-verify.html', '&#128065;', 'Verify Face'],
    ['location-check.html', '&#128205;', 'Location Check'],
    ['timetable.html', '&#128197;', 'Timetable'],
    ['attendance-history.html', '&#128202;', 'Attendance History'],
  ]
    .map(
      ([href, ico, label]) =>
        `<a class="s-link${href === activePage ? ' active' : ''}" href="${href}">${ico} ${label}</a>`
    )
    .join('');

  sidebar.innerHTML = `<div class="s-brand"><span class="brand-icon">&#9672;</span>SmartAttendance</div>
    ${links}
    <div class="s-foot">
      <div class="s-user"><b>${UI.escapeHtml(user.name)}</b><span>${UI.escapeHtml(
        user.studentId || user.email
      )}</span></div>
      <button class="btn btn-danger btn-sm" data-logout>Log out</button>
    </div>`;
}