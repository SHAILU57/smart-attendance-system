/* ============================================================
   reports.js - Attendance reports (teacher / admin).
   Data layer is completed in Stage 4; today it renders a
   clean empty state until attendance records exist.
   ============================================================ */

let lastRows = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) return;
  const user = Auth.getUser();
  if (!['teacher', 'admin'].includes(user.role)) return Auth.goToDashboard();

  const sidebar = document.getElementById('reportsSidebar');
  if (sidebar) {
    sidebar.innerHTML =
      `<div class="s-brand"><span class="brand-icon">&#9672;</span>SmartAttendance</div>` +
      (user.role === 'teacher'
        ? `<a class="s-link" href="teacher-dashboard.html">&#9967; Dashboard</a>`
        : `<a class="s-link" href="admin-dashboard.html">&#9967; Admin Dashboard</a>`) +
      `<a class="s-link" href="timetable.html">&#128197; Timetable</a>
       <a class="s-link active" href="reports.html">&#128202; Reports</a>
       <div class="s-foot">
         <div class="s-user"><b>${UI.escapeHtml(user.name)}</b><span>${UI.escapeHtml(user.email)}</span></div>
         <button class="btn btn-danger btn-sm" data-logout>Log out</button>
       </div>`;
    sidebar.querySelector('[data-logout]').addEventListener('click', (e) => {
      e.preventDefault();
      Auth.clearSession();
      window.location.href = 'login.html';
    });
  }

  await loadFilters();
  await generate();

  document.getElementById('generateBtn').addEventListener('click', generate);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
});

async function loadFilters() {
  try {
    const [depts, subs] = await Promise.all([
      API.get('/api/students?limit=500'),
      API.get('/api/subjects'),
    ]);
    const deptSet = [...new Set(depts.students.map((s) => s.department).filter(Boolean))];
    deptSet.forEach((d) => addOption('fDepartment', d, d));
    ['1st Year', '2nd Year', '3rd Year', '4th Year'].forEach((y) => addOption('fYear', y, y));
    ['A', 'B', 'C'].forEach((s) => addOption('fSection', s, s));
    subs.subjects.forEach((s) => addOption('fSubject', `${s.subjectCode} - ${s.name}`, s._id));
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

function addOption(id, label, value) {
  const el = document.getElementById(id);
  if (el) el.insertAdjacentHTML('beforeend', `<option value="${UI.escapeHtml(value)}">${UI.escapeHtml(label)}</option>`);
}

async function generate() {
  const params = new URLSearchParams();
  const date = document.getElementById('fDate').value;
  const dept = document.getElementById('fDepartment').value;
  const year = document.getElementById('fYear').value;
  const section = document.getElementById('fSection').value;
  const subject = document.getElementById('fSubject').value;
  if (date) params.set('date', date);
  if (dept) params.set('department', dept);
  if (year) params.set('year', year);
  if (section) params.set('section', section);
  if (subject) params.set('subjectId', subject);

  const q = params.toString() ? '?' + params.toString() : '';
  try {
    const data = await API.get('/api/reports/attendance' + q);
    const rows = data.records || [];
    lastRows = rows;
    render(rows);
  } catch (err) {
    if (err.status === 404) {
      render([]);
      return;
    }
    UI.toast(err.message, 'error');
    render([]);
  }
}

function render(rows) {
  const present = rows.filter((r) => r.status === 'PRESENT').length;
  const absent = rows.filter((r) => r.status === 'ABSENT').length;
  const rejected = rows.filter((r) => r.status === 'REJECTED').length;

  document.getElementById('rTotal').textContent = rows.length;
  document.getElementById('rPresent').textContent = present;
  document.getElementById('rAbsent').textContent = absent;
  document.getElementById('rRejected').textContent = rejected;

  const tbody = document.getElementById('reportBody');
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
            <td><b>${UI.escapeHtml(r.studentId || '')}</b> ${UI.escapeHtml(r.studentName || '')}
              <div class="text-sm text-muted">${UI.escapeHtml(
                ((r.department || '') + ' ' + (r.year || '') + ' ' + (r.section || '')).trim() || '-'
              )}</div>
            </td>
            <td>${UI.escapeHtml(UI.formatDate(r.date || r.createdAt))}</td>
            <td>${UI.escapeHtml(r.subjectName || '-')}</td>
            <td>${UI.badge(r.status)}</td>
            <td>${UI.escapeHtml(r.room || '-')}</td>
            <td>${UI.escapeHtml(r.expectedRoom || '-')}</td>
            <td class="text-sm">
              ${r.rejectionReason ? UI.escapeHtml(r.rejectionReason)
                : r.status === 'PRESENT'
                ? 'QR \u2713 Face \u2713 GPS \u2713 Indoor \u2713 TT \u2713'
                : '-'}
            </td>
          </tr>`
        )
        .join('')
    : `<tr class="empty-row"><td colspan="7">No attendance records match these filters. Records appear once attendance is marked.</td></tr>`;
}

function exportCSV() {
  if (!lastRows.length) {
    UI.toast('Nothing to export yet.', 'warning');
    return;
  }
  const header = ['StudentID', 'StudentName', 'Department', 'Year', 'Section', 'Date', 'Subject', 'Status', 'Room', 'ExpectedRoom', 'RejectionReason'];
  const lines = lastRows.map((r) =>
    [
      r.studentId || '',
      `"${r.studentName || ''}"`,
      r.department || '',
      r.year || '',
      r.section || '',
      r.date || '',
      `"${r.subjectName || ''}"`,
      r.status,
      r.room || '',
      r.expectedRoom || '',
      `"${r.rejectionReason || ''}"`,
    ].join(',')
  );
  const csv = '\uFEFF' + [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  UI.toast('CSV downloaded.', 'success');
}