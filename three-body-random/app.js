const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const skyCanvas = document.getElementById("skyView");
const skyCtx = skyCanvas.getContext("2d");

const controls = {
  hud: document.querySelector(".hud"),
  togglePanel: document.getElementById("togglePanel"),
  spaceSound: document.getElementById("spaceSound"),
  playPause: document.getElementById("playPause"),
  newSystem: document.getElementById("newSystem"),
  resetSeed: document.getElementById("resetSeed"),
  preset: document.getElementById("preset"),
  seedInput: document.getElementById("seedInput"),
  speed: document.getElementById("speed"),
  gravity: document.getElementById("gravity"),
  trailLength: document.getElementById("trailLength"),
  autoFrame: document.getElementById("autoFrame"),
  showVectors: document.getElementById("showVectors"),
  fadeTrails: document.getElementById("fadeTrails"),
  speedValue: document.getElementById("speedValue"),
  gravityValue: document.getElementById("gravityValue"),
  trailValue: document.getElementById("trailValue"),
  presetNote: document.getElementById("presetNote"),
  bodyLegend: document.getElementById("bodyLegend"),
  skyObserver: document.getElementById("skyObserver"),
  skyReadout: document.getElementById("skyReadout"),
  timeStat: document.getElementById("timeStat"),
  distanceStat: document.getElementById("distanceStat"),
  energyStat: document.getElementById("energyStat"),
  subtitle: document.getElementById("subtitle"),
};

const colors = ["#ff6b6b", "#4dd8ff", "#ffd166"];
const labels = ["A", "B", "C"];
const presetNotes = {
  random: "랜덤 검증: A/B/C 질량은 각각 0.7~2.5 범위에서 달라집니다. 너무 가까운 접근, 초기 발산형 에너지, 빠른 이탈 조짐이 있는 시드는 버립니다.",
  figure8: "Figure-eight: A/B/C 모두 질량 1입니다. 세 물체가 같은 8자 경로를 시간차를 두고 따라가는 알려진 안정 궤도입니다.",
  lagrange: "Lagrange 삼각형: A/B/C 모두 질량 1입니다. 정삼각형 구성을 유지하며 공통 질량중심 주위를 회전합니다.",
  binaryOuter: "근쌍성 + 외곽체: A/B는 질량 1.2, C는 질량 0.35입니다. 가까운 쌍성 주위를 가벼운 외곽체가 도는 구조입니다.",
};
const softening = 0.035;
const fixedStep = 1 / 180;
const stagnationCheckInterval = 2.5;
const stagnationGraceTime = 18;
const stagnationRestartAfter = 14;
const stagnationPixelThreshold = 1.2;
const divergenceGraceTime = 10;
const divergenceDistance = 18;
const closeApproachLimit = 0.16;
let bodies = [];
let initialBodies = [];
let seed = "";
let elapsed = 0;
let accumulator = 0;
let lastFrame = performance.now();
let paused = false;
let initialEnergy = 0;
let camera = { x: 0, y: 0, scale: 210 };
let pointer = { dragging: false, x: 0, y: 0 };
let stagnation = { sampleTime: 0, stillTime: 0, points: null };
let currentPreset = "random";
let spaceAudio = null;

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff)
    .toString(36)
    .padStart(7, "0")
    .slice(0, 7);
}

function cloneBodies(source) {
  return source.map((body) => ({
    ...body,
    pos: { ...body.pos },
    vel: { ...body.vel },
    acc: { x: 0, y: 0 },
    trail: [],
  }));
}

function makeBody(index, mass, x, y, vx, vy) {
  return {
    id: labels[index],
    color: colors[index],
    mass,
    radius: 5 + mass * 2.4,
    pos: { x, y },
    vel: { x: vx, y: vy },
    acc: { x: 0, y: 0 },
    trail: [],
  };
}

