/* ============================================================
   api.js - Central API client
   Handles the base URL, auth token, JSON parsing and errors.
   ============================================================ */

// The backend serves these pages, so same-origin works.
// If you open the HTML files directly (file://), change API_BASE to:
//   const API_BASE = 'http://localhost:5000';
const API_BASE = '';

const API = {
  // Attach the stored JWT if present
  _headers(extra = {}) {
    const token = localStorage.getItem('sat_token');
    const headers = {
      'Content-Type': 'application/json',
      ...extra,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  },

  async request(method, path, body = null) {
    const options = { method, headers: this._headers() };
    if (body !== null) options.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(API_BASE + path, options);
    } catch (err) {
      throw new ApiError(
        'Could not reach the server. Is the backend running? (npm start in /backend)',
        -1
      );
    }

    let data = null;
    try {
      data = await res.json();
    } catch (err) {
      // non-JSON response
    }

    if (!res.ok) {
      // 401 usually means expired/invalid token -> clear it
      if (res.status === 401 && path !== '/api/auth/login') {
        Auth.clearSession();
      }
      throw new ApiError(
        data && data.message ? data.message : 'Request failed',
        res.status,
        data
      );
    }
    return data;
  },

  get(path) {
    return this.request('GET', path);
  },
  post(path, body) {
    return this.request('POST', path, body);
  },
  put(path, body) {
    return this.request('PUT', path, body);
  },
  del(path) {
    return this.request('DELETE', path);
  },
};

/* Friendly error object */
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/* Simple auth/session helpers shared by all pages */
const Auth = {
  getToken() {
    return localStorage.getItem('sat_token');
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('sat_user') || 'null');
    } catch (err) {
      return null;
    }
  },
  setSession(token, user) {
    localStorage.setItem('sat_token', token);
    localStorage.setItem('sat_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('sat_token');
    localStorage.removeItem('sat_user');
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  role() {
    const u = this.getUser();
    return u ? u.role : null;
  },
  // Redirect to the correct dashboard for the role
  goToDashboard(user) {
    const role = user ? user.role : this.role();
    const pages = {
      student: 'student-dashboard.html',
      teacher: 'teacher-dashboard.html',
      admin: 'admin-dashboard.html',
    };
    window.location.href = pages[role] || 'login.html';
  },
};