/* ═══════════════════════════════════════════════════
   ZITLAS Partner Network — Profile / Account Settings
   account-profile.js
═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SESSION_KEY = 'zitlas_session';
  var TOKEN_KEY   = 'zitlas_token';
  var THEME_KEY   = 'zitlas_theme';
  var USE_BACKEND = (location.protocol === 'http:' || location.protocol === 'https:');

  /* ── Session ─────────────────────────────────────── */
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }

  /* ── Helpers ─────────────────────────────────────── */
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getInitials(name) {
    var parts = (name || 'ZP').trim().split(/\s+/);
    return parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ── Apply nav always goes to the role selector ──── */
  var APPLY_URL = '../../apply/apply.html';

  /* ── API helper ──────────────────────────────────── */
  function apiFetch(path) {
    return fetch(path, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); });
  }

  /* ── Build profile from session ──────────────────── */
  function buildProfile() {
    var s    = getSession();
    var name = s.name || '';

    /* hero */
    setText('profileName',  name || '—');
    setText('profileEmail', s.email || '—');

    /* avatar — show Google photo if stored, else initials */
    var avatarEl = document.getElementById('avatarEl');
    if (avatarEl) {
      if (s.picture) {
        var img = document.createElement('img');
        img.src       = s.picture;
        img.alt       = name;
        img.className = 'avatar-photo';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
        img.onerror = function () {
          avatarEl.removeChild(img);
          appendInitials(avatarEl, name);
        };
        avatarEl.appendChild(img);
      } else {
        appendInitials(avatarEl, name);
      }
    }

    /* info rows */
    var mobile = s.phone || s.mobile || '';
    if (mobile && !mobile.startsWith('+')) mobile = '+91 ' + mobile;
    setText('infoMobile', mobile || '—');
    setText('infoSince',  formatDate(s.joinedAt) || '—');

    /* apply nav */
    var applyItem = document.getElementById('applyNavItem');
    if (applyItem) applyItem.href = APPLY_URL;

    /* roles card */
    var role = (s.role || '').toLowerCase();
    buildRoles(role);

    /* fetch real data from API if connected */
    if (USE_BACKEND) {
      loadFromApi(s);
    }
  }

  function appendInitials(avatarEl, name) {
    var div = document.createElement('div');
    div.className   = 'avatar-initials';
    div.textContent = getInitials(name);
    avatarEl.appendChild(div);
  }

  /* ── Load real data from API ─────────────────────── */
  function loadFromApi(s) {
    /* Get real join date from /api/auth/me */
    apiFetch('/api/auth/me').then(function (r) {
      if (!r.ok) return;
      var user = r.data;
      /* Update join date with server value */
      if (user.created_at) setText('infoSince', formatDate(user.created_at));
      /* Update mobile if not in session */
      if (!s.phone && user.phone) {
        var m = user.phone;
        if (!m.startsWith('+')) m = '+91 ' + m;
        setText('infoMobile', m);
      }
    }).catch(function () {});

    /* Get real partner ID from /api/affiliate/me */
    apiFetch('/api/affiliate/me').then(function (r) {
      if (!r.ok) {
        setText('infoPid', '—');
        return;
      }
      var aff = r.data;
      setText('infoPid', aff.affiliate_id || '—');
      /* Show "Verified Account" badge only when affiliate is active */
      if (aff.status === 'active') {
        var pill = document.getElementById('verifiedPill');
        if (pill) pill.style.display = '';
      }
    }).catch(function () {
      setText('infoPid', '—');
    });
  }

  function buildRoles(role) {
    var card = document.getElementById('rolesCard');
    if (!card) return;

    var rows = [];

    /* Affiliate — always shown (all registered partners are affiliates) */
    rows.push(roleRow('affiliate', 'Affiliate'));

    /* Expert roles */
    if (role === 'nutritionist' || role === 'both' || role === 'nutritionist,fitness_coach') {
      rows.push(roleRow('nut', 'Nutritionist'));
    }
    if (role === 'fitness_coach' || role === 'coach' || role === 'both' || role === 'nutritionist,fitness_coach') {
      rows.push(roleRow('coach', 'Fitness Coach'));
    }

    card.innerHTML = rows.join('');
  }

  function roleRow(type, label) {
    return (
      '<div class="role-row">' +
      '<span class="role-check role-check--' + type + '">✓</span>' +
      '<span>' + label + '</span>' +
      '</div>'
    );
  }

  /* ── Settings menu tap feedback ──────────────────── */
  var toastTimer = null;
  function showToast(msg) {
    var t = document.getElementById('appToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2500);
  }

  document.querySelectorAll('.menu-item[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var msgs = {
        edit:     'Edit Profile — coming soon',
        password: 'Change Password — coming soon',
        notif:    'Notification Settings — coming soon',
        privacy:  'Privacy Settings — coming soon',
        bank:     'Bank Details — coming soon',
        docs:     'Verification Documents — coming soon',
      };
      showToast(msgs[btn.dataset.action] || 'Coming soon');
    });
  });

  /* ── Logout ──────────────────────────────────────── */
  document.getElementById('logoutBtn').addEventListener('click', function () {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    window.location.replace('../../login.html');
  });

  /* ── Theme sheet ─────────────────────────────────── */
  var overlay  = document.getElementById('modalOverlay');
  var lightBtn = document.getElementById('lightBtn');
  var darkBtn  = document.getElementById('darkBtn');

  document.getElementById('settingsBtn').addEventListener('click', function () {
    overlay.classList.add('open');
  });
  document.getElementById('closeBtn').addEventListener('click', function () {
    overlay.classList.remove('open');
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  function syncTheme() {
    var t = localStorage.getItem(THEME_KEY) || 'light';
    lightBtn.classList.toggle('active', t === 'light');
    darkBtn.classList.toggle('active',  t === 'dark');
  }

  function setTheme(t) {
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.setAttribute('data-theme', t);
    syncTheme();
  }

  lightBtn.addEventListener('click', function () { setTheme('light'); });
  darkBtn.addEventListener('click',  function () { setTheme('dark');  });

  /* ── Init ────────────────────────────────────────── */
  syncTheme();
  buildProfile();

})();
