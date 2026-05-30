(function(){
  const F = (window.F9 = window.F9 || {});
  const { state, G, R_EARTH, RHO_0, H_SCALE, C_SOUND, DRY_MASS, FUEL_MASS_FULL, T_PER_ENGINE, T_VAC_PER_ENGINE, ISP_SL, ISP_VAC, N_ENGINES_ASCENT, N_ENGINES_BOOSTBACK, N_ENGINES_ENTRY, N_ENGINES_LANDING, DIAMETER, HEIGHT, AREA, CD_FORWARD, CD_REVERSE, MIN_THROTTLE, MAX_THROTTLE, S2_DRY_MASS, S2_FUEL_MASS_FULL, S2_THRUST_VAC, S2_ISP_VAC, S2_DIAMETER, S2_HEIGHT, S2_AREA, TARGET_ORBIT_ALT, TARGET_ORBIT_VEL, FAIRING_MASS } = F;

  // ===== Octaweb engine layout (Falcon 9: 1 center + 8 around) =====
  const ENGINE_LAYOUT = [
    { x: 50, y: 50, idx: 0 },  // center
    ...Array.from({length: 8}, (_, i) => {
      const angle = (i / 8) * Math.PI * 2 - Math.PI/2;
      return {
        x: 50 + 36 * Math.cos(angle),
        y: 50 + 36 * Math.sin(angle),
        idx: i + 1
      };
    })
  ];

  // Which engines fire in which phase (center + symmetric pattern)
  // Landing: just center. Entry/Boostback: center + 2 opposite. Ascent: all.
  function activeEngineSet(phase, count){
    if (count >= 9) return new Set([0,1,2,3,4,5,6,7,8]);
    if (count === 3) return new Set([0, 1, 5]); // center + top + bottom
    if (count === 1) return new Set([0]);
    if (count === 0) return new Set();
    const s = new Set([0]);
    for (let i = 0; i < count - 1; i++) s.add(i + 1);
    return s;
  }

  function buildOctaweb(){
    const wrap = document.getElementById('octaweb');
    ENGINE_LAYOUT.forEach((eng, i) => {
      const el = document.createElement('div');
      el.className = 'engine';
      el.id = 'eng-' + i;
      el.style.left = eng.x + '%';
      el.style.top = eng.y + '%';
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = i === 0 ? 'C' : i;
      el.appendChild(num);
      wrap.appendChild(el);
    });
  }

  function updateOctaweb(){
    const activeCount = state.enginesActive;
    const active = activeEngineSet(state.phase, activeCount);
    const throttled = state.throttle < 0.7;

    ENGINE_LAYOUT.forEach((_, i) => {
      const el = document.getElementById('eng-' + i);
      const isOn = active.has(i) && state.throttle > 0.01;
      el.classList.toggle('on', isOn);
      el.classList.toggle('throttled', throttled && isOn);
    });

    // Info readout
    document.getElementById('engActive').textContent = activeCount + ' / 9';
    document.getElementById('engActive').className = 'v ' + (activeCount > 0 ? 'on' : 'off');
    document.getElementById('engThrottle').textContent = (state.throttle * 100).toFixed(0) + '%';
    const perThrust = state.throttle * T_PER_ENGINE / 1000;
    document.getElementById('engPerThrust').textContent = perThrust.toFixed(0) + ' kN';
    const total = activeCount * perThrust;
    document.getElementById('engTotal').textContent = total.toFixed(0) + ' kN';
    const twr = (total * 1000) / (state.mass * F.gravity(state.y));
    document.getElementById('engTWR').textContent = twr.toFixed(2);
    document.getElementById('engTWR').className = 'v ' + (twr > 1 ? 'on' : (twr > 0 ? 'off' : ''));
  }

  F.buildOctaweb = buildOctaweb;
  F.updateOctaweb = updateOctaweb;
  buildOctaweb();
})();
