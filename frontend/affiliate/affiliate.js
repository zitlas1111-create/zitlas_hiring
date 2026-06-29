/* ═══════════════════════════════════════════════════
   ZITLAS — Affiliate Dashboard  (API-connected)
   affiliate.js
═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var USE_BACKEND = window.location.protocol !== 'file:';
  var API         = '/api/affiliate';
  var TOKEN_KEY   = 'zitlas_token';
  var SESSION_KEY = 'zitlas_session';

  /* ── Helpers ─────────────────────────────────────── */
  function getToken()   { return localStorage.getItem(TOKEN_KEY) || ''; }
  function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || {}; } catch(e) { return {}; } }

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
  }

  function apiFetch(path, opts) {
    return fetch(API + path, Object.assign({ headers: authHeaders() }, opts || {}))
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); });
  }

  function fmt(n) {
    if (!n) return '₹0';
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getFullYear();
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  var APPLY_URL = '../apply/apply.html';

  /* ── Toast ───────────────────────────────────────── */
  var toastTimer = null;
  function showToast(msg) {
    var t = document.getElementById('appToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }

  /* ── Render experts list ─────────────────────────── */
  var ROLE_LABELS = {
    nutritionist: '🥗 Nutritionist',
    fitness_coach: '💪 Fitness Coach',
    coach: '💪 Fitness Coach',
    both: '⚡ Both',
  };
  var ROLE_CSS = {
    nutritionist: 'role-tag--nut',
    fitness_coach: 'role-tag--coach',
    coach: 'role-tag--coach',
    both: 'role-tag--both',
  };
  var STATUS_CSS = { active: 'status--active', pending: 'status--pending', approved: 'status--active', rejected: 'status--rejected' };

  function initials(name) {
    return (name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join('');
  }
  var AVATAR_COLORS = ['expert-avatar--orange', 'expert-avatar--blue', 'expert-avatar--purple'];

  function renderExperts(apps) {
    var list = document.querySelector('.experts-list');
    var empty = document.getElementById('emptyExperts');
    if (!list) return;

    if (!apps || apps.length === 0) {
      list.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = apps.map(function (a, i) {
      var isLast   = i === apps.length - 1;
      var avatar   = AVATAR_COLORS[i % AVATAR_COLORS.length];
      var roleTag  = ROLE_LABELS[a.role] || a.role;
      var roleCss  = ROLE_CSS[a.role] || '';
      var statCss  = STATUS_CSS[a.status] || '';
      var statLbl  = a.status ? (a.status.charAt(0).toUpperCase() + a.status.slice(1)) : 'Pending';
      return (
        '<div class="expert-row' + (isLast ? ' expert-row--last' : '') + '">' +
          '<div class="expert-avatar ' + avatar + '">' + initials(a.name) + '</div>' +
          '<div class="expert-info">' +
            '<div class="expert-name">' + (a.name || '') + '</div>' +
            '<div class="expert-role-tag ' + roleCss + '">' + roleTag + '</div>' +
          '</div>' +
          '<div class="expert-right">' +
            '<div class="expert-status ' + statCss + '">' + statLbl + '</div>' +
            '<div class="expert-commission' + (a.status === 'pending' ? ' expert-commission--zero' : '') + '">—</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  /* ── Render earnings timeline ────────────────────── */
  function renderEarnings(earnings) {
    var card = document.querySelector('.timeline-card');
    if (!card) return;

    if (!earnings || earnings.length === 0) {
      card.innerHTML = '<p style="text-align:center;color:var(--text-3);font-size:13px;padding:20px 0;">No earnings yet</p>';
      return;
    }

    var today = new Date(); today.setHours(0,0,0,0);
    var yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    function dayLabel(iso) {
      var d = new Date(iso); d.setHours(0,0,0,0);
      if (d.getTime() === today.getTime()) return 'Today';
      if (d.getTime() === yesterday.getTime()) return 'Yesterday';
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
    function timeStr(iso) {
      var d = new Date(iso);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    /* Group by day */
    var groups = {};
    earnings.forEach(function (e) {
      var lbl = dayLabel(e.earned_at);
      if (!groups[lbl]) groups[lbl] = [];
      groups[lbl].push(e);
    });

    var keys = Object.keys(groups);
    var html = keys.map(function (day, gi) {
      var items = groups[day];
      var rows = items.map(function (e, ii) {
        var isLast = gi === keys.length - 1 && ii === items.length - 1;
        return (
          '<div class="tl-item' + (isLast ? ' tl-item--last' : '') + '">' +
            '<div class="tl-dot"></div>' +
            (isLast ? '' : '<div class="tl-line"></div>') +
            '<div class="tl-content">' +
              '<div class="tl-desc">Consultation</div>' +
              '<div class="tl-time">' + timeStr(e.earned_at) + '</div>' +
            '</div>' +
            '<div class="tl-amount">+' + fmt(e.amount) + '</div>' +
          '</div>'
        );
      }).join('');
      return '<div class="timeline-group"><div class="tl-date">' + day + '</div>' + rows + '</div>';
    }).join('');

    card.innerHTML = html + '<button class="tl-view-all" id="tlViewAll">View All Transactions →</button>';

    var tlBtn = document.getElementById('tlViewAll');
    if (tlBtn) tlBtn.addEventListener('click', function () { showToast('Full transaction history — coming soon'); });
  }

  /* ── Update stats UI ─────────────────────────────── */
  function applyStats(stats, profile) {
    var refLink = 'https://zitlas.com/join?ref=' + stats.affiliate_id;

    /* Status card */
    setText('affId',    stats.affiliate_id);
    setText('affSince', 'Partner since ' + formatDate(profile.created_at));
    var badge = document.querySelector('.badge--active');
    if (badge) {
      var stat = (stats.status || 'pending');
      badge.querySelector('.badge-dot') && (badge.querySelector('.badge-dot').className = 'badge-dot');
      badge.childNodes[badge.childNodes.length - 1].textContent = ' ' + stat.charAt(0).toUpperCase() + stat.slice(1);
      badge.className = 'badge badge--' + (stat === 'active' ? 'active' : 'pending');
    }

    /* Status card mini stats */
    var statNums = document.querySelectorAll('.sc-stat-num');
    if (statNums[0]) statNums[0].textContent = stats.approved_experts;
    if (statNums[1]) statNums[1].textContent = fmt(stats.total_earnings);

    var conversion = stats.total_applications > 0
      ? Math.round((stats.approved_experts / stats.total_applications) * 100) + '%'
      : '0%';
    if (statNums[2]) statNums[2].textContent = conversion;

    /* Referral link */
    var linkInput = document.getElementById('refLinkInput');
    if (linkInput) linkInput.value = refLink;
    setText('refCode',     stats.affiliate_id);
    setText('qrCodeLabel', stats.affiliate_id);

    /* QR */
    var qrImg = document.getElementById('qrImg');
    if (qrImg) {
      qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=ffffff&color=0c0d11&data=' + encodeURIComponent(refLink);
      qrImg.alt = 'Referral QR Code for ' + stats.affiliate_id;
    }

    /* Earnings grid */
    var earnNums = document.querySelectorAll('.earn-num');
    if (earnNums[0]) earnNums[0].textContent = fmt(stats.total_earnings);
    if (earnNums[1]) earnNums[1].textContent = fmt(stats.pending_balance);
    if (earnNums[2]) earnNums[2].textContent = fmt(stats.month_earnings);
    if (earnNums[3]) earnNums[3].textContent = fmt(stats.available_balance);

    /* Payout section */
    var pbAmt = document.querySelector('.pb-amount');
    if (pbAmt) pbAmt.textContent = fmt(stats.available_balance);
    var wbAmt = document.querySelector('.wb-amount');
    if (wbAmt) wbAmt.textContent = fmt(stats.available_balance);

    /* Referral stats */
    var rsNums = document.querySelectorAll('.rs-num');
    var totals = [
      stats.total_clicks,
      stats.total_applications,
      stats.approved_experts,
      stats.active_experts,
    ];
    rsNums.forEach(function (el, i) {
      if (totals[i] !== undefined) el.textContent = totals[i];
    });
    var convEl = document.querySelector('.rs-num--brand');
    if (convEl) convEl.textContent = conversion;

    /* Stat bars */
    var max = stats.total_clicks || 1;
    var barData = [
      stats.total_clicks / max,
      stats.total_applications / max,
      stats.approved_experts / max,
      stats.active_experts / max,
    ];
    document.querySelectorAll('.rs-fill').forEach(function (bar, i) {
      bar.style.width = (barData[i] !== undefined ? Math.round(barData[i] * 100) : 0) + '%';
    });

    /* Apply nav link */
    var s = getSession();
    var applyItem = document.getElementById('applyNavItem');
    if (applyItem) applyItem.href = APPLY_URL;

    /* UPI — shown only when user has linked a UPI ID */
    setText('upiId',      '—');
    setText('modalUpiId', '—');
  }

  /* ── Bootstrap: register if needed, then load data ── */
  function bootstrap() {
    if (!USE_BACKEND) {
      /* Offline / file:// mode — backend required for real data */
      var s = getSession();
      setText('affId',    '—');
      setText('affSince', s.name ? 'Signed in as ' + s.name : '');
      showToast('Connect to the backend server to load your affiliate dashboard.');
      return;
    }

    /* Try to get profile; auto-register if not found */
    apiFetch('/me').then(function (r) {
      if (r.ok) return loadDashboard(r.data);
      if (r.data && r.data.detail === 'Not registered as affiliate') {
        return apiFetch('/register', { method: 'POST' }).then(function (reg) {
          if (reg.ok) return loadDashboard(reg.data);
          showToast('Could not register affiliate profile');
        });
      }
      /* Not logged in or other error — show placeholder */
      showToast('Sign in to see your dashboard');
    }).catch(function () {
      showToast('Could not connect to server');
    });
  }

  function loadDashboard(profile) {
    apiFetch('/stats').then(function (r) {
      if (r.ok) applyStats(r.data, profile);
    }).catch(function () {});

    apiFetch('/applications?limit=5').then(function (r) {
      if (r.ok) renderExperts(r.data);
    }).catch(function () {});

    apiFetch('/earnings?limit=10').then(function (r) {
      if (r.ok) renderEarnings(r.data);
    }).catch(function () {});
  }

  /* ── Copy Link ───────────────────────────────────── */
  var copyBtn = document.getElementById('copyLinkBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var input = document.getElementById('refLinkInput');
      var text  = input ? input.value : '';
      if (!text) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () { showToast('Referral link copied!'); }).catch(function () { legacyCopy(text); });
      } else {
        legacyCopy(text);
      }
    });
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;top:-100px;opacity:0;';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast('Referral link copied!'); } catch (e) { showToast('Copy failed — try manually'); }
    document.body.removeChild(ta);
  }

  /* ── WhatsApp Share ──────────────────────────────── */
  var waBtn = document.getElementById('waShareBtn');
  if (waBtn) {
    waBtn.addEventListener('click', function () {
      var input = document.getElementById('refLinkInput');
      var link  = input ? input.value : 'https://zitlas.com/apply';
      var msg   = 'Join ZITLAS as a Nutritionist or Fitness Coach and start earning! Register via my referral link: ' + link;
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    });
  }

  /* ── QR Modal ────────────────────────────────────── */
  var qrModal = document.getElementById('qrModal');
  var qrBtn   = document.getElementById('qrBtn');
  if (qrBtn)  qrBtn.addEventListener('click',  function () { if (qrModal) qrModal.classList.add('open'); });
  var closeQrBtn = document.getElementById('closeQrBtn');
  if (closeQrBtn) closeQrBtn.addEventListener('click', function () { if (qrModal) qrModal.classList.remove('open'); });
  if (qrModal) qrModal.addEventListener('click', function (e) { if (e.target === qrModal) qrModal.classList.remove('open'); });

  /* Download QR */
  var downloadQrBtn = document.getElementById('downloadQrBtn');
  if (downloadQrBtn) {
    downloadQrBtn.addEventListener('click', function () {
      var qrImg = document.getElementById('qrImg');
      if (!qrImg || !qrImg.src) { showToast('QR code not ready'); return; }
      var a = document.createElement('a');
      a.href = qrImg.src; a.download = 'zitlas-referral-qr.png'; a.target = '_blank';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      showToast('Downloading QR code...');
    });
  }

  /* ── Withdraw Modal ──────────────────────────────── */
  var withdrawModal   = document.getElementById('withdrawModal');
  var withdrawBtn     = document.getElementById('withdrawBtn');
  var closeWdBtn      = document.getElementById('closeWithdrawBtn');
  var confirmWdBtn    = document.getElementById('confirmWithdrawBtn');

  if (withdrawBtn)  withdrawBtn.addEventListener('click', function () { if (withdrawModal) withdrawModal.classList.add('open'); });
  if (closeWdBtn)   closeWdBtn.addEventListener('click',  function () { if (withdrawModal) withdrawModal.classList.remove('open'); });
  if (withdrawModal) withdrawModal.addEventListener('click', function (e) { if (e.target === withdrawModal) withdrawModal.classList.remove('open'); });

  if (confirmWdBtn) {
    confirmWdBtn.addEventListener('click', function () {
      var wbAmt = document.querySelector('.wb-amount');
      var raw   = wbAmt ? wbAmt.textContent.replace(/[^\d.]/g, '') : '0';
      var amount = parseFloat(raw) || 0;

      if (!USE_BACKEND) {
        if (withdrawModal) withdrawModal.classList.remove('open');
        showToast('Withdrawal request submitted! 2–3 business days.');
        return;
      }

      confirmWdBtn.disabled = true;
      confirmWdBtn.textContent = 'Processing…';
      apiFetch('/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: amount, method: 'bank' }),
      }).then(function (r) {
        confirmWdBtn.disabled = false;
        confirmWdBtn.textContent = 'Confirm Withdrawal';
        if (withdrawModal) withdrawModal.classList.remove('open');
        if (r.ok) {
          showToast('Withdrawal request submitted! 2–3 business days.');
        } else {
          showToast(r.data.detail || 'Withdrawal failed');
        }
      }).catch(function () {
        confirmWdBtn.disabled = false;
        confirmWdBtn.textContent = 'Confirm Withdrawal';
        showToast('Network error — please try again');
      });
    });
  }

  /* ── Payout action buttons ───────────────────────── */
  var updateBankBtn = document.getElementById('updateBankBtn');
  if (updateBankBtn) updateBankBtn.addEventListener('click', function () { showToast('Bank account update — coming soon'); });
  var updateUpiBtn = document.getElementById('updateUpiBtn');
  if (updateUpiBtn)  updateUpiBtn.addEventListener('click', function () { showToast('UPI update — coming soon'); });

  /* ── See All buttons ─────────────────────────────── */
  var seeAllBtn = document.querySelector('.see-all-btn');
  if (seeAllBtn) seeAllBtn.addEventListener('click', function () { showToast('Full experts list — coming soon'); });

  /* ── Init ────────────────────────────────────────── */
  bootstrap();

})();
