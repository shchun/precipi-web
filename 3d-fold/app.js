import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// ===== objects (merged from objects.js) =====
// objects.js — 3D object factory for the Fold 3D illusion app.
// Each factory returns a THREE.Group, normalized to roughly fit a unit sphere
// (radius ~0.5) centered at origin. Optional per-frame animation is attached
// as group.userData.update(t, dt).

const C = {
  cyan:    0x35e8ff,
  ice:     0x9af7ff,
  magenta: 0xff4fd8,
  pink:    0xff86c8,
  gold:    0xffd27a,
  green:   0x55f0a0,
  leaf:    0x37d98a,
  violet:  0xb085ff,
  white:   0xeafcff,
};

// ---- shared helpers -------------------------------------------------

// Glowing wireframe edges for a geometry.
function neonEdges(geo, color, opacity = 0.9) {
  const edges = new THREE.EdgesGeometry(geo, 18);
  const mat = new THREE.LineBasicMaterial({
    color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.LineSegments(edges, mat);
}

// A soft additive glow billboard used to fake bloom.
function glowSprite(color, size, opacity = 0.55) {
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 128;
  const ctx = cvs.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  const hex = '#' + color.toString(16).padStart(6, '0');
  g.addColorStop(0, hex);
  g.addColorStop(0.25, hex);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(64, 64, 64, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(cvs);
  const mat = new THREE.SpriteMaterial({
    map: tex, color: 0xffffff, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(size);
  return s;
}

function physical(color, opts = {}) {
  return new THREE.MeshPhysicalMaterial(Object.assign({
    color, metalness: 0.1, roughness: 0.18,
    clearcoat: 0.8, clearcoatRoughness: 0.25,
    envMapIntensity: 1.4,
  }, opts));
}

// ---- 1. Diamond / gem ----------------------------------------------

function createDiamond() {
  const g = new THREE.Group();
  // Brilliant cut: long pointed pavilion + shallow crown, 8 sharp facets.
  const pavilion = new THREE.ConeGeometry(0.36, 0.6, 8, 1);
  pavilion.rotateX(Math.PI);                 // apex points DOWN
  pavilion.translate(0, -0.16, 0);          // girdle at y=0.14
  const crown = new THREE.CylinderGeometry(0.17, 0.36, 0.14, 8, 1);
  crown.translate(0, 0.21, 0);              // table on top

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x9bf3ff, metalness: 0, roughness: 0.02,
    transmission: 0.4, ior: 2.4, thickness: 0.5,
    clearcoat: 1, clearcoatRoughness: 0.02,
    envMapIntensity: 1.7, transparent: true, opacity: 0.85,
    flatShading: true, side: THREE.DoubleSide,
  });
  const pav = new THREE.Mesh(pavilion, mat);
  const crw = new THREE.Mesh(crown, mat);
  pav.add(neonEdges(pavilion, C.ice, 0.95));
  crw.add(neonEdges(crown, C.ice, 1.0));
  g.add(pav, crw);
  g.add(glowSprite(C.cyan, 1.2, 0.22));

  g.scale.setScalar(1.05);
  return g;
}

// ---- 2. Heart -------------------------------------------------------

function createHeart() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  const x = 0, y = 0;
  s.moveTo(x, y + 0.25);
  s.bezierCurveTo(x, y + 0.25, x - 0.05, y, x - 0.25, y);
  s.bezierCurveTo(x - 0.55, y, x - 0.55, y + 0.35, x - 0.55, y + 0.35);
  s.bezierCurveTo(x - 0.55, y + 0.55, x - 0.35, y + 0.77, x, y + 0.95);
  s.bezierCurveTo(x + 0.35, y + 0.77, x + 0.55, y + 0.55, x + 0.55, y + 0.35);
  s.bezierCurveTo(x + 0.55, y + 0.35, x + 0.55, y, x + 0.25, y);
  s.bezierCurveTo(x + 0.05, y, x, y + 0.25, x, y + 0.25);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.32, bevelEnabled: true, bevelSegments: 6,
    bevelSize: 0.07, bevelThickness: 0.07, curveSegments: 24,
  });
  geo.center();
  geo.scale(0.95, 0.95, 0.95);
  const mat = physical(0xff3d7f, {
    roughness: 0.14, clearcoat: 1, metalness: 0.0,
    emissive: 0x4a0018, emissiveIntensity: 0.22,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.z = Math.PI;       // point down
  g.add(mesh);
  g.add(glowSprite(C.magenta, 1.4, 0.24));
  g.userData.update = () => {};
  // gentle "heartbeat" pulse
  let beat = 0;
  g.userData.update = (t, dt) => {
    beat += dt;
    const p = 1 + 0.06 * Math.pow(Math.max(0, Math.sin(beat * 2.2)), 6);
    mesh.scale.setScalar(p);
  };
  return g;
}

// ---- 3. Abstract geometry ------------------------------------------

function createAbstract() {
  const g = new THREE.Group();
  const geo = new THREE.TorusKnotGeometry(0.3, 0.095, 200, 28, 2, 3);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x6bdcff, metalness: 0.9, roughness: 0.15,
    iridescence: 1, iridescenceIOR: 2.0,
    iridescenceThicknessRange: [120, 520],
    clearcoat: 1, envMapIntensity: 1.8,
  });
  const mesh = new THREE.Mesh(geo, mat);
  g.add(mesh);
  const wire = neonEdges(geo, C.violet, 0.25);
  g.add(wire);
  g.add(glowSprite(C.violet, 1.4, 0.22));
  g.userData.update = () => {};
  return g;
}

