/* ============================================================
   location-check.js - GPS geofence + indoor positioning checks
   ============================================================ */

let cfg = null;
let zones = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) return;
  if (Auth.role() !== 'student' && Auth.role() !== 'admin' && Auth.role() !== 'teacher') {
    Auth.goToDashboard();
    return;
  }
  buildStudentSidebar('location-check.html');

  await loadConfig();
  document.getElementById('gpsBtn').addEventListener('click', gpsCheck);
  document.getElementById('manualMatchBtn').addEventListener('click', manualMatch);
  document.getElementById('bleScanBtn').addEventListener('click', bleScan);
  document.getElementById('demoMatchBtn').addEventListener('click', demoMatch);

  // mode tabs
  document.querySelectorAll('.verify-step[data-mode]').forEach((step) => {
    step.addEventListener('click', () => {
      document.querySelectorAll('.indoor-panel').forEach((p) => (p.style.display = 'none'));
      if (step.dataset.mode === 'manual') document.getElementById('manualPanel').style.display = '';
      if (step.dataset.mode === 'ble') document.getElementById('blePanel').style.display = '';
      if (step.dataset.mode === 'demo') document.getElementById('demoPanel').style.display = '';
    });
  });
});

async function loadConfig() {
  const info = document.getElementById('configInfo');
  try {
    cfg = await API.get('/api/location/config');
    info.innerHTML = cfg.gpsConfigured
      ? `College GPS center configured (${cfg.collegeLat}, ${cfg.collegeLng}); geofence radius <b>${cfg.geofenceRadiusMeters} m</b>. ${cfg.rejectOutsideGeoFence ? '<span class="badge badge-danger">Reject outside geofence ON</span>' : '<span class="badge badge-plain">Reject outside geofence OFF</span>'} ${cfg.demoIndoorMode ? '<span class="badge badge-warning">Demo indoor mode enabled</span>' : ''}`
      : 'GPS is <b>not configured</b>. Ask the admin to set the college latitude/longitude first.';
    const row = document.getElementById('demoModeRow');
    if (row) row.style.display = cfg.demoIndoorMode ? '' : 'none';
  } catch (err) {
    info.textContent = 'Could not load location config: ' + err.message;
  }
  try {
    const data = await API.get('/api/zones');
    zones = data.zones || [];
    const sel = document.getElementById('demoZoneSelect');
    sel.innerHTML = zones.length
      ? zones
          .map(
            (z) =>
              `<option value="${z._id}">${z.zoneId || ''} - ${z.building ? z.building.name : ''} / Floor ${z.floor ? z.floor.floorNumber : ''} / ${z.room ? z.room.roomCode : ''}</option>`
          )
          .join('')
      : '<option value="">No zones available</option>';
  } catch (err) {
    /* zones optional for demo */
  }
}