function normalizeSystem(source) {
  const made = cloneBodies(source);
  let totalMass = 0;
  let momentum = { x: 0, y: 0 };
  let center = { x: 0, y: 0 };

  for (const body of made) {
    totalMass += body.mass;
    momentum.x += body.vel.x * body.mass;
    momentum.y += body.vel.y * body.mass;
    center.x += body.pos.x * body.mass;
    center.y += body.pos.y * body.mass;
  }

  center.x /= totalMass;
  center.y /= totalMass;
  momentum.x /= totalMass;
  momentum.y /= totalMass;

  for (const body of made) {
    body.pos.x -= center.x;
    body.pos.y -= center.y;
    body.vel.x -= momentum.x;
    body.vel.y -= momentum.y;
  }

  return made;
}

function buildRandomCandidate(nextSeed) {
  const random = mulberry32(hashString(nextSeed));
  const made = [];

  for (let i = 0; i < 3; i += 1) {
    const angle = (Math.PI * 2 * i) / 3 + (random() - 0.5) * 0.9;
    const radius = 0.72 + random() * 0.72;
    const mass = 0.7 + random() * 1.8;
    const tangent = angle + Math.PI / 2;
    const orbital = 0.38 + random() * 0.55;
    const radialKick = (random() - 0.5) * 0.42;
    const spin = random() > 0.5 ? 1 : -1;

    made.push(
      makeBody(
        i,
        mass,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        Math.cos(tangent) * orbital * spin + Math.cos(angle) * radialKick,
        Math.sin(tangent) * orbital * spin + Math.sin(angle) * radialKick,
      ),
    );
  }

  return normalizeSystem(made);
}

function pairDistance(a, b) {
  return Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
}

function minimumBodyDistance(source) {
  let min = Infinity;
  for (let i = 0; i < source.length; i += 1) {
    for (let j = i + 1; j < source.length; j += 1) {
      min = Math.min(min, pairDistance(source[i], source[j]));
    }
  }
  return min;
}

function maxDistanceFromCenter(source) {
  return Math.max(...source.map((body) => Math.hypot(body.pos.x, body.pos.y)));
}

function centerOfMass(source = bodies) {
  let totalMass = 0;
  let x = 0;
  let y = 0;
  for (const body of source) {
    totalMass += body.mass;
    x += body.pos.x * body.mass;
    y += body.pos.y * body.mass;
  }
  return totalMass === 0 ? { x: 0, y: 0 } : { x: x / totalMass, y: y / totalMass };
}

function localAccelerations(source, g) {
  const acc = source.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < source.length; i += 1) {
    for (let j = i + 1; j < source.length; j += 1) {
      const a = source[i];
      const b = source[j];
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const r2 = dx * dx + dy * dy + softening * softening;
      const invR = 1 / Math.sqrt(r2);
      const force = g * invR * invR * invR;
      acc[i].x += dx * force * b.mass;
      acc[i].y += dy * force * b.mass;
      acc[j].x -= dx * force * a.mass;
      acc[j].y -= dy * force * a.mass;
    }
  }
  return acc;
}

function localStep(source, g, dt) {
  let acc = localAccelerations(source, g);
  for (let i = 0; i < source.length; i += 1) {
    source[i].vel.x += acc[i].x * dt * 0.5;
    source[i].vel.y += acc[i].y * dt * 0.5;
    source[i].pos.x += source[i].vel.x * dt;
    source[i].pos.y += source[i].vel.y * dt;
  }
  acc = localAccelerations(source, g);
  for (let i = 0; i < source.length; i += 1) {
    source[i].vel.x += acc[i].x * dt * 0.5;
    source[i].vel.y += acc[i].y * dt * 0.5;
  }
}

function localEnergy(source, g) {
  let kinetic = 0;
  let potential = 0;
  for (const body of source) kinetic += 0.5 * body.mass * (body.vel.x * body.vel.x + body.vel.y * body.vel.y);
  for (let i = 0; i < source.length; i += 1) {
    for (let j = i + 1; j < source.length; j += 1) {
      potential -= (g * source[i].mass * source[j].mass) / Math.sqrt(pairDistance(source[i], source[j]) ** 2 + softening ** 2);
    }
  }
  return kinetic + potential;
}

