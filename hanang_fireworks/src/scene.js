// hanang_fireworks · scene: background, bridge, water reflection, particle & smoke drawing
// Classic script — shares top-level globals with the other src/*.js via the
// global lexical scope. Load order matters (see index.html).

// ── 드로우 ──────────────────────────────────────────
function drawBackground() {
  // 그라데이션 하늘 — 사진처럼 약간 따뜻한 검정
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON());
  sky.addColorStop(0, '#050507');
  sky.addColorStop(0.5, '#0a0805');
  sky.addColorStop(1, '#1a0f08');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HORIZON());

  // 지평선 멀리 산/언덕 실루엣 (사진처럼 오른쪽)
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(W * 0.55, BRIDGE_Y());
  ctx.bezierCurveTo(W * 0.7, BRIDGE_Y() - 30, W * 0.85, BRIDGE_Y() - 45, W, BRIDGE_Y() - 35);
  ctx.lineTo(W, BRIDGE_Y());
  ctx.closePath();
  ctx.fill();

  // 다리 (사진의 아치 다리 — 왼쪽에서 시작)
  drawBridge();

  // 강물
  const water = ctx.createLinearGradient(0, WATER_TOP(), 0, H);
  water.addColorStop(0, '#0a0805');
  water.addColorStop(1, '#000');
  ctx.fillStyle = water;
  ctx.fillRect(0, WATER_TOP(), W, H - WATER_TOP());
}

function drawBridge() {
  const y = BRIDGE_Y();
  const bridgeLeft = 0;
  const bridgeRight = W;

  // 다리 본체 라인
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(bridgeLeft, y);
  ctx.lineTo(bridgeRight, y);
  ctx.stroke();

  // 아치 (왼쪽 부분 — 사진처럼)
  const archCount = 4;
  const archWidth = W * 0.18 / archCount;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < archCount; i++) {
    const ax = bridgeLeft + i * archWidth;
    ctx.beginPath();
    ctx.arc(ax + archWidth/2, y, archWidth/2 * 0.95, Math.PI, 0, false);
    ctx.stroke();
  }

  // 다리 위 황금 가로등 (왼쪽 부분)
  for (let x = 0; x < W * 0.4; x += 24) {
    const flicker = 0.7 + Math.sin(x * 0.3 + Date.now() * 0.001) * 0.1;
    ctx.beginPath();
    ctx.arc(x, y - 4, 2, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x, y - 4, 0, x, y - 4, 8);
    grad.addColorStop(0, `rgba(255, 200, 100, ${flicker})`);
    grad.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 8, y - 12, 16, 16);

    ctx.fillStyle = `rgba(255, 220, 140, ${flicker})`;
    ctx.beginPath();
    ctx.arc(x, y - 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 다리 위 보라색 LED 라인 (오른쪽 — 사진의 특징)
  const ledStart = W * 0.5;
  for (let x = ledStart; x < W; x += 10) {
    const t = (x - ledStart) / (W - ledStart);
    // 보라→파랑 그라데이션
    const r = Math.floor(120 + t * 40);
    const g = Math.floor(60 + t * 60);
    const b = Math.floor(200 + t * 55);
    const flicker = 0.8 + Math.sin(x * 0.2 + Date.now() * 0.002) * 0.15;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, 5);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${flicker})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(x - 5, y - 5, 10, 10);

    ctx.fillStyle = `rgba(${r+50}, ${g+50}, ${b}, ${flicker})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWaterReflection() {
  // 강 위 빛 반영 — 흔들리는 가로 띠
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 모든 불꽃 파티클이 강에 반사된 듯한 따뜻한 빛
  let totalBrightness = 0;
  let centerX = 0;
  let count = 0;
  for (const p of particles) {
    if (p.alive && p.y < HORIZON() && p.type !== 'rocket') {
      totalBrightness += p.alpha;
      centerX += p.x;
      count++;
    }
  }

  if (count > 0) {
    centerX /= count;
    const intensity = Math.min(0.4, totalBrightness / 200);

    const grad = ctx.createRadialGradient(
      centerX, WATER_TOP() + 30, 0,
      centerX, WATER_TOP() + 30, W * 0.6
    );
    grad.addColorStop(0, `rgba(255, 180, 80, ${intensity})`);
    grad.addColorStop(0.4, `rgba(255, 150, 60, ${intensity * 0.4})`);
    grad.addColorStop(1, 'rgba(255, 150, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, WATER_TOP(), W, H - WATER_TOP());

    // 흔들리는 가로 띠
    for (let i = 0; i < 8; i++) {
      const yy = WATER_TOP() + 10 + i * (H - WATER_TOP()) / 8;
      const wobble = Math.sin(Date.now() * 0.002 + i) * 20;
      const a = intensity * (1 - i / 8) * 0.6;
      const ww = W * 0.5;
      const gx = ctx.createLinearGradient(centerX - ww + wobble, yy, centerX + ww + wobble, yy);
      gx.addColorStop(0, 'rgba(255, 180, 80, 0)');
      gx.addColorStop(0.5, `rgba(255, 200, 100, ${a})`);
      gx.addColorStop(1, 'rgba(255, 180, 80, 0)');
      ctx.fillStyle = gx;
      ctx.fillRect(0, yy - 1, W, 2 + i * 0.5);
    }
  }

  ctx.restore();
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const p of particles) {
    if (!p.alive) continue;

    if (p.type === 'flash') {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, `rgba(255, 250, 220, ${p.alpha})`);
      grad.addColorStop(0.4, `rgba(255, 200, 100, ${p.alpha * 0.5})`);
      grad.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    // 긴 빛줄기 (streak) — 사진의 핵심
    if (p.type === 'streak' && p.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let i = 1; i < p.trail.length; i++) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
      }
      // 줄기 자체에 그라데이션 효과를 단계별 alpha로
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.4;
      ctx.lineWidth = p.size * 0.8;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 끝부분 밝은 점
      ctx.globalAlpha = p.alpha;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      grad.addColorStop(0, p.color);
      grad.addColorStop(0.5, p.color.replace(')', ',0.5)').replace('rgb', 'rgba'));
      grad.addColorStop(1, 'transparent');
      // 단순화: 그냥 점
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // 끝에 따뜻한 후광
      ctx.globalAlpha = p.alpha * 0.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

    } else if (p.type === 'glitter') {
      // 반짝이는 작은 점
      const twinkle = 0.6 + Math.sin(p.flicker) * 0.4;
      ctx.globalAlpha = p.alpha * twinkle;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

    } else if (p.type === 'rocket') {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // 글로우
      ctx.globalAlpha = p.alpha * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill();

    } else {
      // 일반 spark
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawSmoke() {
  // 폭발 후 남는 옅은 연기 (사진처럼 왼쪽 위에 떠다님)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (const cloud of smokeClouds) {
    cloud.x += cloud.vx;
    cloud.y += cloud.vy;
    cloud.alpha *= 0.998;
    cloud.size += 0.15;

    const grad = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.size);
    grad.addColorStop(0, `rgba(180, 140, 100, ${cloud.alpha * 0.15})`);
    grad.addColorStop(1, 'rgba(180, 140, 100, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
    ctx.fill();
  }
  // 사라진 것 제거
  for (let i = smokeClouds.length - 1; i >= 0; i--) {
    if (smokeClouds[i].alpha < 0.01) smokeClouds.splice(i, 1);
  }
  ctx.restore();
}