// ---- 4. Planet ------------------------------------------------------

function planetTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 1024; cvs.height = 512;
  const ctx = cvs.getContext('2d');
  // ocean
  const og = ctx.createLinearGradient(0, 0, 0, 512);
  og.addColorStop(0, '#0a2a6b');
  og.addColorStop(0.5, '#0e3f9e');
  og.addColorStop(1, '#0a2a6b');
  ctx.fillStyle = og; ctx.fillRect(0, 0, 1024, 512);
  // continents — random green/tan blobs
  const blob = (cx, cy, r, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.25) {
      const rr = r * (0.6 + Math.random() * 0.8);
      const px = cx + Math.cos(a) * rr * 1.6;
      const py = cy + Math.sin(a) * rr;
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  };
  for (let i = 0; i < 22; i++) {
    const cx = Math.random() * 1024, cy = 80 + Math.random() * 352;
    const greens = ['#1f7a43', '#249152', '#2faa61', '#7a8f3a'];
    blob(cx, cy, 18 + Math.random() * 46, greens[i % greens.length]);
  }
  // ice caps
  ctx.fillStyle = '#dff3ff';
  ctx.fillRect(0, 0, 1024, 26); ctx.fillRect(0, 486, 1024, 26);
  return new THREE.CanvasTexture(cvs);
}

function createPlanet() {
  const g = new THREE.Group();
  const tex = planetTexture();
  tex.colorSpace = THREE.SRGBColorSpace;
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 64, 48),
    new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.85, metalness: 0.0,
      emissive: 0x05122e, emissiveIntensity: 0.4,
    })
  );
  g.add(globe);

  // atmosphere — fresnel rim glow
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(0.54, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending,
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(0x4fa8ff) } },
      vertexShader: `varying vec3 vN; varying vec3 vP;
        void main(){ vN=normalize(normalMatrix*normal);
        vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz;
        gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vP; uniform vec3 uColor;
        void main(){ float f=pow(1.0-abs(dot(normalize(vN),normalize(-vP))),2.5);
        gl_FragColor=vec4(uColor*f, f); }`,
    })
  );
  g.add(atmo);

  // moon
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0x9aa2b0, roughness: 1 })
  );
  const moonPivot = new THREE.Group();
  moon.position.set(0.8, 0.12, 0);
  moonPivot.add(moon);
  moonPivot.rotation.x = 0.4;
  g.add(moonPivot);

  globe.rotation.z = 0.41; // axial tilt
  g.userData.update = (t, dt) => {
    globe.rotation.y += dt * 0.25;
    moonPivot.rotation.y += dt * 0.6;
  };
  g.userData.noHostSpin = true; // planet spins itself
  return g;
}

// ---- 5. Cube --------------------------------------------------------

function createCube() {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
  const faces = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: 0x0bb4d6, metalness: 0.2, roughness: 0.1,
    transmission: 0.6, thickness: 0.5, ior: 1.3,
    transparent: true, opacity: 0.4, clearcoat: 1,
    envMapIntensity: 1.6, side: THREE.DoubleSide,
  }));
  g.add(faces);
  g.add(neonEdges(geo, C.cyan, 1.0));
  // inner floating wireframe
  const inner = neonEdges(new THREE.BoxGeometry(0.32, 0.32, 0.32), C.magenta, 0.8);
  g.add(inner);
  g.add(glowSprite(C.cyan, 1.5, 0.3));
  g.userData.update = (t, dt) => { inner.rotation.x += dt * 0.9; inner.rotation.y += dt * 1.3; };
  return g;
}