function randomCandidateIsUsable(candidate) {
  const g = Number(controls.gravity.value);
  const preview = cloneBodies(candidate);
  if (minimumBodyDistance(preview) < 0.42 || localEnergy(preview, g) >= 0) return false;

  for (let i = 0; i < 2400; i += 1) {
    localStep(preview, g, 1 / 240);
    if (minimumBodyDistance(preview) < closeApproachLimit) return false;
    if (maxDistanceFromCenter(preview) > 9) return false;
  }

  return true;
}

function buildValidatedRandomSystem(requestedSeed) {
  let candidateSeed = requestedSeed || randomSeed();
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = buildRandomCandidate(candidateSeed);
    if (randomCandidateIsUsable(candidate)) return { seed: candidateSeed, bodies: candidate };
    candidateSeed = randomSeed();
  }
  return { seed: candidateSeed, bodies: buildRandomCandidate(candidateSeed) };
}

function buildFigureEightSystem() {
  return normalizeSystem([
    makeBody(0, 1, -0.97000436, 0.24308753, 0.466203685, 0.43236573),
    makeBody(1, 1, 0.97000436, -0.24308753, 0.466203685, 0.43236573),
    makeBody(2, 1, 0, 0, -0.93240737, -0.86473146),
  ]);
}

function buildLagrangeSystem() {
  const mass = 1;
  const radius = 1.15;
  const omega = Math.sqrt(1 / (Math.sqrt(3) * radius ** 3));
  return normalizeSystem(
    labels.map((_, i) => {
      const angle = (Math.PI * 2 * i) / 3 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      return makeBody(i, mass, x, y, -y * omega, x * omega);
    }),
  );
}

function buildBinaryOuterSystem() {
  return normalizeSystem([
    makeBody(0, 1.2, -0.35, 0, 0, -0.9),
    makeBody(1, 1.2, 0.35, 0, 0, 0.9),
    makeBody(2, 0.35, 0, 3.1, -0.58, 0),
  ]);
}

function buildInitialSystem(nextSeed) {
  currentPreset = controls.preset.value;
  if (currentPreset === "figure8") return { seed: "figure-eight", bodies: buildFigureEightSystem(), label: "Figure-eight orbit" };
  if (currentPreset === "lagrange") return { seed: "lagrange", bodies: buildLagrangeSystem(), label: "Lagrange triangle" };
  if (currentPreset === "binaryOuter") return { seed: "binary-outer", bodies: buildBinaryOuterSystem(), label: "Binary + outer body" };
  const validated = buildValidatedRandomSystem(nextSeed);
  return { ...validated, label: `seed ${validated.seed}` };
}

function restartCurrentMode() {
  resetSimulation(currentPreset === "random" ? randomSeed() : seed, true);
}

function resetSimulation(nextSeed = seed, rebuild = false) {
  elapsed = 0;
  accumulator = 0;
  stagnation = { sampleTime: 0, stillTime: 0, points: null };
  if (rebuild || initialBodies.length === 0) {
    const nextSystem = buildInitialSystem(nextSeed || seed || randomSeed());
    seed = nextSystem.seed;
    initialBodies = nextSystem.bodies;
    controls.seedInput.value = seed;
    controls.subtitle.textContent = nextSystem.label;
    controls.presetNote.textContent = presetNotes[currentPreset];
  }
  bodies = cloneBodies(initialBodies);
  computeAccelerations();
  initialEnergy = totalEnergy();
}

function computeAccelerations() {
  const g = Number(controls.gravity.value);
  for (const body of bodies) body.acc = { x: 0, y: 0 };

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const r2 = dx * dx + dy * dy + softening * softening;
      const invR = 1 / Math.sqrt(r2);
      const invR3 = invR * invR * invR;
      const force = g * invR3;

      a.acc.x += dx * force * b.mass;
      a.acc.y += dy * force * b.mass;
      b.acc.x -= dx * force * a.mass;
      b.acc.y -= dy * force * a.mass;
    }
  }
}

