(function(){
  const F = (window.F9 = window.F9 || {});
  const { state, dbg, G, R_EARTH, RHO_0, H_SCALE, C_SOUND, DRY_MASS, FUEL_MASS_FULL, T_PER_ENGINE, T_VAC_PER_ENGINE, ISP_SL, ISP_VAC, N_ENGINES_ASCENT, N_ENGINES_BOOSTBACK, N_ENGINES_ENTRY, N_ENGINES_LANDING, DIAMETER, HEIGHT, AREA, CD_FORWARD, CD_REVERSE, MIN_THROTTLE, MAX_THROTTLE, S2_DRY_MASS, S2_FUEL_MASS_FULL, S2_THRUST_VAC, S2_ISP_VAC, S2_DIAMETER, S2_HEIGHT, S2_AREA, TARGET_ORBIT_ALT, TARGET_ORBIT_VEL, FAIRING_MASS } = F;

  // ===== Canvas setup =====
  const mainCanvas = document.getElementById('main');
  const ctx = mainCanvas.getContext('2d');
  const miniCanvas = document.getElementById('mini');
  const miniCtx = miniCanvas.getContext('2d');

  function resizeCanvas(){
    const dpr = window.devicePixelRatio || 1;
    const rect = mainCanvas.getBoundingClientRect();
    mainCanvas.width = rect.width * dpr;
    mainCanvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mrect = miniCanvas.getBoundingClientRect();
    miniCanvas.width = mrect.width * dpr;
    miniCanvas.height = mrect.height * dpr;
    miniCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ===== Rendering =====
  function getView(){
    // Camera follows rocket, but pulls back as altitude grows
    const W = mainCanvas.clientWidth;
    const H = mainCanvas.clientHeight;
    // World units per pixel
    let unitsPerPx;
    if (state.phase === 'pre-launch' || state.phase === 'landing' || state.phase === 'success' || state.phase === 'crashed'){
      // Close view when on/near ground
      const closeRange = Math.max(200, state.y * 4 + 100);
      unitsPerPx = closeRange / H;
    } else {
      // Wide view during flight
      const range = Math.max(state.y * 2.5, 5000);
      unitsPerPx = range / H;
    }
    const cx = state.x;
    const cy = Math.max(state.y, 100);

    return {
      W, H, unitsPerPx, cx, cy,
      worldToScreen(wx, wy){
        return {
          x: W/2 + (wx - cx) / unitsPerPx,
          y: H/2 - (wy - cy) / unitsPerPx
        };
      }
    };
  }

  function drawSky(view){
    const { W, H, cy } = view;
    // Altitude-based sky gradient
    const skyAlt = cy;
    let topColor, bottomColor;
    if (skyAlt < 10000){
      topColor = '#1a3560'; bottomColor = '#5a7ba8';
    } else if (skyAlt < 50000){
      const t = (skyAlt - 10000) / 40000;
      topColor = `rgb(${Math.floor(26 - 26*t)}, ${Math.floor(53 - 53*t)}, ${Math.floor(96 - 80*t)})`;
      bottomColor = `rgb(${Math.floor(90 - 70*t)}, ${Math.floor(123 - 100*t)}, ${Math.floor(168 - 140*t)})`;
    } else {
      topColor = '#000308'; bottomColor = '#0a1428';
    }
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars at high altitude
    if (skyAlt > 30000){
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (skyAlt-30000)/20000)})`;
      // Deterministic stars
      const seed = 12345;
      for (let i = 0; i < 80; i++){
        const sx = ((seed * (i+1) * 9301 + 49297) % 233280) / 233280 * W;
        const sy = ((seed * (i+1) * 7901 + 12397) % 233280) / 233280 * H * 0.6;
        const size = ((seed * (i+1) * 1301) % 100) / 100 * 1.5 + 0.3;
        ctx.fillRect(sx, sy, size, size);
      }
    }
  }

  function drawGround(view){
    const { W, H, worldToScreen, unitsPerPx } = view;
    const groundY = worldToScreen(0, 0).y;
    if (groundY < H){
      // Ground
      const grad = ctx.createLinearGradient(0, groundY, 0, H);
      grad.addColorStop(0, '#2d3142');
      grad.addColorStop(1, '#1a1d28');
      ctx.fillStyle = grad;
      ctx.fillRect(0, groundY, W, H - groundY);

      // Horizon line
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();

      // Launch pad marker
      const padScreen = worldToScreen(0, 0);
      if (padScreen.x > -50 && padScreen.x < W + 50){
        ctx.fillStyle = '#4a4f5c';
        ctx.fillRect(padScreen.x - 30/unitsPerPx, groundY - 2, 60/unitsPerPx, 4);
        ctx.fillStyle = '#888f9c';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('LZ-1', padScreen.x, groundY + 14);
      }

      // Landing target
      if (Math.abs(state.targetX) > 100){
        const tgtScreen = worldToScreen(state.targetX, 0);
        if (tgtScreen.x > -50 && tgtScreen.x < W + 50){
          ctx.fillStyle = '#4fc3f7';
          ctx.fillRect(tgtScreen.x - 25/unitsPerPx, groundY - 2, 50/unitsPerPx, 4);
          // Target lines
          ctx.strokeStyle = 'rgba(79,195,247,0.4)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(tgtScreen.x, groundY);
          ctx.lineTo(tgtScreen.x, groundY - 30);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#4fc3f7';
          ctx.font = '9px JetBrains Mono';
          ctx.fillText('TARGET', tgtScreen.x, groundY + 14);
        }
      }
    }
  }

  function drawRocket(view){
    const { worldToScreen, unitsPerPx } = view;
    const pos = worldToScreen(state.x, state.y);

    // Rocket dimensions on screen
    const rocketH = Math.max(20, HEIGHT / unitsPerPx);
    const rocketW = Math.max(3, DIAMETER / unitsPerPx);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    // pitch=π/2 means up. Canvas y is flipped, so we use -pitch + π/2 for visual
    // pitch is angle from +x axis (math convention)
    // Visually: rocket's long axis points along pitch direction
    // In canvas (y down), rotate by -(pitch - π/2)
    ctx.rotate(-(state.pitch - Math.PI/2));

    // Engine flame (drawn first, below)
    if (state.throttle > 0.01 && state.enginesActive > 0){
      const flameLen = (8 + 25 * state.throttle) * (state.enginesActive / 9 + 0.3);
      const flameW = rocketW * 0.9;
      const flameGrad = ctx.createLinearGradient(0, rocketH/2, 0, rocketH/2 + flameLen);
      flameGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
      flameGrad.addColorStop(0.3, 'rgba(255,200,80,0.85)');
      flameGrad.addColorStop(0.7, 'rgba(255,100,30,0.5)');
      flameGrad.addColorStop(1, 'rgba(255,50,0,0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-flameW/2, rocketH/2);
      ctx.quadraticCurveTo(0, rocketH/2 + flameLen + (Math.random()-0.5)*4, flameW/2, rocketH/2);
      ctx.closePath();
      ctx.fill();
    }

    // Body
    ctx.fillStyle = '#e8e8ec';
    ctx.fillRect(-rocketW/2, -rocketH/2, rocketW, rocketH);

    // Black stripes (Falcon 9 signature)
    ctx.fillStyle = '#1a1d28';
    ctx.fillRect(-rocketW/2, -rocketH/2 + rocketH*0.15, rocketW, rocketH*0.05);
    ctx.fillRect(-rocketW/2, rocketH/2 - rocketH*0.25, rocketW, rocketH*0.04);

    // Nose cone (if payload still attached, otherwise interstage)
    ctx.fillStyle = '#d0d0d4';
    ctx.beginPath();
    ctx.moveTo(-rocketW/2, -rocketH/2);
    ctx.lineTo(0, -rocketH/2 - rocketW*0.8);
    ctx.lineTo(rocketW/2, -rocketH/2);
    ctx.closePath();
    ctx.fill();

    // Grid fins (deployed during descent)
    if (state.phase === 'entry' || state.phase === 'landing' || state.phase === 'coast'){
      ctx.fillStyle = '#666';
      const finY = -rocketH/2 + rocketW*1.2;
      const finW = rocketW * 0.4;
      const finH = rocketW * 0.6;
      ctx.fillRect(-rocketW/2 - finW, finY, finW, finH);
      ctx.fillRect(rocketW/2, finY, finW, finH);
    }

    // Landing legs (deployed before landing)
    if (state.phase === 'landing' || state.phase === 'success' || (state.phase === 'entry' && state.y < 3000)){
      ctx.strokeStyle = '#888';
      ctx.lineWidth = Math.max(1, rocketW * 0.15);
      ctx.beginPath();
      ctx.moveTo(-rocketW/2, rocketH/2);
      ctx.lineTo(-rocketW * 1.2, rocketH/2 + rocketW * 0.8);
      ctx.moveTo(rocketW/2, rocketH/2);
      ctx.lineTo(rocketW * 1.2, rocketH/2 + rocketW * 0.8);
      ctx.stroke();
    }

    ctx.restore();

    // Smoke trail during ascent
    if (state.phase === 'ascent' && state.y < 5000 && state.y > 50){
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.arc(pos.x + (Math.random()-0.5)*8, pos.y + rocketH/2 + 20, 15, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function drawTrajectory(view){
    if (state.trajectory.length < 2) return;
    const { worldToScreen } = view;
    ctx.strokeStyle = 'rgba(79,195,247,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < state.trajectory.length; i++){
      const p = worldToScreen(state.trajectory[i].x, state.trajectory[i].y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function drawMinimap(){
    const W = miniCanvas.clientWidth;
    const H = miniCanvas.clientHeight;
    miniCtx.clearRect(0, 0, W, H);
    miniCtx.fillStyle = 'rgba(0,0,0,0.3)';
    miniCtx.fillRect(0, 0, W, H);

    if (state.trajectory.length < 2 && state.phase === 'pre-launch'){
      miniCtx.fillStyle = '#4a4f5c';
      miniCtx.font = '8px JetBrains Mono';
      miniCtx.textAlign = 'center';
      miniCtx.fillText('STANDBY', W/2, H/2);
      return;
    }

    // Find bounds — include stage 2 trajectory too
    let xMin = -1000, xMax = 1000, yMax = 1000;
    for (const p of state.trajectory){
      xMin = Math.min(xMin, p.x);
      xMax = Math.max(xMax, p.x);
      yMax = Math.max(yMax, p.y);
    }
    if (state.stage2.active){
      for (const p of state.stage2.trajectory){
        xMin = Math.min(xMin, p.x);
        xMax = Math.max(xMax, p.x);
        yMax = Math.max(yMax, p.y);
      }
      xMin = Math.min(xMin, state.stage2.x);
      xMax = Math.max(xMax, state.stage2.x);
      yMax = Math.max(yMax, state.stage2.y);
    }
    xMin = Math.min(xMin, state.x, state.targetX);
    xMax = Math.max(xMax, state.x, state.targetX);
    yMax = Math.max(yMax, state.y);

    // Add padding
    const padX = (xMax - xMin) * 0.1 + 500;
    xMin -= padX; xMax += padX;
    const padY = yMax * 0.1 + 500;
    const yMin = -padY;
    yMax += padY;

    const sx = W / (xMax - xMin);
    const sy = H / (yMax - yMin);
    const toX = wx => (wx - xMin) * sx;
    const toY = wy => H - (wy - yMin) * sy;

    // Ground line
    miniCtx.strokeStyle = 'rgba(255,255,255,0.2)';
    miniCtx.beginPath();
    miniCtx.moveTo(0, toY(0));
    miniCtx.lineTo(W, toY(0));
    miniCtx.stroke();

    // Pad
    miniCtx.fillStyle = '#888';
    miniCtx.fillRect(toX(0) - 2, toY(0) - 2, 4, 2);

    // Target
    if (Math.abs(state.targetX) > 100){
      miniCtx.fillStyle = '#4fc3f7';
      miniCtx.fillRect(toX(state.targetX) - 2, toY(0) - 2, 4, 2);
    }

    // Stage 2 trajectory (drawn behind S1)
    if (state.stage2.active && state.stage2.trajectory.length > 1){
      miniCtx.strokeStyle = 'rgba(79, 195, 247, 0.7)';
      miniCtx.lineWidth = 1;
      miniCtx.setLineDash([2, 2]);
      miniCtx.beginPath();
      for (let i = 0; i < state.stage2.trajectory.length; i++){
        const p = state.stage2.trajectory[i];
        if (i === 0) miniCtx.moveTo(toX(p.x), toY(p.y));
        else miniCtx.lineTo(toX(p.x), toY(p.y));
      }
      miniCtx.stroke();
      miniCtx.setLineDash([]);

      // S2 current position
      miniCtx.fillStyle = '#4fc3f7';
      miniCtx.beginPath();
      miniCtx.arc(toX(state.stage2.x), toY(state.stage2.y), 1.8, 0, Math.PI*2);
      miniCtx.fill();
    }

    // Stage 1 trajectory
    miniCtx.strokeStyle = '#ff6b35';
    miniCtx.lineWidth = 1;
    miniCtx.beginPath();
    for (let i = 0; i < state.trajectory.length; i++){
      const p = state.trajectory[i];
      if (i === 0) miniCtx.moveTo(toX(p.x), toY(p.y));
      else miniCtx.lineTo(toX(p.x), toY(p.y));
    }
    miniCtx.stroke();

    // Current S1 position
    miniCtx.fillStyle = '#fff';
    miniCtx.beginPath();
    miniCtx.arc(toX(state.x), toY(state.y), 2, 0, Math.PI*2);
    miniCtx.fill();
  }

  // ===== Stage 2 rendering =====
  function drawStage2(view){
    const s2 = state.stage2;
    if (!s2.active) return;
    const { W, H, worldToScreen, unitsPerPx } = view;
    const pos = worldToScreen(s2.x, s2.y);

    // Compute screen position - clip to edges if off-screen
    let drawX = pos.x, drawY = pos.y, clipped = false;
    const margin = 30;
    if (drawX < margin || drawX > W - margin || drawY < margin || drawY > H - margin){
      // Clip to edge - show indicator
      clipped = true;
      drawX = Math.max(margin, Math.min(W - margin, drawX));
      drawY = Math.max(margin, Math.min(H - margin, drawY));
    }

    if (clipped){
      // Off-screen indicator (arrow pointing toward stage 2)
      ctx.save();
      ctx.translate(drawX, drawY);
      const angle = Math.atan2(pos.y - H/2, pos.x - W/2);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(79, 195, 247, 0.9)';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Label
      ctx.fillStyle = 'rgba(79, 195, 247, 0.9)';
      ctx.font = '9px JetBrains Mono';
      ctx.textAlign = 'center';
      const altKm = (s2.y / 1000).toFixed(0);
      const velKm = (Math.hypot(s2.vx, s2.vy) / 1000).toFixed(1);
      ctx.fillText('S2 · ' + altKm + 'km · ' + velKm + 'km/s', drawX, drawY - 14);
    } else {
      // Draw stage 2 on screen
      const s2H = Math.max(6, S2_HEIGHT / unitsPerPx);
      const s2W = Math.max(2, S2_DIAMETER / unitsPerPx);
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(-(s2.pitch - Math.PI/2));

      // Engine flame
      if (s2.engineOn && s2.throttle > 0.01){
        const flameLen = 6 + 20 * s2.throttle;
        ctx.fillStyle = 'rgba(150, 220, 255, 0.85)';
        ctx.beginPath();
        ctx.moveTo(-s2W/2, s2H/2);
        ctx.lineTo(0, s2H/2 + flameLen);
        ctx.lineTo(s2W/2, s2H/2);
        ctx.closePath();
        ctx.fill();
      }

      // Body
      ctx.fillStyle = '#d0d0d4';
      ctx.fillRect(-s2W/2, -s2H/2, s2W, s2H);

      // Fairing nose cone (if still attached)
      if (s2.hasFairing){
        ctx.fillStyle = '#e8e8ec';
        ctx.beginPath();
        ctx.moveTo(-s2W/2, -s2H/2);
        ctx.quadraticCurveTo(0, -s2H/2 - s2W * 1.5, s2W/2, -s2H/2);
        ctx.closePath();
        ctx.fill();
        // Fairing seam line
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -s2H/2);
        ctx.lineTo(0, -s2H/2 - s2W * 1.5);
        ctx.stroke();
      } else {
        // Exposed payload
        ctx.fillStyle = '#888';
        ctx.fillRect(-s2W/3, -s2H/2 - s2W * 0.6, s2W * 0.66, s2W * 0.6);
      }

      ctx.restore();

      // Small label
      ctx.fillStyle = 'rgba(79, 195, 247, 0.7)';
      ctx.font = '9px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText('S2', drawX + s2W + 4, drawY);
    }
  }

  function drawStage2Trajectory(view){
    const s2 = state.stage2;
    if (s2.trajectory.length < 2) return;
    const { worldToScreen } = view;
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let i = 0; i < s2.trajectory.length; i++){
      const p = worldToScreen(s2.trajectory[i].x, s2.trajectory[i].y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function render(){
    const view = getView();
    drawSky(view);
    drawGround(view);
    drawTrajectory(view);
    drawStage2Trajectory(view);
    drawRocket(view);
    drawStage2(view);
    drawMinimap();
  }

  // ===== HUD update =====
  function updateHUD(){
    document.getElementById('missionTime').textContent = F.formatTime(state.t);

    const phaseEl = document.getElementById('phaseBadge');
    const phaseLabels = {
      'pre-launch': 'Pre-launch', 'ascent': 'Ascent',
      'boostback': 'Boostback', 'coast': 'Coast',
      'entry': 'Entry burn', 'landing': 'Landing',
      'success': 'Touchdown', 'crashed': 'Lost vehicle'
    };
    phaseEl.textContent = phaseLabels[state.phase] || state.phase;
    phaseEl.className = 'phase-badge ' + state.phase;

    document.getElementById('altVal').textContent = formatAlt(state.y);
    const speed = Math.hypot(state.vx, state.vy);
    document.getElementById('velVal').textContent = speed.toFixed(0) + ' m/s';
    document.getElementById('downrangeVal').textContent = formatAlt(Math.abs(state.x));
    document.getElementById('throttleVal').textContent = (state.throttle * 100).toFixed(0) + '%';
    document.getElementById('fuelVal').textContent = (state.fuelMass / FUEL_MASS_FULL * 100).toFixed(0) + '%';

    document.getElementById('pitchVal').textContent = (state.pitch * 180/Math.PI).toFixed(0) + '°';
    document.getElementById('massVal').textContent = (state.mass / 1000).toFixed(1) + ' t';

    const thrust = state.throttle * state.enginesActive * T_PER_ENGINE / 1000;
    document.getElementById('thrustVal').textContent = thrust.toFixed(0) + ' kN';

    const rho = F.airDensity(state.y);
    const relSpeed = Math.hypot(state.vx - state.wind, state.vy);
    const cd = 0.7;
    const drag = 0.5 * rho * relSpeed * relSpeed * cd * AREA;
    document.getElementById('dragVal').textContent = formatForce(drag);

    document.getElementById('machVal').textContent = (speed / C_SOUND).toFixed(2);
    const q = 0.5 * rho * relSpeed * relSpeed;
    const qEl = document.getElementById('qVal');
    qEl.textContent = formatPressure(q);
    qEl.className = 'val' + (q > 30000 ? ' warn' : '');

    document.getElementById('vyVal').textContent = state.vy.toFixed(1) + ' m/s';
    document.getElementById('vxVal').textContent = state.vx.toFixed(1) + ' m/s';

    // Stage 2 panel
    const s2 = state.stage2;
    const statusLabels = {
      'attached': 'Attached',
      'seco1': 'Burning',
      'coast': 'Coasting',
      'orbit': 'In orbit',
      'failed': 'Failed'
    };
    const s2Status = document.getElementById('s2Status');
    s2Status.textContent = s2.active ? statusLabels[s2.phase] || s2.phase : 'Attached';
    s2Status.className = 'val ' + (s2.phase === 'orbit' ? 'good' :
                                     s2.phase === 'seco1' ? 'warn' :
                                     s2.phase === 'failed' ? 'bad' : '');
    const s2Engine = document.getElementById('s2Engine');
    s2Engine.textContent = s2.engineOn ? 'Firing' : 'Off';
    s2Engine.className = 'val ' + (s2.engineOn ? 'warn' : '');

    if (s2.active){
      document.getElementById('s2Alt').textContent = (s2.y / 1000).toFixed(1) + ' km';
      document.getElementById('s2Vel').textContent =
        (Math.hypot(s2.vx, s2.vy) / 1000).toFixed(2) + ' km/s';
      document.getElementById('s2Fuel').textContent =
        Math.max(0, s2.fuelMass / S2_FUEL_MASS_FULL * 100).toFixed(0) + '%';
      // Orbit progress: ratio of (altitude × velocity) toward target
      const altProgress = Math.min(1, s2.y / TARGET_ORBIT_ALT);
      const velProgress = Math.min(1, s2.vx / TARGET_ORBIT_VEL);
      const overall = (altProgress * 0.4 + velProgress * 0.6) * 100;
      const s2Orbit = document.getElementById('s2Orbit');
      s2Orbit.textContent = overall.toFixed(0) + '%';
      s2Orbit.className = 'val ' + (overall >= 99 ? 'good' : '');
    } else {
      document.getElementById('s2Alt').textContent = '— km';
      document.getElementById('s2Vel').textContent = '— km/s';
      document.getElementById('s2Fuel').textContent = '100%';
      document.getElementById('s2Orbit').textContent = '0%';
    }

    // ===== Debug panel =====
    document.getElementById('dbgPhase').textContent = state.phase;
    document.getElementById('dbgDt').textContent = (dbg.dt * 1000).toFixed(1) + 'ms';
    const engEl = document.getElementById('dbgEng');
    engEl.textContent = dbg.enginesCmd + ' (active ' + state.enginesActive + ')';
    engEl.className = 'val ' + (state.enginesActive !== dbg.enginesCmd ? 'warn' : '');
    const thrEl = document.getElementById('dbgThr');
    thrEl.textContent = (dbg.throttleCmdRaw * 100).toFixed(0) + '%';
    thrEl.className = 'val ' + (dbg.throttleCmdRaw > 0.95 ? 'warn' : '');

    // Landing prediction
    if (state.phase === 'entry' || state.phase === 'landing' || state.phase === 'coast'){
      document.getElementById('dbgSuiAlt').textContent = (dbg.suicideBurnAlt/1000).toFixed(2) + ' km';
      const decelEl = document.getElementById('dbgDecel');
      decelEl.textContent = dbg.requiredDecel.toFixed(1) + ' m/s²';
      const maxDecelEl = document.getElementById('dbgMaxDecel');
      maxDecelEl.textContent = dbg.maxDecel.toFixed(1) + ' m/s²';
      maxDecelEl.className = 'val ' + (dbg.requiredDecel > dbg.maxDecel ? 'bad' : 'good');
      const twrEl = document.getElementById('dbgTWR');
      twrEl.textContent = dbg.twr.toFixed(2);
      twrEl.className = 'val ' + (dbg.twr < 1.2 ? 'bad' : (dbg.twr < 2 ? 'warn' : 'good'));
      document.getElementById('dbgTTG').textContent =
        dbg.timeToGround < 100 ? dbg.timeToGround.toFixed(1) + 's' : '—';
      const impactEl = document.getElementById('dbgImpact');
      impactEl.textContent = dbg.predictedImpact.toFixed(0) + ' m/s';
      impactEl.className = 'val ' + (dbg.predictedImpact > 50 ? 'bad' : (dbg.predictedImpact > 10 ? 'warn' : 'good'));
    } else {
      document.getElementById('dbgSuiAlt').textContent = '—';
      document.getElementById('dbgDecel').textContent = '—';
      document.getElementById('dbgMaxDecel').textContent = '—';
      document.getElementById('dbgTWR').textContent = '—';
      document.getElementById('dbgTTG').textContent = '—';
      document.getElementById('dbgImpact').textContent = '—';
    }

    // Stage 2 ΔV budget
    if (s2.active && s2.phase === 'seco1'){
      const dvAvail = dbg.s2dvAvail;
      const dvNeed = dbg.s2dvNeed;
      const availEl = document.getElementById('dbgS2dv');
      availEl.textContent = dvAvail.toFixed(0) + ' m/s';
      availEl.className = 'val ' + (dvAvail < dvNeed ? 'bad' : (dvAvail < dvNeed * 1.2 ? 'warn' : 'good'));
      const needEl = document.getElementById('dbgS2need');
      needEl.textContent = dvNeed.toFixed(0) + ' m/s';
      needEl.className = 'val ' + (dvAvail < dvNeed ? 'bad' : '');
      document.getElementById('dbgS2pitch').textContent = dbg.s2pitchTarget.toFixed(0) + '°';
      document.getElementById('dbgS2burn').textContent = dbg.s2burnTime.toFixed(0) + 's';
    } else if (s2.phase === 'orbit'){
      document.getElementById('dbgS2dv').textContent = 'orbit ✓';
      document.getElementById('dbgS2need').textContent = '0';
      document.getElementById('dbgS2pitch').textContent = '—';
      document.getElementById('dbgS2burn').textContent = '—';
    } else {
      document.getElementById('dbgS2dv').textContent = '—';
      document.getElementById('dbgS2need').textContent = '—';
      document.getElementById('dbgS2pitch').textContent = '—';
      document.getElementById('dbgS2burn').textContent = '—';
    }
  }

  function formatAlt(m){
    if (Math.abs(m) >= 1000) return (m/1000).toFixed(2) + ' km';
    return m.toFixed(0) + ' m';
  }
  function formatForce(n){
    if (n >= 1000) return (n/1000).toFixed(1) + ' kN';
    return n.toFixed(0) + ' N';
  }
  function formatPressure(p){
    if (p >= 1000) return (p/1000).toFixed(1) + ' kPa';
    return p.toFixed(0) + ' Pa';
  }

  F.render = render;
  F.updateHUD = updateHUD;
  F.resizeCanvas = resizeCanvas;
})();
