/* ═══════════════════════════════════════════════════
   ZITLAS — Auth Guard
   Runs synchronously in <head>. Purges stale storage,
   then redirects to login if no valid session exists.
═══════════════════════════════════════════════════ */
(function () {
  /* ── Purge any stale localStorage / sessionStorage keys ── */
  var BAD_TERMS = ['academy', 'opportunities', 'academy-opportunities'];

  function containsBadTerm(value) {
    for (var i = 0; i < BAD_TERMS.length; i++) {
      if (value.indexOf(BAD_TERMS[i]) !== -1) return true;
    }
    return false;
  }

  try {
    for (var i = localStorage.length - 1; i >= 0; i--) {
      var key = localStorage.key(i);
      var val = localStorage.getItem(key) || '';
      if (containsBadTerm(key) || containsBadTerm(val)) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {}

  try {
    for (var j = sessionStorage.length - 1; j >= 0; j--) {
      var sKey = sessionStorage.key(j);
      var sVal = sessionStorage.getItem(sKey) || '';
      if (containsBadTerm(sKey) || containsBadTerm(sVal)) {
        sessionStorage.removeItem(sKey);
      }
    }
  } catch (e) {}

  /* ── Redirect to login if no valid session ── */
  function redirectToLogin() {
    window.location.replace('../../login.html');
  }

  try {
    var s = JSON.parse(localStorage.getItem('zitlas_session'));
    var t = localStorage.getItem('zitlas_token');
    if ((!s || !s.isLoggedIn) && !t) {
      redirectToLogin();
    }
  } catch (e) {
    redirectToLogin();
  }
})();
