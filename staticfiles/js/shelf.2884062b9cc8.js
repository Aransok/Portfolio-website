// The Build Shelf: a book that opens when the crooked painting in the museum
// falls and you pull the glowing book from the shelf behind it. Pages come
// from a JSON file, one build per spread, read only.
(function () {
  var root = document.querySelector('[data-shelf]');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var d = root.dataset, el = null, builds = null, at = 0, lastFocus = null;
  var bg = (document.documentElement.lang || '').indexOf('bg') === 0;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function load() {
    if (builds) return Promise.resolve(builds);
    return fetch(d.src).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
      .then(function (list) { builds = Array.isArray(list) ? list : (list.builds || []); return builds; });
  }

  function build() {
    el = document.createElement('div');
    el.className = 'shelf';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', d.title);
    el.innerHTML =
      '<button type="button" class="vault-x shelf-x" aria-label="' + esc(d.close) + '">esc</button>' +
      '<div class="shelf-book">' +
        '<div class="shelf-page shelf-left"></div>' +
        '<div class="shelf-spine" aria-hidden="true"></div>' +
        '<div class="shelf-page shelf-right"></div>' +
      '</div>' +
      '<div class="shelf-nav">' +
        '<button type="button" class="shelf-prev" aria-label="' + esc(d.prev) + '">&larr;</button>' +
        '<span class="shelf-count" aria-live="polite"></span>' +
        '<button type="button" class="shelf-next" aria-label="' + esc(d.next) + '">&rarr;</button>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('.shelf-x').addEventListener('click', close);
    el.querySelector('.shelf-prev').addEventListener('click', function () { turn(-1); });
    el.querySelector('.shelf-next').addEventListener('click', function () { turn(1); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') turn(1);
      else if (e.key === 'ArrowLeft') turn(-1);
    });
    // swipe on touch
    var sx = null;
    el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) turn(dx < 0 ? 1 : -1);
      sx = null;
    });
  }

  function cover() {
    return {
      left: '<div class="shelf-cover"><span class="shelf-kicker">' + esc(d.kicker) + '</span><h2>' + esc(d.title) + '</h2><p>' + esc(d.lede) + '</p></div>',
      right: '<div class="shelf-toc"><span class="shelf-kicker">' + esc(d.contents) + '</span><ol>' +
        builds.map(function (b, i) { return '<li><button type="button" data-go="' + (i + 1) + '"><b>' + esc(b.title) + '</b><span>' + esc(b.kind || '') + '</span></button></li>'; }).join('') +
        '</ol>' + (builds.length ? '' : '<p class="shelf-empty">' + esc(d.empty) + '</p>') + '</div>'
    };
  }
  function spread(b) {
    var shot = b.image ? '<img src="' + esc(b.image) + '" alt="' + esc(b.title) + '" loading="lazy">' : '<div class="shelf-noimg">' + esc((b.title || '?').slice(0, 2)) + '</div>';
    return {
      left: '<figure class="shelf-shot">' + shot + '</figure>',
      right: '<div class="shelf-entry"><span class="shelf-kicker">' + esc(b.date || '') + (b.kind ? ' &middot; ' + esc(b.kind) : '') + '</span>' +
        '<h3>' + esc(b.title) + '</h3><p>' + esc(bg && b.bg ? b.bg : b.what) + '</p>' +
        (b.how ? '<p class="shelf-how">' + esc(b.how) + '</p>' : '') +
        (b.tags && b.tags.length ? '<div class="tag-row">' + b.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
        (b.link ? '<a class="shelf-link" href="' + esc(b.link) + '" target="_blank" rel="noopener">' + esc(d.open) + '</a>' : '') +
        '</div>'
    };
  }
  function render(dir) {
    var page = at === 0 ? cover() : spread(builds[at - 1]);
    var L = el.querySelector('.shelf-left'), R = el.querySelector('.shelf-right');
    L.innerHTML = page.left;
    R.innerHTML = page.right;
    el.querySelector('.shelf-count').textContent = at === 0 ? d.contents : at + ' / ' + builds.length;
    el.querySelector('.shelf-prev').disabled = at === 0;
    el.querySelector('.shelf-next').disabled = at >= builds.length;
    Array.prototype.forEach.call(R.querySelectorAll('[data-go]'), function (b) {
      b.addEventListener('click', function () { at = +b.dataset.go; render(1); });
    });
    if (!reduce && dir) {
      var book = el.querySelector('.shelf-book');
      book.classList.remove('flip-l', 'flip-r');
      void book.offsetWidth;
      book.classList.add(dir > 0 ? 'flip-r' : 'flip-l');
    }
  }
  function turn(n) {
    var next = Math.max(0, Math.min(builds.length, at + n));
    if (next === at) return;
    at = next;
    render(n);
  }

  function open() {
    if (!el) build();
    lastFocus = document.activeElement;
    load().then(function () {
      at = 0;
      render(0);
      document.documentElement.classList.add('vault-open');
      el.classList.remove('out');
      el.classList.add('on');
      setTimeout(function () { el.querySelector('.shelf-x').focus({ preventScroll: true }); }, 50);
    });
    try { localStorage.setItem('build-shelf', '1'); } catch (e) {}
  }
  function close() {
    if (!el) return;
    el.classList.add('out');
    setTimeout(function () { el.classList.remove('on', 'out'); }, reduce ? 0 : 350);
    document.documentElement.classList.remove('vault-open');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  window.openShelf = open;
})();
