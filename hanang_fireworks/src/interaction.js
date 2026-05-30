// hanang_fireworks · interaction: click/drag/touch/keys, start overlay
// Classic script — shares top-level globals with the other src/*.js via the
// global lexical scope. Load order matters (see index.html).

// ── 인터랙션 ────────────────────────────────────────
canvas.addEventListener('click', e => {
  launchRocket(e.clientX, e.clientY);
});

let dragging = false;
canvas.addEventListener('mousedown', () => dragging = true);
canvas.addEventListener('mouseup', () => dragging = false);
canvas.addEventListener('mousemove', e => {
  if (dragging && Math.random() < 0.15) {
    launchRocket(e.clientX, e.clientY);
  }
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.touches) {
    launchRocket(t.clientX, t.clientY);
  }
}, { passive: false });

document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    auto = !auto;
    document.getElementById('autoLabel').textContent = auto ? 'ON' : 'OFF';
  } else if (e.code === 'KeyM') {
    soundOn = !soundOn;
    document.getElementById('soundLabel').textContent = soundOn ? 'ON' : 'OFF';
  }
});

// ── 시작 오버레이 ────────────────────────────────────
const overlay = document.getElementById('startOverlay');
overlay.addEventListener('click', () => {
  initAudio();
  overlay.style.transition = 'opacity 0.6s';
  overlay.style.opacity = '0';
  setTimeout(() => overlay.remove(), 600);
  // 시작 시 한 발 쏘기
  setTimeout(() => {
    launchRocket(W * 0.5, H * 0.3);
  }, 300);
});
