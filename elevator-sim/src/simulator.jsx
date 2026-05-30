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

    // Hall calls this car will pick up. A full car can't board anyone, so it
    // reports none — its only remaining stops are its passengers' drop-offs.
    function carCalls(e) {
      if (e.passengers.length >= CAPACITY) return [];
      return state.calls.filter((c) => c.assignedTo === e.id && !c.boarded);
    }
    // People already aboard + hall calls promised to this car. Used to avoid
    // promising a car more riders than it can ever hold.
    function assignedLoad(e) {
      return (
        e.passengers.length +
        state.calls.filter((c) => c.assignedTo === e.id && !c.boarded).length
      );
    }
    function hasWork(e) {
      return e.targets.size > 0 || carCalls(e).length > 0;
    }
    // Let go of every hall call still pinned to this car (back into the pool).
    function releaseCalls(e) {
      for (const c of state.calls) {
        if (c.assignedTo === e.id && !c.boarded) c.assignedTo = null;
      }
    }

    function pickElevator(call) {
      let best = null;
      let bestCost = Infinity;
      for (const e of state.elevators) {
        let cost = Infinity;
        const isIdle =
          e.passengers.length === 0 &&
          e.targets.size === 0 &&
          carCalls(e).length === 0;
        if (isIdle) {
          cost = Math.abs(e.position - call.floor);
        } else if (
          e.passengers.length < CAPACITY &&
          ((e.direction === 1 && call.dir === 1 && e.position <= call.floor) ||
            (e.direction === -1 && call.dir === -1 && e.position >= call.floor))
        ) {
          // moving in matching direction & still ahead → cheap swing-by
          cost = Math.abs(e.position - call.floor) + 0.5;
        } else if (
          assignedLoad(e) < CAPACITY &&
          carCalls(e).some((c) => c.dir === call.dir)
        ) {
          // batch onto a car already collecting calls in this direction so a
          // group of same-way hall calls shares one sweep (e.g. 6▼ then 4▼)
          // rather than waking a second car. Cheaper than an idle car at equal
          // distance so the group consolidates onto the one collector.
          cost = Math.abs(e.position - call.floor) - 1;
        }
        if (cost < bestCost) {
          bestCost = cost;
          best = e;
        }
      }
      return best;
    }

    function tryDispatch() {
      // A full car can't board anyone — unpin its hall calls so another car
      // can serve those waiters instead of stranding them behind a packed car.
      for (const e of state.elevators) {
        if (e.passengers.length >= CAPACITY) releaseCalls(e);
      }
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
      if (assignedLoad(e) >= CAPACITY) return;
      for (const call of state.calls) {
        if (call.assignedTo != null) continue;
        if (call.dir !== e.direction) continue;
        const ahead =
          e.direction === 1 ? call.floor >= Math.ceil(e.position) :
          e.direction === -1 ? call.floor <= Math.floor(e.position) : false;
        if (!ahead) continue;
        call.assignedTo = e.id;
        if (assignedLoad(e) >= CAPACITY) break;
      }
    }

    function pickNextTarget(e) {
      const drops = [...e.targets];   // drop-off floors — stop regardless of direction
      const calls = carCalls(e);      // hall calls to collect (none while full)
      if (drops.length === 0 && calls.length === 0) return null;

      // Floors we'd actually stop at while travelling `dir`: drop-offs ahead that
      // way, plus hall calls ahead whose rider wants to go `dir` (you only board
      // people heading your way — a 4▼ call is NOT a stop while you're going up).
      const stopsInDir = (dir) => {
        const out = [];
        for (const f of drops) {
          if (dir === 1 ? f > e.position : f < e.position) out.push(f);
        }
        for (const c of calls) {
          const ahead = dir === 1 ? c.floor > e.position : c.floor < e.position;
          if (ahead && c.dir === dir) out.push(c.floor);
        }
        return out;
      };
      // How far we must travel `dir` before it's worth reversing — the farthest
      // pending drop-off OR hall call that way. A down-call above us is reached by
      // riding up to it first, then sweeping back down: it's a turning point on
      // the way up, a boarding stop on the way down.
      const reachInDir = (dir) => {
        let far = null;
        const consider = (f) => {
          if (dir === 1 ? f > e.position : f < e.position) {
            if (far == null || (dir === 1 ? f > far : f < far)) far = f;
          }
        };
        for (const f of drops) consider(f);
        for (const c of calls) consider(c.floor);
        return far;
      };
      const nextFor = (dir) => {
        const stops = stopsInDir(dir);
        if (stops.length > 0) return dir === 1 ? Math.min(...stops) : Math.max(...stops);
        return reachInDir(dir);   // nothing to board ahead, but ride to the turning point
      };

      // Settle on a direction if we don't have one yet (head toward the nearer end).
      if (e.direction === 0) {
        const up = reachInDir(1);
        const down = reachInDir(-1);
        if (up != null && (down == null || up - e.position <= e.position - down)) {
          e.direction = 1;
        } else if (down != null) {
          e.direction = -1;
        }
      }

      if (e.direction !== 0) {
        const n = nextFor(e.direction);
        if (n != null) return n;
        const flip = e.direction === 1 ? -1 : 1;
        const r = nextFor(flip);
        if (r != null) { e.direction = flip; return r; }
      }
      // fallback: a target sitting at the current floor
      if (drops.includes(e.floor)) return e.floor;
      return calls.some((c) => c.floor === e.floor) ? e.floor : null;
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
      // If we can't continue in our current direction (no onward targets),
      // reverse toward remaining work, or adopt the direction of the people
      // waiting here — we came for them, so don't strand them.
      const workAbove =
        [...e.targets].some((t) => t > e.floor) ||
        carCalls(e).some((c) => c.floor > e.floor);
      const workBelow =
        [...e.targets].some((t) => t < e.floor) ||
        carCalls(e).some((c) => c.floor < e.floor);
      let heading = e.direction;
      if (heading === 1 && !workAbove) heading = workBelow ? -1 : 0;
      else if (heading === -1 && !workBelow) heading = workAbove ? 1 : 0;
      if (heading === 0) {
        const ref = ours[0] || callsHere[0];
        heading = ref ? ref.dir : 0;
      }
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
      // Anyone we were assigned but didn't board (opposite direction, or we filled
      // up) goes back into the pool so another car/trip can serve them — never
      // leave a call stuck to a car that's driving away.
      for (const c of callsHere) {
        if (!c.boarded && c.assignedTo === e.id) c.assignedTo = null;
      }
      // If boarding packed the car, drop any hall calls still promised to it —
      // a full car would only waste a stop opening doors it can't take riders at.
      if (e.passengers.length >= CAPACITY) releaseCalls(e);
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
          // wake if we have work (a drop-off or an assigned hall call)
          if (hasWork(e)) {
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
            if (!hasWork(e)) {
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
