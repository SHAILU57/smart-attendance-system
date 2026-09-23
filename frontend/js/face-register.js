/* ============================================================
   face-register.js - capture face + store embedding (no photo)
   ============================================================ */

let camStream = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn()) return;
  if (Auth.role() !== 'student') {
    Auth.goToDashboard();
    return;
  }
  buildStudentSidebar('face-register.html');

  document.getElementById('startBtn').addEventListener('click', startCameraFlow);
  document.getElementById('stopBtn').addEventListener('click', stopCam);
  document.getElementById('captureBtn').addEventListener('click', captureAndRegister);

  loadStatus();
});

async function loadStatus() {
  try {
    const data = await API.get('/api/face/status');
    const status = document.getElementById('camStatus');
    if (data.faceRegistered) {
      status.textContent = 'Face already registered. Capturing again will update your template.';
      document.getElementById('camStatus').innerHTML =
        '<span class="badge badge-success">Face registered</span> ' +
        '<span class="muted">Reregistering updates your template.</span>';
    }
  } catch (err) {
    /* status is informational only */
  }
}

async function startCameraFlow() {
  const video = document.getElementById('faceVideo');
  const loading = document.getElementById('camLoading');
  const status = document.getElementById('camStatus');
  try {
    status.textContent = 'Loading face recognition models (one time)...';
    await loadFaceModels();
    camStream = await startCamera(video);
    loading.style.display = 'none';
    document.getElementById('captureBtn').disabled = false;
    status.textContent = 'Camera ready. Look straight at the camera and click "Capture".';
    UI.toast('Camera ready', 'info');
  } catch (err) {
    status.textContent = 'Camera unavailable';
    loading.style.display = 'grid';
    loading.textContent = 'Camera unavailable - enable camera permission to register your face.';
    UI.toast(err.message || 'Camera permission denied', 'error');
  }
}

function stopCam() {
  stopCamera(camStream);
  camStream = null;
  document.getElementById('camLoading').style.display = 'grid';
  document.getElementById('camLoading').textContent = 'Camera is off';
  document.getElementById('captureBtn').disabled = true;
}

async function captureAndRegister() {
  const video = document.getElementById('faceVideo');
  const btn = document.getElementById('captureBtn');
  const overlay = document.getElementById('overlay');
  const area = document.getElementById('resultArea');

  btn.disabled = true;
  btn.textContent = 'Capturing... look at the camera';
  area.innerHTML = '<div class="result-banner warn">Analyzing your face...</div>';

  try {
    const fd = await captureFaceDescriptor(video);
    drawFaceBox(overlay, video, fd.box);

    const data = await API.post('/api/face/register', {
      descriptor: fd.descriptor,
      detectionScore: fd.score,
    });

    area.innerHTML = `<div class="result-banner ok">
        &#10004; ${UI.escapeHtml(data.message)}
        <div class="text-sm" style="margin-top:6px;">
          Template length: ${data.descriptorLength} dimensions &nbsp;&bull;&nbsp;
          Detection confidence: ${(fd.score * 100).toFixed(1)}%
        </div>
      </div>`;
    UI.toast('Face registered', 'success');
  } catch (err) {
    if (err.code === 'NO_FACE') {
      area.innerHTML = `<div class="result-banner bad">&#10008; ${UI.escapeHtml(
        err.message
      )}</div>`;
    } else {
      area.innerHTML = `<div class="result-banner bad">&#10008; Registration failed: ${UI.escapeHtml(
        err.message
      )}</div>`;
    }
    UI.toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '&#10024; Capture &amp; save my face';
  }
}