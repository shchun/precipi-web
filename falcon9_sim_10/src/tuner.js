(function(){
  const F = (window.F9 = window.F9 || {});
  const { state, PARAMS, PARAM_SCHEMA, G, R_EARTH, RHO_0, H_SCALE, C_SOUND, DRY_MASS, FUEL_MASS_FULL, T_PER_ENGINE, T_VAC_PER_ENGINE, ISP_SL, ISP_VAC, N_ENGINES_ASCENT, N_ENGINES_BOOSTBACK, N_ENGINES_ENTRY, N_ENGINES_LANDING, DIAMETER, HEIGHT, AREA, CD_FORWARD, CD_REVERSE, MIN_THROTTLE, MAX_THROTTLE, S2_DRY_MASS, S2_FUEL_MASS_FULL, S2_THRUST_VAC, S2_ISP_VAC, S2_DIAMETER, S2_HEIGHT, S2_AREA, TARGET_ORBIT_ALT, TARGET_ORBIT_VEL, FAIRING_MASS } = F;

  function runHeadlessMission(params, opts){
    // Backup current PARAMS, swap in test params
    const origParams = { ...PARAMS };
    Object.assign(PARAMS, params);
    // Backup current state
    const origStateBackup = JSON.parse(JSON.stringify(state));
    // Suppress logging while running headless
    F.suppressLogs = true;

    // Reset state for test mission
    state.t = 0;
    state.phase = 'ascent';
    state.x = 0; state.y = 0; state.vx = 0; state.vy = 0;
    state.pitch = Math.PI/2; state.pitchRate = 0;
    state.payload = opts.payload || 10000;
    state.wind = 0;
    state.targetX = 0;
    state.mass = DRY_MASS + FUEL_MASS_FULL + state.payload;
    state.fuelMass = FUEL_MASS_FULL;
    state.throttle = 0; state.enginesActive = 0;
    state.maxQ = 0; state.maxAlt = 0; state.maxV = 0;
    state.crashed = false; state.landed = false;
    state.trajectory = [];
    state.separated = false;
    state.fairingJettisoned = false;
    state.mecoTime = null;
    state.stage2 = {
      active: false, x: 0, y: 0, vx: 0, vy: 0,
      pitch: Math.PI/2,
      mass: S2_DRY_MASS + S2_FUEL_MASS_FULL,
      fuelMass: S2_FUEL_MASS_FULL,
      throttle: 0, engineOn: false,
      trajectory: [], phase: 'attached',
      orbitalVelocity: 0, hasFairing: true,
      ignitionDelay: undefined
    };

    // Run simulation in fast time steps
    const dt = 0.05; // 50ms steps — faster than visual but still stable
    const maxT = 800; // safety cutoff (13 min mission max)

    // Run until both stages settled (S1 landed/crashed AND S2 in orbit/failed)
    // Also: stage separation triggers in step() via determinePhase
    let separationFired = false;
    while (state.t < maxT){
      // Pre-step: trigger separation if phase transitions
      const prevPhase = state.phase;
      F.step(dt);
      // Check for separation event (replicate the phase-transition logic)
      if (!separationFired && state.separated){
        separationFired = true;
      }
      // Exit when both stages are settled
      const s1Done = state.landed || state.crashed;
      const s2Done = !state.stage2.active || state.stage2.phase === 'orbit' || state.stage2.phase === 'failed';
      if (s1Done && s2Done) break;
    }

    // Collect metrics
    const result = {
      s1Landed: state.landed,
      s1Crashed: state.crashed,
      s1ImpactSpeed: state.landed ? 0 :
        (state.crashed ? Math.hypot(state.vx, state.vy) : 999),
      s1FinalX: state.x,
      s1FuelLeft: state.fuelMass,
      s2InOrbit: state.stage2.phase === 'orbit',
      s2Failed: state.stage2.phase === 'failed',
      s2FinalAlt: state.stage2.y,
      s2FinalVel: Math.hypot(state.stage2.vx, state.stage2.vy),
      s2OrbitalVel: state.stage2.orbitalVelocity,
      s2FuelLeft: state.stage2.fuelMass,
      missionTime: state.t,
      mecoTime: state.mecoTime,
      separated: state.separated
    };

    // Restore originals
    Object.assign(PARAMS, origParams);
    Object.assign(state, origStateBackup);
    state.stage2 = origStateBackup.stage2;
    state.trajectory = origStateBackup.trajectory;
    F.suppressLogs = false;

    return result;
  }

  // ===== Fitness function =====
  function scoreMission(result){
    let score = 10000;
    const reasons = [];

    // === Stage 1 evaluation ===
    if (result.s1Crashed){
      score -= 5000;
      score -= Math.min(2000, result.s1ImpactSpeed * 10);
      reasons.push(`S1 crashed @ ${result.s1ImpactSpeed.toFixed(0)}m/s`);
    } else if (result.s1Landed){
      // Land soft = good (drone ship or RTLS, both count)
      if (result.s1ImpactSpeed > 5) score -= (result.s1ImpactSpeed - 5) * 100;
      reasons.push(`S1 landed @ ${result.s1ImpactSpeed.toFixed(1)}m/s`);
      // Distance penalty is gentle — drone ship landings 500+ km out are real
      const dist = Math.abs(result.s1FinalX);
      // Only mild penalty, capped at -500
      score -= Math.min(500, dist / 2000);
      if (dist > 1000){
        reasons.push(`S1 ${(dist/1000).toFixed(0)}km from launch (drone ship style)`);
      }
    } else {
      score -= 6000;
      reasons.push('S1 mission incomplete');
    }

    // === Stage 2 evaluation ===
    if (!result.separated){
      score -= 5000;
      reasons.push('No separation');
    } else if (result.s2InOrbit){
      // Bonus for good orbit
      const altError = Math.abs(result.s2FinalAlt - TARGET_ORBIT_ALT);
      const velError = Math.abs(result.s2OrbitalVel - TARGET_ORBIT_VEL);
      score -= altError / 100;
      score -= velError * 0.5;
      reasons.push(`S2 orbit ${(result.s2OrbitalVel/1000).toFixed(2)}km/s @ ${(result.s2FinalAlt/1000).toFixed(0)}km`);
    } else {
      // Failed orbit — penalty based on how close it got
      const velGap = Math.max(0, TARGET_ORBIT_VEL - result.s2FinalVel);
      const altGap = Math.max(0, TARGET_ORBIT_ALT - result.s2FinalAlt);
      score -= 3000;
      score -= velGap * 0.8;
      score -= altGap / 200;
      reasons.push(`S2 missed: gap ${(velGap/1000).toFixed(2)}km/s, ${(altGap/1000).toFixed(0)}km`);
    }

    return { score: Math.round(score), reasons };
  }

  // ===== Tuner state =====
  const tuner = {
    running: false,
    iter: 0,
    target: 100,
    history: [],
    best: null,
    bestParams: null
  };

  function randomParams(seed){
    const p = {};
    for (const k in PARAM_SCHEMA){
      const s = PARAM_SCHEMA[k];
      p[k] = s.min + Math.random() * (s.max - s.min);
    }
    return p;
  }

  function mutateParams(base, intensity){
    const p = {};
    for (const k in PARAM_SCHEMA){
      const s = PARAM_SCHEMA[k];
      const range = s.max - s.min;
      const delta = (Math.random() - 0.5) * 2 * range * intensity;
      p[k] = Math.max(s.min, Math.min(s.max, base[k] + delta));
    }
    return p;
  }

  async function runTuner(){
    tuner.running = true;
    tuner.iter = 0;
    tuner.history = [];
    tuner.best = null;
    tuner.bestParams = null;
    tuner.target = parseInt(document.getElementById('tuneIters').value) || 100;

    const headless = document.getElementById('tuneHeadless').checked;
    document.getElementById('tuneStatus').textContent = 'Running...';

    for (let i = 0; i < tuner.target; i++){
      if (!tuner.running) break;

      // Strategy: first 30% random exploration, rest exploit best ± mutation
      let candidate;
      const explore = i < tuner.target * 0.3 || !tuner.bestParams || Math.random() < 0.1;
      if (explore){
        candidate = randomParams();
      } else {
        // Mutate around current best, intensity decreases over time
        const intensity = 0.3 * (1 - i / tuner.target) + 0.05;
        candidate = mutateParams(tuner.bestParams, intensity);
      }

      const result = runHeadlessMission(candidate, { payload: state.payload });
      const { score, reasons } = scoreMission(result);

      tuner.history.push({ iter: i, score, params: candidate, result, reasons });
      if (!tuner.best || score > tuner.best.score){
        tuner.best = { score, result, reasons };
        tuner.bestParams = candidate;
        updateBestDisplay();
      }

      tuner.iter = i + 1;
      updateTunerProgress();
      drawScoreChart();

      // Yield to browser every few iterations
      if (!headless || i % 5 === 0){
        await new Promise(r => setTimeout(r, headless ? 0 : 50));
      }
    }

    tuner.running = false;
    document.getElementById('tuneStatus').textContent = tuner.best ?
      `Done · best score ${tuner.best.score}` : 'Done';
  }

  function updateTunerProgress(){
    const pct = (tuner.iter / tuner.target) * 100;
    document.getElementById('tuneProgress').style.width = pct + '%';
    document.getElementById('tuneCount').textContent = `${tuner.iter} / ${tuner.target}`;
  }

  function updateBestDisplay(){
    if (!tuner.best) return;
    document.getElementById('bestScore').textContent = tuner.best.score;
    const r = tuner.best.result;
    const lines = [];
    lines.push(`<div class="line"><span class="key">S1 landing</span><span class="v ${r.s1Landed ? 'good' : 'bad'}">${r.s1Landed ? `✓ ${r.s1ImpactSpeed.toFixed(1)} m/s` : (r.s1Crashed ? `✗ crash ${r.s1ImpactSpeed.toFixed(0)} m/s` : 'incomplete')}</span></div>`);
    const dist = Math.abs(r.s1FinalX);
    const distClass = dist < 600000 ? 'good' : '';  // drone ship range ~ 500-600 km is fine
    const distStr = dist < 1000 ? `${dist.toFixed(0)} m` : `${(dist/1000).toFixed(1)} km`;
    lines.push(`<div class="line"><span class="key">S1 position</span><span class="v ${distClass}">${distStr} from launch</span></div>`);
    lines.push(`<div class="line"><span class="key">S2 orbit</span><span class="v ${r.s2InOrbit ? 'good' : 'bad'}">${r.s2InOrbit ? `✓ ${(r.s2OrbitalVel/1000).toFixed(2)} km/s @ ${(r.s2FinalAlt/1000).toFixed(0)} km` : `✗ ${(r.s2FinalVel/1000).toFixed(2)} km/s`}</span></div>`);
    lines.push(`<div class="line"><span class="key">MECO @</span><span class="v">${r.mecoTime ? r.mecoTime.toFixed(0)+'s' : '—'}</span></div>`);
    document.getElementById('resultSummary').innerHTML = lines.join('');
    renderParamsTable();
  }

  function renderParamsTable(){
    const tbl = document.getElementById('paramsTable');
    const rows = ['<div class="row-param"><span>Parameter</span><span class="val-current">Best</span><span class="val-range">Range</span></div>'];
    for (const k in PARAM_SCHEMA){
      const s = PARAM_SCHEMA[k];
      const v = tuner.bestParams ? tuner.bestParams[k] : s.def;
      const decimals = (s.max - s.min) < 1 ? 3 : (s.max - s.min) < 10 ? 2 : 1;
      rows.push(`<div class="row-param">
        <span class="key">${s.label}</span>
        <span class="val-current">${v.toFixed(decimals)}</span>
        <span class="val-range">${s.min}…${s.max}</span>
      </div>`);
    }
    tbl.innerHTML = rows.join('');
  }

  function drawScoreChart(){
    const canvas = document.getElementById('scoreChart');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx2 = canvas.getContext('2d');
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width, H = rect.height;
    ctx2.clearRect(0, 0, W, H);

    if (tuner.history.length === 0){
      ctx2.fillStyle = '#4a4f5c';
      ctx2.font = '11px JetBrains Mono';
      ctx2.textAlign = 'center';
      ctx2.fillText('Run tuning to see score evolution', W/2, H/2);
      return;
    }

    // Find score range
    let minS = Infinity, maxS = -Infinity;
    for (const h of tuner.history){
      if (h.score < minS) minS = h.score;
      if (h.score > maxS) maxS = h.score;
    }
    if (maxS === minS) { maxS += 100; minS -= 100; }
    const padTop = 20, padBot = 30, padL = 50, padR = 12;
    const plotW = W - padL - padR;
    const plotH = H - padTop - padBot;

    // Axis lines
    ctx2.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.moveTo(padL, padTop);
    ctx2.lineTo(padL, padTop + plotH);
    ctx2.lineTo(padL + plotW, padTop + plotH);
    ctx2.stroke();

    // Y-axis labels
    ctx2.fillStyle = '#888880';
    ctx2.font = '9px JetBrains Mono';
    ctx2.textAlign = 'right';
    ctx2.fillText(maxS.toFixed(0), padL - 4, padTop + 3);
    ctx2.fillText(minS.toFixed(0), padL - 4, padTop + plotH + 3);
    ctx2.fillText(((maxS+minS)/2).toFixed(0), padL - 4, padTop + plotH/2 + 3);

    // X label
    ctx2.textAlign = 'center';
    ctx2.fillText('iteration', padL + plotW/2, padTop + plotH + 18);

    const tx = i => padL + (i / Math.max(1, tuner.target - 1)) * plotW;
    const ty = s => padTop + plotH - ((s - minS) / (maxS - minS)) * plotH;

    // Scatter all attempts
    ctx2.fillStyle = 'rgba(255, 107, 53, 0.4)';
    for (const h of tuner.history){
      ctx2.beginPath();
      ctx2.arc(tx(h.iter), ty(h.score), 2, 0, Math.PI*2);
      ctx2.fill();
    }

    // Best-so-far line
    let bestSoFar = -Infinity;
    ctx2.strokeStyle = '#4fc3f7';
    ctx2.lineWidth = 1.5;
    ctx2.beginPath();
    for (let i = 0; i < tuner.history.length; i++){
      bestSoFar = Math.max(bestSoFar, tuner.history[i].score);
      const x = tx(tuner.history[i].iter);
      const y = ty(bestSoFar);
      if (i === 0) ctx2.moveTo(x, y);
      else ctx2.lineTo(x, y);
    }
    ctx2.stroke();
  }

  // ===== Tab switching =====
  function setupTabs(){
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'tune'){
          // Trigger initial render
          drawScoreChart();
          renderParamsTable();
        }
      });
    });
  }

  setupTabs();
  renderParamsTable();
  drawScoreChart();

  // ===== Tuner UI bindings =====
  document.getElementById('tuneRun').addEventListener('click', () => {
    if (!tuner.running) runTuner();
  });
  document.getElementById('tuneStop').addEventListener('click', () => {
    tuner.running = false;
  });
  document.getElementById('applyBest').addEventListener('click', () => {
    if (!tuner.bestParams) {
      alert('Run tuning first');
      return;
    }
    Object.assign(PARAMS, tuner.bestParams);
    // Switch to sim tab
    document.querySelector('.tab-btn[data-tab="sim"]').click();
    // Reset for clean launch with new params
    F.reset();
    F.logEvent('✓ Applied tuned parameters', 'good');
  });
  document.getElementById('copyJson').addEventListener('click', () => {
    if (!tuner.bestParams) return;
    navigator.clipboard.writeText(JSON.stringify(tuner.bestParams, null, 2));
    const btn = document.getElementById('copyJson');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = orig, 1200);
  });
})();