function step(dt) {
  for (const body of bodies) {
    body.vel.x += body.acc.x * dt * 0.5;
    body.vel.y += body.acc.y * dt * 0.5;
    body.pos.x += body.vel.x * dt;
    body.pos.y += body.vel.y * dt;
  }

  computeAccelerations();

  for (const body of bodies) {
    body.vel.x += body.acc.x * dt * 0.5;
    body.vel.y += body.acc.y * dt * 0.5;
    body.trail.push({ x: body.pos.x, y: body.pos.y });
    if (body.trail.length > Number(controls.trailLength.value)) body.trail.shift();
  }

  elapsed += dt;
}

function totalEnergy() {
  const g = Number(controls.gravity.value);
  let kinetic = 0;
  let potential = 0;

  for (const body of bodies) {
    kinetic += 0.5 * body.mass * (body.vel.x * body.vel.x + body.vel.y * body.vel.y);
  }

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const dx = bodies[j].pos.x - bodies[i].pos.x;
      const dy = bodies[j].pos.y - bodies[i].pos.y;
      potential -= (g * bodies[i].mass * bodies[j].mass) / Math.sqrt(dx * dx + dy * dy + softening * softening);
    }
  }

  return kinetic + potential;
}

function minimumDistance() {
  let min = Infinity;
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const dx = bodies[j].pos.x - bodies[i].pos.x;
      const dy = bodies[j].pos.y - bodies[i].pos.y;
      min = Math.min(min, Math.hypot(dx, dy));
    }
  }
  return min;
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.floor(window.innerWidth * dpr);
  const height = Math.floor(window.innerHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resizeSkyCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = skyCanvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (skyCanvas.width !== width || skyCanvas.height !== height) {
    skyCanvas.width = width;
    skyCanvas.height = height;
  }
  skyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function updateCamera() {
  if (!controls.autoFrame.checked || pointer.dragging) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const body of bodies) {
    minX = Math.min(minX, body.pos.x);
    minY = Math.min(minY, body.pos.y);
    maxX = Math.max(maxX, body.pos.x);
    maxY = Math.max(maxY, body.pos.y);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const span = Math.max(maxX - minX, maxY - minY, 2.2);
  const targetScale = Math.min(window.innerWidth, window.innerHeight) / span / 1.7;

  camera.x += (cx - camera.x) * 0.035;
  camera.y += (cy - camera.y) * 0.035;
  camera.scale += (targetScale - camera.scale) * 0.035;
}

function toScreen(point) {
  return {
    x: window.innerWidth / 2 + (point.x - camera.x) * camera.scale,
    y: window.innerHeight / 2 + (point.y - camera.y) * camera.scale,
  };
}

function drawGrid() {
  const spacing = Math.max(36, camera.scale * 0.5);
  const offsetX = ((-camera.x * camera.scale + window.innerWidth / 2) % spacing) - spacing;
  const offsetY = ((-camera.y * camera.scale + window.innerHeight / 2) % spacing) - spacing;

  ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = offsetX; x < window.innerWidth + spacing; x += spacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, window.innerHeight);
  }
  for (let y = offsetY; y < window.innerHeight + spacing; y += spacing) {
    ctx.moveTo(0, y);
    ctx.lineTo(window.innerWidth, y);
  }
  ctx.stroke();
}

