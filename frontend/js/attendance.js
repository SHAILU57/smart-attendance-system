/* ============================================================
   attendance.js - the full chained check-in (Stage 4)
   Collect evidence: QR -> Face -> GPS -> Indoor -> then submit.
   The server runs every check and decides PRESENT / REJECTED.
   ============================================================ */

let selectedSession = null;
let camStream = null;
let evidence = {
  qrToken: '',
  faceDescriptor: null,
  gps: null,
  indoor: null, // { zoneId|beaconId|wifiSsid, mode }
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) return;
  if (Auth.role() !== 'student') {
    Auth.goToDashboard();
    return;
  }
  buildStudentSidebar('attendance.html');

  await loadSessions();
  await loadDemoBlock();

  document.getElementById('qrCamBtn').addEventListener('click', startQrCamera);
  document.getElementById('qrTokenInput').addEventListener('input', () => {
    const v = document.getElementById('qrTokenInput').value.trim();
    if (v) {
      evidence.qrToken = v;
      setStep('st-qr', 'done', 'Token entered');
    }
  });
  document.getElementById('faceCamBtn').addEventListener('click', startFaceCamera);
  document.getElementById('faceCaptureBtn').addEventListener('click', captureFace);
  document.getElementById('gpsBtn').addEventListener('click', getGps);
  document.getElementById('indoorBtn').addEventListener('click', verifyIndoor);
  document.getElementById('submitBtn').addEventListener('click', submitCheckin);
});

/* ---------- 1. Sessions ---------- */
async function loadSessions() {
  const list = document.getElementById('sessionList');
  list.innerHTML = '<span class="muted">Loading sessions...</span>';
  try {
    const data = await API.get('/api/attendance/sessions');
    const today = data.sessions.filter((s) => s.liveStatus === 'ONGOING' || s.liveStatus === 'SCHEDULED');
    if (!today.length) {
      list.innerHTML =
        '<div class="result-banner warn">No sessions are open right now. Ask your teacher to open an attendance session.</div>';
      document.getElementById('submitBtn').disabled = true;
      return;
    }
    list.innerHTML = today
      .map(
        (s) => `<label class="session-option" data-id="${s._id}">
          <input type="radio" name="session" value="${s._id}" />
          <span>
            <b>${UI.escapeHtml(s.code)}</b> &middot; ${UI.escapeHtml(s.subject ? s.subject.name : '')}
            <span class="badge badge-primary">${UI.escapeHtml(s.subject ? s.subject.subjectCode : '')}</span>
          </span>
          <span class="muted">${UI.escapeHtml(s.startTime)}-${UI.escapeHtml(s.endTime)} &middot;
            ${UI.escapeHtml(s.room ? s.room.roomCode : '')} &middot; ${UI.escapeHtml(s.teacher ? s.teacher.name : '')}</span>
        </label>`
      )
      .join('');

    list.querySelectorAll('input[name="session"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const id = e.target.value;
        selectedSession = today.find((s) => s._id === id);
        document.getElementById('wizard').style.display = '';
        document.getElementById('sessionPicker').scrollIntoView({ behavior: 'smooth', block: 'start' });
        UI.toast('Session selected: ' + selectedSession.code, 'info');
      });
    });
  } catch (err) {
    list.innerHTML = `<div class="result-banner bad">${UI.escapeHtml(err.message)}</div>`;
  }
}

/* Demo indoor option - only when the admin has enabled demo mode */
async function loadDemoBlock() {
  const block = document.getElementById('demoBlock');
  if (!block) return;
  try {
    const cfg = await API.get('/api/location/config');
    if (!cfg.demoIndoorMode) {
      block.innerHTML = '';
      return;
    }
    const zones = (await API.get('/api/zones')).zones || [];
    if (!zones.length) {
      block.innerHTML = '';
      return;
    }
    block.innerHTML = `
      <div class="demo-flag">&#9888; Demo mode is enabled - simulated indoor positioning only, NOT real</div>
      <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
        <div class="form-group" style="flex:1;min-width:220px;">
          <label>Pick a demo zone</label>
          <select id="demoZone">${zones
            .map(
              (z) =>
                `<option value="${z.zoneId}">${z.zoneId} - ${z.building ? z.building.name : ''}/F${z.floor ? z.floor.floorNumber : ''}/${z.room ? z.room.roomCode : ''}</option>`
            )
            .join('')}
          </select>
        </div>
        <button class="btn btn-sm btn-warning" id="demoIndoorBtn">&#128736; Use demo zone</button>
      </div>`;
    document.getElementById('demoIndoorBtn').addEventListener('click', () => {
      const zoneId = document.getElementById('demoZone').value;
      evidence.indoor = { zoneId, mode: 'demo' };
      const z = zones.find((x) => x.zoneId === zoneId);
      document.getElementById('indoorInfo').innerHTML =
        `<span class="badge badge-success">Demo zone selected</span> ${UI.escapeHtml(z.building.name)}/F${UI.escapeHtml(z.floor.floorNumber)}/<b>${UI.escapeHtml(z.room.roomCode)}</b>` +
        ' <span class="badge badge-warning">DEMO - selection is NOT real positioning</span>';
      setStep('st-indoor', 'done', `${z.building.name}/F${z.floor.floorNumber}/${z.room.roomCode} (demo)`);
      UI.toast('Demo zone selected (not real positioning)', 'warning');
    });
  } catch (err) {
    /* demo block optional */
  }
}