// ---- 6. Low-poly tree / floating island ----------------------------

function createTree() {
  const g = new THREE.Group();
  // floating island rock
  const rockGeo = new THREE.IcosahedronGeometry(0.42, 1);
  rockGeo.scale(1, 0.55, 1);
  // jitter for low-poly look
  const pos = rockGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < 0) pos.setXYZ(i, pos.getX(i) * (1 - (-y) * 0.4), y * (1.6 + Math.random() * 0.6), pos.getZ(i) * (1 - (-y) * 0.4));
  }
  rockGeo.computeVertexNormals();
  const rock = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({
    color: 0x4a3b63, roughness: 1, flatShading: true,
    emissive: 0x140a22, emissiveIntensity: 0.6,
  }));
  rock.position.y = -0.18;
  g.add(rock);
  // grass top
  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.42, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: 0x2faa61, roughness: 1, flatShading: true })
  );
  grass.position.y = -0.02;
  g.add(grass);
  // trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6),
    new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1, flatShading: true })
  );
  trunk.position.y = 0.16;
  g.add(trunk);
  // foliage cones
  const folMat = new THREE.MeshStandardMaterial({ color: 0x37d98a, roughness: 0.9, flatShading: true, emissive: 0x093f26, emissiveIntensity: 0.5 });
  [[0.30, 0.30, 0.34], [0.24, 0.46, 0.27], [0.16, 0.60, 0.2]].forEach(([r, y, h]) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), folMat);
    c.position.y = y; g.add(c);
  });
  // little orbiting firefly
  const fly = glowSprite(C.green, 0.4, 0.9);
  g.add(fly);
  g.add(glowSprite(C.green, 1.8, 0.18));
  g.userData.update = (t) => {
    fly.position.set(Math.cos(t * 1.5) * 0.45, 0.3 + Math.sin(t * 2.3) * 0.12, Math.sin(t * 1.5) * 0.45);
  };
  return g;
}

// ---- 7. Helmet ------------------------------------------------------

function createHelmet() {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xeaf1ff, metalness: 0.3, roughness: 0.32,
    clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 0.9,
  });
  // main head shell
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.44, 48, 36), shellMat);
  dome.scale.set(1, 1.06, 1.02);
  g.add(dome);
  // lower jaw taper
  const jaw = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 40, 24, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    shellMat
  );
  jaw.position.y = -0.30; jaw.scale.set(1.05, 1.1, 1.0);
  g.add(jaw);

  // visor — dark glossy spherical cap facing forward & slightly down,
  // radius larger than the dome so it clearly sits proud of the surface
  const capGeo = new THREE.SphereGeometry(0.49, 44, 32, 0, Math.PI * 2, 0, 1.02);
  capGeo.rotateX(Math.PI * 0.60);
  const visor = new THREE.Mesh(capGeo, new THREE.MeshPhysicalMaterial({
    color: 0x05080f, metalness: 0.0, roughness: 0.05,
    emissive: 0x0a3b50, emissiveIntensity: 0.55,
    clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.45,
    transparent: true, opacity: 0.97,
  }));
  visor.position.set(0, 0.0, 0.0);
  g.add(visor);
  // glowing visor gasket — torus framing the cap rim
  const rimGeo = new THREE.TorusGeometry(0.40, 0.018, 14, 48);
  const rim = new THREE.Mesh(rimGeo, new THREE.MeshBasicMaterial({
    color: C.cyan, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  rim.position.set(0, -0.075, 0.255);
  rim.rotation.x = -0.30;
  g.add(rim);

  // side ear pods
  const podMat = new THREE.MeshStandardMaterial({ color: 0x9aa6bd, metalness: 0.6, roughness: 0.4 });
  [-1, 1].forEach(s => {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20), podMat);
    pod.rotation.z = Math.PI * 0.5; pod.position.set(s * 0.44, -0.02, 0.02);
    g.add(pod);
  });
  // top crest fin
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.4), shellMat);
  fin.position.set(0, 0.42, -0.04);
  g.add(fin);

  g.add(glowSprite(C.cyan, 1.3, 0.16));
  return g;
}

// ---- registry -------------------------------------------------------

