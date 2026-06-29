/* ═══════════════════════════════════════════════════
   ZITLAS Partner Network — Nutritionist + Fitness Coach Profile
   both-profile.js
═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Theme ──────────────────────────────────────── */

  function getTheme() {
    return localStorage.getItem('zitlas_theme') || 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zitlas_theme', theme);

    var lightBtn = document.getElementById('lightBtn');
    var darkBtn  = document.getElementById('darkBtn');
    var sunIcon  = document.getElementById('themeIconSun');
    var moonIcon = document.getElementById('themeIconMoon');

    if (lightBtn) lightBtn.classList.toggle('active', theme === 'light');
    if (darkBtn)  darkBtn.classList.toggle('active', theme === 'dark');

    if (sunIcon && moonIcon) {
      sunIcon.style.display  = theme === 'light' ? 'block' : 'none';
      moonIcon.style.display = theme === 'dark'  ? 'block' : 'none';
    }
  }

  applyTheme(getTheme());

  /* ── Settings Modal ─────────────────────────────── */

  var overlay     = document.getElementById('modalOverlay');
  var settingsBtn = document.getElementById('settingsBtn');
  var closeBtn    = document.getElementById('closeBtn');
  var lightBtn    = document.getElementById('lightBtn');
  var darkBtn     = document.getElementById('darkBtn');

  function openModal() { overlay.classList.add('open'); }
  function closeModal() { overlay.classList.remove('open'); }

  if (settingsBtn) settingsBtn.addEventListener('click', openModal);
  if (closeBtn)    closeBtn.addEventListener('click', closeModal);

  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  if (lightBtn) lightBtn.addEventListener('click', function () { applyTheme('light'); });
  if (darkBtn)  darkBtn.addEventListener('click',  function () { applyTheme('dark');  });

  /* ── Profile Switcher Dropdown ──────────────────── */

  var profileSwitchBtn = document.getElementById('profileSwitchBtn');
  var profileSwitcher  = document.getElementById('profileSwitcher');

  if (profileSwitchBtn && profileSwitcher) {
    profileSwitchBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = profileSwitcher.classList.toggle('open');
      profileSwitchBtn.classList.toggle('open', isOpen);
    });

    document.addEventListener('click', function () {
      profileSwitcher.classList.remove('open');
      profileSwitchBtn.classList.remove('open');
    });
  }

  /* ── Profile Completion Bar ──────────────────────── */

  function animateBar() {
    var bar = document.getElementById('completionBar');
    if (!bar) return;
    var pct = parseInt(bar.getAttribute('data-pct'), 10) || 0;
    setTimeout(function () {
      bar.style.width = pct + '%';
    }, 250);
  }

  /* ── Ripple feedback ─────────────────────────────── */

  function addRipple(el) {
    el.addEventListener('click', function (e) {
      var rect   = el.getBoundingClientRect();
      var circle = document.createElement('span');
      var size   = Math.max(rect.width, rect.height);
      var x      = e.clientX - rect.left - size / 2;
      var y      = e.clientY - rect.top  - size / 2;

      circle.style.cssText = [
        'position:absolute',
        'border-radius:50%',
        'pointer-events:none',
        'background:rgba(255,255,255,0.22)',
        'width:'  + size + 'px',
        'height:' + size + 'px',
        'left:'   + x    + 'px',
        'top:'    + y    + 'px',
        'transform:scale(0)',
        'animation:ripple 0.45s linear',
        'z-index:0',
      ].join(';');

      var pos = getComputedStyle(el).position;
      if (pos === 'static') el.style.position = 'relative';
      el.style.overflow = 'hidden';

      el.appendChild(circle);
      circle.addEventListener('animationend', function () { circle.remove(); });
    });
  }

  function initRipples() {
    document.querySelectorAll('.action-btn').forEach(addRipple);
  }

  if (!document.getElementById('ripple-style')) {
    var style = document.createElement('style');
    style.id  = 'ripple-style';
    style.textContent = '@keyframes ripple{to{transform:scale(2.5);opacity:0}}';
    document.head.appendChild(style);
  }

  /* ── Init ────────────────────────────────────────── */

  function init() {
    animateBar();
    initRipples();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Logout ──────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && (t.id === 'logoutBtn' || (t.closest && t.closest('#logoutBtn')))) {
      localStorage.removeItem('zitlas_session');
      localStorage.removeItem('zitlas_token');
      window.location.replace('../../login.html');
    }
  });

})();
