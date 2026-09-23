/* ============================================================
   qr-scanner.js - scan QR codes with the jsQR library
   ============================================================ */

let scanStream = null;
let scanLoopId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn()) return;
  if (Auth.role() !== 'student' && Auth.role() !== 'admin' && Auth.role() !== 'teacher') {
    Auth.goToDashboard();
    return;
  }
  buildStudentSidebar('qr-scanner.html');

  document.getElementById('startBtn').addEventListener('click', startScanning);
  document.getElementById('stopBtn').addEventListener('click', stopScanning);
  document.getElementById('manualVerify').addEventListener('click', () => {
    const token = document.getElementById('manualToken').value.trim();
    if (!token) return UI.toast('Enter a QR token first', 'warning');
    verifyToken(token);
  });
});

async function startScanning() {
  const video = document.getElementById('qrVideo');
  const status = document.getElementById('scanStatus');
  const loading = document.getElementById('camLoading');
  try {
    loading.textContent = 'Loading QR scanner library...';
    await ensureJsQR();
    scanStream = await startCamera(video);
    loading.style.display = 'none';
    status.textContent = 'Scanning... point the camera at a QR code.';
    UI.toast('Camera started', 'info');
    scanLoopId = requestAnimationFrame(scanFrame);
  } catch (err) {
    status.textContent = 'Camera error';
    UI.toast(
      'Camera permission denied or unavailable. Use manual token entry instead.',
      'error'
    );
    loading.style.display = 'grid';
    loading.textContent = 'Camera unavailable - use manual entry below';
  }
}

function stopScanning() {
  if (scanLoopId) cancelAnimationFrame(scanLoopId);
  scanLoopId = null;
  stopCamera(scanStream);
  scanStream = null;
  document.getElementById('scanStatus').textContent = 'Camera is off';
  document.getElementById('camLoading').style.display = 'grid';
  document.getElementById('camLoading').textContent = 'Camera is off';
}

function scanFrame() {
  const video = document.getElementById('qrVideo');
  if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
    const canvas = document.getElementById('overlay');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (code && code.data) {
      stopScanning();
      document.getElementById('scanStatus').textContent = 'QR detected - verifying...';
      verifyToken(code.data);
      return;
    }
  }
  scanLoopId = requestAnimationFrame(scanFrame);
}

/* jsQR is loaded lazily when scanning starts */
async function ensureJsQR() {
  if (window.jsQR) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/vendor/jsqr/jsQR.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the QR scanning library.'));
    document.head.appendChild(s);
  });
}

/* Verify the decoded payload against the backend */
async function verifyToken(payload) {
  const area = document.getElementById('resultArea');
  area.innerHTML = `<div class="result-banner warn">Verifying QR token...</div>`;
  try {
    await ensureJsQR();
    const data = await API.post('/api/qr/verify', { token: payload });
    const s = data.student;
    area.innerHTML = `
      <div class="result-banner ok">&#10004; ${UI.escapeHtml(data.message)}</div>
      <div class="card" style="margin-top:12px;">
        <div class="card-title">Student identified</div>
        <table class="table">
          <tr><th>Name</th><td>${UI.escapeHtml(s.name)}</td></tr>
          <tr><th>Student ID</th><td>${UI.escapeHtml(s.studentId)}</td></tr>
          <tr><th>Department</th><td>${UI.escapeHtml(s.department || '-')}</td></tr>
          <tr><th>Year / Section</th><td>${UI.escapeHtml(
            (s.year || '-') + ' / ' + (s.section || '-')
          )}</td></tr>
          <tr><th>Face registered</th><td>${
            s.faceRegistered
              ? '<span class="badge badge-success">Yes</span>'
              : '<span class="badge badge-warning">No</span>'
          }</td></tr>
        </table>
        <p class="text-sm text-muted" style="margin-top:8px;">
          QR token verified. In Stage 4 this result feeds into the full attendance pipeline
          (QR &rarr; Face &rarr; GPS &rarr; Indoor &rarr; Timetable).
        </p>
      </div>`;
    UI.toast('QR verified', 'success');
  } catch (err) {
    area.innerHTML = `<div class="result-banner bad">&#10008; ${UI.escapeHtml(
      err.message
    )}</div>`;
    UI.toast(err.message, 'error');
  }
}