/* ═══════════════════════════════════════════════════
   ZITLAS — Login / Sign Up Logic
   login.js
═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  var SESSION_KEY = 'zitlas_session';
  var TOKEN_KEY   = 'zitlas_token';
  var USERS_KEY   = 'zitlas_users';   // fallback local store

  /* ── Purge ALL stale academy / opportunities keys ── */
  var BAD_TERMS = ['academy', 'opportunities', 'academy-opportunities'];

  function containsBadTerm(s) {
    for (var i = 0; i < BAD_TERMS.length; i++) {
      if (s.indexOf(BAD_TERMS[i]) !== -1) return true;
    }
    return false;
  }

  try {
    for (var _i = localStorage.length - 1; _i >= 0; _i--) {
      var _k = localStorage.key(_i);
      var _v = localStorage.getItem(_k) || '';
      if (containsBadTerm(_k) || containsBadTerm(_v)) localStorage.removeItem(_k);
    }
  } catch (e) {}

  try {
    for (var _j = sessionStorage.length - 1; _j >= 0; _j--) {
      var _sk = sessionStorage.key(_j);
      var _sv = sessionStorage.getItem(_sk) || '';
      if (containsBadTerm(_sk) || containsBadTerm(_sv)) sessionStorage.removeItem(_sk);
    }
  } catch (e) {}

  /* ── Detect serving context ──────────────────────── */
  var USE_BACKEND = (window.location.protocol === 'http:' || window.location.protocol === 'https:');
  var API_BASE    = '/api';

  /* ── Post-login destination ─────────────────────── */
  function getApplyUrl() {
    return 'apply/apply.html';
  }

  /* ── Auto-redirect if already logged in ─────────── */
  try {
    var existing = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (existing && existing.isLoggedIn) {
      window.location.replace(getApplyUrl(existing.role));
    }
  } catch (e) {}

  /* ── Session helpers ─────────────────────────────── */
  function saveSession(user, token) {
    var session = {
      isLoggedIn: true,
      role:       user.role,
      name:       user.name,
      email:      user.email  || '',
      phone:      user.phone  || '',
      picture:    user.picture || '',
      joinedAt:   user.created_at || user.joinedAt || '',
      authMethod: user.authMethod || 'password',
      loginTime:  new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (token) localStorage.setItem(TOKEN_KEY, token);

    /* currentUser — read by application forms to prefill fields */
    localStorage.setItem('currentUser', JSON.stringify({
      id:        user.id       || '',
      name:      user.name     || '',
      email:     user.email    || '',
      phone:     user.phone    || '',
      photoURL:  user.picture  || '',
      authMethod: user.authMethod || 'password'
    }));

    return session;
  }

  /* Called by the Firebase module script after successful Google login */
  window._zitlasFinish = function (user, token) {
    saveSession(user, token);
    window.location.replace(getApplyUrl(user.role));
  };

  /* ── Validation ──────────────────────────────────── */
  function isEmail(v)      { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
  function isPhone(v)      { return /^[6-9]\d{9}$/.test(v.trim()); }
  function isValidCred(v)  { return isEmail(v) || isPhone(v); }

  /* ── UI helpers ──────────────────────────────────── */
  function showErr(elId, msg) {
    var el = document.getElementById(elId);
    if (el) { el.textContent = msg; el.classList.add('show'); }
  }
  function hideErr(elId) {
    var el = document.getElementById(elId);
    if (el) el.classList.remove('show');
  }
  function setLoading(btnId, loading) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.7' : '1';
  }

  /* ══════════════════════════════════════════════════
     BACKEND MODE  (served via HTTP/HTTPS)
  ══════════════════════════════════════════════════ */

  function apiLogin(cred, pass) {
    setLoading('loginBtn', true);
    hideErr('loginError');

    fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cred, password: pass })
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
      .then(function (r) {
        setLoading('loginBtn', false);
        if (!r.ok) {
          showErr('loginError', r.data.detail || 'Login failed. Please try again.');
          return;
        }
        saveSession(r.data.user, r.data.access_token);
        window.location.replace(getApplyUrl(r.data.user.role));
      })
      .catch(function () {
        setLoading('loginBtn', false);
        showErr('loginError', 'Cannot reach server. Check your connection and try again.');
      });
  }

  function apiSignup(name, cred, pass) {
    setLoading('signupBtn', true);
    hideErr('signupError');

    var body = {
      name:     name,
      password: pass,
      role:     'nutritionist',
      email:    isEmail(cred) ? cred.toLowerCase() : null,
      phone:    isPhone(cred) ? cred : null
    };

    fetch(API_BASE + '/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
      .then(function (r) {
        setLoading('signupBtn', false);
        if (!r.ok) {
          showErr('signupError', r.data.detail || 'Sign up failed. Please try again.');
          return;
        }
        saveSession(r.data.user, r.data.access_token);
        window.location.replace('apply/apply.html');
      })
      .catch(function () {
        setLoading('signupBtn', false);
        showErr('signupError', 'Cannot reach server. Check your connection and try again.');
      });
  }

  /* ══════════════════════════════════════════════════
     LOCAL FALLBACK  (file:// protocol or offline)
  ══════════════════════════════════════════════════ */

  function getLocalUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (e) { return []; }
  }

  function findLocalUser(credential) {
    var lc = credential.trim().toLowerCase();
    return getLocalUsers().find(function (u) {
      return (u.email && u.email.toLowerCase() === lc) || (u.phone && u.phone === lc);
    });
  }

  function localLogin(cred, pass) {
    var user = findLocalUser(cred);
    if (!user) {
      if (isValidCred(cred) && pass.length >= 6) {
        var demo = {
          id: Date.now().toString(36), name: 'ZITLAS User',
          email: isEmail(cred) ? cred : '', phone: isPhone(cred) ? cred : '',
          password: pass, role: 'nutritionist'
        };
        var users = getLocalUsers(); users.push(demo);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        saveSession(demo, null);
        window.location.replace(getApplyUrl(demo.role));
        return;
      }
      showErr('loginError', 'No account found. Please create an account first.');
      return;
    }
    if (user.password !== pass) { showErr('loginError', 'Incorrect password.'); return; }
    saveSession(user, null);
    window.location.replace(getApplyUrl(user.role));
  }

  function localSignup(name, cred, pass) {
    if (findLocalUser(cred)) {
      showErr('signupError', 'An account with this email/phone already exists.');
      return;
    }
    var newUser = {
      id: Date.now().toString(36), name: name,
      email: isEmail(cred) ? cred.toLowerCase() : '',
      phone: isPhone(cred) ? cred : '',
      password: pass, role: 'nutritionist'
    };
    var users = getLocalUsers(); users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    saveSession(newUser, null);
    window.location.replace('apply/apply.html');
  }

  /* ══════════════════════════════════════════════════
     FORM HANDLERS
  ══════════════════════════════════════════════════ */

  function doLogin() {
    var cred = (document.getElementById('loginCredential').value || '').trim();
    var pass = (document.getElementById('loginPassword').value || '');
    hideErr('loginError');
    if (!cred) { showErr('loginError', 'Please enter your email or mobile number.'); return; }
    if (!pass)  { showErr('loginError', 'Please enter your password.'); return; }
    if (USE_BACKEND) apiLogin(cred, pass);
    else             localLogin(cred, pass);
  }

  function doSignup() {
    var name    = (document.getElementById('signupName').value || '').trim();
    var cred    = (document.getElementById('signupCredential').value || '').trim();
    var pass    = (document.getElementById('signupPassword').value || '');
    var confirm = (document.getElementById('signupConfirmPassword').value || '');
    hideErr('signupError');
    if (!name) { showErr('signupError', 'Please enter your full name.'); return; }
    if (!cred) { showErr('signupError', 'Please enter your email or mobile number.'); return; }
    if (!isValidCred(cred)) { showErr('signupError', 'Enter a valid email or 10-digit mobile number.'); return; }
    if (pass.length < 6) { showErr('signupError', 'Password must be at least 6 characters.'); return; }
    if (pass !== confirm) { showErr('signupError', 'Passwords do not match.'); return; }
    if (USE_BACKEND) apiSignup(name, cred, pass);
    else             localSignup(name, cred, pass);
  }

  /* ── View switching ──────────────────────────────── */
  function showView(id) {
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
  }

  /* ── Password visibility toggle ─────────────────── */
  function bindPwToggle(toggleId, inputId) {
    var btn = document.getElementById(toggleId);
    var inp = document.getElementById(inputId);
    if (!btn || !inp) return;
    btn.addEventListener('click', function () {
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.innerHTML = show
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  }
  bindPwToggle('loginPwToggle',  'loginPassword');
  bindPwToggle('signupPwToggle', 'signupPassword');

  /* ── Skip for Now → Apply selector ──────────────── */
  var skipBtn = document.getElementById('skipBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', function () {
      window.location.replace('apply/apply.html');
    });
  }

  /* ── Google Sign-in (Firebase) ──────────────────── */
  var googleBtn = document.getElementById('googleBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', function () {
      if (typeof window._zitlasGoogleSignIn === 'function') {
        window._zitlasGoogleSignIn();
      } else {
        showErr('loginError', 'Google sign-in is loading. Please try again in a moment.');
      }
    });
  }

  /* ── Event bindings ──────────────────────────────── */
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('signupBtn').addEventListener('click', doSignup);
  document.getElementById('goSignup').addEventListener('click', function () { showView('viewSignup'); });
  document.getElementById('goLogin').addEventListener('click', function () { showView('viewLogin'); });
  document.getElementById('backToLogin').addEventListener('click', function () { showView('viewLogin'); });
  document.getElementById('forgotLink').addEventListener('click', function (e) {
    e.preventDefault();
    alert('Password reset coming soon. Please create a new account.');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    if (document.getElementById('viewLogin').classList.contains('active')) doLogin();
    else doSignup();
  });

})();
