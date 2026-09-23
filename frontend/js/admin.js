/* ============================================================
   admin.js - Admin dashboard: tabs, stats, CRUD for students,
   teachers, buildings, floors, classrooms, indoor zones,
   subjects, timetable, settings and logs.
   ============================================================ */

let cached = { buildings: [], floors: [], classrooms: [], subjects: [], teachers: [], students: [] };

document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.getUser();
  if (!Auth.isLoggedIn() || !user) return;
  if (user.role !== 'admin') return Auth.goToDashboard();

  document.getElementById('sbName').textContent = user.name;
  document.getElementById('sbUid').textContent = user.email;

  initTabs();
  initModal();
  loadOverview();

  // wire CRUD loaders
  document.getElementById('stuAddBtn').onclick = () => openStudentForm();
  document.getElementById('stuSearchBtn').onclick = () => loadStudents();
  document.getElementById('stuSearch').addEventListener('keydown', (e) => e.key === 'Enter' && loadStudents());

  document.getElementById('tchAddBtn').onclick = () => openTeacherForm();
  document.getElementById('tchSearchBtn').onclick = () => loadTeachers();
  document.getElementById('tchSearch').addEventListener('keydown', (e) => e.key === 'Enter' && loadTeachers());

  document.getElementById('bldAddBtn').onclick = () => openBuildingForm();
  document.getElementById('flrAddBtn').onclick = async () => { await refreshCache(); openFloorForm(); };
  document.getElementById('clsAddBtn').onclick = async () => { await refreshCache(); openClassroomForm(); };
  document.getElementById('zonAddBtn').onclick = async () => { await refreshCache(); openZoneForm(); };
  document.getElementById('subAddBtn').onclick = () => openSubjectForm();
  document.getElementById('ttAddBtn').onclick = async () => { await refreshCache(); openTimetableForm(); };

  document.getElementById('saveSettingsBtn').onclick = () => saveSettings();
  document.getElementById('logFilterBtn').onclick = () => loadLogs();

  loadSettings();
  loadLogs();
});

/* ---------------- TABS ---------------- */
function initTabs() {
  const links = document.querySelectorAll('[data-tab-link]');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const name = link.dataset.tabLink;
      showTab(name);
      window.location.hash = name;
    });
  });

  // deep-link: #students -> open students tab
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById('tab-' + hash)) {
    showTab(hash);
  }
}

function showTab(name) {
  document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
  const pane = document.getElementById('tab-' + name);
  if (pane) pane.classList.add('active');
  document.querySelectorAll('[data-tab-link]').forEach((a) => {
    a.classList.toggle('active', a.dataset.tabLink === name);
  });
  // lazy-load tab content
  if (name === 'students') loadStudents();
  if (name === 'teachers') loadTeachers();
  if (name === 'buildings') loadBuildings();
  if (name === 'floors') refreshCache().then(loadFloors);
  if (name === 'classrooms') refreshCache().then(loadClassrooms);
  if (name === 'zones') refreshCache().then(loadZones);
  if (name === 'subjects') loadSubjects();
  if (name === 'timetable') refreshCache().then(loadTimetable);
  if (name === 'logs') loadLogs();
}

