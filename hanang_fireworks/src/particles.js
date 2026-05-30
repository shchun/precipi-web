// hanang_fireworks · particles: pool, palette, burst, rocket, physics update
// Classic script — shares top-level globals with the other src/*.js via the
// global lexical scope. Load order matters (see index.html).

// ── 파티클 풀 ────────────────────────────────────────
const POOL_SIZE = 10000;
const pool = [];
let poolIdx = 0;

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.alpha = 0; this.decay = 0;
    this.size = 0; this.color = '#FFD89B';
    this.trail = []; this.maxTrail = 0;
    this.type = 'spark';
    this.gravity = 0;
    this.alive = false;
    this.flicker = 0;
    this.targetY = 0;
  }
}

for (let i = 0; i < POOL_SIZE; i++) pool.push(new Particle());

function getParticle() {
  for (let i = 0; i < POOL_SIZE; i++) {
    const idx = (poolIdx + i) % POOL_SIZE;
    if (!pool[idx].alive) {
      poolIdx = idx + 1;
      const p = pool[idx];
      p.alive = true;
      p.trail = [];
      return p;
    }
  }
  poolIdx++;
  return pool[poolIdx % POOL_SIZE];
}

// ── 사진 톤 팔레트 (황금/주황 위주) ──────────────────
const GOLD_PALETTE = [
  '#FFE9B5', '#FFD89B', '#FFC579', '#FFA94D', '#FF8C2E',
  '#FFCC66', '#FFB347', '#F4A340', '#E89940', '#FFE0A3',
];

const ACCENT_PALETTE = [
  '#FFF4D6', '#FFFAE5',  // 가끔 섞이는 흰빛
];

function goldColor() {
  return GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)];
}

// ── 폭발: 크고 풍성한 국화 (사진과 동일한 큰 구) ─────
function burst(x, y, scale = 1) {
  const baseCount = Math.floor(280 * scale);

  // 1. 메인 국화: 길게 늘어지는 빛줄기 (사진의 핵심 모양)
  for (let i = 0; i < baseCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    // 균등한 구를 만들기 위해 sqrt 분포
    const speedFactor = Math.sqrt(Math.random());
    const speed = speedFactor * (5.5 * scale) + 1;

    const p = getParticle();
    p.x = x; p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.alpha = 1;
    p.decay = 0.008 + Math.random() * 0.006;  // 천천히 사라짐 → 빛줄기 길게
    p.size = 1.8 + Math.random() * 1.4;
    p.color = Math.random() < 0.9 ? goldColor() : ACCENT_PALETTE[Math.floor(Math.random()*ACCENT_PALETTE.length)];
    p.type = 'streak';
    p.gravity = 0.045;
    p.maxTrail = 18 + Math.floor(Math.random() * 8);  // 긴 꼬리
    p.flicker = 0;
  }

  // 2. 끝부분 반짝임 (글리터)
  const glitterCount = Math.floor(80 * scale);
  for (let i = 0; i < glitterCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * (5 * scale) + 0.5;

    const p = getParticle();
    p.x = x; p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.alpha = 1;
    p.decay = 0.012;
    p.size = 1 + Math.random();
    p.color = goldColor();
    p.type = 'glitter';
    p.gravity = 0.05;
    p.maxTrail = 3;
    p.flicker = Math.random() * Math.PI * 2;
  }

  // 3. 중심 빛 (감마 플래시)
  const p = getParticle();
  p.x = x; p.y = y;
  p.vx = 0; p.vy = 0;
  p.alpha = 1;
  p.decay = 0.04;
  p.size = 30 * scale;
  p.color = '#FFFAE5';
  p.type = 'flash';
  p.gravity = 0;
  p.maxTrail = 0;
}

// ── 로켓 ────────────────────────────────────────────
function launchRocket(tx, ty) {
  const p = getParticle();
  // 다리 너머 (지평선 부근)에서 발사
  p.x = tx + (Math.random() - 0.5) * 60;
  p.y = HORIZON() - 10;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const speed = 13 + Math.random() * 4;
  p.vx = (dx/dist) * speed * 0.35;
  p.vy = -(speed * 0.95 + Math.random() * 2);
  p.alpha = 1;
  p.decay = 0;
  p.size = 2.5;
  p.color = '#FFD89B';
  p.type = 'rocket';
  p.gravity = 0.18;
  p.maxTrail = 10;
  p.targetY = ty;
  p.scaleHint = 0.85 + Math.random() * 0.4;  // 폭발 크기 변동

  playLaunch(p.x);
}

// ── 업데이트 ────────────────────────────────────────
const particles = pool;

function update() {
  for (const p of particles) {
    if (!p.alive) continue;

    if (p.type === 'flash') {
      p.alpha -= p.decay;
      p.size *= 0.92;
      if (p.alpha <= 0) p.alive = false;
      continue;
    }

    // trail
    if (p.maxTrail > 0) {
      p.trail.push({ x: p.x, y: p.y, a: p.alpha });
      if (p.trail.length > p.maxTrail) p.trail.shift();
    }

    p.vy += p.gravity;
    p.x += p.vx;
    p.y += p.vy;

    if (p.type === 'rocket') {
      p.vx *= 0.99;
      if (p.vy >= -1 || p.y <= p.targetY) {
        burst(p.x, p.y, p.scaleHint || 1);
        p.alive = false;
        continue;
      }
      // 로켓 트레일
      if (Math.random() < 0.7) {
        const t = getParticle();
        t.x = p.x + (Math.random() - 0.5) * 2;
        t.y = p.y;
        t.vx = (Math.random() - 0.5) * 0.4;
        t.vy = Math.random() * 1.2 + 0.5;
        t.alpha = 0.8;
        t.decay = 0.08;
        t.size = 1.5;
        t.color = Math.random() < 0.5 ? '#FFA94D' : '#FFD89B';
        t.type = 'spark';
        t.gravity = 0.04;
        t.maxTrail = 0;
      }
    } else {
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.alpha -= p.decay;
      if (p.type === 'glitter') {
        p.flicker += 0.5;
      }
      if (p.alpha <= 0) p.alive = false;

      // 물에 닿으면 사라짐
      if (p.y > WATER_TOP()) {
        p.alpha *= 0.5;
      }
    }
  }
}
