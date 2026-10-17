// Woven light hero: a torus knot made of glowing particles that scatter
// away from the cursor and spring back. Drag spins it.
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

  var knot = new THREE.TorusKnotGeometry(1.7, 0.52, 480, 40, 2, 3);
  var src = knot.attributes.position.array;
  var count = src.length / 3;
  var base = new Float32Array(src.length);
  var pos = new Float32Array(src.length);
  var vel = new Float32Array(src.length);
  var colors = new Float32Array(src.length);
  var sizes = new Float32Array(count);
  var cThread = new THREE.Color('#7fe3d4');
  var cEmber = new THREE.Color('#ffb35c');
  var cPale = new THREE.Color('#e9edf2');
  var tmp = new THREE.Color();

  for (var i = 0; i < count; i++) {
    var j = i * 3, jit = 0.035;
    base[j] = src[j] + (Math.random() - 0.5) * jit;
    base[j + 1] = src[j + 1] + (Math.random() - 0.5) * jit;
    base[j + 2] = src[j + 2] + (Math.random() - 0.5) * jit;
    var spread = 1 + Math.random() * 2.5;
    pos[j] = base[j] * spread;
    pos[j + 1] = base[j + 1] * spread;
    pos[j + 2] = base[j + 2] * spread;
    var band = 0.5 + 0.5 * Math.sin((i / count) * Math.PI * 6);
    tmp.copy(cThread).lerp(cEmber, Math.pow(band, 6));
    if (Math.random() < 0.06) tmp.lerp(cPale, 0.7);
    colors[j] = tmp.r; colors[j + 1] = tmp.g; colors[j + 2] = tmp.b;
    sizes[i] = 0.6 + Math.random() * 1.4;
  }
  knot.dispose();

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
    points.position.set(wide ? 2.5 : 0.3, wide ? 0.2 : 2.9, 0);
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
  var spinX = 0.35, spinY = 0, velX = 0, velY = 0.0025;

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
  window.addEventListener('pointerup', function () { dragging = false; });
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

    spinY += velY; spinX += velX;
    velY += ((reduce ? 0.0006 : 0.0025) - velY) * 0.02;
    velX *= 0.95;
    points.rotation.set(spinX + Math.sin(t * 0.3) * 0.08, spinY, Math.sin(t * 0.2) * 0.05);
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