/* ---------------- OVERVIEW ---------------- */
async function loadOverview() {
  try {
    const [students, teachers, buildings, classrooms, zones, subjects, tt, logs, settings] =
      await Promise.all([
        API.get('/api/students'),
        API.get('/api/teachers'),
        API.get('/api/buildings'),
        API.get('/api/classrooms'),
        API.get('/api/zones'),
        API.get('/api/subjects'),
        API.get('/api/timetable'),
        API.get('/api/logs?limit=1'),
        API.get('/api/settings'),
      ]);
    setTxt('ovStudents', students.count);
    setTxt('ovTeachers', teachers.count);
    setTxt('ovBuildings', buildings.count);
    setTxt('ovRooms', classrooms.count);
    setTxt('ovZones', zones.count);
    setTxt('ovSubjects', subjects.count);
    setTxt('ovSlots', tt.count);
    setTxt('ovLogs', logs.count);

    const s = settings.settings;
    document.getElementById('ovLat').textContent = s.collegeLat || 0;
    document.getElementById('ovLng').textContent = s.collegeLng || 0;
    document.getElementById('ovRadius').textContent = s.geofenceRadius + ' m';
    document.getElementById('ovDemo').innerHTML = s.demoIndoorMode
      ? '<span class="badge badge-warning">Demo mode ON</span>'
      : '<span class="badge badge-plain">Off</span>';
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

function setTxt(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ---------------- CACHE / LOOKUPS ---------------- */
async function refreshCache() {
  const [buildings, floors, classrooms, subjects, teachers] = await Promise.all([
    API.get('/api/buildings'),
    API.get('/api/floors'),
    API.get('/api/classrooms'),
    API.get('/api/subjects'),
    API.get('/api/teachers'),
  ]);
  cached = {
    buildings: buildings.buildings,
    floors: floors.floors,
    classrooms: classrooms.classrooms,
    subjects: subjects.subjects,
    teachers: teachers.teachers,
    ...cached,
  };
  return cached;
}

const findName = (list, id) => {
  const it = list.find((x) => String(x._id) === String(id));
  return it ? (it.name || it.roomCode || it.floorNumber || it.code) : '-';
};

function selOptions(list, labelFn, valFn, selected) {
  return list
    .map((x) => {
      const sel = String(valFn(x)) === String(selected ?? '') ? ' selected' : '';
      return `<option value="${UI.escapeHtml(valFn(x))}"${sel}>${UI.escapeHtml(labelFn(x))}</option>`;
    })
    .join('');
}

/* ---------------- MODAL ---------------- */
let activeForm = null;

function initModal() {
  document.getElementById('modalClose').onclick = closeModal;
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  document.getElementById('modalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (activeForm) activeForm();
  });
}

function openModal(title, fields, onSubmit) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalFields').innerHTML = fields;
  document.getElementById('modal').classList.add('open');
  activeForm = onSubmit;
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  activeForm = null;
}

function formData() {
  const form = document.getElementById('modalForm');
  const data = {};
  new FormData(form).forEach((v, k) => (data[k] = v));
  return data;
}

function readEntries() {
  const data = {};
  document.querySelectorAll('#modalForm [name]').forEach((el) => {
    let val = el.value;
    if (el.type === 'checkbox') val = el.checked;
    data[el.name] = val;
  });
  return data;
}

/* ---------------- STUDENTS ---------------- */
async function loadStudents() {
  const q = document.getElementById('stuSearch').value.trim();
  const url = q ? '/api/students?search=' + encodeURIComponent(q) : '/api/students';
  try {
    const data = await API.get(url);
    document.getElementById('stuBody').innerHTML = data.students.length
      ? data.students.map((s) => `<tr>
          <td><b>${UI.escapeHtml(s.studentId)}</b></td>
          <td>${UI.escapeHtml(s.name)}</td>
          <td>${UI.escapeHtml(s.department)}</td>
          <td>${UI.escapeHtml(s.year)}</td>
          <td>${UI.escapeHtml(s.section)}</td>
          <td>${s.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-sm btn-ghost" onclick="editStudent('${s._id}')">Edit</button>
            ${s.isActive ? `<button class="btn btn-sm btn-danger" onclick="toggleStudent('${s._id}', false)">Disable</button>` : `<button class="btn btn-sm btn-success" onclick="toggleStudent('${s._id}', true)">Enable</button>`}
          </td>
        </tr>`).join('')
      : `<tr class="empty-row"><td colspan="7">No students found.</td></tr>`;
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

async function editStudent(id) {
  try {
    const data = await API.get('/api/students/' + id);
    const s = data.student;
    openModal(
      'Edit Student - ' + s.studentId,
      `
      <div class="form-group"><label>Full name</label><input class="form-control" name="name" value="${UI.escapeHtml(s.name)}" required /></div>
      <div class="form-group"><label>Email</label><input class="form-control" name="email" type="email" value="${UI.escapeHtml(s.email)}" required /></div>
      <div class="form-group"><label>Phone</label><input class="form-control" name="phone" value="${UI.escapeHtml(s.phone || '')}" /></div>
      <div class="form-row">
        <div class="form-group"><label>Department</label><input class="form-control" name="department" value="${UI.escapeHtml(s.department)}" required /></div>
        <div class="form-group"><label>Year</label><input class="form-control" name="year" value="${UI.escapeHtml(s.year)}" required /></div>
      </div>
      <div class="form-group"><label>Section</label><input class="form-control" name="section" value="${UI.escapeHtml(s.section)}" required /></div>
      <div class="form-group"><label>New password (leave blank to keep)</label><input class="form-control" name="password" type="password" /></div>`,
      async () => {
        const d = readEntries();
        const clean = {};
        Object.keys(d).forEach((k) => d[k] !== '' && (clean[k] = d[k]));
        try {
          await API.put('/api/students/' + id, clean);
          UI.toast('Student updated.');
          closeModal();
          loadStudents();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      }
    );
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

async function toggleStudent(id, active) {
  try {
    await API.put('/api/students/' + id, { isActive: active });
    UI.toast(active ? 'Student enabled.' : 'Student disabled.');
    loadStudents();
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

function openStudentForm() {
  openModal(
    'Add Student',
    `
    <div class="form-group"><label>Student ID</label><input class="form-control" name="studentId" placeholder="STU005" required /></div>
    <div class="form-group"><label>Full name</label><input class="form-control" name="name" required /></div>
    <div class="form-group"><label>Email</label><input class="form-control" name="email" type="email" required /></div>
    <div class="form-group"><label>Phone</label><input class="form-control" name="phone" /></div>
    <div class="form-row">
      <div class="form-group"><label>Department</label><input class="form-control" name="department" placeholder="CSE" required /></div>
      <div class="form-group"><label>Year</label><input class="form-control" name="year" placeholder="3rd Year" required /></div>
    </div>
    <div class="form-group"><label>Section</label><input class="form-control" name="section" placeholder="A" required /></div>
    <div class="form-group"><label>Password</label><input class="form-control" name="password" type="password" value="demo123" required /></div>`,
    async () => {
      try {
        const d = readEntries();
        await API.post('/api/students', d);
        UI.toast('Student created. Their QR code is ready.');
        closeModal();
        loadStudents();
        loadOverview();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    }
  );
}

/* ---------------- TEACHERS ---------------- */
async function loadTeachers() {
  const q = document.getElementById('tchSearch').value.trim();
  const url = q ? '/api/teachers?search=' + encodeURIComponent(q) : '/api/teachers';
  try {
    const data = await API.get(url);
    document.getElementById('tchBody').innerHTML = data.teachers.length
      ? data.teachers.map((t) => `<tr>
          <td><b>${UI.escapeHtml(t.teacherId)}</b></td>
          <td>${UI.escapeHtml(t.name)}</td>
          <td>${UI.escapeHtml(t.email)}</td>
          <td>${UI.escapeHtml(t.department || '-')}</td>
          <td>${t.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-sm btn-ghost" onclick="editTeacher('${t._id}')">Edit</button>
            ${t.isActive ? `<button class="btn btn-sm btn-danger" onclick="toggleTeacher('${t._id}', false)">Disable</button>` : `<button class="btn btn-sm btn-success" onclick="toggleTeacher('${t._id}', true)">Enable</button>`}
          </td>
        </tr>`).join('')
      : `<tr class="empty-row"><td colspan="6">No teachers found.</td></tr>`;
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

function openTeacherForm() {
  openModal(
    'Add Teacher',
    `
    <div class="form-group"><label>Teacher ID</label><input class="form-control" name="teacherId" placeholder="TCH003" required /></div>
    <div class="form-group"><label>Full name</label><input class="form-control" name="name" required /></div>
    <div class="form-group"><label>Email</label><input class="form-control" name="email" type="email" required /></div>
    <div class="form-group"><label>Phone</label><input class="form-control" name="phone" /></div>
    <div class="form-group"><label>Department</label><input class="form-control" name="department" placeholder="CSE" /></div>
    <div class="form-group"><label>Password</label><input class="form-control" name="password" type="password" value="demo123" required /></div>`,
    async () => {
      try {
        await API.post('/api/teachers', readEntries());
        UI.toast('Teacher created.');
        closeModal();
        loadTeachers();
        loadOverview();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    }
  );
}

async function editTeacher(id) {
  try {
    const data = await API.get('/api/teachers');
    const t = data.teachers.find((x) => String(x._id) === String(id));
    if (!t) return UI.toast('Teacher not found', 'error');
    openModal(
      'Edit Teacher - ' + t.teacherId,
      `
      <div class="form-group"><label>Full name</label><input class="form-control" name="name" value="${UI.escapeHtml(t.name)}" required /></div>
      <div class="form-group"><label>Email</label><input class="form-control" name="email" type="email" value="${UI.escapeHtml(t.email)}" required /></div>
      <div class="form-group"><label>Phone</label><input class="form-control" name="phone" value="${UI.escapeHtml(t.phone || '')}" /></div>
      <div class="form-group"><label>Department</label><input class="form-control" name="department" value="${UI.escapeHtml(t.department || '')}" /></div>
      <div class="form-group"><label>New password (leave blank to keep)</label><input class="form-control" name="password" type="password" /></div>`,
      async () => {
        const d = readEntries();
        const clean = {};
        Object.keys(d).forEach((k) => d[k] !== '' && (clean[k] = d[k]));
        try {
          await API.put('/api/teachers/' + id, clean);
          UI.toast('Teacher updated.');
          closeModal();
          loadTeachers();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      }
    );
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

async function toggleTeacher(id, active) {
  try {
    await API.put('/api/teachers/' + id, { isActive: active });
    UI.toast(active ? 'Teacher enabled.' : 'Teacher disabled.');
    loadTeachers();
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

/* ---------------- BUILDINGS ---------------- */
async function loadBuildings() {
  try {
    const data = await API.get('/api/buildings');
    document.getElementById('bldBody').innerHTML = data.buildings.length
      ? data.buildings.map((b) => `<tr>
          <td><b>${UI.escapeHtml(b.code)}</b></td>
          <td>${UI.escapeHtml(b.name)}</td>
          <td>${UI.escapeHtml(b.description || '-')}</td>
          <td>${b.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
          <td style="white-space:nowrap;"><button class="btn btn-sm btn-ghost" onclick="editBuilding('${b._id}')">Edit</button></td>
        </tr>`).join('')
      : `<tr class="empty-row"><td colspan="5">No buildings yet.</td></tr>`;
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

function openBuildingForm() {
  openModal(
    'Add Building',
    `
    <div class="form-group"><label>Building code</label><input class="form-control" name="code" placeholder="C" required /></div>
    <div class="form-group"><label>Name</label><input class="form-control" name="name" placeholder="Block C" required /></div>
    <div class="form-group"><label>Description</label><input class="form-control" name="description" /></div>`,
    async () => {
      try {
        await API.post('/api/buildings', readEntries());
        UI.toast('Building created.');
        closeModal();
        loadBuildings();
        loadOverview();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    }
  );
}

async function editBuilding(id) {
  try {
    const data = await API.get('/api/buildings');
    const b = data.buildings.find((x) => String(x._id) === String(id));
    if (!b) return;
    openModal(
      'Edit Building - ' + b.code,
      `
      <div class="form-group"><label>Code</label><input class="form-control" name="code" value="${UI.escapeHtml(b.code)}" required /></div>
      <div class="form-group"><label>Name</label><input class="form-control" name="name" value="${UI.escapeHtml(b.name)}" required /></div>
      <div class="form-group"><label>Description</label><input class="form-control" name="description" value="${UI.escapeHtml(b.description || '')}" /></div>`,
      async () => {
        try {
          await API.put('/api/buildings/' + id, readEntries());
          UI.toast('Building updated.');
          closeModal();
          loadBuildings();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      }
    );
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

/* ---------------- FLOORS ---------------- */
async function loadFloors() {
  try {
    const data = await API.get('/api/floors');
    document.getElementById('flrBody').innerHTML = data.floors.length
      ? data.floors.map((f) => `<tr>
          <td><b>${UI.escapeHtml(findName(cached.buildings, f.building._id))}</b></td>
          <td>Floor ${UI.escapeHtml(f.floorNumber)}</td>
          <td>${f.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
          <td style="white-space:nowrap;"><button class="btn btn-sm btn-ghost" onclick="deleteFloor('${f._id}')">Delete</button></td>
        </tr>`).join('')
      : `<tr class="empty-row"><td colspan="4">No floors yet.</td></tr>`;
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

function openFloorForm() {
  openModal(
    'Add Floor',
    `
    <div class="form-group"><label>Building</label><select class="form-control" name="building">${selOptions(cached.buildings, (b) => b.name, (b) => b._id)}</select></div>
    <div class="form-group"><label>Floor number</label><input class="form-control" name="floorNumber" placeholder="1" required /></div>`,
    async () => {
      try {
        await API.post('/api/floors', readEntries());
        UI.toast('Floor created.');
        closeModal();
        refreshCache().then(loadFloors);
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    }
  );
}

async function deleteFloor(id) {
  if (!confirm('Delete this floor?')) return;
  try {
    await API.del('/api/floors/' + id);
    UI.toast('Floor deleted.');
    loadFloors();
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

/* ---------------- CLASSROOMS ---------------- */
async function loadClassrooms() {
  try {
    const data = await API.get('/api/classrooms');
    document.getElementById('clsBody').innerHTML = data.classrooms.length
      ? data.classrooms.map((c) => `<tr>
          <td><b>${UI.escapeHtml(c.roomCode)}</b></td>
          <td>${UI.escapeHtml(findName(cached.buildings, c.building._id))}</td>
          <td>Floor ${UI.escapeHtml(c.floor.floorNumber)}</td>
          <td>${UI.escapeHtml(c.name || '-')}</td>
          <td>${c.capacity}</td>
          <td>${c.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
          <td style="white-space:nowrap;"><button class="btn btn-sm btn-ghost" onclick="deleteClassroom('${c._id}')">Delete</button></td>
        </tr>`).join('')
      : `<tr class="empty-row"><td colspan="7">No classrooms yet.</td></tr>`;
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

function openClassroomForm() {
  openModal(
    'Add Classroom',
    `
    <div class="form-group"><label>Room code</label><input class="form-control" name="roomCode" placeholder="A301" required /></div>
    <div class="form-group"><label>Building</label><select class="form-control" name="building" id="clsBuilding">${selOptions(cached.buildings, (b) => b.name, (b) => b._id)}</select></div>
    <div class="form-group"><label>Floor</label><select class="form-control" name="floor" id="clsFloor"></select></div>
    <div class="form-group"><label>Name (optional)</label><input class="form-control" name="name" /></div>
    <div class="form-group"><label>Capacity</label><input class="form-control" name="capacity" type="number" value="60" /></div>`,
    async () => {
      try {
        await API.post('/api/classrooms', readEntries());
        UI.toast('Classroom created.');
        closeModal();
        refreshCache().then(loadClassrooms);
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    }
  );
  // filter floors by chosen building
  const bSel = document.getElementById('clsBuilding');
  const fSel = document.getElementById('clsFloor');
  const fillFloors = () => {
    fSel.innerHTML = selOptions(cached.floors.filter((f) => String(f.building) === String(bSel.value) || String(f.building?._id) === String(bSel.value)), (f) => 'Floor ' + f.floorNumber, (f) => f._id);
  };
  fillFloors();
  bSel.addEventListener('change', fillFloors);
}

async function deleteClassroom(id) {
  if (!confirm('Delete this classroom?')) return;
  try {
    await API.del('/api/classrooms/' + id);
    UI.toast('Classroom deleted.');
    loadClassrooms();
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

/* ---------------- INDOOR ZONES ---------------- */
async function loadZones() {
  try {
    const data = await API.get('/api/zones');
    document.getElementById('zonBody').innerHTML = data.zones.length
      ? data.zones.map((z) => `<tr>
          <td><b>${UI.escapeHtml(z.zoneId)}</b></td>
          <td>${UI.escapeHtml(findName(cached.buildings, z.building._id))}</td>
          <td>Floor ${UI.escapeHtml(z.floor.floorNumber)}</td>
          <td>${UI.escapeHtml(z.room.roomCode)}</td>
          <td class="mono">${UI.escapeHtml(z.beaconId || '-')}</td>
          <td class="mono">${UI.escapeHtml(z.wifiSsid || '-')}</td>
          <td>${z.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
          <td style="white-space:nowrap;"><button class="btn btn-sm btn-ghost" onclick="deleteZone('${z._id}')">Delete</button></td>
        </tr>`).join('')
      : `<tr class="empty-row"><td colspan="8">No indoor zones yet.</td></tr>`;
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

function openZoneForm() {
  openModal(
    'Add Indoor Zone',
    `
    <div class="form-group"><label>Zone ID</label><input class="form-control" name="zoneId" placeholder="ZONE_A101" required /></div>
    <div class="form-group"><label>Building</label><select class="form-control" name="building" id="zonBuilding">${selOptions(cached.buildings, (b) => b.name, (b) => b._id)}</select></div>
    <div class="form-group"><label>Floor</label><select class="form-control" name="floor" id="zonFloor"></select></div>
    <div class="form-group"><label>Room</label><select class="form-control" name="room" id="zonRoom"></select></div>
    <div class="form-group"><label>BLE Beacon ID</label><input class="form-control" name="beaconId" placeholder="BEACON_A1" /></div>
    <div class="form-group"><label>Wi-Fi SSID</label><input class="form-control" name="wifiSsid" /></div>`,
    async () => {
      try {
        await API.post('/api/zones', readEntries());
        UI.toast('Indoor zone created.');
        closeModal();
        refreshCache().then(loadZones);
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    }
  );
  const bSel = document.getElementById('zonBuilding');
  const fSel = document.getElementById('zonFloor');
  const rSel = document.getElementById('zonRoom');
  const fill = () => {
    const floors = cached.floors.filter((f) => String(f.building) === String(bSel.value) || String(f.building?._id) === String(bSel.value));
    fSel.innerHTML = selOptions(floors, (f) => 'Floor ' + f.floorNumber, (f) => f._id);
    const floorIds = new Set(floors.map((f) => String(f._id)));
    const rooms = cached.classrooms.filter((c) => floorIds.has(String(c.floor)) || floorIds.has(String(c.floor?._id)));
    rSel.innerHTML = selOptions(rooms, (c) => `${c.roomCode} (Floor ${c.floor.floorNumber})`, (c) => c._id);
  };
  fill();
  bSel.addEventListener('change', fill);
}

async function deleteZone(id) {
  if (!confirm('Delete this indoor zone?')) return;
  try {
    await API.del('/api/zones/' + id);
    UI.toast('Indoor zone deleted.');
    loadZones();
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

/* ---------------- SUBJECTS ---------------- */
async function loadSubjects() {
  try {
    const data = await API.get('/api/subjects');
    document.getElementById('subBody').innerHTML = data.subjects.length
      ? data.subjects.map((s) => `<tr>
          <td><b>${UI.escapeHtml(s.subjectCode)}</b></td>
          <td>${UI.escapeHtml(s.name)}</td>
          <td>${UI.escapeHtml(s.department || '-')}</td>
          <td>${UI.escapeHtml(s.year || '-')}</td>
          <td>${s.credits}</td>
          <td>${s.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
          <td style="white-space:nowrap;"><button class="btn btn-sm btn-ghost" onclick="deleteSubject('${s._id}')">Delete</button></td>
        </tr>`).join('')
      : `<tr class="empty-row"><td colspan="7">No subjects yet.</td></tr>`;
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

function openSubjectForm() {
  openModal(
    'Add Subject',
    `
    <div class="form-group"><label>Subject code</label><input class="form-control" name="subjectCode" placeholder="CS104" required /></div>
    <div class="form-group"><label>Name</label><input class="form-control" name="name" required /></div>
    <div class="form-row">
      <div class="form-group"><label>Department</label><input class="form-control" name="department" placeholder="CSE" /></div>
      <div class="form-group"><label>Year</label><input class="form-control" name="year" placeholder="3rd Year" /></div>
    </div>
    <div class="form-group"><label>Credits</label><input class="form-control" name="credits" type="number" value="4" /></div>`,
    async () => {
      try {
        await API.post('/api/subjects', readEntries());
        UI.toast('Subject created.');
        closeModal();
        loadSubjects();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    }
  );
}

async function deleteSubject(id) {
  if (!confirm('Delete this subject?')) return;
  try {
    await API.del('/api/subjects/' + id);
    UI.toast('Subject deleted.');
    loadSubjects();
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

/* ---------------- TIMETABLE ---------------- */
async function loadTimetable() {
  try {
    const data = await API.get('/api/timetable');
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const rows = [...data.timetable].sort(
      (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime)
    );
    document.getElementById('ttBody').innerHTML = rows.length
      ? rows.map((e) => `<tr>
          <td><b>${UI.escapeHtml(e.day)}</b></td>
          <td>${UI.escapeHtml(e.startTime)}-${UI.escapeHtml(e.endTime)}</td>
          <td>${UI.escapeHtml(e.subject.name)} <span class="badge badge-plain">${UI.escapeHtml(e.subject.subjectCode)}</span></td>
          <td>${UI.escapeHtml(e.department)} ${UI.escapeHtml(e.year)} ${UI.escapeHtml(e.section)}</td>
          <td>${UI.escapeHtml(e.teacher.name)}</td>
          <td>${UI.escapeHtml(findName(cached.buildings, e.building._id))} / F${UI.escapeHtml(e.floor.floorNumber)} / <b>${UI.escapeHtml(e.room.roomCode)}</b></td>
          <td>${e.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
          <td style="white-space:nowrap;"><button class="btn btn-sm btn-ghost" onclick="deleteTimetable('${e._id}')">Delete</button></td>
        </tr>`).join('')
      : `<tr class="empty-row"><td colspan="8">No timetable entries yet.</td></tr>`;
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

function openTimetableForm() {
  openModal(
    'Add Timetable Slot',
    `
    <div class="form-row">
      <div class="form-group"><label>Department</label><input class="form-control" name="department" value="CSE" required /></div>
      <div class="form-group"><label>Year</label><input class="form-control" name="year" value="3rd Year" required /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Section</label><input class="form-control" name="section" value="A" required /></div>
      <div class="form-group"><label>Day</label><select class="form-control" name="day">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d) => `<option>${d}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label>Subject</label><select class="form-control" name="subject">${selOptions(cached.subjects, (s) => `${s.subjectCode} - ${s.name}`, (s) => s._id)}</select></div>
    <div class="form-group"><label>Teacher</label><select class="form-control" name="teacher">${selOptions(cached.teachers, (t) => `${t.teacherId} - ${t.name}`, (t) => t._id)}</select></div>
    <div class="form-row">
      <div class="form-group"><label>Start time</label><input class="form-control" name="startTime" type="time" value="10:00" required /></div>
      <div class="form-group"><label>End time</label><input class="form-control" name="endTime" type="time" value="11:00" required /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Building</label><select class="form-control" name="building" id="ttBuilding">${selOptions(cached.buildings, (b) => b.name, (b) => b._id)}</select></div>
      <div class="form-group"><label>Floor</label><select class="form-control" name="floor" id="ttFloor"></select></div>
    </div>
    <div class="form-group"><label>Room</label><select class="form-control" name="room" id="ttRoom"></select></div>`,
    async () => {
      try {
        await API.post('/api/timetable', readEntries());
        UI.toast('Timetable slot created.');
        closeModal();
        refreshCache().then(loadTimetable);
        loadOverview();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    }
  );
  // chained filters: building -> floor -> room
  const bSel = document.getElementById('ttBuilding');
  const fSel = document.getElementById('ttFloor');
  const rSel = document.getElementById('ttRoom');
  const fill = () => {
    const floors = cached.floors.filter((f) => String(f.building) === String(bSel.value) || String(f.building?._id) === String(bSel.value));
    fSel.innerHTML = selOptions(floors, (f) => 'Floor ' + f.floorNumber, (f) => f._id);
    const floorIds = new Set(floors.map((f) => String(f._id)));
    const rooms = cached.classrooms.filter((c) => floorIds.has(String(c.floor)) || floorIds.has(String(c.floor?._id)));
    rSel.innerHTML = selOptions(rooms, (c) => `${c.roomCode} (Floor ${c.floor.floorNumber})`, (c) => c._id);
  };
  fill();
  bSel.addEventListener('change', fill);
}

async function deleteTimetable(id) {
  if (!confirm('Delete this timetable slot?')) return;
  try {
    await API.del('/api/timetable/' + id);
    UI.toast('Timetable slot deleted.');
    loadTimetable();
    loadOverview();
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

/* ---------------- SETTINGS ---------------- */
async function loadSettings() {
  try {
    const data = await API.get('/api/settings');
    const s = data.settings;
    document.getElementById('setLat').value = s.collegeLat;
    document.getElementById('setLng').value = s.collegeLng;
    document.getElementById('setRadius').value = s.geofenceRadius;
    document.getElementById('setRejectOutside').checked = !!s.rejectOutsideGeoFence;
    document.getElementById('setRejectWrong').checked = !!s.rejectWrongLocation;
    document.getElementById('setDemoIndoor').checked = !!s.demoIndoorMode;
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

async function saveSettings() {
  const payload = {
    collegeLat: Number(document.getElementById('setLat').value) || 0,
    collegeLng: Number(document.getElementById('setLng').value) || 0,
    geofenceRadius: Number(document.getElementById('setRadius').value) || 100,
    rejectOutsideGeoFence: document.getElementById('setRejectOutside').checked,
    rejectWrongLocation: document.getElementById('setRejectWrong').checked,
    demoIndoorMode: document.getElementById('setDemoIndoor').checked,
  };
  try {
    await API.put('/api/settings', payload);
    UI.toast('Settings saved.');
    loadOverview();
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

/* ---------------- LOGS ---------------- */
async function loadLogs() {
  const level = document.getElementById('logLevel').value;
  const action = document.getElementById('logAction').value.trim();
  const params = new URLSearchParams({ limit: '100' });
  if (level) params.set('level', level);
  if (action) params.set('action', action);
  try {
    const data = await API.get('/api/logs?' + params.toString());
    const box = document.getElementById('logBox');
    box.innerHTML = data.logs.length
      ? data.logs
          .map(
            (l) => `<div class="log-line">
              <span class="badge badge-plain">${UI.escapeHtml(UI.formatTime(l.createdAt))}</span>
              <span class="badge ${l.level === 'error' ? 'badge-danger' : l.level === 'warn' ? 'badge-warning' : 'badge-info'}">${UI.escapeHtml(l.level)}</span>
              <b>${UI.escapeHtml(l.action)}</b> &mdash; ${UI.escapeHtml(l.message || '')}
              <span class="text-muted text-sm">by ${UI.escapeHtml(l.userId ? (l.userId.name || 'unknown') : 'system')}</span>
            </div>`
          )
          .join('')
      : '<p class="text-muted">No log entries match.</p>';
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}