const OBJECTS = [
  { id: 'diamond', name: '다이아몬드', accent: 0x35e8ff, make: createDiamond },
  { id: 'heart',   name: '하트',       accent: 0xff4fd8, make: createHeart },
  { id: 'abstract',name: '기하 도형',   accent: 0xb085ff, make: createAbstract },
  { id: 'cube',    name: '큐브',       accent: 0x35e8ff, make: createCube },
  { id: 'tree',    name: '나무',       accent: 0x55f0a0, make: createTree },
];

// ===== app =====
// app.js — Fold 3D illusion core.
// Renders one scene through two off-axis cameras: the TOP half of the display
// is a vertical "back wall" window, the BOTTOM half is a horizontal "floor"
// window. Fold the device 90° at the crease and the two perpendicular screens
// reconstruct a single coherent 3D space (anamorphic / fish-tank projection).

const PREFS_KEY = 'fold3d.prefs.v1';
const defaults = {
  object: 'diamond',
  eyeHeight: 1.15,   // × screenLen, above the floor
  eyeDist: 1.75,     // × screenLen, out from the crease
  objSize: 0.88,     // × screenLen
  objHeight: 0.52,   // × screenLen, center height above floor
  autorotate: true,
  speed: 0.5,
};
const prefs = Object.assign({}, defaults, load());
function load() { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } }
function save() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {} }

// ---- renderer / scene ----------------------------------------------
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(0x03040c, 1);

const scene = new THREE.Scene();

// environment map for reflections (procedural gradient)
function buildEnv() {
  const cvs = document.createElement('canvas');
  cvs.width = 512; cvs.height = 256;
  const ctx = cvs.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0.0, '#0a1e44');
  grd.addColorStop(0.45, '#123a7a');
  grd.addColorStop(0.5, '#3a6fff');
  grd.addColorStop(0.55, '#7a2bd6');
  grd.addColorStop(1.0, '#05030f');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 512, 256);
  // a couple of bright "studio" streaks
  ctx.fillStyle = 'rgba(120,230,255,0.55)';
  ctx.fillRect(60, 70, 120, 8);
  ctx.fillStyle = 'rgba(255,120,220,0.4)';
  ctx.fillRect(330, 150, 140, 6);
  const tex = new THREE.CanvasTexture(cvs);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose(); tex.dispose();
  return env;
}
scene.environment = buildEnv();

// ---- lighting -------------------------------------------------------
scene.add(new THREE.AmbientLight(0x4060a0, 0.5));
const key = new THREE.PointLight(0x6fe8ff, 30, 0, 2); key.position.set(1.4, 2.0, 2.0); scene.add(key);
const fill = new THREE.PointLight(0xff5fd0, 18, 0, 2); fill.position.set(-1.8, 1.0, 1.4); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(0, 2, -2); scene.add(rim);

// ---- the holographic room (grid + stars + shadow) -------------------
const room = new THREE.Group();
scene.add(room);

let screenLen = 1; // world height of each screen half, set on resize

const floorGrid = new THREE.Group();
const wallGrid = new THREE.Group();
room.add(floorGrid, wallGrid);

