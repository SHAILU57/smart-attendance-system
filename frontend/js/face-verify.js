/* ============================================================
   face-verify.js - verify a live capture against the server template
   ============================================================ */

let camStream = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn()) return;
  if (Auth.role() !== 'student') {
    Auth.goToDashboard();
    return;
  }
  buildStudentSidebar('face-verify.html');

  document.getElementById('startBtn').addEventListener('click', startCameraFlow);
  document.getElementById('stopBtn').addEventListener('click', stopCam);
  document.getElementById('verifyBtn').addEventListener('click', verifyLive);
});

async function startCameraFlow() {
  const video = document.getElementById('faceVideo');
  const loading = document.getElementById('camLoading');
  const status = document.getElementById('camStatus');
  try {
    status.textContent = 'Loading face recognition models (one time)...';
    await loadFaceModels();
    camStream = await startCamera(video);
    loading.style.display = 'none';
    document.getElementById('verifyBtn').disabled = false;
    status.textContent = 'Camera ready. Look straight at the camera.';
    UI.toast('Camera ready', 'info');
  } catch (err) {
    status.textContent = 'Camera unavailable';
    loading.style.display = 'grid';
    loading.textContent = 'Camera unavailable - enable camera permission to verify your face.';
    UI.toast(err.message || 'Camera permission denied', 'error');
  }
}

function stopCam() {
  stopCamera(camStream);
  camStream = null;
  document.getElementById('camLoading').style.display = 'grid';
  document.getElementById('camLoading').textContent = 'Camera is off';
  document.getElementById('verifyBtn').disabled = true;
}

async function verifyLive() {
  const video = document.getElementById('faceVideo');
  const btn = document.getElementById('verifyBtn');
  const overlay = document.getElementById('overlay');
  const area = document.getElementById('resultArea');

  btn.disabled = true;
  btn.textContent = 'Verifying...';
  area.innerHTML = '<div class="result-banner warn">Comparing your face to the registered template...</div>';

  try {
    const fd = await captureFaceDescriptor(video);
    drawFaceBox(overlay, video, fd.box);

    const data = await API.post('/api/face/verify', {
      descriptor: fd.descriptor,
    });

    const ok = data.matched;
    area.innerHTML = `
      <div class="result-banner ${ok ? 'ok' : 'bad'}">
        ${ok ? '\u2714' : '\u2718'} ${UI.escapeHtml(data.message)}
        <div class="text-sm" style="margin-top:6px;">
          Euclidean distance: <b>${data.distance}</b> &nbsp;(threshold ${data.threshold}
          &rarr; lower is more similar)
        </div>
      </div>
      <p class="text-sm text-muted" style="margin-top:8px;">
        Face verification is one step. The final attendance decision (Stage 4) also checks
        location and the correct classroom before marking PRESENT.
      </p>`;
    UI.toast(data.matched ? 'Face matched' : 'Face did not match', data.matched ? 'success' : 'error');
  } catch (err) {
    if (err.code === 'NO_FACE') {
      area.innerHTML = `<div class="result-banner bad">&#10008; ${UI.escapeHtml(err.message)}</div>`;
    } else {
      area.innerHTML = `<div class="result-banner bad">&#10008; Verification failed: ${UI.escapeHtml(
        err.message
      )}</div>`;
    }
    UI.toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verify my face';
  }
}