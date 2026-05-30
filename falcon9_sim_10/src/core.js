(function(){
  const F = (window.F9 = window.F9 || {});
  // ===== Constants, schema, state (shared data) =====
  // ===== Constants (real Falcon 9 data) =====
  const G = 9.80665;
  const R_EARTH = 6371000;
  const RHO_0 = 1.225;          // sea level air density
  const H_SCALE = 8500;          // atmospheric scale height
  const C_SOUND = 340;
  const DRY_MASS = 25600;        // kg, Falcon 9 stage 1 dry
  const FUEL_MASS_FULL = 395700; // kg
  const T_PER_ENGINE = 845000;   // N, sea level Merlin 1D
  const T_VAC_PER_ENGINE = 914000;
  const ISP_SL = 282;
  const ISP_VAC = 311;
  const N_ENGINES_ASCENT = 9;
  const N_ENGINES_BOOSTBACK = 3;
  const N_ENGINES_ENTRY = 3;
  const N_ENGINES_LANDING = 1;
  const DIAMETER = 3.66;
  const HEIGHT = 41;
  const AREA = Math.PI * (DIAMETER/2)**2;
  const CD_FORWARD = 0.3;        // engine down, going up
  const CD_REVERSE = 1.2;        // engine up, falling (grid fins help)
  const MIN_THROTTLE = 0.40;
  const MAX_THROTTLE = 1.00;

  // ===== Stage 2 constants (Falcon 9 upper stage, real data) =====
  const S2_DRY_MASS = 4000;          // kg
  const S2_FUEL_MASS_FULL = 92670;   // kg (LOX + RP-1)
  const S2_THRUST_VAC = 981000;      // N, single Merlin Vacuum
  const S2_ISP_VAC = 348;
  const S2_DIAMETER = 3.66;
  const S2_HEIGHT = 13.8;
  const S2_AREA = Math.PI * (S2_DIAMETER/2)**2;
  const TARGET_ORBIT_ALT = 200000;   // 200 km LEO
  const TARGET_ORBIT_VEL = 7788;     // m/s, circular velocity at 200km
  const FAIRING_MASS = 1900;         // kg, jettisoned at ~3.5min

  // ===== Tunable parameters =====
  // These are the magic numbers that auto-tune optimizes.
  // Each has: default value, min, max, label
  const PARAM_SCHEMA = {
    // --- Ascent ---
    ascentVerticalTime:   { def: 10,   min: 5,    max: 20,   label: 'Vertical phase (s)' },
    ascentPitchRate:      { def: 0.50, min: 0.30, max: 0.80, label: 'Pitch rate (°/s)' },
    ascentMaxTilt:        { def: 65,   min: 50,   max: 75,   label: 'Max tilt (°)' },
    maxQThrottle:         { def: 0.75, min: 0.55, max: 0.95, label: 'Max-Q throttle' },
    mecoFuelRatio:        { def: 0.28, min: 0.20, max: 0.40, label: 'MECO fuel reserve' },
    // --- Boostback ---
    boostbackDuration:    { def: 30,   min: 15,   max: 50,   label: 'Boostback dur (s)' },
    boostbackTiltGain:    { def: 200,  min: 100,  max: 400,  label: 'Boostback tilt gain' },
    boostbackThrottleK:   { def: 100,  min: 50,   max: 200,  label: 'Boostback thr gain' },
    boostbackFuelReserve: { def: 0.13, min: 0.08, max: 0.20, label: 'Boostback fuel rsv' },
    // --- Landing ---
    suicideBurnMargin:    { def: 1.8,  min: 1.2,  max: 2.5,  label: 'Suicide margin' },
    landingPidGain:       { def: 0.035,min: 0.015,max: 0.08, label: 'Landing PID gain' },
    landingDesiredVx:     { def: 25,   min: 10,   max: 50,   label: 'Landing max vx' },
    threeEngThreshold:    { def: 30,   min: 10,   max: 80,   label: '3-eng vy threshold' },
    // --- Stage 2 ---
    s2PitchLow:           { def: 45,   min: 30,   max: 60,   label: 'S2 pitch <50km (°)' },
    s2PitchMid:           { def: 20,   min: 10,   max: 35,   label: 'S2 pitch 120km (°)' },
    s2PitchHigh:          { def: 5,    min: 0,    max: 15,   label: 'S2 pitch tgt (°)' },
    s2LoftMinPitch:       { def: 25,   min: 15,   max: 40,   label: 'S2 loft min pitch (°)' },
    s2LoftVyTrigger:      { def: 50,   min: 0,    max: 150,  label: 'S2 loft vy trigger' }
  };

  // Active params (mutable, populated from schema defaults or applied from tuner)
  let PARAMS = {};
  for (const k in PARAM_SCHEMA) PARAMS[k] = PARAM_SCHEMA[k].def;

  // ===== State =====
  const state = {
    t: 0,
    phase: 'pre-launch',
    x: 0, y: 0,          // position (m), y=altitude
    vx: 0, vy: 0,        // velocity
    pitch: Math.PI/2,    // 90° = pointing up
    pitchRate: 0,
    mass: DRY_MASS + FUEL_MASS_FULL,
    fuelMass: FUEL_MASS_FULL,
    throttle: 0,
    engineGimbal: 0,     // rad, ±5°
    enginesActive: 0,
    payload: 5000,
    wind: 0,
    targetX: 0,
    maxQ: 0, maxAlt: 0, maxV: 0,
    crashed: false,
    landed: false,
    trajectory: [],
    speed: 1,
    separated: false,
    fairingJettisoned: false,
    mecoTime: null,
    // ----- Stage 2 sub-state (only active after separation) -----
    stage2: {
      active: false,
      x: 0, y: 0,
      vx: 0, vy: 0,
      pitch: Math.PI/2,
      mass: S2_DRY_MASS + S2_FUEL_MASS_FULL,
      fuelMass: S2_FUEL_MASS_FULL,
      throttle: 0,
      engineOn: false,
      trajectory: [],
      phase: 'attached',   // attached → seco1 (burn) → coast → orbit
      orbitalVelocity: 0,
      hasFairing: true
    }
  };

  // Debug telemetry store - populated during physics step, read by HUD
  const dbg = {
    dt: 0,
    suicideBurnAlt: 0,
    requiredDecel: 0,
    maxDecel: 0,
    twr: 0,
    timeToGround: 0,
    predictedImpact: 0,
    s2dvAvail: 0,
    s2dvNeed: 0,
    s2pitchTarget: 0,
    s2burnTime: 0,
    throttleCmdRaw: 0,
    enginesCmd: 0
  };

  function airDensity(altitude){
    if (altitude < 0) return RHO_0;
    return RHO_0 * Math.exp(-altitude / H_SCALE);
  }
  function gravity(altitude){
    return G * (R_EARTH / (R_EARTH + Math.max(0, altitude)))**2;
  }

  // ===== Mission phases =====
  // Phase ordering: pre-launch → ascent → boostback → coast → entry → landing
  // Once we advance past a phase, we cannot go back
  const PHASE_ORDER = ['pre-launch', 'ascent', 'boostback', 'coast', 'entry', 'landing'];
  function phaseRank(p){
    const i = PHASE_ORDER.indexOf(p);
    return i < 0 ? 99 : i;
  }

  function formatTime(t){
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(1);
    return `${String(m).padStart(2,'0')}:${s.padStart(4,'0')}`;
  }

  function logEvent(msg, type){
    if (F.suppressLogs) return;  // skip during headless tuning
    const el = document.getElementById('events');
    const row = document.createElement('div');
    row.className = 'event-row ' + (type || '');
    const tStr = formatTime(state.t);
    row.innerHTML = `<span class="t">T+${tStr}</span><span class="msg">${msg}</span>`;
    el.appendChild(row);
    el.scrollTop = el.scrollHeight;
  }

  function announcePhase(oldP, newP){
    const messages = {
      'ascent': '🚀 Liftoff. Tower clear',
      'boostback': '↩ Boostback burn initiated',
      'coast': '⏸ Coast phase. Engines off',
      'entry': '🔥 Entry burn. Slowing through atmosphere',
      'landing': '🎯 Landing burn. Final approach',
      'success': '✓ Touchdown nominal',
      'crashed': '✗ RUD'
    };
    const types = {
      'crashed': 'bad', 'success': 'good', 'landing': 'warn'
    };
    if (messages[newP]) logEvent(messages[newP], types[newP] || '');
  }

  Object.assign(F, {
    state, dbg, PARAMS, PARAM_SCHEMA,
    G, R_EARTH, RHO_0, H_SCALE, C_SOUND, DRY_MASS, FUEL_MASS_FULL, T_PER_ENGINE, T_VAC_PER_ENGINE, ISP_SL, ISP_VAC, N_ENGINES_ASCENT, N_ENGINES_BOOSTBACK, N_ENGINES_ENTRY, N_ENGINES_LANDING, DIAMETER, HEIGHT, AREA, CD_FORWARD, CD_REVERSE, MIN_THROTTLE, MAX_THROTTLE, S2_DRY_MASS, S2_FUEL_MASS_FULL, S2_THRUST_VAC, S2_ISP_VAC, S2_DIAMETER, S2_HEIGHT, S2_AREA, TARGET_ORBIT_ALT, TARGET_ORBIT_VEL, FAIRING_MASS,
    airDensity, gravity, phaseRank, formatTime, logEvent, announcePhase
  });
  F.suppressLogs = false;
})();
