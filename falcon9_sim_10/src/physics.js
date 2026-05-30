(function(){
  const F = (window.F9 = window.F9 || {});
  const { state, dbg, PARAMS, G, R_EARTH, RHO_0, H_SCALE, C_SOUND, DRY_MASS, FUEL_MASS_FULL, T_PER_ENGINE, T_VAC_PER_ENGINE, ISP_SL, ISP_VAC, N_ENGINES_ASCENT, N_ENGINES_BOOSTBACK, N_ENGINES_ENTRY, N_ENGINES_LANDING, DIAMETER, HEIGHT, AREA, CD_FORWARD, CD_REVERSE, MIN_THROTTLE, MAX_THROTTLE, S2_DRY_MASS, S2_FUEL_MASS_FULL, S2_THRUST_VAC, S2_ISP_VAC, S2_DIAMETER, S2_HEIGHT, S2_AREA, TARGET_ORBIT_ALT, TARGET_ORBIT_VEL, FAIRING_MASS } = F;

  function determinePhase(){
    if (state.phase === 'pre-launch') return 'pre-launch';
    if (state.crashed) return 'crashed';
    if (state.landed) return 'success';

    const currentRank = F.phaseRank(state.phase);

    // Compute what phase we *should* be in based on current state
    let target = state.phase;

    // MECO trigger: time-based OR fuel-based (whichever comes first)
    // Real Falcon 9 reserves ~25% propellant for boostback + entry + landing
    const fuelReserveRatio = state.fuelMass / FUEL_MASS_FULL;
    const mecoTriggered = state.t >= 150 || fuelReserveRatio <= PARAMS.mecoFuelRatio || state.mecoTime !== null;

    if (!mecoTriggered) {
      target = 'ascent';
    } else {
      // Record MECO time once
      if (state.mecoTime === null) state.mecoTime = state.t;
      const tSinceMeco = state.t - state.mecoTime;

      if (tSinceMeco < PARAMS.boostbackDuration) {
        target = 'boostback';
      } else {
        // Past boostback. Are we still going up or near apex?
        if (state.y > 30000 && state.vy > -50) target = 'coast';
        else {
          // Descending. Decide entry vs landing based on suicide burn altitude.
          const g = F.gravity(state.y);
          const maxThrust = 3 * T_PER_ENGINE;
          const aNet = Math.max(1, (maxThrust / state.mass) - g);
          const suicideBurnAlt = (state.vy * state.vy) / (2 * aNet) * PARAMS.suicideBurnMargin;
          dbg.suicideBurnAlt = suicideBurnAlt;

          if (state.y < suicideBurnAlt * 1.2 || state.y < 1500){
            target = 'landing';
          } else if (state.y < 30000){
            target = 'entry';
          } else {
            target = 'coast';
          }
        }
      }
    }

    // STRICT: never go backwards. Only advance to >= current phase.
    if (F.phaseRank(target) < currentRank) return state.phase;
    return target;
  }

  // ===== Guidance per phase =====
  function guidance(dt){
    const phase = state.phase;
    let targetPitch = state.pitch;
    let throttleCmd = 0;
    let nEngines = 0;

    if (phase === 'ascent'){
      nEngines = N_ENGINES_ASCENT;
      throttleCmd = 1.0;
      // Real Falcon 9 ascent profile (compressed to 150s instead of ~160s)
      // Vertical liftoff first ~10s, then gravity turn to ~25° by MECO
      if (state.t < PARAMS.ascentVerticalTime){
        targetPitch = Math.PI/2; // straight up
      } else {
        // From 90° at t=verticalTime to (90-maxTilt)° over time
        const tPitch = state.t - PARAMS.ascentVerticalTime;
        const targetDeg = 90 - Math.min(PARAMS.ascentMaxTilt, tPitch * PARAMS.ascentPitchRate);
        targetPitch = targetDeg * Math.PI / 180;
      }
      // Throttle down during max-Q (around t=70s)
      const q = 0.5 * F.airDensity(state.y) * (state.vx**2 + state.vy**2);
      if (q > 35000) throttleCmd = PARAMS.maxQThrottle;
    }
    else if (phase === 'boostback'){
      nEngines = N_ENGINES_BOOSTBACK;
      // Goal: push booster back toward targetX so it lands there
      // Predict where we'll land based on current trajectory (ballistic estimate)
      // Time to apex + time to fall = total airtime
      const g = F.gravity(state.y);
      const timeToApex = Math.max(0, state.vy / g);
      const apexHeight = state.y + state.vy * timeToApex - 0.5 * g * timeToApex * timeToApex;
      const timeToFall = Math.sqrt(2 * Math.max(1, apexHeight) / g);
      const totalAirtime = timeToApex + timeToFall;
      // Predicted landing x (ignoring entry/landing burn slowdown)
      const predictedX = state.x + state.vx * totalAirtime;
      // We want predictedX ≈ targetX, so we need to change vx
      const xError = state.targetX - predictedX;
      const desiredDeltaVx = xError / Math.max(20, totalAirtime);

      // Total horizontal correction needed
      const correctionVx = desiredDeltaVx;

      // Point engine to push us in the right direction
      // If we need to slow down (correctionVx < 0 when moving right): point retrograde
      // Rocket nose points in thrust direction
      if (Math.abs(correctionVx) > 5){
        // Pitch the rocket so thrust component opposes current vx error
        const tiltMag = Math.min(Math.PI/2.5, Math.abs(correctionVx) / PARAMS.boostbackTiltGain);
        if (correctionVx < 0){
          // Need to push left (decelerate rightward motion)
          targetPitch = Math.PI/2 + tiltMag;
        } else {
          targetPitch = Math.PI/2 - tiltMag;
        }
        throttleCmd = Math.min(1, Math.abs(correctionVx) / PARAMS.boostbackThrottleK);
      } else {
        throttleCmd = 0;
        targetPitch = Math.PI/2; // vertical
      }

      // Don't drain too much fuel - reserve for entry + landing
      if (state.fuelMass < FUEL_MASS_FULL * PARAMS.boostbackFuelReserve) throttleCmd = 0;
    }
    else if (phase === 'coast'){
      nEngines = 0;
      throttleCmd = 0;
      // During coast: prepare orientation for entry burn
      // We want engines pointing retrograde (against velocity) before entry
      if (state.vy < 0){
        // Falling - point engines into airflow (engine end faces velocity direction)
        // pitch is direction nose points; we want nose opposite to velocity
        const vAngle = Math.atan2(state.vy, state.vx);
        // Nose opposite to velocity vector
        targetPitch = vAngle + Math.PI;
        // Normalize
        while (targetPitch > Math.PI) targetPitch -= 2*Math.PI;
        while (targetPitch < -Math.PI) targetPitch += 2*Math.PI;
      } else {
        targetPitch = Math.PI/2; // still going up, stay vertical-ish
      }
    }
    else if (phase === 'entry'){
      nEngines = N_ENGINES_ENTRY;
      // Point retrograde - engines opposing velocity
      const speed = Math.hypot(state.vx, state.vy);
      const vAngle = Math.atan2(state.vy, state.vx);
      let retrograde = vAngle + Math.PI;

      // Horizontal correction bias
      const xError = state.targetX - state.x;
      const timeRemaining = Math.max(2, -state.y / Math.min(-10, state.vy));
      const requiredVx = xError / timeRemaining;
      const vxError = requiredVx - state.vx;
      const tilt = Math.max(-0.25, Math.min(0.25, vxError * 0.005));
      targetPitch = retrograde + tilt;

      // Entry burn: kill enough velocity that landing burn can finish the job
      // Goal: reduce vertical speed to ~250 m/s by altitude ~3km
      // (Real Falcon 9 reaches ~300 m/s after entry burn at ~6km)
      const targetVyAtEnd = -200; // m/s when entry burn should end
      const vyError = targetVyAtEnd - state.vy; // positive if we need to decelerate more
      // Strong throttle while we still need to slow down significantly
      if (state.vy < targetVyAtEnd){
        throttleCmd = Math.min(1.0, 0.6 + Math.abs(vyError) / 200);
      } else {
        throttleCmd = 0;
      }
    }
    else if (phase === 'landing'){
      const g = F.gravity(state.y);
      const vy = state.vy;
      const h = Math.max(1, state.y);

      // Required deceleration
      const requiredDecel = vy < 0 ? (vy * vy) / (2 * h) : 0;
      const neededAccel = requiredDecel + g;
      const neededThrust = neededAccel * state.mass;

      // Debug snapshot
      dbg.requiredDecel = requiredDecel;
      dbg.maxDecel = (3 * T_PER_ENGINE * MAX_THROTTLE) / state.mass - g;
      dbg.twr = (3 * T_PER_ENGINE * MAX_THROTTLE) / (state.mass * g);
      // Time to ground at current vy (assuming no thrust)
      dbg.timeToGround = vy < -1 ? h / (-vy) : 999;
      // Predict impact speed if we did nothing: v² = vy² + 2gh
      dbg.predictedImpact = Math.sqrt(vy*vy + 2*g*h);

      // Engine count decision — PREFER 3 ENGINES if descending fast
      // 1 engine only makes sense for very low speed final hover
      const maxThrustOneEng = T_PER_ENGINE * MAX_THROTTLE;

      let useThree;
      if (Math.abs(vy) < PARAMS.threeEngThreshold && h < 100){
        // Final hover-and-touchdown — 1 engine is enough
        useThree = neededThrust > maxThrustOneEng * 0.8;
      } else {
        // Coming in hot — use 3 engines for authority + margin
        useThree = true;
      }

      nEngines = useThree ? 3 : N_ENGINES_LANDING;

      const maxThrustForN = nEngines * T_PER_ENGINE;
      throttleCmd = neededThrust / maxThrustForN;
      throttleCmd = Math.max(0, Math.min(1, throttleCmd));

      // Safety margin: always at least 5% over what's needed (anticipate drag changes)
      if (throttleCmd > 0.05 && throttleCmd < 0.95){
        throttleCmd = Math.min(1, throttleCmd + 0.05);
      }

      // Min throttle handling
      if (throttleCmd > 0 && throttleCmd < MIN_THROTTLE){
        // Decide: throttle up to min, or coast briefly
        // Coast only if we're SAFELY above suicide-burn altitude
        const a_at_min = (nEngines * T_PER_ENGINE * MIN_THROTTLE) / state.mass - g;
        const safeAlt = (vy * vy) / (2 * Math.max(1, a_at_min)) * 1.3;
        if (h > safeAlt && Math.abs(vy) < 80){
          throttleCmd = 0;
          nEngines = 0;
        } else {
          throttleCmd = MIN_THROTTLE;
        }
      }

      // ----- Horizontal PID via tilt -----
      const xError = state.targetX - state.x;
      const desiredVx = Math.max(-PARAMS.landingDesiredVx, Math.min(PARAMS.landingDesiredVx, xError * 0.4));
      const vxError = desiredVx - state.vx;
      const tiltAngle = Math.max(-0.35, Math.min(0.35, vxError * PARAMS.landingPidGain));
      targetPitch = Math.PI/2 - tiltAngle;

      // Final approach (< 50m): be very gentle on tilt, focus on stopping vy
      if (h < 50){
        targetPitch = Math.PI/2 - tiltAngle * 0.3;
        // If still descending fast, force max thrust
        if (vy < -5){
          throttleCmd = Math.max(throttleCmd, 0.7);
          if (nEngines === 0) nEngines = N_ENGINES_LANDING;
        }
      }

      // Touchdown detection — more lenient (we are simulating after all)
      if (state.y <= 1 && Math.abs(vy) < 8){
        state.landed = true;
        state.y = 0;
        state.vy = 0;
        state.vx = 0;
        throttleCmd = 0;
        nEngines = 0;
        F.logEvent(`Landing successful · ${Math.abs(vy).toFixed(1)} m/s`, 'good');
      }
    }

    // ===== Apply pitch dynamics (rocket can't instantly rotate) =====
    const pitchError = targetPitch - state.pitch;
    // Normalize to [-π, π]
    let pe = pitchError;
    while (pe > Math.PI) pe -= 2*Math.PI;
    while (pe < -Math.PI) pe += 2*Math.PI;

    const maxPitchRate = phase === 'ascent' ? 0.08 : 0.8; // rad/s
    state.pitchRate = Math.max(-maxPitchRate, Math.min(maxPitchRate, pe * 2));
    state.pitch += state.pitchRate * dt;

    state.throttle = throttleCmd;
    state.enginesActive = throttleCmd > 0.01 ? nEngines : 0;
    dbg.throttleCmdRaw = throttleCmd;
    dbg.enginesCmd = nEngines;
  }

  // ===== Stage 2 physics (only active after separation) =====
  function stepStage2(dt){
    const s2 = state.stage2;
    if (!s2.active) return;
    if (s2.phase === 'orbit') {
      // Once in orbit, keep coasting on circular trajectory (simplified)
      s2.x += s2.vx * dt;
      s2.y += s2.vy * dt;
      // Approximate circular motion: rotate velocity vector slowly toward tangent
      // (for visualization only)
      return;
    }

    // Handle SES-1 ignition delay (simulation-time gated, not setTimeout)
    if (s2.ignitionDelay !== undefined && s2.ignitionDelay > 0){
      s2.ignitionDelay -= dt;
      if (s2.ignitionDelay <= 0 && s2.phase === 'seco1'){
        s2.engineOn = true;
        s2.throttle = 1.0;
        s2.ignitionDelay = undefined;
        F.logEvent('SES-1 · Stage 2 ignition', 'good');
      }
    }

    // Fairing jettison around 200s mission time / above 100km
    if (s2.hasFairing && s2.y > 110000){
      s2.hasFairing = false;
      s2.mass -= FAIRING_MASS;
      state.fairingJettisoned = true;
      F.logEvent('Fairing jettisoned', 'good');
    }

    const g = F.gravity(s2.y);
    const rho = F.airDensity(s2.y);

    // ----- Guidance -----
    // Smarter pitch program: prioritize gaining altitude first, then accelerate horizontally
    // (real Falcon 9 uses closed-loop guidance like PEG; this is simpler heuristic)
    if (s2.phase === 'seco1'){
      const speed = Math.hypot(s2.vx, s2.vy);
      const horizSpeed = s2.vx;

      // Pitch program based on multiple factors:
      // - If we're too low, pitch up to gain altitude
      // - If we're high enough but slow horizontally, pitch down to accelerate
      // - Keep some vertical velocity until near target alt
      const altFrac = s2.y / TARGET_ORBIT_ALT;
      const velFrac = horizSpeed / TARGET_ORBIT_VEL;

      let targetPitchDeg;
      if (s2.y < 50000){
        // Low altitude: stay relatively steep to climb out of atmosphere
        targetPitchDeg = PARAMS.s2PitchLow;
      } else if (s2.y < 120000){
        // Mid altitude: gradual pitch over
        const t = (s2.y - 50000) / 70000;
        targetPitchDeg = PARAMS.s2PitchLow * (1 - t) + PARAMS.s2PitchMid * t;
      } else if (s2.y < TARGET_ORBIT_ALT){
        // High altitude approaching target: nearly horizontal
        const t = (s2.y - 120000) / (TARGET_ORBIT_ALT - 120000);
        targetPitchDeg = PARAMS.s2PitchMid * (1 - t) + PARAMS.s2PitchHigh * t;
      } else {
        // At or above target altitude: horizontal to circularize
        targetPitchDeg = s2.vy > 50 ? -5 : 2; // slight negative if rising too much
      }

      // Loft correction: if vy is dropping too fast, pitch up more
      if (s2.vy < PARAMS.s2LoftVyTrigger && s2.y < TARGET_ORBIT_ALT * 0.9){
        targetPitchDeg = Math.max(targetPitchDeg, PARAMS.s2LoftMinPitch);
      }

      const targetPitch = targetPitchDeg * Math.PI / 180;
      s2.pitch += (targetPitch - s2.pitch) * Math.min(1, dt * 1.0);

      // Debug: compute ΔV remaining (Tsiolkovsky) and ΔV still needed
      const mTotal = S2_DRY_MASS + s2.fuelMass + (s2.hasFairing ? FAIRING_MASS : 0) + state.payload;
      const mDry = S2_DRY_MASS + (s2.hasFairing ? FAIRING_MASS : 0) + state.payload;
      const dvAvail = s2.fuelMass > 0 ? S2_ISP_VAC * G * Math.log(mTotal / mDry) : 0;
      // ΔV still needed: target velocity - current horiz, plus gravity loss estimate
      const dvVelGap = Math.max(0, TARGET_ORBIT_VEL - horizSpeed);
      const dvAltGap = s2.y < TARGET_ORBIT_ALT ? Math.sqrt(2 * 9.81 * (TARGET_ORBIT_ALT - s2.y)) * 0.6 : 0;
      const dvNeeded = dvVelGap + dvAltGap;
      // Burn time at full throttle
      const massFlow = S2_THRUST_VAC / (S2_ISP_VAC * G);
      const burnTime = s2.fuelMass > 0 ? s2.fuelMass / massFlow : 0;
      dbg.s2dvAvail = dvAvail;
      dbg.s2dvNeed = dvNeeded;
      dbg.s2pitchTarget = targetPitchDeg;
      dbg.s2burnTime = burnTime;

      // Throttle: full until BOTH alt and vel targets near met
      const orbitReached = (s2.y >= TARGET_ORBIT_ALT * 0.95) &&
                          (horizSpeed >= TARGET_ORBIT_VEL);
      if (!orbitReached && s2.fuelMass > 0){
        s2.throttle = 1.0;
        s2.engineOn = true;
      } else if (orbitReached) {
        s2.throttle = 0;
        s2.engineOn = false;
        s2.phase = 'orbit';
        s2.orbitalVelocity = horizSpeed;
        F.logEvent(`✓ Orbit insertion · ${(horizSpeed/1000).toFixed(2)} km/s @ ${(s2.y/1000).toFixed(0)} km`, 'good');
      }
    }

    // ----- Forces -----
    let thrustMag = 0;
    if (s2.engineOn && s2.fuelMass > 0){
      thrustMag = S2_THRUST_VAC * s2.throttle;
      const massFlow = thrustMag / (S2_ISP_VAC * G);
      const dm = massFlow * dt;
      if (dm < s2.fuelMass){
        s2.fuelMass -= dm;
      } else {
        s2.fuelMass = 0;
        thrustMag = 0;
        s2.engineOn = false;
        if (s2.phase === 'seco1'){
          F.logEvent('Stage 2 fuel depleted before orbit', 'bad');
          s2.phase = 'failed';
        }
      }
      s2.mass = S2_DRY_MASS + s2.fuelMass + (s2.hasFairing ? FAIRING_MASS : 0) + state.payload;
    }

    const thrustX = thrustMag * Math.cos(s2.pitch);
    const thrustY = thrustMag * Math.sin(s2.pitch);

    // Drag (negligible at high altitude but compute anyway)
    const speed = Math.hypot(s2.vx, s2.vy);
    const dragForce = 0.5 * rho * speed * speed * 0.3 * S2_AREA;
    const dragX = speed > 0.1 ? -dragForce * s2.vx / speed : 0;
    const dragY = speed > 0.1 ? -dragForce * s2.vy / speed : 0;

    const ax = (thrustX + dragX) / s2.mass;
    const ay = (thrustY + dragY) / s2.mass - g;

    s2.vx += ax * dt;
    s2.vy += ay * dt;
    s2.x += s2.vx * dt;
    s2.y += s2.vy * dt;

    // Log trajectory
    if (s2.trajectory.length === 0 || state.t - s2.trajectory[s2.trajectory.length-1].t > 0.5){
      s2.trajectory.push({ t: state.t, x: s2.x, y: s2.y });
    }
  }

  function performSeparation(){
    const s2 = state.stage2;
    s2.active = true;
    s2.x = state.x;
    s2.y = state.y;
    s2.vx = state.vx;
    s2.vy = state.vy;
    s2.pitch = state.pitch;
    s2.phase = 'seco1';
    s2.engineOn = false; // brief delay before ignition (handled in stepStage2)
    s2.ignitionDelay = 0.8; // simulation-time seconds until SES-1 fires
    state.separated = true;
    const speed = Math.hypot(state.vx, state.vy);
    F.logEvent(`MECO · sep @ ${(state.y/1000).toFixed(0)}km, ${speed.toFixed(0)}m/s`, 'warn');
  }


  function step(dt){
    if (state.crashed || state.landed){
      state.throttle = 0;
      state.enginesActive = 0;
      stepStage2(dt);  // S2 keeps going even after S1 lands/crashes
      state.t += dt;
      return;
    }
    if (state.phase === 'pre-launch') return;

    guidance(dt);

    const g = F.gravity(state.y);
    const rho = F.airDensity(state.y);
    const speed = Math.hypot(state.vx, state.vy);

    // Thrust
    let thrustMag = 0;
    if (state.fuelMass > 0 && state.enginesActive > 0){
      const isp = ISP_SL + (ISP_VAC - ISP_SL) * Math.min(1, state.y / 80000);
      const tPerEng = T_PER_ENGINE + (T_VAC_PER_ENGINE - T_PER_ENGINE) * Math.min(1, state.y / 80000);
      thrustMag = state.enginesActive * tPerEng * state.throttle;

      const massFlow = thrustMag / (isp * G);
      const dm = massFlow * dt;
      if (dm < state.fuelMass){
        state.fuelMass -= dm;
      } else {
        state.fuelMass = 0;
        thrustMag = 0;
        if (state.phase !== 'landing'){
          F.logEvent('Fuel depleted', 'bad');
        }
      }
      state.mass = DRY_MASS + state.fuelMass + state.payload;
    }

    // Thrust direction = rocket pointing direction (pitch)
    const thrustX = thrustMag * Math.cos(state.pitch);
    const thrustY = thrustMag * Math.sin(state.pitch);

    // Drag (opposite to velocity, with wind)
    const relVx = state.vx - state.wind;
    const relVy = state.vy;
    const relSpeed = Math.hypot(relVx, relVy);
    // Drag coefficient depends on orientation vs velocity
    // If engine points "into" velocity, lower Cd (forward); else higher (sideways/reverse)
    const vAngle = Math.atan2(relVy, relVx);
    const angleOff = Math.abs(((state.pitch - vAngle + Math.PI) % (2*Math.PI)) - Math.PI);
    const cd = CD_FORWARD + (CD_REVERSE - CD_FORWARD) * Math.abs(Math.sin(angleOff));
    const dragForce = 0.5 * rho * relSpeed * relSpeed * cd * AREA;
    const dragX = relSpeed > 0.1 ? -dragForce * relVx / relSpeed : 0;
    const dragY = relSpeed > 0.1 ? -dragForce * relVy / relSpeed : 0;

    const q = 0.5 * rho * relSpeed * relSpeed;
    state.maxQ = Math.max(state.maxQ, q);

    // Acceleration
    const ax = (thrustX + dragX) / state.mass;
    const ay = (thrustY + dragY) / state.mass - g;

    // Integrate
    state.vx += ax * dt;
    state.vy += ay * dt;
    state.x += state.vx * dt;
    state.y += state.vy * dt;

    state.maxAlt = Math.max(state.maxAlt, state.y);
    state.maxV = Math.max(state.maxV, Math.hypot(state.vx, state.vy));

    // Trajectory log (every ~0.5s)
    if (state.trajectory.length === 0 || state.t - state.trajectory[state.trajectory.length-1].t > 0.5){
      state.trajectory.push({ t: state.t, x: state.x, y: state.y });
    }

    // Update phase
    const newPhase = determinePhase();
    if (newPhase !== state.phase){
      const oldPhase = state.phase;
      state.phase = newPhase;
      F.announcePhase(oldPhase, newPhase);
      // Stage separation at ascent → boostback transition
      if (oldPhase === 'ascent' && newPhase === 'boostback' && !state.separated){
        performSeparation();
      }
    }

    // Step stage 2 physics every step
    stepStage2(dt);

    // Crash check
    if (state.y <= 0 && !state.landed){
      const impactSpeed = Math.hypot(state.vx, state.vy);
      if (impactSpeed > 5){
        state.crashed = true;
        state.phase = 'crashed';
        F.logEvent(`Lost vehicle (${impactSpeed.toFixed(0)} m/s impact)`, 'bad');
      }
    }

    state.t += dt;
  }

  F.step = step;
})();
