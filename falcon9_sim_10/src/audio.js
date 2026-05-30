(function(){
  const F = (window.F9 = window.F9 || {});
  const { state } = F;

  // ===== Web Audio: synthesized rocket engine =====
  // Combines low-freq rumble + filtered white noise + crackling for that
  // characteristic Merlin engine roar
  const audio = {
    ctx: null,
    enabled: true,
    masterVol: 0.7,
    initialized: false,
    nodes: null
  };

  function initAudio(){
    if (audio.initialized) return;
    try {
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      console.warn('Web Audio not supported');
      return;
    }
    const ctx = audio.ctx;

    // Master gain
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // 1) Low rumble: two detuned sawtooth oscillators going through lowpass
    const rumble1 = ctx.createOscillator();
    rumble1.type = 'sawtooth';
    rumble1.frequency.value = 45;
    const rumble2 = ctx.createOscillator();
    rumble2.type = 'sawtooth';
    rumble2.frequency.value = 67;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.25;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 180;
    rumbleFilter.Q.value = 1.2;
    rumble1.connect(rumbleGain);
    rumble2.connect(rumbleGain);
    rumbleGain.connect(rumbleFilter);
    rumbleFilter.connect(master);
    rumble1.start();
    rumble2.start();

    // 2) White noise (continuous) — the main "roar"
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) noiseData[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 800;
    noiseFilter.Q.value = 0.6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.6;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    // 3) High-freq sizzle (combustion crackle)
    const sizzle = ctx.createBufferSource();
    sizzle.buffer = noiseBuffer;
    sizzle.loop = true;
    const sizzleFilter = ctx.createBiquadFilter();
    sizzleFilter.type = 'highpass';
    sizzleFilter.frequency.value = 2500;
    const sizzleGain = ctx.createGain();
    sizzleGain.gain.value = 0.15;
    sizzle.connect(sizzleFilter);
    sizzleFilter.connect(sizzleGain);
    sizzleGain.connect(master);
    sizzle.start();

    // 4) Sub-bass thump (the deep felt vibration)
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 30;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.4;
    sub.connect(subGain);
    subGain.connect(master);
    sub.start();

    audio.nodes = {
      master, rumble1, rumble2, rumbleGain, rumbleFilter,
      noiseFilter, noiseGain, sizzleGain, sub, subGain
    };
    audio.initialized = true;
  }

  function updateAudio(){
    if (!audio.initialized || !audio.enabled) return;
    const ctx = audio.ctx;
    const n = audio.nodes;
    const now = ctx.currentTime;

    // Engine intensity factor: 0 to 1+
    // Scales with engine count × throttle, dampened by atmosphere (sound thins at altitude)
    const engineFactor = (state.enginesActive / 9) * state.throttle;
    const atmosphereFactor = Math.exp(-state.y / 20000); // sound fades with altitude
    // Doppler-ish effect: faster = slight pitch shift
    const speed = Math.hypot(state.vx, state.vy);
    const dopplerShift = 1 + (state.vy > 0 ? -0.0001 : 0.00005) * speed;

    const targetMaster = audio.masterVol * (0.3 + engineFactor * 1.5) * atmosphereFactor;
    // Only audible when engines actually firing
    const finalMaster = state.enginesActive > 0 && state.throttle > 0.05 ? targetMaster : 0;
    n.master.gain.setTargetAtTime(finalMaster, now, 0.08);

    // Pitch up slightly with throttle (more energetic combustion)
    n.rumble1.frequency.setTargetAtTime(45 * (0.85 + state.throttle * 0.3) * dopplerShift, now, 0.05);
    n.rumble2.frequency.setTargetAtTime(67 * (0.85 + state.throttle * 0.3) * dopplerShift, now, 0.05);
    n.sub.frequency.setTargetAtTime(30 * (0.9 + state.throttle * 0.2), now, 0.1);

    // More engines = brighter, more sizzle
    n.noiseFilter.frequency.setTargetAtTime(500 + 800 * (state.enginesActive / 9), now, 0.1);
    n.sizzleGain.gain.setTargetAtTime(0.05 + 0.2 * (state.enginesActive / 9), now, 0.1);
  }

  function toggleAudio(on){
    audio.enabled = on;
    if (on){
      if (!audio.initialized) initAudio();
      if (audio.ctx){
        // Some browsers start in suspended state - must resume after user gesture
        if (audio.ctx.state === 'suspended'){
          audio.ctx.resume().then(() => {
            console.log('Audio context resumed');
          }).catch(e => console.warn('Resume failed:', e));
        }
        // Force a small initial gain so user hears it immediately if engines firing
        if (audio.nodes && state.enginesActive > 0){
          audio.nodes.master.gain.setTargetAtTime(audio.masterVol * 0.3, audio.ctx.currentTime, 0.05);
        }
      }
    } else {
      if (audio.nodes){
        audio.nodes.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.05);
      }
    }
  }

  // Also try to init audio on first launch click (counts as user gesture)
  function tryInitAudioOnLaunch(){
    if (audio.enabled && !audio.initialized){
      initAudio();
    }
    if (audio.ctx && audio.ctx.state === 'suspended'){
      audio.ctx.resume();
    }
  }

  F.audio = audio;
  F.initAudio = initAudio;
  F.updateAudio = updateAudio;
  F.toggleAudio = toggleAudio;
  F.tryInitAudioOnLaunch = tryInitAudioOnLaunch;
})();
