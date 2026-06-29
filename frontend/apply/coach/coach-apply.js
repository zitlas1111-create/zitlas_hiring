/* ═══════════════════════════════════════════════════
   ZITLAS — Coach Apply (Scrollable Profile Form)
   coach-apply.js
═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Application-type guard ──────────────────────
     Users must arrive via apply/apply.html and choose
     "Fitness Trainer". Redirect anyone who doesn't.  */
  (function () {
    var chosen = localStorage.getItem('zitlas_application_type');
    if (chosen && chosen !== 'fitness_trainer') {
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

  /* ── Theme ──────────────────────────────────────── */
  function getTheme() { return localStorage.getItem('zitlas_theme') || 'light'; }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('zitlas_theme', t);
    var lb = document.getElementById('lightBtn');
    var db = document.getElementById('darkBtn');
    if (lb) lb.classList.toggle('active', t === 'light');
    if (db) db.classList.toggle('active', t === 'dark');
  }
  applyTheme(getTheme());

  /* ── Rebuild Progress Header ─────────────────────
     Replaces the old step-counter header with a
     completion-percentage bar                        */
  var progHeader = document.getElementById('progHeader');
  if (progHeader) {
    progHeader.removeAttribute('style');
    progHeader.innerHTML =
      '<div class="prog-inner">' +
        '<div class="prog-info">' +
          '<span class="prog-form-title">Fitness Trainer Application</span>' +
          '<span class="prog-completion-label" id="completionLabel">Getting Started</span>' +
        '</div>' +
        '<span class="prog-pct" id="progPct">0%</span>' +
      '</div>' +
      '<div class="prog-track"><div class="prog-fill" id="progFill"></div></div>';
  }

  /* ── Convert Step-Nav → Save Bar ────────────────── */
  var stepNav = document.getElementById('stepNav');
  if (stepNav) {
    stepNav.removeAttribute('style');
    stepNav.className = 'save-bar';
    stepNav.id = 'saveBar';
    stepNav.innerHTML = '<button class="save-btn" id="saveBtn">💾 Save Profile</button>';
  }

  /* ── Force scrollable main (defensive against stale CSS cache) ── */
  var mainEl = document.getElementById('mainEl');
  if (mainEl) {
    mainEl.style.setProperty('overflow-y', 'auto', 'important');
    mainEl.style.setProperty('overflow-x', 'hidden', 'important');
    mainEl.style.setProperty('position', 'static', 'important');
  }

  /* ── Required Fields for Completion % ──────────── */
  var REQUIRED = [
    { type: 'input',    id: 'coachName'      },
    { type: 'input',    id: 'mobileNum'      },
    { type: 'input',    id: 'coachEmail'     },
    { type: 'chips',    group: 'gender'      },
    { type: 'input',    id: 'dob'            },
    { type: 'input',    id: 'coachCity'      },
    { type: 'chips',    group: 'langs'       },
    { type: 'chips',    group: 'spec'        },
    { type: 'chips',    group: 'expYears'    },
    { type: 'chips',    group: 'certLevel'   },
    { type: 'chips',    group: 'ageGroups'   },
    { type: 'chips',    group: 'clientLevel' },
    { type: 'chips',    group: 'strengths'   },
    { type: 'textarea', id: 'coachBio'       },
    { type: 'chips',    group: 'sessionType' },
    { type: 'chips',    group: 'days'        },
    { type: 'chips',    group: 'slots'       },
    { type: 'input',    id: 'feeDayReview'   },
    { type: 'input',    id: 'feeWeekReview'  },
    { type: 'input',    id: 'feeMonthly'     },
    { type: 'chips',    group: 'whatsapp'    },
    { type: 'chips',    group: 'videoCall'   },
    { type: 'chips',    group: 'idType'      },
    { type: 'chips',    group: 'clientCount' }
  ];

  function getCompletionLabel(pct) {
    if (pct <= 30) return 'Getting Started';
    if (pct <= 70) return 'Building Your Profile';
    if (pct < 100) return 'Almost Complete';
    return '✅ Profile Complete';
  }

  function computeCompletion() {
    var filled = 0;
    REQUIRED.forEach(function (req) {
      if (req.type === 'chips') {
        if (document.querySelector('[data-group="' + req.group + '"].active')) filled++;
      } else {
        var el = document.getElementById(req.id);
        if (el && el.value && el.value.trim() !== '') filled++;
      }
    });
    return Math.round((filled / REQUIRED.length) * 100);
  }

  function updateProgress() {
    var pct   = computeCompletion();
    var fill  = document.getElementById('progFill');
    var pctEl = document.getElementById('progPct');
    var label = document.getElementById('completionLabel');
    if (fill)  fill.style.width  = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (label) label.textContent = getCompletionLabel(pct);
  }

  /* ── Settings Modal ─────────────────────────────── */
  var modalOverlay = document.getElementById('modalOverlay');
  var closeBtn     = document.getElementById('closeBtn');
  var lightBtn     = document.getElementById('lightBtn');
  var darkBtn      = document.getElementById('darkBtn');
  if (closeBtn) closeBtn.addEventListener('click', function () { modalOverlay.classList.remove('open'); });
  if (modalOverlay) modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) modalOverlay.classList.remove('open');
  });
  if (lightBtn) lightBtn.addEventListener('click', function () { applyTheme('light'); });
  if (darkBtn)  darkBtn.addEventListener('click',  function () { applyTheme('dark');  });

  /* ── Chip Selection ─────────────────────────────── */
  document.querySelectorAll('.chip, .vision-card').forEach(function (el) {
    el.addEventListener('click', function () {
      var group   = el.getAttribute('data-group');
      var isMulti = el.getAttribute('data-multi') === '1';
      if (!isMulti) {
        document.querySelectorAll('[data-group="' + group + '"]').forEach(function (s) {
          s.classList.remove('active');
        });
      }
      el.classList.toggle('active');
      updateProgress();
    });
  });

  /* ── Input Listeners ────────────────────────────── */
  ['coachName','mobileNum','coachEmail','coachCity','coachBio','feeDayReview','feeWeekReview'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { el.addEventListener('input', updateProgress); el.addEventListener('change', updateProgress); }
  });

  /* ── File Upload Labels ─────────────────────────── */
  function bindFileLabel(inputId, labelId) {
    var inp = document.getElementById(inputId);
    var lbl = document.getElementById(labelId);
    if (!inp || !lbl) return;
    inp.addEventListener('change', function () {
      if (inp.files && inp.files.length) {
        lbl.textContent = inp.files.length === 1 ? inp.files[0].name : inp.files.length + ' files selected';
      }
    });
  }
  bindFileLabel('photoFile',        'photoLabel');
  bindFileLabel('idFile',           'idLabel');
  bindFileLabel('certFile',         'certLabel');
  bindFileLabel('playFile',         'playLabel');
  bindFileLabel('achieveFile',      'achieveLabel');
  bindFileLabel('videoFile',        'videoLabel');
  bindFileLabel('testimonialsFile', 'testimonialLabel');

  /* ── Bio Word Count ─────────────────────────────── */
  var bioEl    = document.getElementById('coachBio');
  var bioCount = document.getElementById('bioCount');
  if (bioEl && bioCount) {
    bioEl.addEventListener('input', function () {
      var words = bioEl.value.trim().split(/\s+/).filter(Boolean).length;
      bioCount.textContent = words;
    });
  }

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
      updateProgress();
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
        if (otpBoxes[0]) setTimeout(function () { otpBoxes[0].focus(); }, 100);
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
          var chip = document.getElementById('otpStatusChip');
          if (chip) { chip.classList.add('verified'); chip.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Verified'; }
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

  /* ── Draft Save / Restore ───────────────────────── */
  var STORAGE_KEY = 'zitlas_coach_apply';
  var TEXT_FIELDS = ['coachName','mobileNum','coachEmail','dob','coachCity','coachBio','feeDayReview','feeWeekReview','feeMonthly','achievements'];

  function collectData() {
    var data = { _savedAt: new Date().toISOString() };
    TEXT_FIELDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) data[id] = el.value;
    });
    document.querySelectorAll('.chip.active, .vision-card.active').forEach(function (chip) {
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
      if (bioEl && bioCount) {
        var words = bioEl.value.trim().split(/\s+/).filter(Boolean).length;
        bioCount.textContent = words;
      }
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
      name:          formData.coachName  || '',
      email:         formData.coachEmail || '',
      phone:         formData.mobileNum  || '',
      role:          'fitness_trainer',
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
    } catch (e) {
      if (!silent) { showToast('Save failed — storage may be full'); return; }
    }
    if (silent) {
      updateProgress();
    } else {
      if (!window.phoneVerified) {
        showToast('Please verify your mobile number first.');
        return;
      }
      submitToAffiliate(collectData(), function (appId) {
        localStorage.setItem('application_submitted', 'true');
        localStorage.setItem('application_status', 'under_review');
        if (appId) localStorage.setItem('application_id', appId);
        window.location.href = '../../application-success.html?role=coach';
      });
    }
  }

  var saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.addEventListener('click', function () { saveDraft(false); });

  /* Auto-save every 30 seconds and on page/tab leave */
  setInterval(function () { saveDraft(true); }, 30000);
  window.addEventListener('beforeunload', function () { saveDraft(true); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') saveDraft(true);
  });

  /* ── Drag & Drop Zones ──────────────────────────── */
  document.querySelectorAll('.drop-zone').forEach(function (zone) {
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault(); zone.classList.remove('drag-over');
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) {
        var t = zone.querySelector('.drop-title');
        if (t) t.textContent = files.length === 1 ? files[0].name : files.length + ' files dropped';
        showToast('File ready to upload');
      }
    });
  });

  /* ── Toast ──────────────────────────────────────── */
  var toastEl  = document.getElementById('appToast');
  var toastTmr = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTmr);
    toastTmr = setTimeout(function () { toastEl.classList.remove('show'); }, 3000);
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
    fill('coachName', cu.name  || '');
    fill('mobileNum', cu.phone || '');
    fill('coachEmail', cu.email || '');

    if (cu.authMethod === 'google') {
      var emailEl = document.getElementById('coachEmail');
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
  updateProgress();
  applyTheme(getTheme());


})();
