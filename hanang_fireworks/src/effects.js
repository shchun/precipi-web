// hanang_fireworks · effects: smoke clouds, burst sound/smoke hook, auto-launch, main loop
// Classic script — shares top-level globals with the other src/*.js via the
// global lexical scope. Load order matters (see index.html).

const smokeClouds = [];

// burst를 후킹: 연기 + 사운드 추가
const _burst = burst;
burst = function(x, y, scale) {
  _burst(x, y, scale);
  playBoom(x, y, scale);
  for (let i = 0; i < 3; i++) {
    smokeClouds.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 0.3 - 0.1,  // 왼쪽으로 흐름
      vy: -0.15 - Math.random() * 0.1,
      alpha: 1,
      size: 30 + Math.random() * 40,
    });
  }
};

// ── 자동 발사 ────────────────────────────────────────
let auto = true;
let autoTimer = 0;

function autoLaunch(dt) {
  autoTimer += dt;
  const interval = 700 + Math.random() * 900;
  if (autoTimer > interval) {
    autoTimer = 0;
    // 폭발 위치: 중앙~우측 위쪽 (사진처럼)
    const tx = W * 0.35 + Math.random() * W * 0.4;
    const ty = H * 0.2 + Math.random() * H * 0.25;
    launchRocket(tx, ty);

    // 가끔 동시에 2-3발
    if (Math.random() < 0.4) {
      setTimeout(() => {
        const tx2 = W * 0.3 + Math.random() * W * 0.5;
        const ty2 = H * 0.25 + Math.random() * H * 0.2;
        launchRocket(tx2, ty2);
      }, 200 + Math.random() * 400);
    }
    if (Math.random() < 0.2) {
      setTimeout(() => {
        const tx3 = W * 0.3 + Math.random() * W * 0.5;
        const ty3 = H * 0.25 + Math.random() * H * 0.2;
        launchRocket(tx3, ty3);
      }, 500 + Math.random() * 400);
    }
  }
}

// ── 루프 ────────────────────────────────────────────
let last = 0;
function loop(ts) {
  const dt = ts - last;
  last = ts;

  drawBackground();
  update();
  drawSmoke();
  drawParticles();
  drawWaterReflection();

  if (auto) autoLaunch(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
