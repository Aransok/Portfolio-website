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
  function paint(g, w, h, card) {
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

    paintings.push({ card: card, side: side, z: z, art: art, tex: tex, scan: scan, beam: bm, pool: pool.material, halo: halo.material });
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
    paint(p.tex.image.getContext('2d'), p.tex.image.width, p.tex.image.height, p.card);
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
      paintings.forEach(function (p, j) { p.scan.visible = j === idx; });
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
    if (shown >= 0) paintings[shown].scan.position.y = 0.98 - (clock.elapsedTime * 0.45 % 1) * 1.96;
    renderer.render(scene, camera);
  }
  resize();
  t = progress();
  frame();
})();
