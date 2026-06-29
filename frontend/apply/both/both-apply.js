/* ═══════════════════════════════════════════════════
   ZITLAS — Nutritionist + Fitness Coach Apply
   both-apply.js
═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Application-type guard ──────────────────────
     Users must arrive via apply/apply.html and choose
     "Fitness Trainer + Nutritionist".               */
  (function () {
    var chosen = localStorage.getItem('zitlas_application_type');
    if (chosen && chosen !== 'both') {
      window.location.replace('../../apply/apply.html');
    }
  })();

  /* ── Submission guard ────────────────────────────
     If the user has already submitted and the status
     is not rejected, send them to the status page.  */
  (function () {
    var submitted = localStorage.getItem('application_submitted');
    var status    = localStorage.getItem('application_status');
    if (submitted && status !== 'rejected') {
      window.location.replace('../../apply/apply.html');
    }
  })();

  var TOTAL_STEPS  = 10;
  var currentStep  = 0;
  var STORAGE_KEY  = 'zitlas_both_apply';

  var TEXT_FIELDS  = [
    'expName', 'mobileNum', 'expEmail', 'dob', 'expCity', 'expBio',
    'feeDayReview', 'feeWeekReview', 'feeMonthly', 'achievements',
    'instagramLink', 'youtubeLink'
  ];

  /* ── Theme ──────────────────────────────────────── */
  var theme = localStorage.getItem('zitlas_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);

  /* ── DOM refs ───────────────────────────────────── */
  var mainEl     = document.getElementById('mainEl');
  var progHeader = document.getElementById('progHeader');
  var progFill   = document.getElementById('progFill');
  var progPct    = document.getElementById('progPct');
  var progLabel  = document.getElementById('progLabel');
  var backBtn    = document.getElementById('backBtn');
  var startBtn   = document.getElementById('startBtn');
  var submitBtn  = document.getElementById('submitBtn');

  /* ── Step navigation ────────────────────────────── */
  function goTo(n) {
    var screens = document.querySelectorAll('.screen');
    screens.forEach(function (s) {
      s.classList.remove('active', 'slide-left');
      s.classList.add('slide-left');
    });
    var next = document.getElementById('screen-' + n);
    if (!next) return;
    next.classList.remove('slide-left');
    next.classList.add('active');
    next.scrollTop = 0;
    currentStep = n;
    updateProgress();

    var isForm = n > 0 && n <= TOTAL_STEPS;
    if (progHeader) progHeader.style.display = isForm ? '' : 'none';
    if (backBtn)    backBtn.style.display     = n > 1 ? '' : 'none';
  }

  function updateProgress() {
    if (currentStep < 1) return;
    var pct = Math.round(((currentStep - 1) / TOTAL_STEPS) * 100);
    if (progFill)  progFill.style.width  = pct + '%';
    if (progPct)   progPct.textContent   = pct + '%';
    if (progLabel) progLabel.textContent = 'Step ' + currentStep + ' of ' + TOTAL_STEPS;
  }

  /* ── Next button on each step ───────────────────── */
  function addNextBtn(screenId, nextStep, validate) {
    var screen = document.getElementById(screenId);
    if (!screen) return;
    var body = screen.querySelector('.step-body');
    if (!body) return;
    var btn = document.createElement('button');
    btn.className   = 'next-btn';
    btn.textContent = nextStep <= TOTAL_STEPS ? 'Continue →' : 'Review & Submit';
    btn.type = 'button';
    btn.addEventListener('click', function () {
      if (validate && !validate()) return;
      goTo(nextStep);
    });
    body.appendChild(btn);
  }

  /* ── Add Next buttons to all steps ─────────────── */
  for (var i = 1; i < TOTAL_STEPS; i++) {
    (function (step) { addNextBtn('screen-' + step, step + 1); })(i);
  }

  /* ── Chip Selection ─────────────────────────────── */
  document.querySelectorAll('.chip').forEach(function (el) {
    el.addEventListener('click', function () {
      var group   = el.getAttribute('data-group');
      var isMulti = el.getAttribute('data-multi') === '1';
      if (!isMulti) {
        document.querySelectorAll('[data-group="' + group + '"]')
          .forEach(function (s) { s.classList.remove('active'); });
      }
      el.classList.toggle('active');
      saveDraft(true);
    });
  });

  /* ── Bio word count ─────────────────────────────── */
  var bioEl    = document.getElementById('expBio');
  var bioCount = document.getElementById('bioCount');
  if (bioEl && bioCount) {
    bioEl.addEventListener('input', function () {
      bioCount.textContent = bioEl.value.trim().split(/\s+/).filter(Boolean).length;
    });
  }

  /* ── File upload labels ─────────────────────────── */
  function bindFile(inputId, labelId) {
    var inp = document.getElementById(inputId);
    var lbl = document.getElementById(labelId);
    if (!inp || !lbl) return;
    inp.addEventListener('change', function () {
      if (inp.files && inp.files[0]) lbl.textContent = inp.files[0].name;
    });
  }
  bindFile('photoFile',    'photoLabel');
  bindFile('idFile',       'idLabel');
  bindFile('nutCertFile',  'nutCertLabel');
  bindFile('coachCertFile','coachCertLabel');
  bindFile('videoFile',    'videoLabel');

  /* ── DOB Dropdowns ─────────────────────────────── */
  (function () {
    var dobDay    = document.getElementById('dobDay');
    var dobMonth  = document.getElementById('dobMonth');
    var dobYear   = document.getElementById('dobYear');
    var dobHidden = document.getElementById('dob');
    var MONTHS = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    if (dobDay) {
      for (var d = 1; d <= 31; d++) {
        var o = document.createElement('option');
        o.value = d < 10 ? '0' + d : '' + d;
        o.textContent = d;
        dobDay.appendChild(o);
      }
    }
    if (dobMonth) {
      MONTHS.forEach(function (name, i) {
        var o = document.createElement('option');
        o.value = i < 9 ? '0' + (i + 1) : '' + (i + 1);
        o.textContent = name;
        dobMonth.appendChild(o);
      });
    }
    if (dobYear) {
      var yr = new Date().getFullYear();
      for (var y = yr; y >= 1950; y--) {
        var o = document.createElement('option');
        o.value = y;
        o.textContent = y;
        dobYear.appendChild(o);
      }
    }
    function syncDob() {
      var day   = dobDay   ? dobDay.value   : '';
      var month = dobMonth ? dobMonth.value : '';
      var year  = dobYear  ? dobYear.value  : '';
      if (dobHidden) {
        dobHidden.value = (day && month && year) ? year + '-' + month + '-' + day : '';
      }
    }
    if (dobDay)   dobDay.addEventListener('change', syncDob);
    if (dobMonth) dobMonth.addEventListener('change', syncDob);
    if (dobYear)  dobYear.addEventListener('change', syncDob);
  })();

  /* ── OTP UI (real Twilio integration) ───────────── */
  var phoneVerified  = false;
  var sendOtpBtn     = document.getElementById('sendOtpBtn');
  var otpWrap        = document.getElementById('otpWrap');
  var otpBoxes       = document.querySelectorAll('.otp-box');
  var verifyOtpBtn   = document.getElementById('verifyOtpBtn');
  var otpVerified    = document.getElementById('otpVerified');
  var otpCountdownEl = document.getElementById('otpCountdown');
  var otpErrorEl     = document.getElementById('otpError');
  var countdownTimer = null;

  function showOtpError(msg) {
    if (otpErrorEl) { otpErrorEl.textContent = msg; otpErrorEl.style.display = 'block'; }
  }
  function clearOtpError() {
    if (otpErrorEl) { otpErrorEl.textContent = ''; otpErrorEl.style.display = 'none'; }
  }

  function startCountdown(seconds) {
    var remaining = seconds;
    if (sendOtpBtn) sendOtpBtn.disabled = true;
    if (otpCountdownEl) { otpCountdownEl.style.display = 'block'; otpCountdownEl.textContent = 'Resend in ' + remaining + 's'; }
    clearInterval(countdownTimer);
    countdownTimer = setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        if (otpCountdownEl) otpCountdownEl.style.display = 'none';
        if (sendOtpBtn) { sendOtpBtn.disabled = false; sendOtpBtn.textContent = 'Resend OTP'; }
      } else {
        if (otpCountdownEl) otpCountdownEl.textContent = 'Resend in ' + remaining + 's';
      }
    }, 1000);
  }

  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', function () {
      var mobileEl = document.getElementById('mobileNum');
      var phone    = mobileEl ? mobileEl.value.trim() : '';
      if (!/^[6-9]\d{9}$/.test(phone)) { showToast('Enter a valid 10-digit Indian mobile number'); return; }
      clearOtpError();
      sendOtpBtn.disabled     = true;
      sendOtpBtn.textContent  = 'Sending…';
      fetch('/api/auth/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone_number: phone }),
      })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.detail || 'Failed to send OTP'); });
        return r.json();
      })
      .then(function () {
        if (otpWrap) otpWrap.style.display = 'block';
        otpBoxes.forEach(function (b) { b.value = ''; b.disabled = false; });
        if (otpBoxes[0]) setTimeout(function () { otpBoxes[0].focus(); }, 80);
        if (verifyOtpBtn) { verifyOtpBtn.style.display = ''; verifyOtpBtn.disabled = false; verifyOtpBtn.textContent = 'Verify OTP'; }
        showToast('OTP sent to +91 ' + phone);
        startCountdown(30);
      })
      .catch(function (e) {
        sendOtpBtn.disabled    = false;
        sendOtpBtn.textContent = 'Send OTP';
        showOtpError(e.message || 'Failed to send OTP. Try again.');
        showToast(e.message || 'Failed to send OTP');
      });
    });
  }

  otpBoxes.forEach(function (box, i) {
    box.addEventListener('input', function () {
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if (box.value.length === 1 && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && box.value === '' && i > 0) otpBoxes[i - 1].focus();
    });
    box.addEventListener('paste', function (e) {
      e.preventDefault();
      var digits = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      digits.split('').forEach(function (d, j) { if (otpBoxes[j]) otpBoxes[j].value = d; });
      var last = Math.min(digits.length, otpBoxes.length - 1);
      if (otpBoxes[last]) otpBoxes[last].focus();
    });
  });

  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', function () {
      var code     = Array.from(otpBoxes).map(function (b) { return b.value; }).join('');
      var mobileEl = document.getElementById('mobileNum');
      var phone    = mobileEl ? mobileEl.value.trim() : '';
      if (code.length !== 6) { showToast('Enter all 6 OTP digits'); return; }
      clearOtpError();
      verifyOtpBtn.disabled    = true;
      verifyOtpBtn.textContent = 'Verifying…';
      fetch('/api/auth/verify-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone_number: phone, otp: code }),
      })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.detail || 'Verification failed'); });
        return r.json();
      })
      .then(function (data) {
        if (data.verified) {
          phoneVerified        = true;
          window.phoneVerified = true;
          verifyOtpBtn.style.display = 'none';
          otpBoxes.forEach(function (b) { b.disabled = true; });
          if (mobileEl) mobileEl.disabled = true;
          if (otpVerified) otpVerified.style.display = 'flex';
          clearInterval(countdownTimer);
          if (otpCountdownEl) otpCountdownEl.style.display = 'none';
          if (sendOtpBtn) { sendOtpBtn.disabled = true; sendOtpBtn.textContent = '✓ Verified'; }
          showToast('Mobile number verified!');
        }
      })
      .catch(function (e) {
        verifyOtpBtn.disabled    = false;
        verifyOtpBtn.textContent = 'Verify OTP';
        otpBoxes.forEach(function (b) { b.value = ''; });
        if (otpBoxes[0]) otpBoxes[0].focus();
        showOtpError(e.message || 'Verification failed. Try again.');
        showToast(e.message || 'Verification failed');
      });
    });
  }

  /* ── Draft save / restore ───────────────────────── */
  function collectData() {
    var data = { _savedAt: new Date().toISOString() };
    TEXT_FIELDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) data[id] = el.value;
    });
    document.querySelectorAll('.chip.active').forEach(function (chip) {
      var group = chip.getAttribute('data-group');
      var val   = chip.getAttribute('data-val');
      if (!data[group]) data[group] = [];
      if (Array.isArray(data[group])) data[group].push(val);
    });
    return data;
  }

  function restoreData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      TEXT_FIELDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && data[id] != null) el.value = data[id];
      });
      if (data.dob && /^\d{4}-\d{2}-\d{2}$/.test(data.dob)) {
        var parts = data.dob.split('-');
        var dobDay   = document.getElementById('dobDay');
        var dobMonth = document.getElementById('dobMonth');
        var dobYear  = document.getElementById('dobYear');
        if (dobDay)   dobDay.value   = parts[2];
        if (dobMonth) dobMonth.value = parts[1];
        if (dobYear)  dobYear.value  = parts[0];
      }
      Object.keys(data).forEach(function (group) {
        if (!Array.isArray(data[group])) return;
        data[group].forEach(function (val) {
          var chip = document.querySelector('[data-group="' + group + '"][data-val="' + val + '"]');
          if (chip) chip.classList.add('active');
        });
      });
    } catch (e) {}
  }

  function submitToAffiliate(formData, onDone) {
    var ref = sessionStorage.getItem('affiliate_ref') || '';
    var payload = {
      name:          formData.expName   || '',
      email:         formData.expEmail  || '',
      phone:         formData.mobileNum || '',
      role:          'both',
      affiliate_ref: ref || null,
      form_data:     formData,
    };
    if (!payload.name || (!payload.email && !payload.phone)) { onDone(null); return; }
    if (window.location.protocol === 'file:') { onDone(null); return; }
    fetch('/api/expert-applications', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    .then(function (r) { return r.json(); })
    .catch(function () { return {}; })
    .then(function (data) { onDone(data.id || null); });
  }

  function saveDraft(silent) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
    } catch (e) {}
    if (!silent) {
      submitToAffiliate(collectData(), function (appId) {
        localStorage.setItem('application_submitted', 'true');
        localStorage.setItem('application_status', 'under_review');
        if (appId) localStorage.setItem('application_id', appId);
        window.location.href = '../../application-success.html?role=both';
      });
    }
  }

  setInterval(function () { saveDraft(true); }, 30000);
  window.addEventListener('beforeunload', function () { saveDraft(true); });

  /* ── Toast ──────────────────────────────────────── */
  var toastTmr = null;
  function showToast(msg) {
    var t = document.getElementById('appToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'appToast';
      t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:#f0f6fc;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;opacity:0;transition:opacity .25s;pointer-events:none;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(toastTmr);
    toastTmr = setTimeout(function () { t.style.opacity = '0'; }, 3000);
  }

  /* ── Events ─────────────────────────────────────── */
  if (startBtn) startBtn.addEventListener('click', function () { goTo(1); });
  if (backBtn)  backBtn.addEventListener('click', function () { if (currentStep > 1) goTo(currentStep - 1); });

  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      var name = document.getElementById('expName');
      if (!name || !name.value.trim()) { showToast('Please enter your full name'); return; }
      if (!window.phoneVerified) { showToast('Please verify your mobile number first.'); return; }
      saveDraft(false);
    });
  }

  /* ── Prefill from logged-in user ────────────────── */
  function prefillFromUser() {
    var cu = null;
    try { cu = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}
    if (!cu) {
      try {
        var s = JSON.parse(localStorage.getItem('zitlas_session'));
        if (s) cu = { name: s.name, email: s.email, phone: s.phone, authMethod: s.authMethod };
      } catch (e) {}
    }
    if (!cu) return;

    function fill(id, val) {
      var el = document.getElementById(id);
      if (el && !el.value && val) el.value = val;
    }
    fill('expName',   cu.name  || '');
    fill('mobileNum', cu.phone || '');
    fill('expEmail',  cu.email || '');

    if (cu.authMethod === 'google') {
      var emailEl = document.getElementById('expEmail');
      if (emailEl) {
        emailEl.setAttribute('readonly', 'readonly');
        emailEl.style.opacity = '0.6';
        emailEl.style.cursor  = 'not-allowed';
        emailEl.title = 'Email is set from your Google account';
      }
    }
  }

  /* ── Init ───────────────────────────────────────── */
  restoreData();
  prefillFromUser();
  goTo(0);

})();
