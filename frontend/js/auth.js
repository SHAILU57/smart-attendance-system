/* ============================================================
   auth.js - Logic for login.html and register.html
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, go to their dashboard
  if (Auth.isLoggedIn() && (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html'))) {
    Auth.goToDashboard();
    return;
  }

  initNavToggle();
  attachLogin();
  attachRegister();
  attachDemoFill();
});

/* ---------- shared helpers ---------- */

function setFieldState(input, errorEl, valid) {
  input.classList.remove('invalid', 'valid');
  if (valid === true) {
    input.classList.add('valid');
    errorEl.classList.remove('show');
  } else if (valid === false) {
    input.classList.add('invalid');
    errorEl.classList.add('show');
  } else {
    errorEl.classList.remove('show');
  }
}

function showToast(message, type = 'success') {
  const icons = { success: '\u2714', error: '\u26A0', warning: '\u26A0' };
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.success}</span><span class="t-msg">${message}</span>`;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, 4200);
}

/* ---------- navbar toggle (mobile) ---------- */

function initNavToggle() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }
}

/* ---------- LOGIN ---------- */

function attachLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const btn = document.getElementById('loginBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // client-side validation
    let ok = true;
    const emailOk = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email.value.trim());
    setFieldState(email, document.getElementById('emailError'), emailOk);
    if (!emailOk) ok = false;

    const passOk = password.value.length >= 6;
    setFieldState(password, document.getElementById('passwordError'), passOk);
    if (!passOk) ok = false;

    if (!ok) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Logging in...';

    try {
      const data = await API.post('/api/auth/login', {
        email: email.value.trim(),
        password: password.value,
      });
      Auth.setSession(data.token, data.user);
      showToast(data.message || 'Login successful!');
      setTimeout(() => Auth.goToDashboard(data.user), 700);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  });

  // clear error state on typing
  [email, password].forEach((el) =>
    el.addEventListener('input', () => setFieldState(el, el.nextElementSibling, null))
  );
}

/* ---------- REGISTER ---------- */

function attachRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const fields = {
    studentId: document.getElementById('studentId'),
    name: document.getElementById('name'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    department: document.getElementById('department'),
    year: document.getElementById('year'),
    section: document.getElementById('section'),
    password: document.getElementById('password'),
    confirmPassword: document.getElementById('confirmPassword'),
  };
  const btn = document.getElementById('registerBtn');
  const pwBar = document.getElementById('pwBar');

  // live password strength visual
  fields.password.addEventListener('input', () => {
    const v = fields.password.value;
    let score = 0;
    if (v.length >= 6) score++;
    if (/[A-Za-z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    const pct = (score / 3) * 100;
    pwBar.style.width = pct + '%';
    pwBar.style.background =
      pct <= 33 ? 'var(--danger)' : pct <= 66 ? 'var(--warning)' : 'var(--success)';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let ok = true;
    const E = (id, valid) => setFieldState(fields[id], document.getElementById(id + 'Error'), valid);

    E('studentId', fields.studentId.value.trim().length >= 3);
    E('name', fields.name.value.trim().length >= 3);
    E('email', /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(fields.email.value.trim()));

    const phoneVal = fields.phone.value.trim();
    const phoneOk = phoneVal === '' || /^[0-9+\-\s]{10,15}$/.test(phoneVal);
    E('phone', phoneOk);

    E('department', fields.department.value !== '');
    E('year', fields.year.value !== '');
    E('section', fields.section.value !== '');

    const passOk = fields.password.value.length >= 6 &&
      /[A-Za-z]/.test(fields.password.value) && /[0-9]/.test(fields.password.value);
    E('password', passOk);

    const confirmOk = fields.confirmPassword.value === fields.password.value;
    E('confirmPassword', confirmOk);

    // verify each result only updates styles; collect overall
    if (!passOk || !confirmOk) ok = false;
    if (fields.studentId.value.trim().length < 3 ||
        fields.name.value.trim().length < 3 ||
        !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(fields.email.value.trim()) ||
        !phoneOk ||
        fields.department.value === '' ||
        fields.year.value === '' ||
        fields.section.value === '') {
      ok = false;
    }
    if (!ok) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating account...';

    try {
      const data = await API.post('/api/auth/register', {
        studentId: fields.studentId.value,
        name: fields.name.value,
        email: fields.email.value,
        phone: fields.phone.value,
        department: fields.department.value,
        year: fields.year.value,
        section: fields.section.value,
        password: fields.password.value,
      });
      Auth.setSession(data.token, data.user);
      showToast('Registration successful! Your QR code is ready.');
      setTimeout(() => Auth.goToDashboard(data.user), 900);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Create account';
    }
  });
}

/* ---------- demo credential loader ---------- */

function attachDemoFill() {
  const link = document.getElementById('demoFill');
  if (!link) return;

  link.addEventListener('click', async () => {
    try {
      const data = await API.get('/api/auth/demo');
      const demo = data.demo;
      const emailInput = document.getElementById('email');
      const passInput = document.getElementById('password');
      if (emailInput && demo.student) {
        emailInput.value = demo.student.email;
        passInput.value = demo.student.password;
        showToast('Demo student credentials loaded. Click Login.');
      } else {
        showToast('Demo accounts not seeded yet. Run: npm run seed', 'warning');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}