/* ---------- 2. QR ---------- */
async function startQrCamera() {
  const wrap = document.getElementById('qrCamWrap');
  const video = document.getElementById('qrVideo');
  wrap.style.display = '';
  try {
    await ensureJsQR();
    camStream = await startCamera(video);
    UI.toast('Scan your QR with the camera', 'info');
    scanLoop();
  } catch (err) {
    UI.toast('Camera unavailable. Paste the token instead.', 'error');
  }
}

async function ensureJsQR() {
  if (window.jsQR) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/vendor/jsqr/jsQR.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load QR scanning library'));
    document.head.appendChild(s);
  });
}

function scanLoop() {
  const video = document.getElementById('qrVideo');
  if (!camStream) return;
  if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
    const canvas = document.getElementById('overlay');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const code = jsQR(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      canvas.width,
      canvas.height,
      { inversionAttempts: 'dontInvert' }
    );
    if (code && code.data) {
      onQrDetected(code.data);
      return;
    }
  }
  requestAnimationFrame(scanLoop);
}

function onQrDetected(payload) {
  stopCamera(camStream);
  camStream = null;
  let token = payload;
  try {
    const parsed = JSON.parse(payload);
    if (parsed && parsed.t) token = parsed.t;
  } catch (e) {
    /* raw token */
  }
  evidence.qrToken = token;
  document.getElementById('qrTokenInput').value = token;
  document.getElementById('qrCamWrap').style.display = 'none';
  setStep('st-qr', 'done', 'QR token captured');
  UI.toast('QR token captured', 'success');
}

/* ---------- 3. Face ---------- */
async function startFaceCamera() {
  const video = document.getElementById('faceVideo');
  const loading = document.getElementById('faceCamLoading');
  try {
    await loadFaceModels();
    camStream = await startCamera(video);
    loading.style.display = 'none';
    document.getElementById('faceCaptureBtn').disabled = false;
    UI.toast('Face camera ready', 'info');
  } catch (err) {
    loading.textContent = 'Camera unavailable - enable camera permission.';
    UI.toast(err.message || 'Camera unavailable', 'error');
  }
}

async function captureFace() {
  const video = document.getElementById('faceVideo');
  try {
    const fd = await captureFaceDescriptor(video);
    drawFaceBox(document.getElementById('faceOverlay'), video, fd.box);
    evidence.faceDescriptor = fd.descriptor;
    setStep('st-face', 'done', `Descriptor captured (conf ${(fd.score * 100).toFixed(0)}%)`);
    UI.toast('Face captured', 'success');
  } catch (err) {
    setStep('st-face', 'fail', err.message);
    UI.toast(err.message, 'error');
  }
}

/* ---------- 4. GPS ---------- */
function getGps() {
  const status = document.getElementById('gpsStatus');
  if (!navigator.geolocation) {
    status.textContent = 'unsupported';
    setStep('st-gps', 'fail', 'Browser has no GPS');
    return;
  }
  status.textContent = 'Requesting GPS...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      evidence.gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      status.textContent = '';
      document.getElementById('gpsInfo').textContent =
        `Coordinates captured: ${evidence.gps.lat.toFixed(5)}, ${evidence.gps.lng.toFixed(5)}`;
      setStep('st-gps', 'done', 'GPS captured');
      UI.toast('GPS coordinates captured', 'success');
    },
    (err) => {
      status.textContent = '';
      setStep('st-gps', 'fail', err.message || 'GPS permission denied');
      UI.toast('GPS error: ' + (err.message || 'permission denied'), 'error');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
  );
}

