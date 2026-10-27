// The Crewbase vault: a hidden room unlocked from the home terminal with a
// crew badge. Builds itself on demand, so it costs nothing until found.
(function () {
  var root = document.querySelector('[data-vault]');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var d = root.dataset, el = null, lastFocus = null;

  var features = [
    ['Routes', d.fRoutes], ['Feed', d.fFeed], ['Chat', d.fChat],
    ['Board', d.fBoard], ['People', d.fPeople], ['Workspaces', d.fWork]
  ];

  function build() {
    el = document.createElement('div');
    el.className = 'vault';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Crewbase');
    el.innerHTML =
      '<div class="vault-scan" aria-hidden="true"></div>' +
      '<button type="button" class="vault-x" aria-label="' + d.close + '">esc</button>' +
      '<div class="vault-in">' +
        '<header class="vault-head">' +
          '<span class="vault-tag">' + d.tag + ' &middot; NW-0042</span>' +
          '<h2 class="vault-title" data-text="CREWBASE">CREWBASE</h2>' +
          '<p>' + d.lede + '</p>' +
        '</header>' +
        '<div class="vault-stage">' +
          '<figure class="vault-laptop"><div class="vault-screen"><video muted loop playsinline preload="metadata" src="' + d.desk + '" poster="' + d.deskPoster + '"></video></div><figcaption>' + d.capDesk + '</figcaption></figure>' +
          '<figure class="vault-phone"><div class="vault-screen"><video muted loop playsinline preload="metadata" src="' + d.phone + '" poster="' + d.phonePoster + '"></video></div><figcaption>' + d.capPhone + '</figcaption></figure>' +
        '</div>' +
        '<ul class="vault-features">' + features.map(function (f, i) {
          return '<li style="--i:' + i + '"><b>' + f[0] + '</b><span>' + f[1] + '</span></li>';
        }).join('') + '</ul>' +
        '<div class="vault-stats">' + d.stats.split('|').map(function (s) {
          var p = s.split(':');
          return '<div><b>' + p[0] + '</b><span>' + p[1] + '</span></div>';
        }).join('') + '</div>' +
        '<div class="vault-cta"><a class="btn btn-primary" href="' + d.contact + '">' + d.cta + '</a><span>' + d.foot + '</span></div>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('.vault-x').addEventListener('click', close);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        var f = el.querySelectorAll('a, button');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    });
  }

  function decode(node) {
    var word = node.dataset.text, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&', i = 0;
    if (reduce) { node.textContent = word; return; }
    var iv = setInterval(function () {
      node.textContent = word.split('').map(function (c, k) {
        return k < i ? c : chars[(Math.random() * chars.length) | 0];
      }).join('');
      i += 0.34;
      if (i > word.length) { clearInterval(iv); node.textContent = word; }
    }, 30);
  }

  function open() {
    if (!el) build();
    lastFocus = document.activeElement;
    document.documentElement.classList.add('vault-open');
    el.classList.remove('out');
    el.classList.add('on');
    decode(el.querySelector('.vault-title'));
    if (!reduce) el.querySelectorAll('video').forEach(function (v) { v.play().catch(function () {}); });
    setTimeout(function () { el.querySelector('.vault-x').focus({ preventScroll: true }); }, 50);
    try { if (location.hash !== '#crewbase-vault') history.replaceState(null, '', '#crewbase-vault'); } catch (e) {}
  }
  function close() {
    if (!el) return;
    el.classList.add('out');
    el.querySelectorAll('video').forEach(function (v) { v.pause(); });
    setTimeout(function () { el.classList.remove('on', 'out'); }, reduce ? 0 : 400);
    document.documentElement.classList.remove('vault-open');
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  window.openVault = open;

  // badge holders can come straight back
  var member = false;
  try { member = localStorage.getItem('crew-badge') === 'NW-0042'; } catch (e) {}
  if (member && location.hash === '#crewbase-vault') open();

  if (window.console && console.log) {
    console.log('%cpsst.', 'color:#ffb35c;font:600 14px monospace', 'not everything in the terminal shows up with plain ls.');
  }
})();
