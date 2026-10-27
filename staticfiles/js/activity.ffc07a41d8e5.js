// Activity graph: a year of GitHub contributions as a grid, or as a 3D
// "city" where every day is a column as tall as its commits.
(function () {
  var root = document.querySelector('.activity');
  if (!root) return;
  var grid = document.getElementById('cal');
  var canvas = document.getElementById('cal3d');
  var tip = document.getElementById('cal-tip');
  var bestEl = document.getElementById('best-day');
  var flatPane = root.querySelector('[data-pane="flat"]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var days = [];
  var weeks = 0;
  var maxCount = 1;

  function parseDate(s) {
    var p = s.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }
  function niceDate(s) {
    var d = parseDate(s);
    return WDAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ' ' + d.getUTCFullYear();
  }
  function describe(day) {
    var n = day.count;
    var what = n === 0 ? 'No contributions' : n + (n === 1 ? ' contribution' : ' contributions');
    return '<b>' + what + '</b> on ' + niceDate(day.date);
  }
  function setTip(html) { tip.innerHTML = html; }

  function countUp(el, value, suffix) {
    var fmt = function (v) { return Math.round(v).toLocaleString('en-US') + (suffix || ''); };
    if (reduce) { el.textContent = fmt(value); return; }
    var start = performance.now(), dur = 1100;
    (function step(now) {
      var t = Math.min(1, (now - start) / dur);
      el.textContent = fmt(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  // ---------- Flat grid ----------

  function buildGrid() {
    var first = parseDate(days[0].date);
    var offset = first.getUTCDay(); // pad the first column to Sunday
    weeks = Math.ceil((days.length + offset) / 7);
    grid.style.setProperty('--weeks', weeks);
    var frag = document.createDocumentFragment();

    [1, 3, 5].forEach(function (wd) {
      var lab = document.createElement('span');
      lab.className = 'wday';
      lab.textContent = WDAYS[wd];
      lab.style.gridColumn = '1';
      lab.style.gridRow = String(wd + 2);
      frag.appendChild(lab);
    });

    var lastMonth = -1;
    days.forEach(function (day, i) {
      var idx = i + offset;
      var week = Math.floor(idx / 7);
      var wd = idx % 7;
      day.week = week;
      day.wd = wd;
      var d = parseDate(day.date);
      if (wd === 0 || i === 0) {
        var m = d.getUTCMonth();
        if (m !== lastMonth && (d.getUTCDate() <= 7 || i === 0) && week < weeks - 1) {
          var ml = document.createElement('span');
          ml.className = 'month';
          ml.textContent = MONTHS[m];
          ml.style.gridColumn = String(week + 2) + ' / span 3';
          ml.style.gridRow = '1';
          frag.appendChild(ml);
          lastMonth = m;
        }
      }
      var cell = document.createElement('span');
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.dataset.l = String(day.level);
      cell.dataset.i = String(i);
      cell.style.gridColumn = String(week + 2);
      cell.style.gridRow = String(wd + 2);
      cell.style.setProperty('--i', String(week + wd));
      cell.setAttribute('aria-label', describe(day).replace(/<[^>]+>/g, ''));
      frag.appendChild(cell);
    });
    grid.appendChild(frag);

    grid.addEventListener('pointerover', function (e) {
      var c = e.target.closest('.cell');
      if (c) setTip(describe(days[+c.dataset.i]));
    });
    flatPane.scrollLeft = flatPane.scrollWidth;
  }

  // ---------- 3D city ----------
  // Camera math adapted from kedhareswer's "contribution-skyline" on 21st.dev:
  // world x = week, y = weekday, z = height; drag orbits within a safe range
  // and the bars rise in a wave from the oldest week to the newest.

  var levelColors = [];
  var hover = -1;
  var rise = 0;
  var layout = null;
  var drawn = [];
  var RAD = Math.PI / 180;
  var cam = { yaw: 45 * RAD, elev: 34 * RAD };
  var YAW = [8 * RAD, 82 * RAD], ELEV = [18 * RAD, 62 * RAD];
  var TOP = 7.72; // tallest possible bar, used to keep the fit steady while rising

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    levelColors = [0, 1, 2, 3, 4].map(function (l) {
      return cs.getPropertyValue('--lvl-' + l).trim() || '#1d7268';
    });
  }
  function shade(hex, f) {
    var n = parseInt(hex.replace('#', ''), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(Math.min(255, r * f)); g = Math.round(Math.min(255, g * f)); b = Math.round(Math.min(255, b * f));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function computeLayout() {
    var cssW = canvas.clientWidth || canvas.parentElement.clientWidth;
    var cssH = Math.round(clamp(cssW * 0.55, 280, 560));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    layout = { w: cssW, h: cssH, dpr: dpr };
  }

  function camera() {
    return { cs: Math.cos(cam.yaw), sn: Math.sin(cam.yaw), se: Math.sin(cam.elev), ce: Math.cos(cam.elev) };
  }
  function proj(c, x, y, z) {
    return [x * c.cs - y * c.sn, (x * c.sn + y * c.cs) * c.se - z * c.ce];
  }
  function riseAt(day) {
    var d = (weeks > 1 ? day.week / (weeks - 1) : 0) * 0.36 + (day.wd / 6) * 0.06;
    var t = clamp((rise - d) / 0.58, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }
  function barHeight(day) {
    if (!day.count) return 0.12;
    return 0.12 + (0.28 + Math.pow(day.count / maxCount, 0.85) * 7.2) * riseAt(day);
  }

  function drawCity() {
    if (!layout) return;
    var ctx = canvas.getContext('2d');
    var L = layout, c = camera(), s = 0.41;
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    ctx.clearRect(0, 0, L.w, L.h);

    // fit the whole city (at full height) into the canvas for this camera
    var xs = [], ys = [];
    [[0, 0], [weeks, 0], [0, 7], [weeks, 7]].forEach(function (g) {
      [0, TOP].forEach(function (z) { var p = proj(c, g[0], g[1], z); xs.push(p[0]); ys.push(p[1]); });
    });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var k = Math.min((L.w - 24) / (maxX - minX), (L.h - 24) / (maxY - minY));
    var ox = (L.w - (maxX - minX) * k) / 2 - minX * k;
    var oy = (L.h - (maxY - minY) * k) / 2 - minY * k;
    function P(x, y, z) { var p = proj(c, x, y, z); return [ox + p[0] * k, oy + p[1] * k]; }

    var order = days.map(function (d, i) { return i; }).sort(function (a, b) {
      var A = days[a], B = days[b];
      return ((A.week + 0.5) * c.sn + (A.wd + 0.5) * c.cs) - ((B.week + 0.5) * c.sn + (B.wd + 0.5) * c.cs);
    });
    drawn = [];
    order.forEach(function (i) {
      var day = days[i], h = barHeight(day), col = levelColors[day.level];
      var x0 = day.week + 0.5 - s, x1 = day.week + 0.5 + s, y0 = day.wd + 0.5 - s, y1 = day.wd + 0.5 + s;
      var faces = [
        [P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, h), P(x1, y0, h), shade(col, 0.55)],
        [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, h), P(x0, y1, h), shade(col, 0.78)],
        [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h),
          i === hover ? '#e9edf2' : shade(col, day.level >= 3 ? 1.15 : 1.0)]
      ];
      faces.forEach(function (f) {
        ctx.fillStyle = f[4];
        ctx.beginPath();
        ctx.moveTo(f[0][0], f[0][1]);
        for (var j = 1; j < 4; j++) ctx.lineTo(f[j][0], f[j][1]);
        ctx.closePath();
        ctx.fill();
      });
      if (day.level === 4) {
        var t = P(day.week + 0.5, day.wd + 0.5, h);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,179,92,0.12)';
        ctx.beginPath();
        ctx.arc(t[0], t[1], s * k * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      drawn.push({ i: i, faces: faces });
    });
  }

  function inQuad(q, x, y) {
    var inside = false;
    for (var a = 0, b = 3; a < 4; b = a++) {
      if ((q[a][1] > y) !== (q[b][1] > y) &&
          x < (q[b][0] - q[a][0]) * (y - q[a][1]) / (q[b][1] - q[a][1]) + q[a][0]) inside = !inside;
    }
    return inside;
  }
  function hitTest(mx, my) {
    for (var n = drawn.length - 1; n >= 0; n--) { // front-most first
      var f = drawn[n].faces;
      if (inQuad(f[2], mx, my) || inQuad(f[1], mx, my) || inQuad(f[0], mx, my)) return drawn[n].i;
    }
    return -1;
  }

  // drag to orbit, hover to read a day
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, elev: cam.elev };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
  });
  function endDrag() { drag = null; canvas.classList.remove('dragging'); }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('dblclick', function () { cam.yaw = 45 * RAD; cam.elev = 34 * RAD; drawCity(); });
  canvas.addEventListener('pointermove', function (e) {
    if (!layout) return;
    if (drag) {
      cam.yaw = clamp(drag.yaw - (e.clientX - drag.x) * 0.006, YAW[0], YAW[1]);
      cam.elev = clamp(drag.elev + (e.clientY - drag.y) * 0.004, ELEV[0], ELEV[1]);
      drawCity();
      return;
    }
    var r = canvas.getBoundingClientRect();
    var i = hitTest(e.clientX - r.left, e.clientY - r.top);
    if (i !== hover) {
      hover = i;
      if (i >= 0) setTip(describe(days[i]));
      drawCity();
    }
  });
  canvas.addEventListener('pointerleave', function () { if (!drag) { hover = -1; drawCity(); } });

  function showCity() {
    readColors();
    computeLayout();
    if (reduce) { rise = 1; drawCity(); return; }
    rise = 0;
    var start = performance.now(), dur = 1800;
    (function step(now) {
      rise = Math.min(1, (now - start) / dur);
      drawCity();
      if (rise < 1) requestAnimationFrame(step);
    })(start);
  }

  window.addEventListener('resize', function () {
    if (!canvas.hidden && days.length) { computeLayout(); drawCity(); }
  });

  root.querySelectorAll('.view-switch button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!days.length) return;
      var view = btn.dataset.view;
      root.querySelectorAll('.view-switch button').forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      flatPane.hidden = view !== 'flat';
      canvas.hidden = view !== '3d';
      if (view === '3d') showCity();
    });
  });

  // ---------- Load ----------

  fetch(root.dataset.src, { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.ok || !data.days || !data.days.length) throw new Error('no data');
      days = data.days.slice(-371);
      maxCount = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.count; })));
      var s = data.summary;
      root.querySelectorAll('[data-stat]').forEach(function (el) {
        var key = el.dataset.stat;
        var suffix = key.indexOf('streak') >= 0 ? (s[key] === 1 ? ' day' : ' days') : '';
        countUp(el, s[key] || 0, suffix);
      });
      if (s.best_day && s.best_day.count) {
        bestEl.textContent = 'Busiest day: ' + s.best_day.count + ' contributions on ' + niceDate(s.best_day.date) + (data.sample ? ' (sample data)' : '');
      }
      buildGrid();
      setTip('Hover a day to see its commits.');
    })
    .catch(function () {
      root.querySelectorAll('[data-stat]').forEach(function (el) { el.textContent = '-'; });
      setTip('GitHub activity is not available right now. See it on GitHub instead.');
    });
})();
