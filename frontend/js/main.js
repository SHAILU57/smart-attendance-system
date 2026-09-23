/* ============================================================
   main.js - Shared helpers used on every page
   ============================================================ */

const UI = {
  // toast notifications
  toast(message, type = 'success') {
    const icons = { success: '\u2714', error: '\u26A0', warning: '\u26A0', info: '\u2139' };
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || icons.info}</span><span class="t-msg">${message}</span>`;
    wrap.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 350);
    }, 4200);
  },

  // escape HTML to prevent XSS when injecting user data
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // date helpers (local timezone)
  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },
  formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  },

  // status badge html
  badge(status) {
    const map = {
      PRESENT: 'badge-success',
      ABSENT: 'badge-danger',
      REJECTED: 'badge-danger',
      PENDING: 'badge-warning',
      ACTIVE: 'badge-success',
      INACTIVE: 'badge-plain',
      ONGOING: 'badge-info',
      ASSIGNED: 'badge-primary',
    };
    const cls = map[status] || 'badge-plain';
    return `<span class="badge ${cls}">${this.escapeHtml(status)}</span>`;
  },

  // form helper: highlight invalid fields
  setFieldState(input, errorEl, valid) {
    input.classList.remove('invalid', 'valid');
    if (valid === true) {
      input.classList.add('valid');
      errorEl && errorEl.classList.remove('show');
    } else if (valid === false) {
      input.classList.add('invalid');
      errorEl && errorEl.classList.add('show');
    } else {
      errorEl && errorEl.classList.remove('show');
    }
  },

  // load a JSON-encoded user into a form
  fillSelect(select, options, selectedValue) {
    select.innerHTML = '<option value="">-- Select --</option>' +
      options.map((o) => {
        const val = o.value !== undefined ? o.value : o;
        const label = o.label !== undefined ? o.label : o;
        const sel = String(val) === String(selectedValue) ? ' selected' : '';
        return `<option value="${this.escapeHtml(val)}"${sel}>${this.escapeHtml(label)}</option>`;
      }).join('');
    return select;
  },
};

/* Navbar: build shared nav + role-aware links */
function buildNav(activeLabel) {
  const user = Auth.getUser();
  const isLogged = Auth.isLoggedIn();

  // logs user out (used by logout links via data-logout attr)
  document.querySelectorAll('[data-logout]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await API.post('/api/auth/logout', {});
      } catch (err) {
        /* token may already be invalid - ignore */
      }
      Auth.clearSession();
      UI.toast('Logged out successfully', 'info');
      setTimeout(() => (window.location.href = 'login.html'), 600);
    });
  });

  // redirect dashboard brand link by role
  const brand = document.querySelector('.brand');
  if (brand && isLogged) {
    brand.href = roleDashboard(user && user.role);
  }

  // if a page needs authentication, protect it
  const protectedPages = ['student-dashboard', 'teacher-dashboard', 'admin-dashboard',
    'attendance', 'qr-scanner', 'face-register', 'face-verify', 'timetable',
    'attendance-history', 'reports'];
  const current = (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '');
  if (protectedPages.includes(current) && !isLogged) {
    window.location.href = 'login.html';
    return;
  }

  // role-level gate
  const roleGates = {
    'teacher-dashboard': ['teacher', 'admin'],
    'admin-dashboard': ['admin'],
    attendance: ['student'],
    reports: ['teacher', 'admin'],
  };
  if (roleGates[current] && user && !roleGates[current].includes(user.role)) {
    Auth.goToDashboard();
  }
}

function roleDashboard(role) {
  return {
    student: 'student-dashboard.html',
    teacher: 'teacher-dashboard.html',
    admin: 'admin-dashboard.html',
  }[role] || 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }
  buildNav && buildNav();
});