// Hero swarm: glowing particles that morph between code glyphs and 3D shapes,
// bursting apart on each switch. They scatter from the cursor; drag tilts,
// click morphs to the next shape.
(function () {
  var canvas = document.getElementById('woven');
  if (!canvas || typeof THREE === 'undefined') return;
  var hero = canvas.parentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true });
  } catch (e) {
    return; // no WebGL: the gradient background stays on its own
  }
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // Shapes the swarm morphs between. Every shape is a list of points sorted
  // by x, so particle i always sits at the same left-to-right fraction and the
  // teal-to-ember gradient survives each morph.
  var count = 16000;
  var base = new Float32Array(count * 3);
  var pos = new Float32Array(count * 3);
  var vel = new Float32Array(count * 3);
  var colors = new Float32Array(count * 3);
  var sizes = new Float32Array(count);
  var cThread = new THREE.Color('#7fe3d4');
  var cEmber = new THREE.Color('#ffb35c');
  var cPale = new THREE.Color('#e9edf2');
  var tmp = new THREE.Color();

  function byX(a, b) { return a[0] - b[0]; }
  function glyph(text, font) {
    var c = document.createElement('canvas'), W = 640, H = 320;
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font; g.fillText(text, W / 2, H / 2);
    var px = g.getImageData(0, 0, W, H).data, pts = [];
    for (var y = 0; y < H; y += 2) for (var x = 0; x < W; x += 2) {
      if (px[(y * W + x) * 4 + 3] > 128) pts.push([(x - W / 2) / W * 6.4, (H / 2 - y) / W * 6.4, (Math.random() - 0.5) * 0.6]);
    }
    return pts.sort(byX);
  }
  function sphere() {
    var pts = [], n = 3000, ga = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * ga, R = 1.8 + (Math.random() - 0.5) * 0.1;
      pts.push([Math.cos(a) * r * R, y * R, Math.sin(a) * r * R]);
    }
    return pts.sort(byX);
  }
  function helix() {
    var pts = [];
    for (var i = 0; i < 3000; i++) {
      var u = i / 3000, a = u * Math.PI * 6, strand = i % 2 ? Math.PI : 0, rung = i % 5 === 0;
      var r = rung ? Math.random() * 0.9 : 0.9;
      pts.push([(u - 0.5) * 6, Math.cos(a + strand) * r, Math.sin(a + strand) * r]);
    }
    return pts.sort(byX);
  }

  var shapes = [], shape = 0;
  function useShape(n, burst) {
    var pts = shapes[n], len = pts.length;
    for (var i = 0; i < count; i++) {
      var p = pts[Math.min(len - 1, Math.floor((i + Math.random()) / count * len))], j = i * 3;
      base[j] = p[0] + (Math.random() - 0.5) * 0.03;
      base[j + 1] = p[1] + (Math.random() - 0.5) * 0.03;
      base[j + 2] = p[2] + (Math.random() - 0.5) * 0.03;
      if (burst) {
        // blow the swarm apart; the spring pulls it into the next shape
        vel[j] += (pos[j] * 0.06 + (Math.random() - 0.5) * 0.5) * burst;
        vel[j + 1] += (pos[j + 1] * 0.06 + (Math.random() - 0.5) * 0.5) * burst;
        vel[j + 2] += ((Math.random() - 0.3) * 0.7) * burst;
      }
    }
  }
  function buildShapes() {
    var mono = '700 230px "IBM Plex Mono", monospace', disp = '800 240px Syne, sans-serif';
    shapes = [glyph('</>', mono), sphere(), glyph('{ }', mono), helix(), glyph('AI', disp), glyph('py', mono)]
      .filter(function (s) { return s.length > 50; });
  }
  buildShapes();
  useShape(0);
  for (var i = 0; i < count; i++) {
    var j = i * 3, spread = 1 + Math.random() * 2.5;
    pos[j] = base[j] * spread; pos[j + 1] = base[j + 1] * spread; pos[j + 2] = base[j + 2] * spread;
    var u = i / count;
    tmp.copy(cThread).lerp(cEmber, Math.pow(u, 2.2));
    if (Math.random() < 0.06) tmp.lerp(cPale, 0.7);
    colors[j] = tmp.r; colors[j + 1] = tmp.g; colors[j + 2] = tmp.b;
    sizes[i] = 0.6 + Math.random() * 1.4;
  }
  // web fonts may land after first paint; redraw the glyphs with them
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('700 230px "IBM Plex Mono"'), document.fonts.load('800 240px Syne')])
      .then(function () { buildShapes(); useShape(shape); }, function () {});
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  var mat = new THREE.ShaderMaterial({
    uniforms: { uPx: { value: dpr }, uTime: { value: 0 } },
    vertexShader: [
      'attribute vec3 aColor; attribute float aSize;',
      'uniform float uPx; uniform float uTime;',
      'varying vec3 vColor; varying float vFade;',
      'void main() {',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  float twinkle = 0.75 + 0.25 * sin(uTime * 2.0 + position.x * 7.0 + position.y * 5.0);',
      '  gl_PointSize = aSize * uPx * twinkle * (26.0 / -mv.z);',
      '  vColor = aColor;',
      '  vFade = smoothstep(14.0, 6.0, -mv.z);',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vColor; varying float vFade;',
      'void main() {',
      '  float d = length(gl_PointCoord - 0.5);',
      '  float a = smoothstep(0.5, 0.0, d);',
      '  gl_FragColor = vec4(vColor, a * a * 0.9 * vFade);',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  var points = new THREE.Points(geo, mat);
  scene.add(points);

  function resize() {
    var w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    var wide = w > 820;
    points.position.set(wide ? 2.6 : 0.3, wide ? 0.2 : 2.5, 0);
    points.scale.setScalar(wide ? 1 : 0.62);
  }
  window.addEventListener('resize', resize);
  resize();

  var ndc = new THREE.Vector2(9, 9);
  var ray = new THREE.Raycaster();
  var plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  var hit = new THREE.Vector3();
  var local = new THREE.Vector3();
  var inv = new THREE.Matrix4();
  var active = false, dragging = false, lastX = 0, lastY = 0;
  var spinX = 0, spinY = 0, velX = 0, velY = 0;

  hero.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    active = true;
    if (dragging) {
      velY = (e.clientX - lastX) * 0.00035;
      velX = (e.clientY - lastY) * 0.00035;
      lastX = e.clientX; lastY = e.clientY;
    }
  });
  hero.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a, button')) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
  });
  var downX = 0, downY = 0, lastMorph = 0;
  hero.addEventListener('pointerdown', function (e) { downX = e.clientX; downY = e.clientY; });
  function next(burst) {
    shape = (shape + 1) % shapes.length;
    useShape(shape, burst);
    lastMorph = clock.getElapsedTime();
  }
  window.addEventListener('pointerup', function (e) {
    if (dragging && Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) < 6) next(1.6);
    dragging = false;
  });
  hero.addEventListener('pointerleave', function () { active = false; dragging = false; });

  // Only animate while the hero is on screen.
  var visible = true, running = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
    }).observe(hero);
  }

  var clock = new THREE.Clock();
  var R = 0.9, R2 = R * R;

  function frame() {
    if (!visible) { running = false; return; }
    var t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;

    if (!reduce && t - lastMorph > 5.5) next(1);
    spinY += velY * 12; spinX += velX * 12;
    velY *= 0.9; velX *= 0.9;
    if (!dragging) { spinY *= 0.97; spinX *= 0.97; }
    var sway = reduce ? 0 : 1;
    points.rotation.set(spinX + Math.sin(t * 0.3) * 0.12 * sway, spinY + Math.sin(t * 0.45) * 0.5 * sway, Math.sin(t * 0.2) * 0.05 * sway);
    points.updateMatrixWorld();

    var mx = 1e9, my = 1e9, mz = 1e9;
    if (active) {
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        inv.copy(points.matrixWorld).invert();
        local.copy(hit).applyMatrix4(inv);
        mx = local.x; my = local.y; mz = local.z;
      }
    }

    var k = reduce ? 0.12 : 0.06, damp = 0.86;
    for (var j = 0; j < pos.length; j += 3) {
      var x = pos[j], y = pos[j + 1], z = pos[j + 2];
      var fx = (base[j] - x) * k, fy = (base[j + 1] - y) * k, fz = (base[j + 2] - z) * k;
      var dx = x - mx, dy = y - my, dz = z - mz;
      var d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < R2) {
        var d = Math.sqrt(d2) + 1e-4;
        var push = (1 - d / R) * 0.09;
        fx += (dx / d) * push; fy += (dy / d) * push; fz += (dz / d) * push;
      }
      vel[j] = (vel[j] + fx) * damp;
      vel[j + 1] = (vel[j + 1] + fy) * damp;
      vel[j + 2] = (vel[j + 2] + fz) * damp;
      pos[j] = x + vel[j]; pos[j + 1] = y + vel[j + 1]; pos[j + 2] = z + vel[j + 2];
    }
    geo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  running = true;
  requestAnimationFrame(frame);
})();
