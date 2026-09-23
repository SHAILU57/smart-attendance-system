/* ============================================================
   history.js - Attendance history for a student.
   Attendance marking arrives in Stage 4; this page already
   renders whatever records exist and shows a clean empty state.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) return;
  buildSidebar(Auth.getUser());
  await loadHistory();
});

async function loadHistory() {
  const tbody = document.getElementById('historyBody');
  if (!tbody) return;

  // This endpoint is wired in Stage 4; if not available yet,
  // show the empty state instead of an error.
  let records = [];
  try {
    const data = await API.get('/api/attendance/student/me');
    records = data.records || [];
  } catch (err) {
    if (err.status === 404) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="8">No attendance records yet. Your attendance will appear here after you mark attendance.</td></tr>`;
      return;
    }
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">${UI.escapeHtml(err.message)}</td></tr>`;
    return;
  }

  const present = records.filter((r) => r.status === 'PRESENT').length;
  const absent = records.filter((r) => r.status === 'ABSENT').length;
  const rejected = records.filter((r) => r.status === 'REJECTED').length;
  const total = records.length;

  setTxt('presentCount', present);
  setTxt('absentCount', absent);
  setTxt('rejectedCount', rejected);
  setTxt('totalCount', total);
  const pct = total ? Math.round((present / total) * 100) : 0;
  document.getElementById('attPct').textContent = total ? `Attendance: ${pct}%` : 'Attendance: -';

  tbody.innerHTML = records.length
    ? records
        .map(
          (r) => `<tr>
            <td>${UI.escapeHtml(UI.formatDate(r.date || r.createdAt))}</td>
            <td>${UI.escapeHtml(UI.formatTime(r.createdAt))}</td>
            <td>${UI.escapeHtml(r.subjectName || '-')}</td>
            <td>${UI.badge(r.status)}</td>
            <td>${UI.escapeHtml(r.building)}</td>
            <td>${UI.escapeHtml(r.floor ? 'Floor ' + r.floor : '-')}</td>
            <td><b>${UI.escapeHtml(r.room)}</b></td>
            <td class="text-sm">
              QR ${r.qrVerified ? '&#10003;' : '&#10007;'}
              Face ${r.faceVerified ? '&#10003;' : '&#10007;'}
              GPS ${r.gpsVerified ? '&#10003;' : '&#10007;'}
              Indoor ${r.indoorVerified ? '&#10003;' : '&#10007;'}
            </td>
          </tr>`
        )
        .join('')
    : `<tr class="empty-row"><td colspan="8">No attendance records yet.</td></tr>`;
}

function setTxt(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}