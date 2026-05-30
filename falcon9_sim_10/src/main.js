(function(){
  const F = (window.F9 = window.F9 || {});
  const { state, dbg, audio, G, R_EARTH, RHO_0, H_SCALE, C_SOUND, DRY_MASS, FUEL_MASS_FULL, T_PER_ENGINE, T_VAC_PER_ENGINE, ISP_SL, ISP_VAC, N_ENGINES_ASCENT, N_ENGINES_BOOSTBACK, N_ENGINES_ENTRY, N_ENGINES_LANDING, DIAMETER, HEIGHT, AREA, CD_FORWARD, CD_REVERSE, MIN_THROTTLE, MAX_THROTTLE, S2_DRY_MASS, S2_FUEL_MASS_FULL, S2_THRUST_VAC, S2_ISP_VAC, S2_DIAMETER, S2_HEIGHT, S2_AREA, TARGET_ORBIT_ALT, TARGET_ORBIT_VEL, FAIRING_MASS } = F;

  let running = false;
  let lastTime = 0;
  let rafId;

  // ===== Controls =====
  function reset(){
    Object.assign(state, {
      t: 0, phase: 'pre-launch',
      x: 0, y: 0, vx: 0, vy: 0,
      pitch: Math.PI/2, pitchRate: 0,
      mass: DRY_MASS + FUEL_MASS_FULL + state.payload,
      fuelMass: FUEL_MASS_FULL,
      throttle: 0, enginesActive: 0,
      maxQ: 0, maxAlt: 0, maxV: 0,
      crashed: false, landed: false,
      trajectory: [],
      separated: false,
      fairingJettisoned: false,
      mecoTime: null
    });
    state.stage2 = {
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      pitch: Math.PI/2,
      mass: S2_DRY_MASS + S2_FUEL_MASS_FULL,
      fuelMass: S2_FUEL_MASS_FULL,
      throttle: 0, engineOn: false,
      trajectory: [],
      phase: 'attached',
      orbitalVelocity: 0,
      hasFairing: true
    };
    document.getElementById('events').innerHTML = '';
    running = false;
    document.getElementById('launchBtn').textContent = 'Launch';
    document.getElementById('launchBtn').classList.add('primary');
    document.getElementById('launchBtn').classList.remove('danger');
  }

  F.reset = reset;

  function bindParam(id, valId, key, scale, unit, fmt){
    const el = document.getElementById(id);
    const v = document.getElementById(valId);
    el.addEventListener('input', () => {
      const raw = parseFloat(el.value);
      state[key] = raw * (scale || 1);
      v.textContent = (fmt ? fmt(raw) : raw) + ' ' + (unit || '');
    });
  }

  // ===== Main loop =====
  function loop(timestamp){
    if (!lastTime) lastTime = timestamp;
    const realDt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (running && state.speed > 0){
      // Fixed sub-step physics for stability
      const simDt = realDt * state.speed;
      const subSteps = Math.ceil(simDt / 0.02);
      const dt = simDt / subSteps;
      dbg.dt = dt;
      for (let i = 0; i < subSteps; i++){
        F.step(dt);
      }
    }

    F.render();
    F.updateHUD();
    F.updateOctaweb();
    F.updateAudio();
    rafId = requestAnimationFrame(loop);
  }

  document.getElementById('launchBtn').addEventListener('click', () => {
    F.tryInitAudioOnLaunch();
    if (state.phase === 'pre-launch'){
      state.phase = 'ascent';
      state.t = 0;
      running = true;
      F.logEvent('Liftoff', 'good');
      document.getElementById('launchBtn').textContent = 'Abort';
      document.getElementById('launchBtn').classList.remove('primary');
      document.getElementById('launchBtn').classList.add('danger');
    } else {
      reset();
    }
  });

  document.getElementById('resetBtn').addEventListener('click', reset);

  document.querySelectorAll('[data-speed]').forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseInt(btn.dataset.speed);
      state.speed = speed;
      document.querySelectorAll('[data-speed]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (speed > 0 && state.phase !== 'pre-launch' && !state.crashed && !state.landed){
        running = true;
      }
    });
  });

  bindParam('payload', 'payloadVal', 'payload', 1000, 't', x => x.toFixed(1));
  bindParam('wind', 'windVal', 'wind', 1, 'm/s');
  bindParam('targetX', 'targetXVal', 'targetX', 1000, 'km', x => x.toFixed(1));

  // Audio bindings
  document.getElementById('audioOn').addEventListener('change', e => {
    F.toggleAudio(e.target.checked);
  });
  document.getElementById('volume').addEventListener('input', e => {
    const v = parseInt(e.target.value);
    audio.masterVol = v / 100;
    document.getElementById('volVal').textContent = v;
  });

  // Init
  state.payload = 5000;
  reset();
  loop();
})();
