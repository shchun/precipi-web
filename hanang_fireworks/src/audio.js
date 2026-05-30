// hanang_fireworks · audio: WebAudio boom/launch synthesis
// Classic script — shares top-level globals with the other src/*.js via the
// global lexical scope. Load order matters (see index.html).

// ── 오디오 ────────────────────────────────────────────
// 사진처럼 다리 너머에서 터지는 폭죽 → 거리 ~500m → 소리는 약 1.5초 늦게
// 화면상 위치(y)에 따라 약간 변동 (위로 갈수록 더 멀다고 가정)
let audioCtx = null;
let soundOn = true;
let masterGain = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(audioCtx.destination);
}

// 화이트 노이즈 버퍼 (재사용)
let noiseBuffer = null;
function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const len = audioCtx.sampleRate * 2;
  noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

// 폭발음 합성: low boom (저주파 sine) + crackle (필터된 노이즈)
function playBoom(x, y, scale = 1) {
  if (!soundOn || !audioCtx) return;

  // 거리 기반 지연 (화면 y 위쪽일수록 멀다고 가정)
  // 기본 약 1.2초 + y 위치에 따라 추가
  const distanceFactor = 1 - (y / H);  // 0~1
  const delaySec = 0.9 + distanceFactor * 0.9 + Math.random() * 0.15;

  // 스테레오 팬: 화면 x → -1~1
  const pan = (x / W) * 2 - 1;

  const startTime = audioCtx.currentTime + delaySec;
  const volume = Math.min(1, scale) * (1.0 + Math.random() * 0.3);

  // ── 1. 저음 붐 ─────────────────────────────────
  const boom = audioCtx.createOscillator();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(90, startTime);
  boom.frequency.exponentialRampToValueAtTime(28, startTime + 0.5);

  const boomGain = audioCtx.createGain();
  boomGain.gain.setValueAtTime(0, startTime);
  boomGain.gain.linearRampToValueAtTime(volume * 1.4, startTime + 0.01);
  boomGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.9);

  // ── 1b. 서브 베이스 (더 묵직하게) ─────────────────
  const sub = audioCtx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(50, startTime);
  sub.frequency.exponentialRampToValueAtTime(20, startTime + 0.6);

  const subGain = audioCtx.createGain();
  subGain.gain.setValueAtTime(0, startTime);
  subGain.gain.linearRampToValueAtTime(volume * 1.2, startTime + 0.02);
  subGain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.0);

  // ── 2. 노이즈 펀치 (낮은 대역) ──────────────────
  const noise = audioCtx.createBufferSource();
  noise.buffer = getNoiseBuffer();

  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(500, startTime);
  noiseFilter.frequency.exponentialRampToValueAtTime(80, startTime + 0.5);
  noiseFilter.Q.value = 1.2;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0, startTime);
  noiseGain.gain.linearRampToValueAtTime(volume * 1.1, startTime + 0.005);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);

  // ── 3. 크랙클 (고주파 노이즈 — 폭죽 잔불 터지는 소리) ─
  const crackle = audioCtx.createBufferSource();
  crackle.buffer = getNoiseBuffer();

  const crackleFilter = audioCtx.createBiquadFilter();
  crackleFilter.type = 'bandpass';
  crackleFilter.frequency.value = 3500;
  crackleFilter.Q.value = 1.5;

  const crackleGain = audioCtx.createGain();
  crackleGain.gain.setValueAtTime(0, startTime);
  crackleGain.gain.linearRampToValueAtTime(volume * 0.35, startTime + 0.05);
  crackleGain.gain.linearRampToValueAtTime(volume * 0.25, startTime + 0.5);
  crackleGain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0);

  // 스테레오 패닝
  const panner = audioCtx.createStereoPanner();
  panner.pan.value = pan * 0.6;  // 너무 극단적이지 않게

  // 연결
  boom.connect(boomGain).connect(panner);
  sub.connect(subGain).connect(panner);
  noise.connect(noiseFilter).connect(noiseGain).connect(panner);
  crackle.connect(crackleFilter).connect(crackleGain).connect(panner);
  panner.connect(masterGain);

  boom.start(startTime);
  boom.stop(startTime + 0.95);
  sub.start(startTime);
  sub.stop(startTime + 1.05);
  noise.start(startTime);
  noise.stop(startTime + 0.75);
  crackle.start(startTime + 0.05);
  crackle.stop(startTime + 2.1);
}

// 발사음 (휘이익~ 휘파람 소리 — 작게)
function playLaunch(x) {
  if (!soundOn || !audioCtx) return;

  const startTime = audioCtx.currentTime;
  const pan = (x / W) * 2 - 1;

  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, startTime);
  osc.frequency.exponentialRampToValueAtTime(1800, startTime + 0.7);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200;
  filter.Q.value = 6;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.04, startTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

  const panner = audioCtx.createStereoPanner();
  panner.pan.value = pan * 0.5;

  osc.connect(filter).connect(gain).connect(panner).connect(masterGain);
  osc.start(startTime);
  osc.stop(startTime + 0.85);
}
