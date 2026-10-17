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

  var levelColors = [];
  var hover = -1;
  var grow = 0;
  var layout = null;

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

  function computeLayout() {
    var cssW = canvas.clientWidth || canvas.parentElement.clientWidth;
    var cw = (cssW - 24) / (weeks + 7);
    var ch = cw * 0.5;
    var hMax = cw * 9;
    var cssH = Math.ceil((weeks + 7) * ch + hMax + 24);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    layout = { cw: cw, ch: ch, hMax: hMax, dpr: dpr, ox: 12 + 7 * cw, oy: hMax + 12 };
  }

  function barHeight(day) {
    if (!day.count) return layout.cw * 0.18;
    return layout.cw * 0.5 + Math.sqrt(day.count / maxCount) * layout.hMax * grow;
  }
  function project(day) {
    var x = layout.ox + (day.week - day.wd) * layout.cw;
    var y = layout.oy + (day.week + day.wd) * layout.ch;
    return { x: x, y: y };
  }

  function drawCity() {
    if (!layout) return;
    var ctx = canvas.getContext('2d');
    var L = layout, s = 0.82;
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var order = days.slice().sort(function (a, b) {
      return (a.week + a.wd) - (b.week + b.wd) || (a.week - b.week);
    });
    order.forEach(function (day) {
      var p = project(day);
      var h = barHeight(day);
      var w = L.cw * s, hh = L.ch * s;
      var col = levelColors[day.level];
      var isHover = days[hover] === day;
      // left face
      ctx.fillStyle = shade(col, 0.55);
      ctx.beginPath();
      ctx.moveTo(p.x - w, p.y - h); ctx.lineTo(p.x, p.y + hh - h);
      ctx.lineTo(p.x, p.y + hh); ctx.lineTo(p.x - w, p.y);
      ctx.closePath(); ctx.fill();
      // right face
      ctx.fillStyle = shade(col, 0.78);
      ctx.beginPath();
      ctx.moveTo(p.x + w, p.y - h); ctx.lineTo(p.x, p.y + hh - h);
      ctx.lineTo(p.x, p.y + hh); ctx.lineTo(p.x + w, p.y);
      ctx.closePath(); ctx.fill();
      // top face
      ctx.fillStyle = isHover ? '#e9edf2' : shade(col, day.level >= 3 ? 1.15 : 1.0);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - hh - h); ctx.lineTo(p.x + w, p.y - h);
      ctx.lineTo(p.x, p.y + hh - h); ctx.lineTo(p.x - w, p.y - h);
      ctx.closePath(); ctx.fill();
      if (day.level === 4) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,179,92,0.10)';
        ctx.beginPath();
        ctx.arc(p.x, p.y - h, w * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  function hitTest(mx, my) {
    // Front-most first: larger week+wd is drawn later, so test it first.
    var L = layout, s = 0.82, best = -1, bestKey = -1;
    for (var i = 0; i < days.length; i++) {
      var day = days[i], p = project(day), h = barHeight(day);
      var w = L.cw * s, hh = L.ch * s;
      var dx = Math.abs(mx - p.x);
      if (dx > w) continue;
      var top = p.y - h - hh * (1 - dx / w);
      var bottom = p.y + hh * (1 - dx / w);
      if (my >= top && my <= bottom) {
        var key = day.week + day.wd;
        if (key > bestKey) { bestKey = key; best = i; }
      }
    }
    return best;
  }

  canvas.addEventListener('pointermove', function (e) {
    if (!layout) return;
    var r = canvas.getBoundingClientRect();
    var i = hitTest(e.clientX - r.left, e.clientY - r.top);
    if (i !== hover) {
      hover = i;
      if (i >= 0) setTip(describe(days[i]));
      drawCity();
    }
  });
  canvas.addEventListener('pointerleave', function () { hover = -1; drawCity(); });

  function showCity() {
    readColors();
    computeLayout();
    if (reduce) { grow = 1; drawCity(); return; }
    grow = 0;
    var start = performance.now(), dur = 1200;
    (function step(now) {
      var t = Math.min(1, (now - start) / dur);
      grow = 1 - Math.pow(1 - t, 3);
      drawCity();
      if (t < 1) requestAnimationFrame(step);
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
