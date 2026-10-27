// Per-page effects: ASCII portrait + git-graph timeline (about), holo foil
// certificate (certificates), packet globe behind the form (contact).
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var css = getComputedStyle(document.documentElement);
  var THREAD = css.getPropertyValue('--thread').trim() || '#7fe3d4';
  var EMBER = css.getPropertyValue('--ember').trim() || '#ffb35c';

  function whenVisible(el, on, off) {
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver(function (es) { es[0].isIntersecting ? on() : off && off(); }).observe(el);
  }

  // ---------- About: photo rendered as ASCII, lens shows the real one ----------
  var photo = document.querySelector('.about-photo');
  var img = photo && photo.querySelector('img');
  if (img) {
    var cv = document.createElement('canvas');
    cv.className = 'ascii';
    cv.setAttribute('aria-hidden', 'true');
    photo.appendChild(cv);
    var RAMP = ' .`:-=+*cox#%@';
    var cells = null, cols, rows, cw, ch;

    function sample() {
      var W = photo.clientWidth, H = photo.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
      cols = W < 360 ? 54 : 68;
      cw = W / cols; ch = cw * 1.55; rows = Math.ceil(H / ch);
      cv.width = W * dpr; cv.height = H * dpr;
      var c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      // object-fit: cover crop, same as the <img>
      var iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(W / iw, H / ih);
      var sx = (iw - W / s) / 2, sy = (ih - H / s) / 2;
      var off = document.createElement('canvas');
      off.width = cols; off.height = rows;
      var o = off.getContext('2d');
      o.drawImage(img, sx, sy, W / s, H / s, 0, 0, cols, rows);
      var d = o.getImageData(0, 0, cols, rows).data;
      cells = [];
      for (var i = 0; i < cols * rows; i++) {
        var l = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
        cells.push(Math.pow(l, 0.85));
      }
      c.font = (ch * 0.95).toFixed(1) + 'px "IBM Plex Mono", monospace';
      c.textBaseline = 'top';
      return c;
    }

    function draw(c, reveal) {
      c.fillStyle = '#07090c';
      c.fillRect(0, 0, cv.width, cv.height);
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var l = cells[y * cols + x];
          var ch2 = (y * cols + x) % 97 / 97 > reveal ? '01<>/{}'[(Math.random() * 7) | 0] : RAMP[Math.min(RAMP.length - 1, (l * RAMP.length) | 0)];
          if (ch2 === ' ') continue;
          c.fillStyle = l > 0.72 ? EMBER : THREAD;
          c.globalAlpha = 0.25 + l * 0.75;
          c.fillText(ch2, x * cw, y * ch);
        }
      }
      c.globalAlpha = 1;
    }

    function decode(c, ms, then) {
      var t0 = performance.now();
      (function frame(now) {
        var r = Math.min(1, (now - t0) / ms);
        draw(c, r);
        if (r < 1) requestAnimationFrame(frame); else if (then) then();
      })(t0);
    }
    // ascii -> glitch -> photo -> glitch -> ascii, looping while on screen
    var ctx, onScreen = false, timer;
    function glitchTo(showPhoto) {
      photo.classList.add('glitch');
      setTimeout(function () {
        photo.classList.toggle('real', showPhoto);
        if (!showPhoto) draw(ctx, 0.35);
      }, 260);
      setTimeout(function () {
        photo.classList.remove('glitch');
        if (!showPhoto) decode(ctx, 500);
        if (onScreen) timer = setTimeout(function () { glitchTo(!showPhoto); }, showPhoto ? 2600 : 3400);
      }, 520);
    }
    var started = false;
    function start() {
      onScreen = true;
      if (!started && img.naturalWidth) {
        started = true;
        ctx = sample();
        if (reduce) { draw(ctx, 1); return; }
        decode(ctx, 1400, function () { timer = setTimeout(function () { glitchTo(true); }, 2200); });
      } else if (started && !reduce && !photo.classList.contains('glitch')) {
        clearTimeout(timer);
        timer = setTimeout(function () { glitchTo(!photo.classList.contains('real')); }, 1500);
      }
    }
    function stop() { onScreen = false; clearTimeout(timer); }
    if (img.complete) whenVisible(photo, start, stop);
    else img.addEventListener('load', function () { whenVisible(photo, start, stop); });
    var rw;
    window.addEventListener('resize', function () {
      clearTimeout(rw);
      rw = setTimeout(function () { if (started) { ctx = sample(); draw(ctx, 1); } }, 200);
    });
  }

  // ---------- About: timeline as a git graph, drawn by scroll ----------
  var tl = document.querySelector('.timeline');
  if (tl) {
    var items = Array.prototype.slice.call(tl.querySelectorAll('.timeline-item'));
    items.forEach(function (it) {
      // stable fake commit hash from the heading
      var s = it.querySelector('h3').textContent, h = 2166136261;
      for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
      var tag = document.createElement('span');
      tag.className = 'tl-hash';
      tag.textContent = ('0000000' + (h >>> 0).toString(16)).slice(-7) + (it.classList.contains('current') ? ' (HEAD -> main)' : '');
      it.insertBefore(tag, it.firstChild);
    });
    function tlScroll() {
      var r = tl.getBoundingClientRect();
      var p = reduce ? 1 : Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / r.height));
      tl.style.setProperty('--tl', p.toFixed(3));
      items.forEach(function (it) { it.classList.toggle('lit', it.offsetTop <= p * r.height + 8); });
    }
    window.addEventListener('scroll', tlScroll, { passive: true });
    window.addEventListener('resize', tlScroll);
    tlScroll();
  }

  // ---------- Certificates: holographic tilt card ----------
  var card = document.querySelector('.cert-image');
  if (card && !reduce) {
    card.classList.add('holo');
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--px', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--py', (y * 100).toFixed(1) + '%');
      if (fine) {
        card.style.setProperty('--rx', ((0.5 - y) * 14).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((x - 0.5) * 18).toFixed(2) + 'deg');
      }
      card.classList.add('on');
    });
    card.addEventListener('pointerleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.classList.remove('on');
    });
  }

  // scanner sweeps the cert once when it comes into view
  if (card && card.dataset.scan && !reduce) {
    var beam = document.createElement('span');
    beam.className = 'cert-beam';
    beam.setAttribute('aria-hidden', 'true');
    beam.setAttribute('data-label', card.dataset.scan);
    card.appendChild(beam);
    whenVisible(card, function () { card.classList.add('scan'); });
  }

  // cert strip as a coverflow around the current one
  var strip = document.querySelector('.cert-strip');
  if (strip) {
    var links = [].slice.call(strip.querySelectorAll('a'));
    var cur = links.findIndex(function (a) { return a.getAttribute('aria-current') === 'true'; });
    links.forEach(function (a, i) {
      var d = Math.max(-4, Math.min(4, i - cur));
      a.style.setProperty('--d', d);
      a.style.setProperty('--a', Math.abs(d));
    });
    strip.classList.add('flow');
    if (links[cur]) strip.scrollLeft = links[cur].offsetLeft - (strip.clientWidth - links[cur].offsetWidth) / 2;
  }

  // ---------- Contact: dotted globe, packets fly to Plovdiv ----------
  var grid = document.querySelector('.contact-grid');
  if (grid) {
    var g = document.createElement('canvas');
    g.className = 'contact-globe';
    g.setAttribute('aria-hidden', 'true');
    grid.insertBefore(g, grid.firstChild);
    var gc = g.getContext('2d');
    var RAD = Math.PI / 180;
    function vec(lat, lon) { lat *= RAD; lon *= RAD; return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]; }
    var HOME = vec(42.15, 24.75);
    var CITIES = [[37.77, -122.42], [40.71, -74.0], [51.5, -0.12], [52.52, 13.4], [35.68, 139.7], [1.35, 103.8],
      [-33.87, 151.2], [-23.55, -46.63], [25.2, 55.27], [19.07, 72.88], [59.33, 18.07], [43.65, -79.38]].map(function (c) { return vec(c[0], c[1]); });
    var dots = [], N = 1400;
    for (var i = 0; i < N; i++) {
      var yy = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - yy * yy), th = i * 2.39996;
      dots.push([rr * Math.sin(th), yy, rr * Math.cos(th)]);
    }
    function slerp(a, b, t) {
      var d = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))), s = Math.sin(d);
      var ka = Math.sin((1 - t) * d) / s, kb = Math.sin(t * d) / s, lift = 1 + 0.22 * d * Math.sin(Math.PI * t);
      return [(a[0] * ka + b[0] * kb) * lift, (a[1] * ka + b[1] * kb) * lift, (a[2] * ka + b[2] * kb) * lift];
    }
    var packets = [];
    function fire(n) {
      for (var k = 0; k < n; k++) packets.push({ from: CITIES[(Math.random() * CITIES.length) | 0], t: -k * 0.04, v: 0.5 + Math.random() * 0.4 });
    }

    var W, H, cx, cy, R, BASE = -24.75 * RAD, rot = BASE, TILT = 0.38;
    function size() {
      var dpr = Math.min(2, devicePixelRatio || 1);
      W = grid.clientWidth; H = grid.clientHeight;
      g.width = W * dpr; g.height = H * dpr;
      gc.setTransform(dpr, 0, 0, dpr, 0, 0);
      // phone: small globe behind the heading; desktop: planet rising under the grid
      var narrow = W < 700;
      R = narrow ? W * 0.46 : W * 0.42;
      cx = narrow ? W * 0.5 : W * 0.28; cy = narrow ? H * 0.2 : H + R * 0.25;
      TILT = narrow ? 0.38 : 0.2;
    }
    function proj(p) {
      var c = Math.cos(rot), s = Math.sin(rot);
      var x = p[0] * c + p[2] * s, z = -p[0] * s + p[2] * c, y = p[1];
      var ct = Math.cos(TILT), st = Math.sin(TILT);
      var y2 = y * ct - z * st, z2 = y * st + z * ct;
      return [cx + x * R, cy - y2 * R, z2];
    }

    function render(dt) {
      gc.clearRect(0, 0, W, H);
      var halo = gc.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.25);
      halo.addColorStop(0, 'rgba(127,227,212,0.05)');
      halo.addColorStop(1, 'rgba(127,227,212,0)');
      gc.fillStyle = halo;
      gc.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
      gc.fillStyle = THREAD;
      for (var i = 0; i < N; i++) {
        var q = proj(dots[i]);
        if (q[2] < -0.05) continue;
        gc.globalAlpha = 0.08 + q[2] * 0.32;
        gc.fillRect(q[0], q[1], 1.6, 1.6);
      }
      // arcs
      gc.lineWidth = 1;
      CITIES.forEach(function (c) {
        gc.beginPath();
        var pen = false;
        for (var t = 0; t <= 1.0001; t += 0.04) {
          var q = proj(slerp(c, HOME, t));
          if (q[2] < 0) { pen = false; continue; }
          pen ? gc.lineTo(q[0], q[1]) : gc.moveTo(q[0], q[1]);
          pen = true;
        }
        gc.globalAlpha = 0.18;
        gc.strokeStyle = THREAD;
        gc.stroke();
        var a = proj(c);
        if (a[2] > 0) { gc.globalAlpha = 0.6; gc.fillRect(a[0] - 1.5, a[1] - 1.5, 3, 3); }
      });
      // packets
      packets = packets.filter(function (p) {
        p.t += dt * p.v;
        if (p.t < 0) return true;
        if (p.t >= 1) return false;
        for (var k = 0; k < 6; k++) {
          var tt = p.t - k * 0.015;
          if (tt < 0) break;
          var q = proj(slerp(p.from, HOME, tt));
          if (q[2] < 0) continue;
          gc.globalAlpha = (1 - k / 6) * 0.95;
          gc.fillStyle = k ? THREAD : '#fff';
          gc.beginPath(); gc.arc(q[0], q[1], k ? 1.6 : 2.4, 0, 7); gc.fill();
        }
        return true;
      });
      // home
      var h = proj(HOME);
      if (h[2] > 0) {
        var pulse = (performance.now() / 1400) % 1;
        gc.globalAlpha = 1 - pulse;
        gc.strokeStyle = EMBER;
        gc.beginPath(); gc.arc(h[0], h[1], 4 + pulse * 18, 0, 7); gc.stroke();
        gc.globalAlpha = 1;
        gc.fillStyle = EMBER;
        gc.beginPath(); gc.arc(h[0], h[1], 3.5, 0, 7); gc.fill();
        gc.font = '11px "IBM Plex Mono", monospace';
        gc.fillText('PLOVDIV', h[0] + 10, h[1] + 4);
      }
      gc.globalAlpha = 1;
    }

    size();
    window.addEventListener('resize', function () { size(); if (reduce) render(0); });
    if (reduce) render(0);
    else {
      var running = false, last = 0, idle = 0;
      var loop = function (now) {
        if (!running) return;
        var dt = Math.min(0.05, (now - last) / 1000 || 0);
        last = now;
        rot = BASE + Math.sin(now / 9000) * 0.35; // sway, Plovdiv never turns away
        idle += dt;
        if (idle > 0.9) { idle = 0; fire(1); }
        render(dt);
        requestAnimationFrame(loop);
      };
      whenVisible(grid, function () { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } },
        function () { running = false; });
    }

    // ---------- Contact: send with fetch and play the transmission log ----------
    var form = grid.querySelector('.contact-form');
    var tx = form && form.querySelector('.tx');
    if (tx && window.fetch && window.FormData) {
      var steps = Array.prototype.slice.call(tx.querySelectorAll('.tx-log li'));
      var done = tx.querySelector('.tx-done'), err = tx.querySelector('.tx-err');
      var gap = reduce ? 0 : 420;
      form.addEventListener('input', function () { fire(1); });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (form.classList.contains('sending')) return;
        var old = form.querySelector('.alert');
        if (old) old.remove();
        form.classList.add('sending');
        tx.hidden = false; done.hidden = true; err.hidden = true;
        steps.forEach(function (li) { li.className = ''; });
        var req = fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'X-Requested-With': 'fetch' } })
          .then(function (r) { return r.json(); })
          .catch(function () { return { ok: false }; });
        // every step but the last runs on a timer, the last one waits for the server
        steps.forEach(function (li, i) {
          setTimeout(function () {
            if (i) steps[i - 1].className = 'ok';
            li.className = 'run';
            fire(i < steps.length - 1 ? 3 : 0);
          }, i * gap);
        });
        setTimeout(function () {
          req.then(function (res) {
            var last = steps[steps.length - 1];
            if (res.ok) {
              last.className = 'ok';
              fire(30);
              done.hidden = false;
              form.reset();
            } else {
              last.className = 'fail';
              err.textContent = res.message || err.dataset.fallback;
              err.hidden = false;
              // fields come back so they can fix and resend, the log and error stay under them
              setTimeout(function () { form.classList.remove('sending'); }, 1600);
            }
          });
        }, steps.length * gap);
      });
      tx.querySelector('[data-again]').addEventListener('click', function () {
        form.classList.remove('sending');
        tx.hidden = true;
        form.querySelector('input').focus();
      });
    }
  }
})();