function gridMat(opacity) {
  return new THREE.LineBasicMaterial({ color: 0x2bd6ff, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
}

// shadow / reflection blob on the floor under the object
const shadowTex = (() => {
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = 128;
  const ctx = cvs.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(70,220,255,0.55)');
  g.addColorStop(0.4, 'rgba(50,150,255,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cvs);
})();
const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
);
shadow.rotation.x = -Math.PI / 2;
room.add(shadow);

// starfield behind the wall
const stars = (() => {
  const n = 320, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 8;
    pos[i*3+1] = Math.random() * 4 - 0.5;
    pos[i*3+2] = -1 - Math.random() * 6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x9fd8ff, size: 0.018, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  return new THREE.Points(geo, mat);
})();
scene.add(stars);

function buildGrids() {
  [floorGrid, wallGrid].forEach(grp => { while (grp.children.length) { const c = grp.children.pop(); c.geometry.dispose(); } });
  const half = 1.0;              // x: -1..1
  const L = screenLen;          // depth/height
  const div = 8;
  const pts = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3)); return g; };

  // FLOOR: XZ plane, z 0..L (crease at z=0, near edge at z=L)
  const fseg = [];
  for (let i = 0; i <= div; i++) {
    const x = -half + (2 * half) * i / div;
    fseg.push(x, 0, 0, x, 0, L);
  }
  for (let j = 0; j <= div; j++) {
    const z = L * j / div;
    fseg.push(-half, 0, z, half, 0, z);
  }
  floorGrid.add(new THREE.LineSegments(pts(fseg), gridMat(0.4)));

  // WALL: XY plane, y 0..L (crease at y=0)
  const wseg = [];
  for (let i = 0; i <= div; i++) {
    const x = -half + (2 * half) * i / div;
    wseg.push(x, 0, 0, x, L, 0);
  }
  for (let j = 0; j <= div; j++) {
    const y = L * j / div;
    wseg.push(-half, y, 0, half, y, 0);
  }
  wallGrid.add(new THREE.LineSegments(pts(wseg), gridMat(0.32)));

  // bright crease line
  const crease = new THREE.LineSegments(pts([-half, 0, 0, half, 0, 0]),
    new THREE.LineBasicMaterial({ color: 0x7af6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  floorGrid.add(crease);
}

// ---- the object container ------------------------------------------
const pivot = new THREE.Group();   // host-driven spin
const container = new THREE.Group();
container.add(pivot);
scene.add(container);
let current = null;

function setObject(id) {
  if (current) { pivot.remove(current); dispose(current); }
  const def = OBJECTS.find(o => o.id === id) || OBJECTS[0];
  current = def.make();
  pivot.add(current);
  prefs.object = def.id; save();
  document.querySelectorAll('.obj-btn').forEach(b => b.classList.toggle('active', b.dataset.id === def.id));
  layoutObject();
}
function dispose(obj) {
  obj.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
}

function layoutObject() {
  const size = prefs.objSize * screenLen;
  container.scale.setScalar(size);
  container.position.set(0, prefs.objHeight * screenLen, screenLen * 0.5);
  shadow.position.set(0, 0.004, screenLen * 0.5);
  const sw = size * 1.7;
  shadow.scale.set(sw, sw, sw);
}

// ---- off-axis projection (Kooima generalized perspective) ----------
const wallCam = new THREE.PerspectiveCamera();
const floorCam = new THREE.PerspectiveCamera();
[wallCam, floorCam].forEach(c => { c.matrixAutoUpdate = false; });

const _vr = new THREE.Vector3(), _vu = new THREE.Vector3(), _vn = new THREE.Vector3();
const _va = new THREE.Vector3(), _vb = new THREE.Vector3(), _vc = new THREE.Vector3();
const _M = new THREE.Matrix4(), _T = new THREE.Matrix4();

function offAxis(cam, pa, pb, pc, pe, near, far) {
  _vr.subVectors(pb, pa).normalize();
  _vu.subVectors(pc, pa).normalize();
  _vn.crossVectors(_vr, _vu).normalize();
  _va.subVectors(pa, pe);
  _vb.subVectors(pb, pe);
  _vc.subVectors(pc, pe);
  const dist = -_va.dot(_vn);
  const nd = near / dist;
  const l = _vr.dot(_va) * nd;
  const r = _vr.dot(_vb) * nd;
  const b = _vu.dot(_va) * nd;
  const t = _vu.dot(_vc) * nd;
  cam.projectionMatrix.makePerspective(l, r, t, b, near, far);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  _M.set(_vr.x, _vr.y, _vr.z, 0, _vu.x, _vu.y, _vu.z, 0, _vn.x, _vn.y, _vn.z, 0, 0, 0, 0, 1);
  _T.makeTranslation(-pe.x, -pe.y, -pe.z);
  const view = _M.multiply(_T);            // world -> view
  cam.matrixWorld.copy(view).invert();
  cam.matrixWorldInverse.copy(view);
}

const eye = new THREE.Vector3();
const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3();

function updateCameras() {
  const L = screenLen, hx = 1.0;
  eye.set(0, prefs.eyeHeight * L, prefs.eyeDist * L);
  // WALL (vertical, z=0): lower-left, lower-right, upper-left
  pa.set(-hx, 0, 0); pb.set(hx, 0, 0); pc.set(-hx, L, 0);
  offAxis(wallCam, pa, pb, pc, eye, 0.03, 60);
  // FLOOR (horizontal, y=0): near edge is lower (toward viewer at z=L)
  pa.set(-hx, 0, L); pb.set(hx, 0, L); pc.set(-hx, 0, 0);
  offAxis(floorCam, pa, pb, pc, eye, 0.03, 60);
}

// ---- resize ---------------------------------------------------------
let W = 0, Hh = 0;
function resize() {
  W = canvas.clientWidth; Hh = canvas.clientHeight;
  renderer.setSize(W, Hh, false);
  const halfH = Hh / 2;
  screenLen = 2.0 * (halfH / W);   // world height of each half (x spans 2)
  buildGrids();
  layoutObject();
  updateCameras();
}
window.addEventListener('resize', resize);

// ---- interaction: drag to rotate -----------------------------------
let dragging = false, lastX = 0, lastY = 0, idle = 0;
const velo = { x: 0, y: 0 };
function onDown(e) { dragging = true; idle = 0; const p = pt(e); lastX = p.x; lastY = p.y; }
function onMove(e) {
  if (!dragging) return;
  const p = pt(e); const dx = p.x - lastX, dy = p.y - lastY; lastX = p.x; lastY = p.y;
  pivot.rotation.y += dx * 0.01;
  pivot.rotation.x = Math.max(-0.9, Math.min(0.9, pivot.rotation.x + dy * 0.006));
  velo.y = dx * 0.01; velo.x = dy * 0.006;
}
function onUp() { dragging = false; idle = 0; }
function pt(e) { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }
canvas.addEventListener('pointerdown', onDown);
window.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);

// ---- render loop ----------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;

  if (!dragging) {
    idle += dt;
    // inertia then auto-rotate
    if (Math.abs(velo.y) > 0.0002) { pivot.rotation.y += velo.y; velo.y *= 0.94; }
    if (prefs.autorotate && idle > 0.8 && !(current && current.userData.noHostSpin)) {
      pivot.rotation.y += dt * prefs.speed;
    }
  }
  if (current && current.userData.update) current.userData.update(t, dt);
  stars.rotation.y = t * 0.01;

  renderer.setScissorTest(true);
  // wall = upper half (WebGL y is bottom-up)
  renderer.setViewport(0, Hh / 2, W, Hh / 2);
  renderer.setScissor(0, Hh / 2, W, Hh / 2);
  renderer.render(scene, wallCam);
  // floor = lower half
  renderer.setViewport(0, 0, W, Hh / 2);
  renderer.setScissor(0, 0, W, Hh / 2);
  renderer.render(scene, floorCam);

  requestAnimationFrame(frame);
}