/* ---------- 5. Indoor ---------- */
async function verifyIndoor() {
  const beaconId = document.getElementById('beaconId').value.trim();
  const wifiSsid = document.getElementById('wifiSsid').value.trim();
  if (!beaconId && !wifiSsid) {
    return UI.toast('Enter a Beacon ID or Wi-Fi SSID first', 'warning');
  }
  try {
    const data = await API.post('/api/location/indoor', {
      beaconId: beaconId || undefined,
      wifiSsid: wifiSsid || undefined,
    });
    const kind = beaconId ? 'beaconId' : 'wifiSsid';
    evidence.indoor = { [kind]: beaconId || wifiSsid, mode: data.isDemo ? 'demo' : 'real' };
    const z = data.zone;
    document.getElementById('indoorInfo').innerHTML =
      `<span class="badge badge-success">Verified</span> ${UI.escapeHtml(z.building)} / Floor ${UI.escapeHtml(z.floor)} / <b>${UI.escapeHtml(z.room)}</b>` +
      (data.isDemo
        ? ' <span class="badge badge-warning">DEMO - not real positioning</span>'
        : '');
    setStep('st-indoor', 'done', `${z.building}/F${z.floor}/${z.room}`);
    UI.toast('Indoor location verified', 'success');

    // show demo option if enabled
    if (data.isDemo) document.getElementById('demoBlock').style.display = 'none';
  } catch (err) {
    setStep('st-indoor', 'fail', err.message);
    UI.toast(err.message, 'error');
  }
}

/* ---------- 6. Submit ---------- */
async function submitCheckin() {
  const checks = {
    qr: !!evidence.qrToken,
    face: !!evidence.faceDescriptor,
    gps: !!evidence.gps,
    indoor: !!evidence.indoor,
  };
  const missing = ['QR token', 'Face', 'GPS', 'Indoor'].filter((_, i) => !Object.values(checks)[i]);
  if (missing.length) {
    return UI.toast('Complete missing steps first: ' + missing.join(', '), 'warning');
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Verifying all checks...';
  document.getElementById('resultArea').innerHTML =
    '<div class="result-banner warn">Running QR &rarr; Face &rarr; GPS &rarr; Indoor &rarr; Timetable... please wait.</div>';

  try {
    const data = await API.post('/api/attendance/checkin', {
      sessionId: selectedSession._id,
      qrToken: evidence.qrToken,
      faceDescriptor: evidence.faceDescriptor,
      gps: evidence.gps,
      indoor: evidence.indoor,
    });
    renderResult(data);
  } catch (err) {
    document.getElementById('resultArea').innerHTML =
      `<div class="result-banner bad">&#10008; ${UI.escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Record my attendance';
  }
}

function renderResult(data) {
  const area = document.getElementById('resultArea');
  const ok = data.status === 'PRESENT';
  spot(data.checks);
  area.innerHTML = `
    <div class="result-banner ${ok ? 'ok' : 'bad'}">
      ${ok ? '\u2714' : '\u2718'} ${UI.escapeHtml(data.message)}
    </div>
    ${data.reason ? `<div class="result-banner bad" style="margin-top:8px;">Reason: ${UI.escapeHtml(data.reason)}</div>` : ''}
    <div class="card" style="margin-top:12px;">
      <div class="card-title">Result summary</div>
      <table class="table">
        <tr><th>Status</th><td>${UI.badge(data.status)}</td></tr>
        <tr><th>Session</th><td>${UI.escapeHtml(data.session.code)} - ${UI.escapeHtml(data.session.subject)}</td></tr>
        <tr><th>Student</th><td>${UI.escapeHtml(data.student.name)} (${UI.escapeHtml(data.student.studentId)})</td></tr>
        <tr><th>QR</th><td>${checkTxt(data.checks.qr)} ${UI.escapeHtml(data.checks.qr.detail)}</td></tr>
        <tr><th>Face</th><td>${checkTxt(data.checks.face)} ${UI.escapeHtml(data.checks.face.detail)}</td></tr>
        <tr><th>GPS</th><td>${checkTxt(data.checks.gps)} ${UI.escapeHtml(data.checks.gps.detail)}</td></tr>
        <tr><th>Indoor</th><td>${checkTxt(data.checks.indoor)} ${UI.escapeHtml(data.checks.indoor.detail)}</td></tr>
        <tr><th>Timetable</th><td>${checkTxt(data.checks.timetable)} ${UI.escapeHtml(data.checks.timetable.detail)}</td></tr>
      </table>
    </div>`;
  UI.toast(data.message, ok ? 'success' : 'error');
}

function checkTxt(chk) {
  return chk.ok ? '<span class="badge badge-success">OK</span>' : '<span class="badge badge-danger">FAIL</span>';
}

function spot(checks) {
  const map = { st_qr: 'qr', st_face: 'face', st_gps: 'gps', st_indoor: 'indoor', st_tt: 'timetable' };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    const state = document.getElementById(id + '-state');
    if (el && state) {
      const c = checks[key];
      el.classList.toggle('done', !!c.ok);
      el.classList.toggle('fail', !c.ok);
      state.textContent = c.ok ? 'OK' : 'FAIL';
    }
  });
}

function setStep(id, state, detail) {
  const el = document.getElementById(id);
  const st = document.getElementById(id + '-state');
  if (!el || !st) return;
  el.classList.remove('done', 'fail');
  if (state === 'done') el.classList.add('done');
  if (state === 'fail') el.classList.add('fail');
  st.textContent = detail || (state === 'done' ? 'OK' : 'FAIL');
}