/* ═══════════════════════════════════════════════════
   ZITLAS — Login Popup
   shared/login-popup.js

   Usage:
     window.ZitlasAuth.requireLogin(callback, optionalMessage)

   If already logged in, callback fires immediately.
   Otherwise a bottom-sheet login popup appears.
   "Skip for Now" closes popup without callback.
═══════════════════════════════════════════════════ */

window.ZitlasAuth = (function () {
  'use strict';

  var SESSION_KEY  = 'zitlas_session';
  var TOKEN_KEY    = 'zitlas_token';
  var USERS_KEY    = 'zitlas_users';
  var USE_BACKEND  = (location.protocol === 'http:' || location.protocol === 'https:');
  var API_BASE     = '/api';

  var _pending = null;
  var _popup   = null;

  /* ── Public API ──────────────────────────────────── */

  function isLoggedIn() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY));
      var t = localStorage.getItem(TOKEN_KEY);
      return (s && s.isLoggedIn) || !!t;
    } catch (e) { return false; }
  }

  function requireLogin(callback, message) {
    if (isLoggedIn()) { if (callback) callback(); return; }
    _pending = callback || null;
    _open(message || 'Login to book a consultation.\nYou can still browse experts without an account.');
  }

  /* ── Session ─────────────────────────────────────── */

  function _save(user, token) {
    var s = { isLoggedIn: true, role: user.role, name: user.name,
              email: user.email || '', phone: user.phone || '',
              picture: user.picture || '',
              joinedAt: user.created_at || user.joinedAt || '',
              loginTime: new Date().toISOString() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    if (token) localStorage.setItem(TOKEN_KEY, token);
  }

  function _onSuccess(user, token) {
    _save(user, token);
    _close();
    if (_pending) {
      var cb = _pending;
      _pending = null;
      setTimeout(cb, 80);
    }
  }

  /* ── Open / Close ────────────────────────────────── */

  function _open(msg) {
    if (_popup) { _popup.classList.add('lp-visible'); return; }
    _injectStyles();
    _popup = _buildDOM(msg);
    document.body.appendChild(_popup);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { if (_popup) _popup.classList.add('lp-visible'); });
    });
  }

  function _close() {
    if (!_popup) return;
    _popup.classList.remove('lp-visible');
    var el = _popup;
    _popup = null;
    _pending = null;
    document.body.style.overflow = '';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
  }

  /* ── DOM Builder ─────────────────────────────────── */

  function _buildDOM(msg) {
    var wrap = document.createElement('div');
    wrap.id = 'zitlasLoginPopup';
    wrap.innerHTML = [
      '<div class="lp-backdrop" id="lpBackdrop"></div>',
      '<div class="lp-sheet" id="lpSheet">',
        '<div class="lp-handle-bar"></div>',

        /* ── LOGIN VIEW ── */
        '<div class="lp-view lp-view--active" id="lpViewLogin">',
          '<div class="lp-header">',
            '<button class="lp-close-btn" id="lpCloseBtn" aria-label="Close">',
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            '</button>',
            '<div class="lp-lock-icon">🔒</div>',
            '<div class="lp-hed">Sign in to continue</div>',
            '<div class="lp-msg" id="lpMsg">' + _esc(msg) + '</div>',
          '</div>',
          '<div class="lp-body">',
            '<div class="lp-err" id="lpLoginErr"></div>',
            '<div class="lp-field">',
              '<input class="lp-input" id="lpCred" type="text" placeholder="Email or mobile number" autocomplete="username" />',
            '</div>',
            '<div class="lp-field lp-field--pw">',
              '<input class="lp-input" id="lpPw" type="password" placeholder="Password" autocomplete="current-password" />',
              '<button class="lp-pw-toggle" id="lpPwBtn" type="button" tabindex="-1">',
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
              '</button>',
            '</div>',
            '<button class="lp-btn-primary" id="lpLoginBtn" type="button">Login</button>',
            '<div class="lp-divider"><span>or</span></div>',
            '<button class="lp-btn-google" id="lpGoogleBtn" type="button">',
              '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',
              'Continue with Google',
            '</button>',
            '<button class="lp-btn-skip" id="lpSkipBtn" type="button">Skip for Now</button>',
          '</div>',
          '<div class="lp-footer">',
            'Don\'t have an account? <span class="lp-link" id="lpGoSignup">Create Account</span>',
          '</div>',
        '</div>',/* end login view */

        /* ── SIGNUP VIEW ── */
        '<div class="lp-view" id="lpViewSignup">',
          '<div class="lp-header">',
            '<button class="lp-back-btn" id="lpBackBtn" type="button">',
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
              'Back',
            '</button>',
            '<button class="lp-close-btn" id="lpCloseBtn2" aria-label="Close">',
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            '</button>',
            '<div class="lp-hed" style="margin-top:10px">Create Account</div>',
            '<div class="lp-msg">Join ZITLAS Experts as a Nutritionist or Fitness Trainer</div>',
          '</div>',
          '<div class="lp-body">',
            '<div class="lp-err" id="lpSignupErr"></div>',
            '<div class="lp-field"><input class="lp-input" id="lpName" type="text" placeholder="Full name" autocomplete="name" /></div>',
            '<div class="lp-field"><input class="lp-input" id="lpSCred" type="text" placeholder="Email or mobile number" autocomplete="username" /></div>',
            '<div class="lp-field lp-field--pw">',
              '<input class="lp-input" id="lpSPw" type="password" placeholder="Password (min 6 chars)" autocomplete="new-password" />',
              '<button class="lp-pw-toggle" id="lpSPwBtn" type="button" tabindex="-1">',
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
              '</button>',
            '</div>',
            '<button class="lp-btn-primary" id="lpSignupBtn" type="button">Create Account</button>',
          '</div>',
          '<div class="lp-footer">',
            'Already have an account? <span class="lp-link" id="lpGoLogin">Sign In</span>',
          '</div>',
        '</div>',/* end signup view */

      '</div>',/* end sheet */
    ].join('');

    /* Wire up events */
    wrap.querySelector('#lpBackdrop').addEventListener('click', _close);
    wrap.querySelector('#lpCloseBtn').addEventListener('click', _close);
    wrap.querySelector('#lpCloseBtn2').addEventListener('click', _close);
    wrap.querySelector('#lpSkipBtn').addEventListener('click', _close);
    wrap.querySelector('#lpBackBtn').addEventListener('click', function () { _switchView(wrap, 'login'); });
    wrap.querySelector('#lpGoSignup').addEventListener('click', function () { _switchView(wrap, 'signup'); });
    wrap.querySelector('#lpGoLogin').addEventListener('click', function () { _switchView(wrap, 'login'); });

    /* Login form */
    wrap.querySelector('#lpLoginBtn').addEventListener('click', function () { _doLogin(wrap); });
    _bindPwToggle(wrap, '#lpPwBtn', '#lpPw');

    /* Signup form */
    wrap.querySelector('#lpSignupBtn').addEventListener('click', function () { _doSignup(wrap); });
    _bindPwToggle(wrap, '#lpSPwBtn', '#lpSPw');

    /* Google Sign-in (delegates to Firebase handler on login page) */
    wrap.querySelector('#lpGoogleBtn').addEventListener('click', function () {
      if (typeof window._zitlasGoogleSignIn === 'function') {
        window._zitlasGoogleSignIn();
      } else {
        window.location.href = '/';
      }
    });

    /* Enter key */
    wrap.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var login = wrap.querySelector('#lpViewLogin');
      if (login && login.classList.contains('lp-view--active')) { _doLogin(wrap); }
      else { _doSignup(wrap); }
    });

    return wrap;
  }

  /* ── View switching ──────────────────────────────── */

  function _switchView(wrap, name) {
    wrap.querySelectorAll('.lp-view').forEach(function (v) { v.classList.remove('lp-view--active'); });
    var target = wrap.querySelector(name === 'login' ? '#lpViewLogin' : '#lpViewSignup');
    if (target) target.classList.add('lp-view--active');
    /* scroll sheet back to top */
    var sheet = wrap.querySelector('#lpSheet');
    if (sheet) sheet.scrollTop = 0;
  }

  /* ── Login action ────────────────────────────────── */

  function _doLogin(wrap) {
    var cred  = (wrap.querySelector('#lpCred').value || '').trim();
    var pass  = (wrap.querySelector('#lpPw').value   || '');
    var errEl = wrap.querySelector('#lpLoginErr');
    _hideErr(errEl);

    if (!cred) { _showErr(errEl, 'Please enter your email or mobile number.'); return; }
    if (!pass)  { _showErr(errEl, 'Please enter your password.'); return; }

    var loginBtn = wrap.querySelector('#lpLoginBtn');
    loginBtn.disabled = true;

    if (USE_BACKEND) {
      fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cred, password: pass })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (r) {
          loginBtn.disabled = false;
          if (!r.ok) { _showErr(errEl, r.data.detail || 'Login failed. Try again.'); return; }
          _onSuccess(r.data.user, r.data.access_token);
        })
        .catch(function () {
          loginBtn.disabled = false;
          _showErr(errEl, 'Cannot reach server. Check connection.');
        });
    } else {
      loginBtn.disabled = false;
      var user = _localFind(cred);
      if (!user) {
        if (_validCred(cred) && pass.length >= 6) {
          user = { id: Date.now().toString(36), name: 'ZITLAS User',
                   email: _isEmail(cred) ? cred : '', phone: _isPhone(cred) ? cred : '',
                   password: pass, role: 'nutritionist' };
          var all = _localUsers(); all.push(user);
          localStorage.setItem(USERS_KEY, JSON.stringify(all));
          _onSuccess(user, null); return;
        }
        _showErr(errEl, 'No account found. Please create an account first.'); return;
      }
      if (user.password !== pass) { _showErr(errEl, 'Incorrect password.'); return; }
      _onSuccess(user, null);
    }
  }

  /* ── Signup action ───────────────────────────────── */

  function _doSignup(wrap) {
    var name  = (wrap.querySelector('#lpName').value   || '').trim();
    var cred  = (wrap.querySelector('#lpSCred').value  || '').trim();
    var pass  = (wrap.querySelector('#lpSPw').value    || '');
    var errEl = wrap.querySelector('#lpSignupErr');
    _hideErr(errEl);

    if (!name) { _showErr(errEl, 'Please enter your full name.'); return; }
    if (!cred) { _showErr(errEl, 'Please enter your email or mobile number.'); return; }
    if (!_validCred(cred)) { _showErr(errEl, 'Enter a valid email or 10-digit mobile number.'); return; }
    if (pass.length < 6) { _showErr(errEl, 'Password must be at least 6 characters.'); return; }

    var signupBtn = wrap.querySelector('#lpSignupBtn');
    signupBtn.disabled = true;

    if (USE_BACKEND) {
      fetch(API_BASE + '/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          password: pass,
          role: 'nutritionist',
          email: _isEmail(cred) ? cred.toLowerCase() : null,
          phone: _isPhone(cred) ? cred : null
        })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (r) {
          signupBtn.disabled = false;
          if (!r.ok) { _showErr(errEl, r.data.detail || 'Sign up failed. Try again.'); return; }
          _onSuccess(r.data.user, r.data.access_token);
        })
        .catch(function () {
          signupBtn.disabled = false;
          _showErr(errEl, 'Cannot reach server. Check connection.');
        });
    } else {
      signupBtn.disabled = false;
      if (_localFind(cred)) { _showErr(errEl, 'Account already exists. Please log in.'); return; }
      var newUser = { id: Date.now().toString(36), name: name,
                     email: _isEmail(cred) ? cred.toLowerCase() : '',
                     phone: _isPhone(cred) ? cred : '',
                     password: pass, role: 'nutritionist' };
      var all = _localUsers(); all.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(all));
      _onSuccess(newUser, null);
    }
  }

  /* ── Helpers ─────────────────────────────────────── */

  function _isEmail(v)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
  function _isPhone(v)    { return /^[6-9]\d{9}$/.test(v.trim()); }
  function _validCred(v)  { return _isEmail(v) || _isPhone(v); }
  function _localUsers()  { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch(e) { return []; } }
  function _esc(s)        { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _localFind(cred) {
    var lc = cred.trim().toLowerCase();
    return _localUsers().find(function (u) {
      return (u.email && u.email.toLowerCase() === lc) || (u.phone && u.phone === lc);
    });
  }

  function _showErr(el, msg) { if (el) { el.textContent = msg; el.style.display = 'block'; } }
  function _hideErr(el)      { if (el) { el.style.display = 'none'; el.textContent = ''; } }

  function _bindPwToggle(wrap, btnSel, inputSel) {
    var btn = wrap.querySelector(btnSel);
    var inp = wrap.querySelector(inputSel);
    if (!btn || !inp) return;
    btn.addEventListener('click', function () {
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
    });
  }

  /* ── CSS injection ───────────────────────────────── */

  function _injectStyles() {
    if (document.getElementById('zitlasPopupStyles')) return;
    var s = document.createElement('style');
    s.id = 'zitlasPopupStyles';
    s.textContent = [
      /* overlay */
      '#zitlasLoginPopup{position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;}',
      '#zitlasLoginPopup.lp-visible{pointer-events:all;}',
      '#zitlasLoginPopup .lp-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0);transition:background .28s ease;}',
      '#zitlasLoginPopup.lp-visible .lp-backdrop{background:rgba(0,0,0,.72);}',

      /* sheet */
      '#zitlasLoginPopup .lp-sheet{position:relative;width:100%;max-width:440px;max-height:92dvh;overflow-y:auto;background:#0d1117;border-top:1px solid rgba(255,255,255,.08);border-radius:24px 24px 0 0;padding:0 0 env(safe-area-inset-bottom,16px);transform:translateY(100%);transition:transform .3s cubic-bezier(.32,0,.67,0);}',
      '#zitlasLoginPopup.lp-visible .lp-sheet{transform:translateY(0);transition:transform .32s cubic-bezier(.16,1,.3,1);}',

      /* scrollbar hide */
      '#zitlasLoginPopup .lp-sheet::-webkit-scrollbar{display:none;}',

      /* handle */
      '#zitlasLoginPopup .lp-handle-bar{width:36px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:12px auto 0;}',

      /* view */
      '#zitlasLoginPopup .lp-view{display:none;flex-direction:column;}',
      '#zitlasLoginPopup .lp-view.lp-view--active{display:flex;}',

      /* header */
      '#zitlasLoginPopup .lp-header{padding:16px 20px 0;position:relative;}',
      '#zitlasLoginPopup .lp-close-btn{position:absolute;top:14px;right:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:#9ca3af;cursor:pointer;transition:background .15s;}',
      '#zitlasLoginPopup .lp-close-btn:hover{background:rgba(255,255,255,.12);}',
      '#zitlasLoginPopup .lp-back-btn{display:inline-flex;align-items:center;gap:5px;background:none;border:none;color:#9ca3af;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;padding:0;margin-bottom:6px;}',
      '#zitlasLoginPopup .lp-back-btn:hover{color:#f0f4f0;}',

      /* lock icon + heading */
      '#zitlasLoginPopup .lp-lock-icon{font-size:28px;margin:14px 0 10px;}',
      '#zitlasLoginPopup .lp-hed{font-size:18px;font-weight:800;color:#f0f4f0;letter-spacing:-.02em;margin-bottom:4px;}',
      '#zitlasLoginPopup .lp-msg{font-size:12px;color:#6b7280;line-height:1.5;margin-bottom:4px;white-space:pre-line;}',

      /* body */
      '#zitlasLoginPopup .lp-body{padding:16px 20px 10px;display:flex;flex-direction:column;gap:10px;}',

      /* error */
      '#zitlasLoginPopup .lp-err{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);border-radius:10px;padding:9px 13px;font-size:12px;color:#f87171;display:none;}',

      /* field */
      '#zitlasLoginPopup .lp-field{position:relative;}',
      '#zitlasLoginPopup .lp-field--pw input{padding-right:42px;}',

      /* input */
      '#zitlasLoginPopup .lp-input{width:100%;height:46px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);border-radius:12px;padding:0 14px;font-size:14px;color:#f0f4f0;font-family:inherit;outline:none;transition:border-color .15s;-webkit-appearance:none;box-sizing:border-box;}',
      '#zitlasLoginPopup .lp-input::placeholder{color:#4b5563;}',
      '#zitlasLoginPopup .lp-input:focus{border-color:#FF7A00;}',

      /* pw toggle */
      '#zitlasLoginPopup .lp-pw-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:#4b5563;cursor:pointer;padding:4px;display:flex;}',
      '#zitlasLoginPopup .lp-pw-toggle:hover{color:#9ca3af;}',

      /* primary button */
      '#zitlasLoginPopup .lp-btn-primary{width:100%;height:50px;background:#FF7A00;border:none;border-radius:13px;font-size:15px;font-weight:800;color:#080910;cursor:pointer;font-family:inherit;transition:opacity .12s,transform .1s;}',
      '#zitlasLoginPopup .lp-btn-primary:hover{background:#c8ff33;}',
      '#zitlasLoginPopup .lp-btn-primary:active{opacity:.88;transform:scale(.99);}',
      '#zitlasLoginPopup .lp-btn-primary:disabled{opacity:.4;pointer-events:none;}',

      /* divider */
      '#zitlasLoginPopup .lp-divider{display:flex;align-items:center;gap:10px;color:#4b5563;font-size:11px;font-weight:500;}',
      '#zitlasLoginPopup .lp-divider::before,#zitlasLoginPopup .lp-divider::after{content:"";flex:1;height:1px;background:rgba(255,255,255,.08);}',

      /* google button */
      '#zitlasLoginPopup .lp-btn-google{width:100%;height:46px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);border-radius:13px;font-size:13px;font-weight:600;color:#d1d5db;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;font-family:inherit;transition:background .15s,border-color .15s;}',
      '#zitlasLoginPopup .lp-btn-google:hover{background:rgba(255,255,255,.09);}',

      /* skip button */
      '#zitlasLoginPopup .lp-btn-skip{background:none;border:none;color:#6b7280;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;padding:4px 0;text-align:center;transition:color .15s;letter-spacing:.01em;}',
      '#zitlasLoginPopup .lp-btn-skip:hover{color:#9ca3af;}',

      /* footer */
      '#zitlasLoginPopup .lp-footer{padding:12px 20px 20px;text-align:center;font-size:13px;color:#6b7280;}',
      '#zitlasLoginPopup .lp-link{color:#FF7A00;font-weight:600;cursor:pointer;transition:opacity .15s;}',
      '#zitlasLoginPopup .lp-link:hover{opacity:.8;}',

    ].join('');
    document.head.appendChild(s);
  }

  /* ── Export ──────────────────────────────────────── */
  window.ZitlasAuth = { requireLogin: requireLogin, isLoggedIn: isLoggedIn };

})();
