(function () {
  function buildNav() {
    var nav = document.querySelector('.bottom-nav');
    if (!nav) return;

    var path = window.location.pathname.replace(/\\/g, '/').toLowerCase();

    // Detect user type from folder name in path
    var type = 'nutritionist';
    if (path.indexOf('/coach/') !== -1) type = 'coach';
    else if (path.indexOf('/both/') !== -1) type = 'both';

    // Detect which section is currently open
    var active = '';
    if (path.indexOf('/apply/') !== -1) active = 'apply';
    else if (path.indexOf('/profile/account/') !== -1) active = 'profile';
    else if (path.indexOf('/affiliate/') !== -1) active = 'affiliate';

    // Affiliate pages are one level deep; all others are two levels deep
    var base = path.indexOf('/affiliate/') !== -1 ? '../' : '../../';

    var hrefs = {
      apply:     base + 'apply/apply.html',
      affiliate: base + 'affiliate/affiliate.html',
      profile:   base + 'profile/account/account-profile.html'
    };

    var svgs = {
      apply:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>',
      affiliate: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
      profile:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
    };

    var items  = ['apply', 'affiliate', 'profile'];
    var labels = { apply: 'Apply', affiliate: 'Affiliate', profile: 'Profile' };

    nav.innerHTML = items.map(function (item) {
      var isActive    = item === active;
      var isAffiliate = item === 'affiliate';
      var classes = 'nav-item' +
        (isAffiliate ? ' nav-item--affiliate' : '') +
        (isActive    ? ' nav-item--active'    : '');
      return (
        '<a href="' + (isActive ? '#' : hrefs[item]) + '" class="' + classes + '">' +
        svgs[item] +
        '<span>' + labels[item] + '</span>' +
        '</a>'
      );
    }).join('');

    // Inject affiliate accent styles once per page load
    if (!document.getElementById('zitlas-affiliate-style')) {
      var s = document.createElement('style');
      s.id = 'zitlas-affiliate-style';
      s.textContent = [
        '.nav-item--affiliate { color: rgba(255,122,0,0.55); }',
        '.nav-item--affiliate.nav-item--active {',
        '  color: #FF7A00;',
        '  filter: drop-shadow(0 0 5px rgba(255,122,0,0.45));',
        '}',
        '[data-theme="dark"] .nav-item--affiliate { color: rgba(255,122,0,0.5); }',
        '[data-theme="dark"] .nav-item--affiliate.nav-item--active {',
        '  color: #FF7A00;',
        '  filter: drop-shadow(0 0 7px rgba(255,122,0,0.6));',
        '}'
      ].join('\n');
      document.head.appendChild(s);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildNav);
  } else {
    buildNav();
  }
})();