function drawTrails() {
  for (const body of bodies) {
    if (body.trail.length < 2) continue;
    ctx.lineWidth = 1.8;

    for (let i = 1; i < body.trail.length; i += 1) {
      const prev = toScreen(body.trail[i - 1]);
      const next = toScreen(body.trail[i]);
      const alpha = controls.fadeTrails.checked ? i / body.trail.length : 0.85;
      ctx.strokeStyle = hexToRgba(body.color, alpha * 0.72);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
  }
}

function drawBodies() {
  for (const body of bodies) {
    const p = toScreen(body.pos);
    const radius = Math.max(5, Math.min(18, body.radius));

    ctx.shadowColor = body.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = body.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(5, 7, 10, 0.72)";
    ctx.font = "600 11px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(body.id, p.x, p.y + 0.5);

    if (controls.showVectors.checked) {
      const end = {
        x: p.x + body.vel.x * camera.scale * 0.28,
        y: p.y + body.vel.y * camera.scale * 0.28,
      };
      ctx.strokeStyle = hexToRgba(body.color, 0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createNoiseBuffer(audioContext, seconds = 3) {
  const length = audioContext.sampleRate * seconds;
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    last = last * 0.985 + (Math.random() * 2 - 1) * 0.015;
    data[i] = last * 2.8;
  }
  return buffer;
}

function ensureSpaceAudio() {
  if (spaceAudio) return spaceAudio;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  const audioContext = new AudioContextClass();
  const master = audioContext.createGain();
  master.gain.value = 0.08;

  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 520;
  lowpass.Q.value = 0.7;

  const rumbleFilter = audioContext.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.value = 95;
  rumbleFilter.Q.value = 1.1;

  const noise = audioContext.createBufferSource();
  noise.buffer = createNoiseBuffer(audioContext);
  noise.loop = true;
  noise.connect(rumbleFilter);
  rumbleFilter.connect(lowpass);
  lowpass.connect(master);

  const drone = audioContext.createOscillator();
  const droneGain = audioContext.createGain();
  drone.type = "sine";
  drone.frequency.value = 38;
  droneGain.gain.value = 0.16;
  drone.connect(droneGain);
  droneGain.connect(master);

  const pulse = audioContext.createOscillator();
  const pulseGain = audioContext.createGain();
  pulse.type = "triangle";
  pulse.frequency.value = 0.035;
  pulseGain.gain.value = 0.018;
  pulse.connect(pulseGain);
  pulseGain.connect(master.gain);

  master.connect(audioContext.destination);
  noise.start();
  drone.start();
  pulse.start();

  spaceAudio = { audioContext, master, enabled: false };
  return spaceAudio;
}

async function setSpaceSound(enabled) {
  const audio = ensureSpaceAudio();
  if (!audio) return;
  if (enabled) await audio.audioContext.resume();
  const now = audio.audioContext.currentTime;
  audio.master.gain.cancelScheduledValues(now);
  audio.master.gain.setTargetAtTime(enabled ? 0.08 : 0.0001, now, 0.35);
  if (!enabled) window.setTimeout(() => audio.audioContext.suspend(), 500);
  audio.enabled = enabled;
  controls.spaceSound.textContent = enabled ? "소리 끄기" : "소리 켜기";
  controls.spaceSound.title = enabled ? "우주소음 끄기" : "우주소음 켜기";
}

function normalizeAngle(angle) {
  let next = angle;
  while (next <= -Math.PI) next += Math.PI * 2;
  while (next > Math.PI) next -= Math.PI * 2;
  return next;
}

function bodyById(id) {
  return bodies.find((body) => body.id === id) ?? bodies[2] ?? bodies[0];
}

function drawSkyView() {
  resizeSkyCanvas();
  const width = skyCanvas.clientWidth;
  const height = skyCanvas.clientHeight;
  const observer = bodyById(controls.skyObserver.value);
  if (!observer) return;

  const forward = Math.hypot(observer.vel.x, observer.vel.y) > 0.0001 ? Math.atan2(observer.vel.y, observer.vel.x) : 0;
  const midY = height * 0.56;

  skyCtx.clearRect(0, 0, width, height);
  skyCtx.fillStyle = "rgba(3, 7, 12, 0.52)";
  skyCtx.fillRect(0, 0, width, height);

  skyCtx.strokeStyle = "rgba(148, 163, 184, 0.16)";
  skyCtx.lineWidth = 1;
  for (let i = 0; i <= 8; i += 1) {
    const x = (width * i) / 8;
    skyCtx.beginPath();
    skyCtx.moveTo(x, 0);
    skyCtx.lineTo(x, height);
    skyCtx.stroke();
  }
  skyCtx.beginPath();
  skyCtx.moveTo(0, midY);
  skyCtx.lineTo(width, midY);
  skyCtx.stroke();

  skyCtx.fillStyle = "rgba(226, 232, 240, 0.52)";
  skyCtx.font = "11px ui-sans-serif, system-ui";
  skyCtx.textAlign = "center";
  skyCtx.textBaseline = "top";
  skyCtx.fillText("-180°", 24, 8);
  skyCtx.fillText("전방", width / 2, 8);
  skyCtx.fillText("+180°", width - 26, 8);

  const visibleBodies = bodies.filter((body) => body !== observer);
  for (const body of visibleBodies) {
    const dx = body.pos.x - observer.pos.x;
    const dy = body.pos.y - observer.pos.y;
    const distance = Math.hypot(dx, dy);
    const bearing = normalizeAngle(Math.atan2(dy, dx) - forward);
    const x = width / 2 + (bearing / Math.PI) * (width / 2 - 20);
    const apparent = Math.max(4, Math.min(18, 18 / Math.sqrt(Math.max(distance, 0.08))));

    skyCtx.strokeStyle = hexToRgba(body.color, 0.24);
    skyCtx.beginPath();
    skyCtx.moveTo(x, 28);
    skyCtx.lineTo(x, height - 22);
    skyCtx.stroke();

    skyCtx.shadowColor = body.color;
    skyCtx.shadowBlur = 16;
    skyCtx.fillStyle = body.color;
    skyCtx.beginPath();
    skyCtx.arc(x, midY, apparent, 0, Math.PI * 2);
    skyCtx.fill();
    skyCtx.shadowBlur = 0;

    skyCtx.fillStyle = "rgba(5, 7, 10, 0.78)";
    skyCtx.font = "700 11px ui-sans-serif, system-ui";
    skyCtx.textBaseline = "middle";
    skyCtx.fillText(body.id, x, midY + 0.5);
  }

  controls.skyReadout.innerHTML = visibleBodies
    .map((body) => {
      const dx = body.pos.x - observer.pos.x;
      const dy = body.pos.y - observer.pos.y;
      const distance = Math.hypot(dx, dy);
      const bearing = (normalizeAngle(Math.atan2(dy, dx) - forward) * 180) / Math.PI;
      return `<div class="skyReadoutLine">
        <span class="legendName"><i class="dot dot${body.id}"></i>${body.id}</span>
        <span>방위 ${bearing.toFixed(0)}°</span>
        <span>거리 ${distance.toFixed(2)}</span>
      </div>`;
    })
    .join("");
}

function render() {
  resize();
  updateCamera();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawGrid();
  drawTrails();
  drawBodies();
  drawSkyView();
}

function screenMotionSince(points) {
  if (!points) return Infinity;
  let maxMotion = 0;
  for (let i = 0; i < bodies.length; i += 1) {
    const current = toScreen(bodies[i].pos);
    const previous = points[i];
    maxMotion = Math.max(maxMotion, Math.hypot(current.x - previous.x, current.y - previous.y));
  }
  return maxMotion;
}

function currentScreenPoints() {
  return bodies.map((body) => toScreen(body.pos));
}

function maybeRestartStagnantSystem() {
  if (elapsed < stagnationGraceTime) return;
  if (elapsed - stagnation.sampleTime < stagnationCheckInterval) return;

  const motion = screenMotionSince(stagnation.points);
  const dt = stagnation.sampleTime === 0 ? 0 : elapsed - stagnation.sampleTime;

  stagnation.sampleTime = elapsed;
  stagnation.points = currentScreenPoints();
  stagnation.stillTime = motion < stagnationPixelThreshold ? stagnation.stillTime + dt : 0;

  if (stagnation.stillTime >= stagnationRestartAfter) {
    restartCurrentMode();
  }
}

function maybeRestartDivergentSystem() {
  if (elapsed < divergenceGraceTime) return;
  if (minimumDistance() < closeApproachLimit || maxDistanceFromCenter(bodies) > divergenceDistance) {
    restartCurrentMode();
  }
}

function updateStats() {
  const center = centerOfMass();
  controls.timeStat.textContent = elapsed.toFixed(1);
  controls.distanceStat.textContent = minimumDistance().toFixed(2);
  const drift = initialEnergy === 0 ? 0 : ((totalEnergy() - initialEnergy) / Math.abs(initialEnergy)) * 100;
  controls.energyStat.textContent = `${drift.toFixed(2)}%`;
  controls.speedValue.textContent = `${Number(controls.speed.value).toFixed(1)}x`;
  controls.gravityValue.textContent = Number(controls.gravity.value).toFixed(2);
  controls.trailValue.textContent = controls.trailLength.value;
  controls.playPause.textContent = paused ? "재생" : "일시정지";
  controls.bodyLegend.innerHTML = bodies
    .map((body, index) => {
      const speed = Math.hypot(body.vel.x, body.vel.y);
      const centerDistance = Math.hypot(body.pos.x - center.x, body.pos.y - center.y);
      return `<div class="legendGrid legendRow">
        <span class="legendName"><i class="dot dot${body.id}"></i>${body.id}</span>
        <span>${body.mass.toFixed(2)}</span>
        <span>${speed.toFixed(2)}</span>
        <span>${centerDistance.toFixed(2)}</span>
      </div>`;
    })
    .join("");
}

function animate(now) {
  const frameSeconds = Math.min(0.08, (now - lastFrame) / 1000);
  lastFrame = now;

  if (!paused) {
    accumulator += frameSeconds * Number(controls.speed.value);
    let steps = 0;
    while (accumulator >= fixedStep && steps < 18) {
      step(fixedStep);
      accumulator -= fixedStep;
      steps += 1;
    }
    maybeRestartStagnantSystem();
    maybeRestartDivergentSystem();
  }

  render();
  updateStats();
  requestAnimationFrame(animate);
}

function screenToWorld(x, y) {
  return {
    x: (x - window.innerWidth / 2) / camera.scale + camera.x,
    y: (y - window.innerHeight / 2) / camera.scale + camera.y,
  };
}

controls.togglePanel.addEventListener("click", () => {
  controls.hud.classList.toggle("collapsed");
  const collapsed = controls.hud.classList.contains("collapsed");
  controls.togglePanel.textContent = collapsed ? "설정" : "닫기";
  controls.togglePanel.title = collapsed ? "설정 열기" : "설정 닫기";
});

controls.spaceSound.addEventListener("click", async () => {
  await setSpaceSound(!(spaceAudio && spaceAudio.enabled));
});

controls.playPause.addEventListener("click", () => {
  paused = !paused;
});

controls.newSystem.addEventListener("click", () => {
  restartCurrentMode();
});

controls.resetSeed.addEventListener("click", () => {
  resetSimulation(controls.seedInput.value.trim() || seed, true);
});

controls.preset.addEventListener("change", () => {
  currentPreset = controls.preset.value;
  resetSimulation(currentPreset === "random" ? randomSeed() : currentPreset, true);
});

controls.seedInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") resetSimulation(controls.seedInput.value.trim() || seed, true);
});

controls.gravity.addEventListener("input", () => {
  computeAccelerations();
  initialEnergy = totalEnergy();
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  controls.autoFrame.checked = false;
  const before = screenToWorld(event.clientX, event.clientY);
  const zoom = Math.exp(-event.deltaY * 0.001);
  camera.scale = Math.max(32, Math.min(900, camera.scale * zoom));
  const after = screenToWorld(event.clientX, event.clientY);
  camera.x += before.x - after.x;
  camera.y += before.y - after.y;
});

canvas.addEventListener("pointerdown", (event) => {
  pointer = { dragging: true, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  controls.autoFrame.checked = false;
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer.dragging) return;
  camera.x -= (event.clientX - pointer.x) / camera.scale;
  camera.y -= (event.clientY - pointer.y) / camera.scale;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

canvas.addEventListener("pointerup", (event) => {
  pointer.dragging = false;
  canvas.releasePointerCapture(event.pointerId);
});

resetSimulation(randomSeed(), true);
requestAnimationFrame(animate);