/* ---- GPS ---- */
async function gpsCheck() {
  const status = document.getElementById('gpsStatus');
  const area = document.getElementById('gpsResult');
  status.textContent = 'Requesting GPS...';
  area.innerHTML = '';

  if (!navigator.geolocation) {
    status.textContent = 'GPS unsupported';
    area.innerHTML = '<div class="result-banner bad">Your browser does not support GPS.</div>';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      status.textContent = '';
      area.innerHTML = '<div class="result-banner warn">Comparing your GPS with the college geofence...</div>';
      try {
        const data = await API.post('/api/location/gps', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        const inside = data.inside;
        area.innerHTML = `
          <div class="result-banner ${inside ? 'ok' : 'bad'}">
            ${inside ? '\u2714 INSIDE campus geofence' : '\u2718 OUTSIDE campus geofence'}
            <div class="text-sm" style="margin-top:6px;">
              Distance from college center: <b>${data.distanceMeters} m</b> (limit ${data.geofenceRadiusMeters} m)
            </div>
          </div>
          <p class="text-sm text-muted" style="margin-top:8px;">
            ${UI.escapeHtml(data.note)}
          </p>`;
      } catch (err) {
        area.innerHTML = `<div class="result-banner bad">&#10008; ${UI.escapeHtml(err.message)}</div>`;
      }
    },
    (err) => {
      status.textContent = '';
      area.innerHTML = `<div class="result-banner bad">GPS error: ${err.message || 'Permission to use location denied.'}</div>`;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
  );
}

/* ---- Indoor: manual authorized identifier ---- */
async function manualMatch() {
  const beaconId = document.getElementById('beaconId').value.trim();
  const wifiSsid = document.getElementById('wifiSsid').value.trim();
  const area = document.getElementById('indoorResult');
  if (!beaconId && !wifiSsid) {
    return UI.toast('Enter a Beacon ID or Wi-Fi SSID', 'warning');
  }
  area.innerHTML = '<div class="result-banner warn">Matching indoor identifier...</div>';
  try {
    const data = await API.post('/api/location/indoor', {
      beaconId: beaconId || undefined,
      wifiSsid: wifiSsid || undefined,
    });
    renderIndoorResult(data, area);
    UI.toast('Indoor location matched', 'success');
  } catch (err) {
    area.innerHTML = `<div class="result-banner bad">&#10008; ${UI.escapeHtml(err.message)}</div>`;
  }
}

/* ---- Indoor: Web Bluetooth (experimental, real) ---- */
async function bleScan() {
  const status = document.getElementById('bleStatus');
  const area = document.getElementById('indoorResult');
  area.innerHTML = '';

  const hasBluetooth =
    navigator.bluetooth &&
    typeof navigator.bluetooth.requestLEScan === 'function';
  if (!hasBluetooth) {
    status.textContent = 'unsupported';
    area.innerHTML = `<div class="result-banner bad">
        Web Bluetooth LE scan is not available in this browser.
        Use the "Authorized Wi-Fi/BLE identifier" manual entry instead,
        or Chrome on Android/macOS for a real BLE scan.</div>`;
    return;
  }

  status.textContent = 'Scanning for ~8 seconds...';
  area.innerHTML = '<div class="result-banner warn">Listening for nearby beacons...</div>';
  let beacons = [];
  try {
    const scan = await navigator.bluetooth.requestLEScan({ acceptAllAdvertisements: true });
    const onAd = (event) => beacons.push(event.device.name || event.device.id);
    navigator.bluetooth.addEventListener('advertisementreceived', onAd);
    await new Promise((r) => setTimeout(r, 8000));
    scan.stop();
    navigator.bluetooth.removeEventListener('advertisementreceived', onAd);

    const known = zones || [];
    const matched = beacons
      .map((name) => known.find((z) => z.beaconId === String(name).toUpperCase().trim()))
      .filter(Boolean);
    if (matched.length) {
      const z = matched[0];
      await reportIndoorZone(z, area);
    } else {
      area.innerHTML = `<div class="result-banner bad">
          No known beacon found. Devices seen: ${beacons.length ? UI.escapeHtml(beacons.join(', ')) : 'none'}</div>`;
    }
    status.textContent = '';
  } catch (err) {
    status.textContent = '';
    area.innerHTML = `<div class="result-banner bad">BLE scan failed: ${UI.escapeHtml(err.message)}</div>`;
  }
}

async function reportIndoorZone(zoneDoc, area) {
  const data = await API.post('/api/location/indoor', { zoneId: zoneDoc.zoneId });
  renderIndoorResult(data, area, zoneDoc);
}

/* ---- Indoor: DEMO mode ---- */
async function demoMatch() {
  const select = document.getElementById('demoZoneSelect');
  const area = document.getElementById('indoorResult');
  const zoneDoc = zones.find((z) => String(z._id) === select.value);
  if (!zoneDoc) {
    area.innerHTML = '<div class="result-banner bad">Select a test zone first.</div>';
    return;
  }
  area.innerHTML = '<div class="result-banner warn">Simulating demo match...</div>';
  try {
    const data = await API.post('/api/location/indoor', {
      zoneId: zoneDoc.zoneId,
      mode: 'demo',
    });
    renderIndoorResult(data, area, zoneDoc);
    UI.toast('Demo match completed (not a real location)', 'warning');
  } catch (err) {
    area.innerHTML = `<div class="result-banner bad">&#10008; ${UI.escapeHtml(err.message)}</div>`;
  }
}

function renderIndoorResult(data, area /* , localZone */) {
  const z = data.zone;
  area.innerHTML = `
    ${data.isDemo ? '<div class="demo-flag">&#9888; DEMO INDOOR LOCATION - this is NOT real physical positioning</div>' : ''}
    <div class="result-banner ${data.isDemo ? 'warn' : 'ok'}">
      ${data.isDemo ? '&#128736; Demo result' : '\u2714 Real indoor match'}
      <div class="text-sm" style="margin-top:6px;">${UI.escapeHtml(data.message)}</div>
    </div>
    <div class="card" style="margin-top:12px;">
      <table class="table">
        <tr><th>Zone ID</th><td>${UI.escapeHtml(z.zoneId)}</td></tr>
        <tr><th>Building</th><td>${UI.escapeHtml(z.building)}</td></tr>
        <tr><th>Floor</th><td>${UI.escapeHtml(z.floor)}</td></tr>
        <tr><th>Room</th><td><b>${UI.escapeHtml(z.room)}</b></td></tr>
        <tr><th>Method</th><td>${data.isDemo ? 'Demo simulation' : 'Authorized identifier'}</td></tr>
      </table>
      ${data.isDemo ? '<p class="text-sm text-muted">A real deployment replaces this with an actual beacon / Wi-Fi reading.</p>' : ''}
    </div>`;
}