// ---- UI -------------------------------------------------------------
function buildUI() {
  const bar = document.getElementById('objbar');
  OBJECTS.forEach(o => {
    const b = document.createElement('button');
    b.className = 'obj-btn'; b.dataset.id = o.id;
    b.innerHTML = `<span class="dot" style="--a:#${o.accent.toString(16).padStart(6,'0')}"></span><span>${o.name}</span>`;
    b.addEventListener('click', () => setObject(o.id));
    bar.appendChild(b);
  });

  // calibration sliders
  const sliders = [
    ['eyeHeight', '시선 높이', 0.4, 2.4, 0.01],
    ['eyeDist', '시선 거리', 0.9, 3.2, 0.01],
    ['objSize', '오브젝트 크기', 0.4, 1.3, 0.01],
    ['objHeight', '오브젝트 높이', 0.1, 1.0, 0.01],
    ['speed', '회전 속도', 0, 1.6, 0.01],
  ];
  const wrap = document.getElementById('sliders');
  sliders.forEach(([k, label, min, max, step]) => {
    const row = document.createElement('label'); row.className = 'srow';
    row.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${prefs[k]}">`;
    const input = row.querySelector('input');
    input.addEventListener('input', () => {
      prefs[k] = parseFloat(input.value); save();
      if (k === 'objSize' || k === 'objHeight') layoutObject();
      else updateCameras();
    });
    wrap.appendChild(row);
  });

  const auto = document.getElementById('autorotate');
  auto.checked = prefs.autorotate;
  auto.addEventListener('change', () => { prefs.autorotate = auto.checked; save(); });

  document.getElementById('gear').addEventListener('click', () => document.body.classList.toggle('panel-open'));
  document.getElementById('panel-close').addEventListener('click', () => document.body.classList.remove('panel-open'));
  document.getElementById('reset').addEventListener('click', () => {
    ['eyeHeight','eyeDist','objSize','objHeight','speed'].forEach(k => { prefs[k] = defaults[k]; });
    save();
    document.querySelectorAll('#sliders input').forEach((inp, i) => { inp.value = prefs[sliders[i][0]]; });
    layoutObject(); updateCameras();
  });
}

buildUI();
resize();
setObject(prefs.object);
requestAnimationFrame(frame);

// install prompt
let deferred = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; document.getElementById('install').hidden = false; });
document.getElementById('install').addEventListener('click', async () => {
  if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; document.getElementById('install').hidden = true;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
