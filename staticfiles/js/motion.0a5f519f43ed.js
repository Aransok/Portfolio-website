// Site-wide motion: scroll progress bar, reveal-on-scroll, card spotlight,
// hero headline decode + parallax, and the pinned "ship it" scroll scene.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  // ---------- Scroll progress (header bar) ----------
  var bar = document.querySelector('.scroll-progress');
  var hero = document.querySelector('.hero');
  var scenes = [];
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var max = root.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
      if (hero && !reduce) {
        var h = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));
        hero.style.setProperty('--hero-p', h.toFixed(3));
      }
      scenes.forEach(function (s) { s(); });
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // ---------- Reveal on scroll ----------
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll(
      '.section-head, .project-card, .activity, .cta-strip, .timeline-item, .page-head, ' +
      '.cert-viewer, .contact-form, .contact-intro, .about-text, .about-photo, .skill-group, .two-col > div'
    );
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) {
      // stagger siblings inside the same grid
      var i = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  // ---------- Card spotlight + tilt follow the cursor ----------
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll('.project-card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
      if (fine && !reduce) {
        card.style.setProperty('--rx', ((0.5 - y / r.height) * 7).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((x / r.width - 0.5) * 9).toFixed(2) + 'deg');
      }
    });
    card.addEventListener('pointerleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  // ---------- Magnetic primary buttons ----------
  if (fine && !reduce) {
    document.querySelectorAll('.btn-primary').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.translate = ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + 'px ' +
          ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + 'px';
      });
      btn.addEventListener('pointerleave', function () { btn.style.translate = ''; });
    });
  }

  // ---------- Hero headline decode ----------
  var h1 = document.querySelector('.hero h1');
  if (h1 && !reduce) {
    h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
    var glyphs = '<>/{}[]=_;:01#$*';
    var nodes = [];
    (function walk(n) {
      n.childNodes.forEach(function (c) {
        if (c.nodeType === 3) nodes.push({ node: c, text: c.nodeValue });
        else walk(c);
      });
    })(h1);
    var total = nodes.reduce(function (a, n) { return a + n.text.length; }, 0);
    var start = performance.now(), dur = 1100;
    (function frame(now) {
      var done = Math.floor(Math.min(1, (now - start) / dur) * total);
      var k = 0;
      nodes.forEach(function (n) {
        var out = '';
        for (var i = 0; i < n.text.length; i++, k++) {
          var ch = n.text[i];
          out += (k < done || ch === ' ') ? ch : glyphs[(Math.random() * glyphs.length) | 0];
        }
        n.node.nodeValue = out;
      });
      if (done < total) requestAnimationFrame(frame);
    })(start);
  }

  // ---------- Ship scene: scroll types the code, then runs the pipeline ----------
  var ship = document.querySelector('.ship');
  if (ship) {
    var codeEl = ship.querySelector('.editor code');
    var src = ship.querySelector('#ship-src').textContent.replace(/^\n+|\s+$/g, '');
    var stages = Array.prototype.slice.call(ship.querySelectorAll('.stage'));
    var logs = Array.prototype.slice.call(ship.querySelectorAll('.log li'));
    var pct = ship.querySelector('[data-pct]');
    var fill = ship.querySelector('.pipe-fill');

    var KW = /^(from|import|def|for|in|if|return|raise|continue|not|and|or|None|True|False)$/;
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function highlight(line) {
      return line.replace(/(#.*$)|("[^"]*"?)|(\b\d+\b)|([A-Za-z_]\w*)(?=\()|([A-Za-z_]\w*)|([^#"\w]+)/g,
        function (m, c, s, n, f, w, o) {
          if (c) return '<span class="c">' + esc(c) + '</span>';
          if (s) return '<span class="s">' + esc(s) + '</span>';
          if (n) return '<span class="n">' + n + '</span>';
          if (f) return '<span class="f">' + f + '</span>';
          if (w) return KW.test(w) ? '<span class="k">' + w + '</span>' : w;
          return esc(o);
        });
    }
    function render(chars) {
      var shown = src.slice(0, chars).split('\n');
      codeEl.innerHTML = shown.map(function (l, i) {
        return '<span class="ln">' + highlight(l) + (i === shown.length - 1 ? '<i class="caret"></i>' : '') + '</span>';
      }).join('');
    }

    var lastChars = -1;
    function scene() {
      var r = ship.getBoundingClientRect();
      var run = ship.offsetHeight - window.innerHeight;
      var p = reduce || run <= 0 ? 1 : Math.min(1, Math.max(0, -r.top / run));
      // 0..0.55 typing, 0.58..0.95 pipeline
      var chars = Math.round(Math.min(1, Math.max(0, (p - 0.02) / 0.53)) * src.length);
      if (chars !== lastChars) { render(chars); lastChars = chars; }
      var q = Math.min(1, Math.max(0, (p - 0.58) / 0.37));
      stages.forEach(function (st, i) {
        var at = (i + 1) / stages.length;
        st.dataset.state = q >= at ? 'done' : q > at - 1 / stages.length ? 'run' : 'wait';
        if (logs[i]) logs[i].classList.toggle('on', q >= at);
      });
      if (fill) fill.style.transform = 'scaleX(' + q + ')';
      if (pct) pct.textContent = Math.round(p * 100) + '%';
      ship.classList.toggle('shipped', q >= 1);
    }
    scenes.push(scene);
  }

  onScroll();
})();
