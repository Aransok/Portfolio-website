// ByteBits channel card: "Watch the channel" (on the card or the museum
// plaque) opens a pop-up with three real shorts playing in phones and a
// subscribe button that goes straight to YouTube's subscribe prompt.
(function () {
  var root = document.querySelector('[data-channel-card]');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var d = root.dataset, el = null, lastFocus = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build() {
    var shorts = d.shorts.split('|'), labels = d.labels.split('|');
    el = document.createElement('div');
    el.className = 'chan';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'ByteBits');
    el.innerHTML =
      '<button type="button" class="vault-x chan-x" aria-label="' + esc(d.close) + '">esc</button>' +
      '<div class="chan-in">' +
        '<div class="chan-phones">' + shorts.map(function (src, i) {
          return '<figure style="--i:' + i + '"><div class="chan-phone"><video muted loop playsinline preload="metadata" src="' + esc(src) + '"></video><i></i></div><figcaption>' + esc(labels[i] || '') + '</figcaption></figure>';
        }).join('') + '</div>' +
        '<div class="chan-info">' +
          '<div class="chan-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4.5l13 7.5-13 7.5z" fill="#fff"/></svg></div>' +
          '<h2>ByteBits</h2>' +
          '<span class="chan-handle">@ByteBits-y3b &middot; YouTube</span>' +
          '<p>' + esc(d.lede) + '</p>' +
          '<div class="chan-stats">' + d.stats.split('|').map(function (s) { var p = s.split(':'); return '<div><b>' + esc(p[0]) + '</b><span>' + esc(p[1]) + '</span></div>'; }).join('') + '</div>' +
          '<div class="chan-cta">' +
            '<a class="chan-sub" href="' + esc(d.sub) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>' + esc(d.subscribe) + '</a>' +
            '<a class="chan-open" href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.open) + '</a>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('.chan-x').addEventListener('click', close);
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    el.querySelector('.chan-sub').addEventListener('click', function () { el.querySelector('.chan-sub').classList.add('done'); });
  }
  function open() {
    if (!el) build();
    lastFocus = document.activeElement;
    document.documentElement.classList.add('vault-open');
    el.classList.remove('out');
    el.classList.add('on');
    if (!reduce) el.querySelectorAll('video').forEach(function (v, i) { setTimeout(function () { v.play().catch(function () {}); }, 250 + i * 180); });
    setTimeout(function () { el.querySelector('.chan-sub').focus({ preventScroll: true }); }, 60);
  }
  function close() {
    el.classList.add('out');
    el.querySelectorAll('video').forEach(function (v) { v.pause(); });
    setTimeout(function () { el.classList.remove('on', 'out'); }, reduce ? 0 : 300);
    document.documentElement.classList.remove('vault-open');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  // works for the card link and for the copy of it on the museum plaque
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-channel]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    open();
  });
  window.openChannel = open;
})();
