// Projects museum: a dark hall in three.js. Scrolling walks the camera past
// each project hung as a generated painting, turning to face it while the
// card's own plaque (title, blurb, links) shows over the scene. The cards
// below stay the accessible catalogue and the no-WebGL / reduced-motion view.
(function () {
  var section = document.querySelector('.museum');
  var canvas = document.getElementById('museum');
  if (!section || !canvas || typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  } catch (e) {
    return;
  }
  var cards = Array.prototype.slice.call(document.querySelectorAll('.projects-grid .project-card'));
  var N = cards.length;
  if (!N) return;
  section.hidden = false;
  section.style.height = ((N + 2) * 80 + 100) + 'vh';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x07090c);

  var plaque = section.querySelector('.museum-plaque');
  var hudRoom = section.querySelector('[data-room]');
  var ds = section.dataset;
  var loader = section.querySelector('.museum-loader');
  var THREAD = '#7fe3d4', EMBER = '#ffb35c';
  var S = 7, HALF = 3.5, H = 4.4, EYE = 1.6;
  var DOOR = 6, DW = 1.1, DH = 2.9;
  var endZ = 2 - (N + 1) * S - 1;
  var L = 2 - endZ + 4;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07090c, 6, 30);
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);
  camera.rotation.order = 'YXZ';

  // ---------- textures ----------
  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  function glow(color) {
    return canvasTex(128, 128, function (g, w, h) {
      var r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, color);
      r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, w, h);
    });
  }
  function seeded(str) {
    var s = 0;
    for (var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Generative "code art": circuit traces seeded by the project title, with
  // the card's glyph (or logo) in the middle and its tags along the bottom.
  function cover(g, src, sw, sh, w, h) {
    var sc = Math.max(w / sw, h / sh), dw = sw * sc, dh = sh * sc;
    g.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  // projects with a recorded demo hang a frame of the real product
  function paintShot(g, w, h, card, shot) {
    var title = card.querySelector('h3').textContent.trim();
    var tags = Array.prototype.map.call(card.querySelectorAll('.tag'), function (t) { return t.textContent.trim(); });
    g.fillStyle = '#0a0d12';
    g.fillRect(0, 0, w, h);
    cover(g, shot, shot.naturalWidth, shot.naturalHeight, w, h);
    var fade = g.createLinearGradient(0, h * 0.45, 0, h);
    fade.addColorStop(0, 'rgba(9,11,15,0)');
    fade.addColorStop(1, 'rgba(9,11,15,0.92)');
    g.fillStyle = fade;
    g.fillRect(0, 0, w, h);
    var badge = (card.dataset.badge || '').toUpperCase();
    if (badge) {
      g.font = '600 20px "IBM Plex Mono", monospace';
      var bw = g.measureText(badge).width + 34;
      g.fillStyle = 'rgba(9,11,15,0.8)';
      g.beginPath();
      if (g.roundRect) g.roundRect(w - bw - 28, 26, bw, 40, 20); else g.rect(w - bw - 28, 26, bw, 40);
      g.fill();
      g.strokeStyle = EMBER;
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = EMBER;
      g.textBaseline = 'middle';
      g.fillText(badge, w - bw - 11, 47);
    }
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.font = '800 54px Syne, "Arial Black", sans-serif';
    g.fillStyle = '#e9edf2';
    g.fillText(title, 48, h - 86);
    g.font = '22px "IBM Plex Mono", monospace';
    g.fillStyle = THREAD;
    g.fillText(tags.join('  /  '), 48, h - 44);
  }
  function paint(g, w, h, card) {
    if (card.__shot) { paintShot(g, w, h, card, card.__shot); return; }
    var title = card.querySelector('h3').textContent.trim();
    var mark = card.querySelector('.project-art .mono');
    var img = card.querySelector('.project-art img');
    var tags = Array.prototype.map.call(card.querySelectorAll('.tag'), function (t) { return t.textContent.trim(); });
    var rnd = seeded(title);
    var bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0d1218');
    bg.addColorStop(1, '#151b24');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    var cell = 32, dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
    g.lineCap = 'round';
    for (var k = 0; k < 46; k++) {
      var x = Math.floor(rnd() * w / cell) * cell, y = Math.floor(rnd() * h / cell) * cell;
      var col = rnd() < 0.18 ? EMBER : THREAD;
      g.strokeStyle = col;
      g.fillStyle = col;
      g.globalAlpha = 0.25 + rnd() * 0.45;
      g.lineWidth = rnd() < 0.3 ? 3 : 1.5;
      g.shadowColor = col;
      g.shadowBlur = 12;
      g.beginPath();
      g.moveTo(x, y);
      var d = dirs[(rnd() * dirs.length) | 0];
      for (var s = 0, steps = 3 + (rnd() * 6 | 0); s < steps; s++) {
        if (rnd() < 0.4) d = dirs[(rnd() * dirs.length) | 0];
        x += d[0] * cell * (1 + (rnd() * 3 | 0));
        y += d[1] * cell * (1 + (rnd() * 2 | 0));
        g.lineTo(x, y);
      }
      g.stroke();
      g.beginPath();
      g.arc(x, y, g.lineWidth + 3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.shadowBlur = 0;

    var vig = g.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, w * 0.6);
    vig.addColorStop(0, 'rgba(9,11,15,0.85)');
    vig.addColorStop(1, 'rgba(9,11,15,0.1)');
    g.fillStyle = vig;
    g.fillRect(0, 0, w, h);

    if (img && img.complete && img.naturalWidth) {
      var sc = Math.min(w * 0.5 / img.naturalWidth, h * 0.42 / img.naturalHeight);
      var iw = img.naturalWidth * sc, ih = img.naturalHeight * sc;
      g.shadowColor = THREAD;
      g.shadowBlur = 40;
      g.drawImage(img, (w - iw) / 2, (h - ih) / 2 - 20, iw, ih);
      g.shadowBlur = 0;
    } else {
      var text = mark ? mark.textContent.trim() : title.slice(0, 2);
      g.font = '800 ' + (text.length > 2 ? 210 : 260) + 'px Syne, "Arial Black", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      var tg = g.createLinearGradient(w * 0.25, 0, w * 0.75, 0);
      tg.addColorStop(0, THREAD);
      tg.addColorStop(1, EMBER);
      g.shadowColor = THREAD;
      g.shadowBlur = 30;
      g.lineWidth = 5;
      g.strokeStyle = tg;
      g.strokeText(text, w / 2, h / 2 - 20);
      g.shadowBlur = 0;
    }
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.font = '500 30px "IBM Plex Mono", monospace';
    g.fillStyle = '#e9edf2';
    g.fillText(title.toLowerCase().replace(/\s+/g, '_'), 48, h - 78);
    g.font = '22px "IBM Plex Mono", monospace';
    g.fillStyle = '#8b95a3';
    g.fillText(tags.join('  /  '), 48, h - 40);
  }

  // ---------- trailers ----------
  // When the camera faces a painting it plays a short looping trailer drawn
  // straight into the painting's canvas: glitch-in, a terminal running the
  // project, its stack, then a one-line hook. Scripts come from the card's
  // data-cmd ("|" separated lines, "$ " = typed command) and data-hook.
  var TR = 9.5;
  function rrect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function trailerScript(card) {
    var title = card.querySelector('h3').textContent.trim();
    var cmd = card.dataset.cmd ? card.dataset.cmd.split('|') : ['$ git clone ' + title.toLowerCase().replace(/\s+/g, '-'), 'ready ✓'];
    var lines = [], at = 0.3;
    cmd.forEach(function (l) {
      l = l.trim();
      var typed = l.indexOf('$ ') === 0;
      var dur = typed ? Math.max(0.5, l.length / 34) : 0.12;
      lines.push({ text: l, typed: typed, at: at, dur: dur });
      at += dur + (typed ? 0.35 : 0.22);
    });
    return {
      title: title,
      slug: title.toLowerCase().replace(/\s+/g, '_'),
      tags: Array.prototype.map.call(card.querySelectorAll('.tag'), function (t) { return t.textContent.trim(); }),
      lines: lines,
      hook: (card.dataset.hook || title).toUpperCase()
    };
  }
  function fitFont(g, text, weight, family, maxW, maxPx) {
    var px = maxPx;
    g.font = weight + ' ' + px + 'px ' + family;
    var m = g.measureText(text).width;
    if (m > maxW) px = Math.floor(px * maxW / m);
    g.font = weight + ' ' + px + 'px ' + family;
    return px;
  }
  function videoTrailer(p) {
    var c = p.tex.image, g = c.getContext('2d'), w = c.width, h = c.height, v = p.video;
    if (v.readyState < 2) return;
    g.fillStyle = '#0a0d12';
    g.fillRect(0, 0, w, h);
    cover(g, v, v.videoWidth, v.videoHeight, w, h);
    var k = v.duration ? v.currentTime / v.duration : 0;
    g.fillStyle = 'rgba(8,11,15,0.72)';
    if (g.roundRect) { g.beginPath(); g.roundRect(24, 22, 196, 40, 20); g.fill(); } else g.fillRect(24, 22, 196, 40);
    g.fillStyle = Math.floor(performance.now() / 500) % 2 ? '#ff5d5d' : '#7a2a2a';
    g.beginPath();
    g.arc(48, 42, 8, 0, Math.PI * 2);
    g.fill();
    g.font = '600 20px "IBM Plex Mono", monospace';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillStyle = '#e9edf2';
    g.fillText('LIVE DEMO', 66, 43);
    g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.fillRect(0, h - 6, w, 6);
    g.fillStyle = THREAD;
    g.fillRect(0, h - 6, w * k, 6);
    p.tex.needsUpdate = true;
  }
  function trailer(p, s) {
    if (p.video) { videoTrailer(p); return; }
    var c = p.tex.image, g = c.getContext('2d'), w = c.width, h = c.height, sc = p.script;
    var t = s % TR;
    var SYNE = 'Syne, "Arial Black", sans-serif', MONO = '"IBM Plex Mono", monospace';
    g.save();
    g.fillStyle = '#0a0d12';
    g.fillRect(0, 0, w, h);

    if (t < 1.4) {
      // glitch-in: the still painting arrives in torn horizontal slices
      var k = ease(t / 1.1), slices = 14, sh = h / slices, rnd = seeded(sc.title + Math.floor(t * 24));
      for (var i = 0; i < slices; i++) {
        var off = (rnd() - 0.5) * 220 * (1 - k);
        g.globalAlpha = 0.35 + 0.65 * k;
        g.drawImage(p.still, 0, i * sh, w, sh, off, i * sh, w, sh);
        if (rnd() < 0.3 * (1 - k)) {
          g.globalAlpha = 0.5 * (1 - k);
          g.fillStyle = rnd() < 0.5 ? THREAD : EMBER;
          g.fillRect(0, i * sh + rnd() * sh, w, 3);
        }
      }
      g.globalAlpha = 1;
    } else if (t < 5.4) {
      // terminal running the project
      var lt = t - 1.4;
      g.globalAlpha = 0.18;
      g.drawImage(p.still, 0, 0);
      g.globalAlpha = 1;
      var px = 70, py = 64, pw = w - 140, ph = h - 150;
      var pop = ease(lt / 0.35);
      g.translate(w / 2, h / 2);
      g.scale(0.94 + 0.06 * pop, 0.94 + 0.06 * pop);
      g.translate(-w / 2, -h / 2);
      g.globalAlpha = pop;
      rrect(g, px, py, pw, ph, 18);
      g.fillStyle = 'rgba(8,11,15,0.94)';
      g.fill();
      g.strokeStyle = 'rgba(127,227,212,0.45)';
      g.lineWidth = 2;
      g.stroke();
      ['#ff6b6b', EMBER, THREAD].forEach(function (col, j) {
        g.fillStyle = col;
        g.beginPath();
        g.arc(px + 30 + j * 26, py + 28, 7, 0, Math.PI * 2);
        g.fill();
      });
      g.font = '500 22px ' + MONO;
      g.fillStyle = '#8b95a3';
      g.textAlign = 'center';
      g.fillText('~/' + sc.slug, w / 2, py + 35);
      g.textAlign = 'left';
      g.font = '500 30px ' + MONO;
      var y = py + 104, cx = px + 36, cy = y;
      for (var n = 0; n < sc.lines.length; n++) {
        var L = sc.lines[n];
        if (lt < L.at) break;
        var txt = L.typed ? L.text.slice(0, Math.ceil(L.text.length * clamp((lt - L.at) / L.dur))) : L.text;
        g.fillStyle = L.typed ? THREAD : (L.text.indexOf('✓') >= 0 ? EMBER : '#d6dde6');
        g.fillText(txt, px + 36, y);
        cx = px + 36 + g.measureText(txt).width + 6;
        cy = y;
        y += 50;
      }
      if (Math.floor(lt * 2.4) % 2 === 0) {
        g.fillStyle = THREAD;
        g.fillRect(cx, cy - 24, 16, 30);
      }
    } else if (t < 7.4) {
      // the stack: title rises, tag chips drop in one by one
      var st = t - 5.4;
      g.globalAlpha = 0.28;
      g.drawImage(p.still, 0, 0);
      g.globalAlpha = 1;
      var vg = g.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.6);
      vg.addColorStop(0, 'rgba(10,13,18,0.55)');
      vg.addColorStop(1, 'rgba(10,13,18,0.95)');
      g.fillStyle = vg;
      g.fillRect(0, 0, w, h);
      var rise = ease(st / 0.5);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      fitFont(g, sc.title, 800, SYNE, w * 0.86, 88);
      g.globalAlpha = rise;
      g.fillStyle = '#e9edf2';
      g.fillText(sc.title, w / 2, h * 0.36 + 40 * (1 - rise));
      g.font = '500 30px ' + MONO;
      var gap = 18, ws = sc.tags.map(function (tg) { return g.measureText(tg).width + 44; });
      var rows = [[]], rw = [0], maxRow = w * 0.84;
      ws.forEach(function (cw, j) {
        var r = rows.length - 1;
        if (rw[r] + cw > maxRow && rows[r].length) { rows.push([]); rw.push(0); r++; }
        rows[r].push(j);
        rw[r] += cw + gap;
      });
      rows.forEach(function (row, r) {
        var x = (w - (rw[r] - gap)) / 2, yy = h * 0.58 + r * 74;
        row.forEach(function (j) {
          var a = ease((st - 0.35 - j * 0.14) / 0.3);
          g.globalAlpha = a;
          var dy = -30 * (1 - a);
          rrect(g, x, yy - 28 + dy, ws[j], 56, 28);
          g.fillStyle = 'rgba(127,227,212,0.08)';
          g.fill();
          g.strokeStyle = j % 3 === 2 ? EMBER : THREAD;
          g.lineWidth = 2;
          g.stroke();
          g.fillStyle = '#e9edf2';
          g.fillText(sc.tags[j], x + ws[j] / 2, yy + 2 + dy);
          x += ws[j] + gap;
        });
      });
    } else {
      // the hook: one big line, then fade back to the still painting
      var ht = t - 7.4;
      var zoom = 1.18 - 0.18 * ease(ht / 0.6);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.translate(w / 2, h * 0.46);
      g.scale(zoom, zoom);
      fitFont(g, sc.hook, 800, SYNE, w * 0.82, 120);
      var gr = g.createLinearGradient(-w * 0.4, 0, w * 0.4, 0);
      gr.addColorStop(0, THREAD);
      gr.addColorStop(1, EMBER);
      g.shadowColor = THREAD;
      g.shadowBlur = 40 * ease(ht / 0.6);
      g.globalAlpha = ease(ht / 0.35);
      g.fillStyle = gr;
      g.fillText(sc.hook, 0, 0);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.shadowBlur = 0;
      g.font = '500 24px ' + MONO;
      g.fillStyle = '#8b95a3';
      g.fillText('doan.idriz  /  ' + sc.slug, w / 2, h * 0.7);
      var back = ease((ht - 1.5) / 0.6);
      if (back > 0) {
        g.globalAlpha = back;
        g.drawImage(p.still, 0, 0);
      }
    }
    g.restore();

    // REC badge and progress line ride on top of every scene
    g.fillStyle = 'rgba(8,11,15,0.7)';
    rrect(g, 24, 22, 150, 40, 20);
    g.fill();
    g.fillStyle = Math.floor(s * 2) % 2 ? '#ff5d5d' : '#7a2a2a';
    g.beginPath();
    g.arc(48, 42, 8, 0, Math.PI * 2);
    g.fill();
    g.font = '600 20px "IBM Plex Mono", monospace';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillStyle = '#e9edf2';
    g.fillText('TRAILER', 66, 43);
    g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(0, h - 6, w, 6);
    g.fillStyle = THREAD;
    g.fillRect(0, h - 6, w * (t / TR), 6);
    p.tex.needsUpdate = true;
  }
  function stopTrailer(p) {
    if (!p || !p.still) return;
    if (p.video) p.video.pause();
    var g = p.tex.image.getContext('2d');
    g.drawImage(p.still, 0, 0);
    p.tex.needsUpdate = true;
  }

  // ---------- hall ----------
  var midZ = 2 - L / 2 + 4;
  var floorTex = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = '#07090c';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(127,227,212,0.10)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, w, h);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(HALF * 2 / 1.4, L / 1.4);
  // the floor is see-through so the mirrored paintings under it read as a glossy reflection
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, L),
    new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, opacity: 0.86, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = midZ;
  floor.renderOrder = 1;
  scene.add(floor);

  var wallMat = new THREE.MeshBasicMaterial({ color: 0x0c1016 });
  var barMats = [];
  [-1, 1].forEach(function (side) {
    var wall = new THREE.Mesh(new THREE.PlaneGeometry(L, H), wallMat);
    wall.position.set(side * HALF, H / 2, midZ);
    wall.rotation.y = -side * Math.PI / 2;
    scene.add(wall);
    var strip = new THREE.Mesh(new THREE.PlaneGeometry(0.04, L), new THREE.MeshBasicMaterial({ color: THREAD }));
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(side * (HALF - 0.03), 0.01, midZ);
    strip.renderOrder = 2;
    scene.add(strip);
  });
  var ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, L), new THREE.MeshBasicMaterial({ color: 0x090c11 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, H, midZ);
  scene.add(ceil);
  for (var r = 0; r < 2; r++) {
    var bar = new THREE.Mesh(new THREE.PlaneGeometry(0.06, L), new THREE.MeshBasicMaterial({ color: 0xbfc9d6, transparent: true, opacity: 0 }));
    barMats.push(bar.material);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(r ? 0.9 : -0.9, H - 0.01, midZ);
    scene.add(bar);
  }

  var beamMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color('#fff4e2') }, k: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 color; uniform float k; varying vec2 vUv; void main(){ gl_FragColor = vec4(color, pow(vUv.y, 1.6) * 0.16 * k); }',
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
  });
  var poolTex = glow('rgba(255,244,226,0.55)');
  var haloTex = glow('rgba(127,227,212,0.35)');

  var paintings = [];
  cards.forEach(function (card, j) {
    var side = j % 2 ? 1 : -1;
    var z = 2 - (j + 1) * S;
    // blank until the loader paints it
    var tex = canvasTex(1024, 640, function (g, w, h) { g.fillStyle = '#0d1218'; g.fillRect(0, 0, w, h); });
    var group = new THREE.Group();
    var frame = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.3, 0.1), new THREE.MeshBasicMaterial({ color: 0x1b212b }));
    var art = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), new THREE.MeshBasicMaterial({ map: tex }));
    art.position.z = 0.06;
    var edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.5, 2.3)),
      new THREE.LineBasicMaterial({ color: j === 0 ? EMBER : THREAD, transparent: true, opacity: 0.8 }));
    edge.position.z = 0.055;
    var halo = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.4), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.z = 0.01;
    group.add(halo, frame, art, edge);
    group.position.set(side * (HALF - 0.06), 1.8, z);
    group.rotation.y = -side * Math.PI / 2;
    scene.add(group);

    var mirror = group.clone();
    mirror.position.y = -1.8;
    mirror.scale.y = -1;
    mirror.traverse(function (o) {
      if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.22; }
    });
    scene.add(mirror);

    var scan = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.03), new THREE.MeshBasicMaterial({ color: THREAD, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    scan.position.z = 0.07;
    scan.visible = false;
    group.add(scan);

    var bm = beamMat.clone();
    var beam = new THREE.Mesh(new THREE.ConeGeometry(1.9, H, 40, 1, true), bm);
    beam.position.set(side * 2.7, H / 2, z);
    beam.rotation.z = side * 0.32;
    scene.add(beam);
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(side * 2.3, 0.02, z);
    pool.renderOrder = 2;
    scene.add(pool);

    // room number painted on the floor across from the painting
    var num = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({
      map: canvasTex(256, 128, function (g, w, h) {
        g.font = '800 96px Syne, "Arial Black", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.strokeStyle = THREAD;
        g.lineWidth = 2;
        g.strokeText((j < 9 ? '0' : '') + (j + 1), w / 2, h / 2);
      }), transparent: true, opacity: 0.35, depthWrite: false }));
    num.rotation.set(-Math.PI / 2, 0, side * Math.PI / 2);
    num.position.set(-side * 1.9, 0.02, z);
    num.renderOrder = 2;
    scene.add(num);

    paintings.push({ card: card, side: side, z: z, art: art, tex: tex, scan: scan, beam: bm, pool: pool.material, halo: halo.material, script: trailerScript(card), still: null, start: 0 });
  });

  // ---------- entrance: building front, neon sign, sliding doors ----------
  var outTex = floorTex.clone();
  outTex.needsUpdate = true;
  outTex.repeat.set(40 / 1.4, 14 / 1.4);
  var outside = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshBasicMaterial({ map: outTex, transparent: true, opacity: 0.86, depthWrite: false }));
  outside.rotation.x = -Math.PI / 2;
  outside.position.z = DOOR + 7;
  outside.renderOrder = 1;
  scene.add(outside);
  var faceMat = new THREE.MeshBasicMaterial({ color: 0x0e131a });
  [-1, 1].forEach(function (side) {
    var piece = new THREE.Mesh(new THREE.PlaneGeometry(20 - DW, 14), faceMat);
    piece.position.set(side * (DW + (20 - DW) / 2), 7, DOOR);
    scene.add(piece);
  });
  var lintel = new THREE.Mesh(new THREE.PlaneGeometry(DW * 2, 14 - DH), faceMat);
  lintel.position.set(0, DH + (14 - DH) / 2, DOOR);
  scene.add(lintel);
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-DW, 0, DOOR + 0.01), new THREE.Vector3(-DW, DH, DOOR + 0.01),
    new THREE.Vector3(DW, DH, DOOR + 0.01), new THREE.Vector3(DW, 0, DOOR + 0.01)
  ]), new THREE.LineBasicMaterial({ color: THREAD })));
  var doorMat = new THREE.MeshBasicMaterial({ color: 0x151c25 });
  var doorEdge = new THREE.LineBasicMaterial({ color: THREAD, transparent: true, opacity: 0.5 });
  var doors = [-1, 1].map(function (side) {
    var d = new THREE.Group();
    d.add(new THREE.Mesh(new THREE.PlaneGeometry(DW, DH), doorMat));
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(DW - 0.08, DH - 0.08)), doorEdge);
    e.position.z = 0.005;
    d.add(e);
    d.position.set(side * DW / 2, DH / 2, DOOR - 0.03);
    d.userData.side = side;
    scene.add(d);
    return d;
  });
  var signMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.15, depthWrite: false, map: canvasTex(1024, 300, function (g, w, h) {
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '800 128px Syne, "Arial Black", sans-serif';
    g.shadowColor = THREAD;
    g.shadowBlur = 30;
    g.lineWidth = 4;
    g.strokeStyle = THREAD;
    g.strokeText('DOAN.IDRIZ', w / 2, h / 2 - 34);
    g.strokeText('DOAN.IDRIZ', w / 2, h / 2 - 34);
    g.font = '500 38px "IBM Plex Mono", monospace';
    g.shadowColor = EMBER;
    g.fillStyle = EMBER;
    g.fillText((ds.sign || 'exhibition').toUpperCase().split('').join(' '), w / 2, h / 2 + 82);
  }) });
  var sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.35), signMat);
  sign.position.set(0, DH + 1.15, DOOR + 0.02);
  scene.add(sign);
  var doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(7, 5.5), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  doorGlow.position.set(0, 1.5, DOOR + 0.04);
  scene.add(doorGlow);
  var stepPool = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  stepPool.rotation.x = -Math.PI / 2;
  stepPool.position.set(0, 0.02, DOOR + 1.6);
  stepPool.renderOrder = 2;
  scene.add(stepPool);

  var endTex = canvasTex(1024, 512, function (g, w, h) {
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '800 92px Syne, "Arial Black", sans-serif';
    g.shadowColor = EMBER;
    g.shadowBlur = 36;
    g.fillStyle = EMBER;
    g.fillText(ds.end1 || 'YOUR PROJECT', w / 2, h / 2 - 50);
    g.shadowColor = THREAD;
    g.fillStyle = THREAD;
    g.fillText(ds.end2 || 'HERE', w / 2, h / 2 + 60);
    g.shadowBlur = 0;
    g.font = '28px "IBM Plex Mono", monospace';
    g.fillStyle = '#8b95a3';
    g.fillText(ds.end3 || 'click to start the conversation', w / 2, h - 50);
  });
  var endWall = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, H), wallMat);
  endWall.position.set(0, H / 2, endZ - 0.01);
  scene.add(endWall);
  var endSign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshBasicMaterial({ map: endTex, transparent: true }));
  endSign.position.set(0, 1.9, endZ);
  scene.add(endSign);

  // drifting dust in the light
  var dustN = 700, dust = new Float32Array(dustN * 3);
  for (var d = 0; d < dustN; d++) {
    dust[d * 3] = (Math.random() * 2 - 1) * HALF;
    dust[d * 3 + 1] = Math.random() * H;
    dust[d * 3 + 2] = endZ + Math.random() * (L - 4);
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  var dustPts = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.03, color: 0xcfe9e4, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(dustPts);

  // ---------- loader: fonts first, then hang one painting at a time ----------
  var openAt = 0, t0 = performance.now();
  var pct = loader && loader.querySelector('.museum-pct');
  function hang(k) {
    if (k === N) {
      setTimeout(function () { section.classList.add('loaded'); openAt = performance.now(); }, Math.max(0, 1200 - (performance.now() - t0)));
      return;
    }
    var p = paintings[k];
    var poster = p.card.dataset.poster;
    if (poster && !p.card.__shot && !p.card.__shotTried) {
      p.card.__shotTried = true;
      var im = new Image();
      im.onload = function () { p.card.__shot = im; hang(k); };
      im.onerror = function () { hang(k); };
      im.src = poster;
      return;
    }
    if (p.card.dataset.video && !p.video) {
      var v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = 'none';
      v.src = p.card.dataset.video;
      p.video = v;
    }
    paint(p.tex.image.getContext('2d'), p.tex.image.width, p.tex.image.height, p.card);
    p.still = document.createElement('canvas');
    p.still.width = p.tex.image.width;
    p.still.height = p.tex.image.height;
    p.still.getContext('2d').drawImage(p.tex.image, 0, 0);
    p.tex.needsUpdate = true;
    if (loader) {
      pct.textContent = Math.round((k + 1) / N * 100) + '%';
      loader.style.setProperty('--p', (k + 1) / N);
    }
    setTimeout(function () { hang(k + 1); }, 70);
  }
  var fontsReady = document.fonts && document.fonts.load ? Promise.race([
    Promise.all([document.fonts.load('800 100px Syne'), document.fonts.load('30px "IBM Plex Mono"')]),
    new Promise(function (r) { setTimeout(r, 1500); })
  ]) : Promise.resolve();
  // the show starts the first time the gallery scrolls into view
  var started = false;
  function startShow() {
    started = true;
    t0 = performance.now();
    fontsReady.then(function () { hang(0); }, function () { hang(0); });
  }

  // after loading the sign flickers on, the doors slide open, then the lights come up room by room
  function lightsUp(now) {
    var s = openAt ? now - openAt : -1;
    var o = s < 0 ? 0 : ease((s - 500) / 1400);
    doors.forEach(function (d) { d.position.x = d.userData.side * DW * (0.5 + o); });
    signMat.opacity = s < 0 ? 0.15 : s < 700 ? (Math.random() < 0.45 ? 0.25 : 1) : 1;
    doorGlow.material.opacity = o * 0.8;
    stepPool.material.opacity = o * 0.6;
    var bars = s < 0 ? 0 : clamp((s - 1300) / 300) * 0.35;
    barMats.forEach(function (m) { m.opacity = bars; });
    paintings.forEach(function (p, j) {
      var k = s < 0 ? 0 : clamp((s - 1500 - j * 260) / 450);
      if (k > 0 && k < 1 && Math.random() < 0.25) k *= 0.3;
      p.beam.uniforms.k.value = k;
      p.pool.opacity = k;
      p.halo.opacity = k;
      var c = 0.18 + 0.82 * k;
      p.art.material.color.setRGB(c, c, c);
    });
  }

  // ---------- plaques ----------
  var plaques = paintings.map(function (p, j) {
    var c = p.card;
    var links = c.querySelector('.project-links');
    var live = c.querySelector('.badge-live');
    return '<span class="museum-no">No. ' + (j < 9 ? '0' : '') + (j + 1) + (live ? ' <b>Live</b>' : '') + '</span>' +
      '<h2>' + c.querySelector('h3').innerHTML + '</h2>' +
      '<p>' + c.querySelector('p').innerHTML + '</p>' +
      (links ? '<div class="project-links">' + links.innerHTML + '</div>' : '');
  });

  // ---------- camera path ----------
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  var target = 0, t = 0, narrow = false, shown = -1;
  var look = { x: 0, y: 0 }, lookT = { x: 0, y: 0 };

  function progress() {
    var run = section.offsetHeight - window.innerHeight;
    var r = section.getBoundingClientRect();
    return run > 0 ? clamp(-r.top / run) : 0;
  }

  function place() {
    // segment -1 walks in from the street, then one per painting, then the exit
    var tt = t * (N + 2) - 1;
    var i = Math.min(N, Math.floor(tt)), f = tt - i;
    var x = 0, z, yaw = 0, pitch = 0, lw = 0, side = 0;
    if (i < 0) {
      z = DOOR + 6 - ease(f) * (DOOR + 4);
      pitch = 0.08 * (1 - ease(f));
    } else if (i < N) {
      side = paintings[i].side;
      z = 2 - (i + ease(f / 0.4)) * S;
      lw = f < 0.85 ? ease((f - 0.4) / 0.15) : 1 - ease((f - 0.85) / 0.15);
      // phones step back to the far wall so the whole painting fits the narrow view
      x = (narrow ? -side * 2.9 : side * 0.4) * lw;
      yaw = -side * Math.PI / 2 * lw;
      pitch = -0.1 * lw;
    } else {
      z = 2 - N * S - ease(f) * (S - 4.5);
    }
    camera.position.set(x, EYE, z);
    camera.rotation.set(pitch + look.y, yaw + look.x, 0);

    var idx = lw > 0.55 ? i : -1;
    if (idx !== shown) {
      // the trailer takes over the canvas, so the scan line stays off while it plays
      paintings.forEach(function (p) { p.scan.visible = false; });
      if (shown >= 0) stopTrailer(paintings[shown]);
      if (idx >= 0) {
        paintings[idx].start = performance.now();
        if (paintings[idx].video) { paintings[idx].video.currentTime = 0; paintings[idx].video.play().catch(function () {}); }
      }
      shown = idx;
      if (idx >= 0) plaque.innerHTML = plaques[idx];
      plaque.classList.toggle('on', idx >= 0);
      plaque.classList.toggle('right', idx >= 0 && narrow === false && paintings[idx].side < 0);
    }
    if (hudRoom) {
      // a room starts counting once you are a fifth of the way to its painting
      var room = Math.min(N, Math.floor(tt + 0.8) - 1);
      hudRoom.textContent = room < 0 ? (ds.entrance || 'Entrance') : room < N ? (ds.roomLabel || 'Room') + ' ' + (room + 1) + ' / ' + N : (ds.exit || 'Exit');
    }
  }

  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    narrow = camera.aspect < 1;
    camera.fov = narrow ? 66 : 50;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    lookT.x = -(e.clientX / window.innerWidth - 0.5) * 0.16;
    lookT.y = -(e.clientY / window.innerHeight - 0.5) * 0.1;
  });

  // click a painting to walk up to it, the exit sign to get in touch
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('click', function (e) {
    var r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hit = ray.intersectObjects(paintings.map(function (p) { return p.art; }).concat(endSign))[0];
    if (!hit) return;
    if (hit.object === endSign) { window.location.href = section.dataset.contact; return; }
    var j = paintings.map(function (p) { return p.art; }).indexOf(hit.object);
    var run = section.offsetHeight - window.innerHeight;
    window.scrollTo({ top: section.offsetTop + (j + 1.7) / (N + 2) * run, behavior: 'smooth' });
  });
  canvas.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    canvas.style.cursor = ray.intersectObjects(paintings.map(function (p) { return p.art; }).concat(endSign)).length ? 'pointer' : '';
  });

  var visible = false, clock = new THREE.Clock();
  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible && !started) startShow();
  }).observe(section);

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    var dt = Math.min(clock.getDelta(), 0.05);
    target = progress();
    t += (target - t) * Math.min(1, dt * 6);
    look.x += (lookT.x - look.x) * 0.05;
    look.y += (lookT.y - look.y) * 0.05;
    var a = dustGeo.attributes.position.array;
    for (var k = 1; k < a.length; k += 3) { a[k] += dt * 0.05; if (a[k] > H) a[k] = 0; }
    dustGeo.attributes.position.needsUpdate = true;
    lightsUp(performance.now());
    place();
    if (shown >= 0 && paintings[shown].still) trailer(paintings[shown], (performance.now() - paintings[shown].start) / 1000);
    if (shown >= 0) paintings[shown].scan.position.y = 0.98 - (clock.elapsedTime * 0.45 % 1) * 1.96;
    renderer.render(scene, camera);
  }
  resize();
  t = progress();
  frame();
})();
