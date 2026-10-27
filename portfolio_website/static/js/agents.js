// Hero "agent HQ": a live multi-agent team on a glass floor. A task types
// itself into the console, the Manager hands work to the other agents, light
// packets arc between their pods and every hop pops the tool call it made.
// Hover a pod to inspect it, click anywhere on the scene for the next task.
(function () {
  var canvas = document.getElementById('woven');
  if (!canvas || typeof THREE === 'undefined') return;
  var hero = canvas.parentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) {
    return; // no WebGL: the gradient background stays on its own
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var THREAD = new THREE.Color('#7fe3d4'), EMBER = new THREE.Color('#ffb35c'), PALE = new THREE.Color('#e9edf2');
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x090b0f, 9, 22);
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  var lookAt = new THREE.Vector3(0, 0.7, 0);

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    return new THREE.CanvasTexture(c);
  }
  var glowTex = canvasTex(128, 128, function (g, w) {
    var r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  });
  function glow(color, size, opacity) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color, transparent: true, opacity: opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(size, size, 1);
    return s;
  }

  // ---------- floor: glass disc with a fading grid and slow rings ----------
  var floorTex = canvasTex(1024, 1024, function (g, w, h) {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(127,227,212,0.22)';
    g.lineWidth = 1.5;
    for (var i = 0; i <= w; i += 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke();
    }
    g.globalCompositeOperation = 'destination-in';
    var m = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    m.addColorStop(0, 'rgba(0,0,0,1)');
    m.addColorStop(0.7, 'rgba(0,0,0,0.5)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m;
    g.fillRect(0, 0, w, h);
  });
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  var rings = [];
  [[1.15, 0.5, EMBER], [3.6, 0.35, THREAD], [4.4, 0.18, THREAD]].forEach(function (r, i) {
    var pts = [];
    for (var a = 0; a <= 128; a++) {
      if (i === 2 && a % 8 > 4) { pts.push(null); continue; }
      pts.push(new THREE.Vector3(Math.cos(a / 128 * Math.PI * 2) * r[0], 0.01, Math.sin(a / 128 * Math.PI * 2) * r[0]));
    }
    var segs = [];
    for (var k = 0; k < pts.length - 1; k++) if (pts[k] && pts[k + 1]) segs.push(pts[k], pts[k + 1]);
    var line = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), new THREE.LineBasicMaterial({ color: r[2], transparent: true, opacity: r[1] }));
    rings.push(line);
    scene.add(line);
  });
  // ember shockwave when a task ships
  var wave = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), new THREE.MeshBasicMaterial({ color: EMBER, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  wave.rotation.x = -Math.PI / 2;
  wave.position.y = 0.02;
  scene.add(wave);

  // ---------- agents ----------
  var roles = [
    { name: 'Manager', key: 'M', role: 'splits the task, checks the result' },
    { name: 'Researcher', key: 'R', role: 'search, read, embed, retrieve' },
    { name: 'Architect', key: 'A', role: 'plans the system and the schema' },
    { name: 'Engineer', key: 'E', role: 'writes code, runs the tests' },
    { name: 'Designer', key: 'D', role: 'layout, tokens, components' },
    { name: 'Writer', key: 'W', role: 'docs, emails, release notes' },
    { name: 'Sales', key: 'S', role: 'leads, offers, follow-ups' }
  ];
  var pods = [];
  var beamMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: THREAD.clone() }, k: { value: 0.35 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 color; uniform float k; varying vec2 vUv; void main(){ gl_FragColor = vec4(color, (1.0 - vUv.y) * 0.22 * k); }',
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
  });
  roles.forEach(function (r, i) {
    var boss = i === 0;
    var col = boss ? EMBER : THREAD;
    var a = (i - 1) / (roles.length - 1) * Math.PI * 2 - Math.PI / 2;
    var R = boss ? 0 : 2.75;
    var g = new THREE.Group();
    g.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);

    var baseR = boss ? 0.75 : 0.5;
    var base = new THREE.Mesh(new THREE.CylinderGeometry(baseR, baseR * 1.08, 0.12, 6), new THREE.MeshBasicMaterial({ color: 0x0f1319 }));
    base.position.y = 0.06;
    var edge = new THREE.LineSegments(new THREE.EdgesGeometry(base.geometry), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.8 }));
    edge.position.copy(base.position);
    var pad = new THREE.Mesh(new THREE.CircleGeometry(baseR * 0.82, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.125;

    var headY = boss ? 1.55 : 1.05;
    var head = new THREE.Group();
    head.position.y = headY;
    var geo = boss ? new THREE.OctahedronGeometry(0.42, 0) : new THREE.IcosahedronGeometry(0.26, 0);
    var core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0b0f14 }));
    var wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: col }));
    wire.scale.setScalar(1.002);
    var inner = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    inner.scale.setScalar(0.55);
    head.add(core, wire, inner);
    if (boss) {
      var orb = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.008, 6, 120), new THREE.MeshBasicMaterial({ color: EMBER, transparent: true, opacity: 0.6 }));
      var orb2 = orb.clone();
      orb2.material = orb.material.clone();
      orb2.material.color = THREAD.clone();
      orb2.scale.setScalar(0.82);
      head.add(orb, orb2);
      head.userData.orbs = [orb, orb2];
    }
    var halo = glow(col, boss ? 3.2 : 2.0, 0.28);
    halo.position.y = headY;
    var beam = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 0.55, baseR * 0.82, headY, 6, 1, true), beamMat.clone());
    beam.material.uniforms.color.value = col.clone();
    beam.position.y = headY / 2 + 0.1;

    g.add(base, edge, pad, beam, halo, head);
    scene.add(g);
    pods.push({ g: g, head: head, headY: headY, halo: halo, beam: beam.material, pad: pad.material, wire: wire.material, hit: core, boss: boss, col: col, pulse: 0, last: '', calls: 0, phase: i * 1.7 });
  });

  // faint links from the Manager to everyone and around the ring
  function arc(a, b, lift) {
    var pa = new THREE.Vector3(a.g.position.x, a.headY, a.g.position.z);
    var pb = new THREE.Vector3(b.g.position.x, b.headY, b.g.position.z);
    var mid = pa.clone().add(pb).multiplyScalar(0.5);
    mid.y += lift;
    return new THREE.QuadraticBezierCurve3(pa, mid, pb);
  }
  var linkMat = new THREE.LineDashedMaterial({ color: THREAD, transparent: true, opacity: 0.22, dashSize: 0.08, gapSize: 0.1 });
  for (var i = 1; i < pods.length; i++) {
    [[0, i, 0.9], [i, i === pods.length - 1 ? 1 : i + 1, 0.5]].forEach(function (l) {
      var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arc(pods[l[0]], pods[l[1]], l[2]).getPoints(40)), linkMat);
      line.computeLineDistances();
      scene.add(line);
    });
  }

  // dust drifting up through the light
  var dustN = 500, dust = new Float32Array(dustN * 3);
  for (var d = 0; d < dustN; d++) {
    var rr = Math.sqrt(Math.random()) * 5, aa = Math.random() * Math.PI * 2;
    dust[d * 3] = Math.cos(aa) * rr; dust[d * 3 + 1] = Math.random() * 4; dust[d * 3 + 2] = Math.sin(aa) * rr;
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.025, color: 0xcfe9e4, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));

  // packets: a bright head sprite with a short trail
  var packets = [];
  for (var p = 0; p < 4; p++) {
    var trail = [];
    for (var s = 0; s < 10; s++) {
      var sp = glow(THREAD, 0.42 - s * 0.03, 0);
      scene.add(sp);
      trail.push(sp);
    }
    packets.push({ trail: trail, curve: null, t0: 0, dur: 0, loop: null, col: THREAD });
  }

  // ---------- HTML overlay: name tags, tool-call pills, console ----------
  var ui = document.createElement('div');
  ui.className = 'hq';
  ui.setAttribute('aria-hidden', 'true');
  ui.innerHTML = '<div class="hq-tags"></div>' +
    '<div class="hq-console">' +
    '<div class="hq-bar"><i></i><span>agent-hq</span><b class="hq-count"></b></div>' +
    '<div class="hq-task"><span>task ›</span> <em></em><u></u></div>' +
    '<ol class="hq-log"></ol>' +
    '<div class="hq-foot"><span class="hq-status"></span><span class="hq-meter"><s></s></span></div>' +
    '</div>' +
    '<div class="hq-card"></div>';
  hero.appendChild(ui);
  var tagsEl = ui.querySelector('.hq-tags');
  var tags = pods.map(function (pd, i) {
    var el = document.createElement('div');
    el.className = 'hq-tag' + (pd.boss ? ' boss' : '');
    el.innerHTML = '<b>' + roles[i].key + '</b>' + roles[i].name.toLowerCase();
    tagsEl.appendChild(el);
    return el;
  });
  var taskEl = ui.querySelector('.hq-task em'), logEl = ui.querySelector('.hq-log');
  var countEl = ui.querySelector('.hq-count'), statusEl = ui.querySelector('.hq-status'), meterEl = ui.querySelector('.hq-meter s');
  var cardEl = ui.querySelector('.hq-card');

  // ---------- tasks ----------
  // [from, to, tool call, seconds the call "took"]
  var tasks = [
    { prompt: 'ship a pricing page for crewbase', steps: [
      [0, 1, 'search("team tools pricing")', 0.8], [1, 0, '8 sources → notes.md', 0.3], [0, 2, 'plan(tiers=3)', 0.5],
      [2, 4, 'spec.md', 0.2], [4, 4, 'tokens.css + 6 components', 1.4], [4, 3, 'figma → tsx', 0.4],
      [3, 3, 'pytest -q  24 passed', 2.1], [3, 5, 'git diff', 0.2], [5, 0, 'release_notes.md', 0.6]] },
    { prompt: 'which supplier invoices are overdue?', steps: [
      [0, 1, 'embed(query)', 0.1], [1, 1, 'pinecone.query(k=6)', 0.2], [1, 2, '6 chunks', 0.1],
      [2, 3, 'sql: due_date < today', 0.3], [3, 5, '3 rows', 0.1], [5, 0, 'answer + sources', 0.4]] },
    { prompt: 'follow up every lead from last week', steps: [
      [0, 6, 'crm.leads(since=7d)', 0.4], [6, 1, '14 leads', 0.1], [1, 6, 'company notes', 1.2],
      [6, 5, 'draft x14', 0.2], [5, 5, 'personalise(tone="warm")', 1.6], [5, 0, 'review queue', 0.2], [0, 6, 'approved 12/14', 0.3]] }
  ];
  var STEP = 1.25, TYPE = 32, LEAD = 1.0, TAIL = 2.6;
  var tIdx = 0, tStart = 0, fired = [], logged = 0, shipped = false;

  function startTask(i, now) {
    tIdx = i % tasks.length;
    tStart = now;
    fired = [];
    logged = 0;
    shipped = false;
    logEl.innerHTML = '';
    pods.forEach(function (pd) { pd.calls = 0; });
    countEl.textContent = 'task ' + (tIdx + 1) + '/' + tasks.length;
    statusEl.textContent = 'planning';
    statusEl.className = 'hq-status';
  }
  function stepAt(task, j) { return task.prompt.length / TYPE + LEAD + j * STEP; }
  function taskLength(task) { return stepAt(task, task.steps.length) + TAIL; }

  function launch(step, now) {
    var a = pods[step[0]], b = pods[step[1]];
    var pk = packets.filter(function (q) { return !q.curve && !q.loop; })[0] || packets[0];
    pk.col = step[0] === 0 ? EMBER : THREAD;
    pk.t0 = now;
    pk.dur = 0.85;
    if (a === b) { pk.curve = null; pk.loop = a; }
    else { pk.loop = null; pk.curve = arc(a, b, a.boss || b.boss ? 0.9 : 0.6); }
    pk.trail.forEach(function (sp) { sp.material.color.copy(pk.col); });
    pk.to = b;
    pk.step = step;
  }
  function land(pk, now) {
    var b = pk.to, step = pk.step;
    b.pulse = 1;
    b.calls++;
    b.last = step[2];
    pill(b, step[2]);
    var li = document.createElement('li');
    li.innerHTML = '<span>' + roles[step[1]].name.toLowerCase() + '</span><code></code><i>✓ ' + step[3].toFixed(1) + 's</i>';
    li.querySelector('code').textContent = step[2];
    logEl.appendChild(li);
    while (logEl.children.length > 4) logEl.removeChild(logEl.firstChild);
    logged++;
    statusEl.textContent = 'working · ' + logged + ' tool calls';
  }
  function pill(pd, text) {
    var el = document.createElement('div');
    el.className = 'hq-pill';
    el.textContent = text;
    tagsEl.appendChild(el);
    pd.pills = (pd.pills || []).concat([{ el: el, born: performance.now() / 1000 }]);
  }

  // ---------- sizing: on wide screens the stage sits right of the copy ----------
  var W = 1, H = 1, wide = true, distK = 1;
  function resize() {
    W = hero.clientWidth; H = hero.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    wide = W > 900;
    camera.aspect = W / H;
    camera.fov = wide ? 36 : 50;
    // centre the scene in the space right of the copy, pulling back when it is tight
    var copy = hero.querySelector('.hero-copy'), right = W * 0.5;
    if (copy) right = copy.getBoundingClientRect().right - hero.getBoundingClientRect().left;
    var room = Math.max(360, W - right);
    distK = wide ? Math.min(1.7, Math.max(0.92, 760 / room)) : 1;
    if (wide) camera.setViewOffset(W, H, -((right + W) / 2 - W / 2), H * 0.13, W, H);
    else camera.setViewOffset(W, H, 0, H * 0.3, W, H);
    camera.updateProjectionMatrix();
    ui.classList.toggle('narrow', !wide);
  }
  window.addEventListener('resize', resize);

  // ---------- input ----------
  var mouse = { x: 0, y: 0, in: false, sx: 0, sy: 0 }, ndc = new THREE.Vector2(), ray = new THREE.Raycaster();
  var hover = -1;
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    mouse.sx = e.clientX - r.left; mouse.sy = e.clientY - r.top;
    mouse.x = mouse.sx / r.width - 0.5;
    mouse.y = mouse.sy / r.height - 0.5;
    mouse.in = true;
  });
  hero.addEventListener('pointerleave', function () { mouse.in = false; hover = -1; });
  hero.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) return;
    startTask(tIdx + 1, performance.now() / 1000);
  });

  // ---------- frame ----------
  var orbit = 0, tilt = 0, v = new THREE.Vector3();
  function frame() {
    if (!visible) { running = false; return; }
    var now = performance.now() / 1000, t = reduce ? 4 : now;
    var task = tasks[tIdx], el = now - tStart;

    // camera drifts around the floor and leans toward the cursor
    var tx = (mouse.in ? mouse.x * 0.5 : 0) + Math.sin(t * 0.08) * 0.35;
    var ty = mouse.in ? mouse.y * 0.25 : 0;
    orbit += (tx - orbit) * 0.04;
    tilt += (ty - tilt) * 0.04;
    var ang = orbit + 0.35, dist = (wide ? 11.6 : 14) * distK, hgt = 4.6 + tilt * 2;
    camera.position.set(Math.sin(ang) * dist, hgt, Math.cos(ang) * dist);
    camera.lookAt(lookAt);

    // typing, then each step launches a packet
    taskEl.textContent = task.prompt.slice(0, Math.floor(el * TYPE));
    ui.querySelector('.hq-task u').style.opacity = Math.floor(now * 2) % 2 ? 1 : 0;
    task.steps.forEach(function (st, j) {
      if (!fired[j] && el >= stepAt(task, j)) { fired[j] = true; launch(st, now); }
    });
    var total = taskLength(task), done = stepAt(task, task.steps.length) + 0.2;
    meterEl.style.transform = 'scaleX(' + clamp(el / done) + ')';
    if (!shipped && el > done) {
      shipped = true;
      statusEl.textContent = '✓ shipped · ' + task.steps.length + ' tool calls · 0 frameworks';
      statusEl.className = 'hq-status ok';
      wave.userData.t0 = now;
      pods[0].pulse = 1.4;
    }
    if (el > total && !reduce) startTask(tIdx + 1, now);

    // shockwave
    if (wave.userData.t0) {
      var wk = (now - wave.userData.t0) / 1.6;
      wave.scale.setScalar(1 + wk * 5);
      wave.material.opacity = wk < 1 ? 0.6 * (1 - wk) : 0;
    }

    // packets along their arcs
    packets.forEach(function (pk) {
      if (!pk.curve && !pk.loop) { pk.trail.forEach(function (sp) { sp.material.opacity = 0; }); return; }
      var k = (now - pk.t0) / pk.dur;
      pk.trail.forEach(function (sp, s) {
        var f = ease(k - s * 0.03);
        if (pk.loop) {
          var a2 = f * Math.PI * 2;
          sp.position.set(pk.loop.g.position.x + Math.cos(a2) * 0.62, pk.loop.headY + Math.sin(a2 * 2) * 0.12, pk.loop.g.position.z + Math.sin(a2) * 0.62);
        } else {
          pk.curve.getPoint(f, sp.position);
        }
        sp.material.opacity = (k - s * 0.03 > 0 && k < 1.02) ? (s ? 0.55 - s * 0.05 : 1) : 0;
      });
      if (k >= 1) { land(pk, now); pk.curve = null; pk.loop = null; }
    });

    // hover test against the pod heads
    if (mouse.in && wide) {
      ndc.set(mouse.x * 2, -mouse.y * 2);
      ray.setFromCamera(ndc, camera);
      var hits = ray.intersectObjects(pods.map(function (pd) { return pd.hit; }));
      hover = hits.length ? pods.map(function (pd) { return pd.hit; }).indexOf(hits[0].object) : -1;
    }
    hero.style.cursor = hover >= 0 ? 'pointer' : '';

    // pods breathe, pulse on arrival, lift on hover
    pods.forEach(function (pd, i) {
      pd.pulse *= 0.95;
      var lift = hover === i ? 0.22 : 0;
      pd.head.userData.lift = (pd.head.userData.lift || 0) + (lift - (pd.head.userData.lift || 0)) * 0.12;
      pd.head.position.y = pd.headY + Math.sin(t * 1.3 + pd.phase) * 0.06 + pd.head.userData.lift;
      pd.head.rotation.y = t * (pd.boss ? 0.5 : 0.8) + pd.phase;
      pd.head.rotation.x = Math.sin(t * 0.6 + pd.phase) * 0.3;
      pd.head.scale.setScalar(1 + pd.pulse * 0.25);
      if (pd.head.userData.orbs) {
        pd.head.userData.orbs[0].rotation.set(1.2 + Math.sin(t) * 0.2, t * 0.7, 0);
        pd.head.userData.orbs[1].rotation.set(-0.9, -t * 0.9, 0.4);
      }
      pd.halo.position.y = pd.head.position.y;
      pd.halo.material.opacity = 0.22 + pd.pulse * 0.45 + (hover === i ? 0.25 : 0);
      pd.beam.uniforms.k.value = 0.35 + pd.pulse * 1.6 + (hover === i ? 0.6 : 0);
      pd.pad.opacity = 0.1 + pd.pulse * 0.35;

      // project name tag + pills to screen
      v.set(pd.g.position.x, 0, pd.g.position.z).project(camera);
      var sx = (v.x * 0.5 + 0.5) * W, sy = (-v.y * 0.5 + 0.5) * H;
      tags[i].style.transform = 'translate(' + sx.toFixed(1) + 'px,' + (sy + 14).toFixed(1) + 'px) translateX(-50%)';
      tags[i].classList.toggle('on', hover === i || pd.pulse > 0.5);
      v.set(pd.g.position.x, pd.head.position.y, pd.g.position.z).project(camera);
      var hx = (v.x * 0.5 + 0.5) * W, hy = (-v.y * 0.5 + 0.5) * H;
      (pd.pills || []).forEach(function (pl, n, arr) {
        var age = now - pl.born, up = ease(age / 0.4) * 22 + (arr.length - 1 - n) * 26;
        pl.el.style.transform = 'translate(' + hx.toFixed(1) + 'px,' + (hy - 46 - up).toFixed(1) + 'px) translateX(-50%)';
        pl.el.style.opacity = age < 0.25 ? age / 0.25 : age > 2.2 ? Math.max(0, 1 - (age - 2.2) / 0.5) : 1;
      });
      pd.pills = (pd.pills || []).filter(function (pl) {
        if (now - pl.born > 2.8) { pl.el.remove(); return false; }
        return true;
      });
      if (hover === i) {
        cardEl.innerHTML = '<b>' + roles[i].name + '</b><span>' + roles[i].role + '</span>' +
          '<code>' + (pd.last ? 'last: ' + pd.last.replace(/</g, '&lt;') : 'idle') + '</code><em>' + pd.calls + ' calls this task · llm() + plain python</em>';
        cardEl.style.transform = 'translate(' + Math.min(W - 250, hx + 34).toFixed(1) + 'px,' + Math.max(10, hy - 40).toFixed(1) + 'px)';
      }
    });
    cardEl.classList.toggle('on', hover >= 0);

    var a = dustGeo.attributes.position.array;
    for (var k = 1; k < a.length; k += 3) { a[k] += 0.004; if (a[k] > 4) a[k] = 0; }
    dustGeo.attributes.position.needsUpdate = true;
    rings[0].rotation.y = t * 0.3;
    rings[1].rotation.y = -t * 0.05;
    rings[2].rotation.y = t * 0.08;
    linkMat.dashOffset = -t * 0.4;

    renderer.render(scene, camera);
    if (!reduce) requestAnimationFrame(frame);
  }

  // only animate while the hero is on screen
  var visible = true, running = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(frame); }
    }).observe(hero);
  }
  resize();
  startTask(0, performance.now() / 1000 - (reduce ? 20 : 0));
  running = true;
  requestAnimationFrame(frame);
})();
