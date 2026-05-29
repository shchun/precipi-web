// simulator.jsx - multi-passenger elevator state machine + dispatcher
// Each elevator can carry multiple passengers and stop at multiple floors per trip
// using a simple LOOK / SCAN algorithm.

(function () {
  const FLOORS = 10;
  const ELEVATORS = 3;
  const CAPACITY = 4;

  // Per-floor travel time (ms) at speed 1
  const TRAVEL_MS = 900;
  const DOOR_MS = 260;
  const DWELL_MS = 700;           // after all destinations are set
  const AWAIT_TIMEOUT_MS = 9000;  // safety: auto-pick destinations after this

  // Elevator state machine:
  //   idle       parked, no targets, no passengers
  //   moving     in transit toward next target floor
  //   opening    doors animating open
  //   open       doors open: drop-off + board; waits for destinations
  //   closing    doors animating shut

  function makeElevator(id, startFloor) {
    return {
      id,
      position: startFloor,        // float in [1, FLOORS]
      floor: startFloor,
      state: "idle",
      stateT: 0,
      doorProgress: 0,             // 0 closed → 1 open
      direction: 0,                // -1 / 0 / +1
      targets: new Set(),          // floor numbers we will stop at (dest + pickup)
      passengers: [],              // {id, fromFloor, toFloor (null=unchosen), dir}
    };
  }

  function makeSimulator(onLog) {
    let nextPersonId = 1;
    let nextCallId = 1;

    const state = {
      elevators: [makeElevator(0, 1), makeElevator(1, 1), makeElevator(2, 1)],
      calls: [],   // {id, personId, floor, dir, assignedTo, placedAt}
      stats: { served: 0, pending: 0, totalWaitMs: 0, servedSamples: 0 },
      time: 0,
      speed: 1,
      log: [],
    };

    function fmtFloor(f) {
      return f === 1 ? "L" : "F" + f;
    }

    function pushLog(kind, text) {
      const entry = {
        t: state.time,
        kind,
        text,
        id: state.time + "-" + Math.random().toString(36).slice(2, 6),
      };
      state.log.unshift(entry);
      if (state.log.length > 40) state.log.length = 40;
      if (onLog) onLog(entry);
    }

    // ---------- actions ----------

    function callElevator(floor, dir, dest) {
      // Several people can wait at the same floor going the same way — each is a
      // distinct passenger so a car can fill to capacity. Cap the queue per
      // floor+dir so auto-traffic can't pile up without bound.
      const waitingHere = state.calls.filter(
        (c) => c.floor === floor && c.dir === dir && !c.boarded
      );
      if (waitingHere.length >= CAPACITY) return;
      const call = {
        id: nextCallId++,
        personId: nextPersonId++,
        floor,
        dir,
        // Optional pre-chosen destination (set by traffic modes). When present the
        // passenger boards already knowing their target floor — no manual pick.
        dest: dest != null && dest !== floor ? dest : null,
        assignedTo: null,
        placedAt: state.time,
      };
      state.calls.push(call);
      pushLog("call", `Hall call · ${fmtFloor(floor)} ${dir === 1 ? "▲" : "▼"}`);
      tryDispatch();
    }

    // Assign a destination to the next un-chosen passenger in this elevator
    function chooseDestination(elevatorId, targetFloor) {
      const e = state.elevators.find((x) => x.id === elevatorId);
      if (!e || e.state !== "open") return;
      const p = e.passengers.find((p) => p.toFloor == null);
      if (!p) return;
      if (targetFloor === e.floor) return;
      p.toFloor = targetFloor;
      e.targets.add(targetFloor);
      pushLog("dropoff", `Car ${e.id + 1} → ${fmtFloor(targetFloor)}`);
    }

    function setSpeed(v) {
      state.speed = v;
    }

    // ---------- dispatch ----------

    function pickElevator(call) {
      let best = null;
      let bestCost = Infinity;
      for (const e of state.elevators) {
        let cost = Infinity;
        const isIdle = e.passengers.length === 0 && e.targets.size === 0;
        if (isIdle) {
          cost = Math.abs(e.position - call.floor);
        } else if (
          e.passengers.length < CAPACITY &&
          ((e.direction === 1 && call.dir === 1 && e.position <= call.floor) ||
            (e.direction === -1 && call.dir === -1 && e.position >= call.floor))
        ) {
          // moving in matching direction & still ahead → cheap swing-by
          cost = Math.abs(e.position - call.floor) + 0.5;
        }
        if (cost < bestCost) {
          bestCost = cost;
          best = e;
        }
      }
      return best;
    }

    function tryDispatch() {
      // A floor+dir is "covered" once any car is assigned/heading there — one car
      // serves the whole group, so we don't send several cars to the same waiters.
      const covered = new Set();
      for (const c of state.calls) {
        if (c.assignedTo != null) covered.add(c.floor + ":" + c.dir);
      }
      for (const call of state.calls) {
        if (call.assignedTo != null) continue;
        const key = call.floor + ":" + call.dir;
        if (covered.has(key)) continue;
        const best = pickElevator(call);
        if (!best) continue;
        call.assignedTo = best.id;
        covered.add(key);
        best.targets.add(call.floor);
        // wake an idle car
        if (best.state === "idle") {
          if (call.floor === best.floor) {
            best.state = "opening";
            best.stateT = 0;
            best.direction = call.dir;
          } else {
            best.direction = call.floor > best.position ? 1 : -1;
            best.state = "moving";
            best.stateT = 0;
          }
        }
      }
    }

    // Opportunistic pickup: while moving, snag any unassigned call ahead of us
    // that's going the same direction and has remaining capacity.
    function opportunisticPickup(e) {
      if (e.passengers.length >= CAPACITY) return;
      for (const call of state.calls) {
        if (call.assignedTo != null) continue;
        if (call.dir !== e.direction) continue;
        const ahead =
          e.direction === 1 ? call.floor >= Math.ceil(e.position) :
          e.direction === -1 ? call.floor <= Math.floor(e.position) : false;
        if (!ahead) continue;
        call.assignedTo = e.id;
        e.targets.add(call.floor);
      }
    }

    function pickNextTarget(e) {
      if (e.targets.size === 0) return null;
      const arr = [...e.targets];
      // Try current direction first
      const tryDir = (dir) => {
        if (dir === 1) return arr.filter((t) => t > e.position).sort((a, b) => a - b)[0];
        if (dir === -1) return arr.filter((t) => t < e.position).sort((a, b) => b - a)[0];
        return null;
      };
      let next = tryDir(e.direction);
      if (next == null) {
        // flip direction
        e.direction = e.direction === 1 ? -1 : 1;
        next = tryDir(e.direction);
      }
      if (next == null) {
        // anything else (target at current floor)
        next = arr[0];
      }
      return next;
    }

    function processArrival(e) {
      e.targets.delete(e.floor);
      // Drop off all passengers whose destination is this floor
      const departing = e.passengers.filter((p) => p.toFloor === e.floor);
      for (let i = 0; i < departing.length; i++) state.stats.served += 1;
      e.passengers = e.passengers.filter((p) => p.toFloor !== e.floor);

      // Everyone waiting at this floor (not yet boarded).
      const callsHere = state.calls.filter(
        (c) => c.floor === e.floor && !c.boarded
      );
      const ours = callsHere.filter((c) => c.assignedTo === e.id);
      // Which way are we about to go? Board people heading that same way.
      const heading =
        e.direction !== 0 ? e.direction :
        e.targets.size > 0
          ? ([...e.targets].some((t) => t > e.floor) ? 1 : -1)
          : (ours[0] ? ours[0].dir : (callsHere[0] ? callsHere[0].dir : 0));
      // Board same-direction waiters up to capacity — ours first, then anyone
      // else going our way (opportunistic), earliest waiting first.
      const toBoard = callsHere
        .filter((c) => heading === 0 || c.dir === heading)
        .sort(
          (a, b) =>
            (a.assignedTo === e.id ? 0 : 1) - (b.assignedTo === e.id ? 0 : 1) ||
            a.placedAt - b.placedAt
        );
      let boardedCount = 0;
      for (const call of toBoard) {
        if (e.passengers.length >= CAPACITY) break;
        const wait = state.time - call.placedAt;
        state.stats.totalWaitMs += wait;
        state.stats.servedSamples += 1;
        e.passengers.push({
          id: call.personId,
          fromFloor: call.floor,
          toFloor: call.dest != null ? call.dest : null,
          dir: call.dir,
        });
        if (call.dest != null) e.targets.add(call.dest);
        call.boarded = true;
        boardedCount += 1;
      }
      state.calls = state.calls.filter((c) => !c.boarded);
      if (departing.length > 0) {
        pushLog("idle", `Car ${e.id + 1} dropped ${departing.length} · ${fmtFloor(e.floor)}`);
      }
      if (boardedCount > 0) {
        pushLog("pickup", `Car ${e.id + 1} boarded ${boardedCount} · ${fmtFloor(e.floor)}`);
      }
    }

    // ---------- tick ----------
    function tick(rawDtMs) {
      const dt = rawDtMs * state.speed;
      state.time += dt;

      for (const e of state.elevators) {
        e.stateT += dt;

        if (e.state === "idle") {
          // wake if we have targets
          if (e.targets.size > 0) {
            const next = pickNextTarget(e);
            if (next != null) {
              if (next === e.floor) {
                e.state = "opening";
                e.stateT = 0;
              } else {
                e.direction = next > e.position ? 1 : -1;
                e.state = "moving";
                e.stateT = 0;
              }
            }
          }
        } else if (e.state === "moving") {
          const next = pickNextTarget(e);
          if (next == null) {
            e.state = "idle";
            e.direction = 0;
            continue;
          }
          const step = dt / TRAVEL_MS;
          if (e.position < next) {
            e.position = Math.min(next, e.position + step);
          } else if (e.position > next) {
            e.position = Math.max(next, e.position - step);
          }
          e.floor = Math.round(e.position);
          opportunisticPickup(e);
          if (Math.abs(e.position - next) < 0.001) {
            e.position = next;
            e.floor = next;
            e.state = "opening";
            e.stateT = 0;
          }
        } else if (e.state === "opening") {
          e.doorProgress = Math.min(1, e.stateT / DOOR_MS);
          if (e.stateT >= DOOR_MS) {
            e.doorProgress = 1;
            processArrival(e);
            e.state = "open";
            e.stateT = 0;
          }
        } else if (e.state === "open") {
          const unchosen = e.passengers.filter((p) => p.toFloor == null);
          if (unchosen.length === 0) {
            // dwell briefly, then close
            if (e.stateT >= DWELL_MS) {
              e.state = "closing";
              e.stateT = 0;
            }
          } else if (e.stateT >= AWAIT_TIMEOUT_MS) {
            // safety: auto-choose
            for (const p of unchosen) {
              let pool;
              if (p.dir === 1) {
                pool = [];
                for (let f = e.floor + 1; f <= FLOORS; f++) pool.push(f);
                if (pool.length === 0) {
                  for (let f = 1; f < e.floor; f++) pool.push(f);
                }
              } else {
                pool = [];
                for (let f = e.floor - 1; f >= 1; f--) pool.push(f);
                if (pool.length === 0) {
                  for (let f = FLOORS; f > e.floor; f--) pool.push(f);
                }
              }
              p.toFloor = pool[Math.floor(Math.random() * pool.length)] || 1;
              e.targets.add(p.toFloor);
            }
          }
        } else if (e.state === "closing") {
          e.doorProgress = Math.max(0, 1 - e.stateT / DOOR_MS);
          if (e.stateT >= DOOR_MS) {
            e.doorProgress = 0;
            if (e.targets.size === 0) {
              e.state = "idle";
              e.direction = 0;
            } else {
              const next = pickNextTarget(e);
              if (next == null) {
                e.state = "idle";
                e.direction = 0;
              } else if (next === e.floor) {
                e.state = "opening";
                e.stateT = 0;
              } else {
                e.direction = next > e.position ? 1 : -1;
                e.state = "moving";
                e.stateT = 0;
              }
            }
          }
        }
      }

      tryDispatch();
      state.stats.pending = state.calls.length;
    }

    return {
      state, callElevator, chooseDestination, tick, setSpeed,
      FLOORS, ELEVATORS, CAPACITY,
    };
  }

  window.makeSimulator = makeSimulator;
  window.SIM_CONST = { FLOORS, ELEVATORS, CAPACITY: 4 };
})();
