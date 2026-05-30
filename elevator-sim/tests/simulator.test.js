// Behavioural tests for the elevator dispatcher/state-machine.
//
// These guard the dispatch bugs we fixed:
//   - a group going the same way should fill one car up to capacity,
//     not be carried one passenger at a time;
//   - up- and down-bound riders must never share a car;
//   - idle cars must fetch already-waiting passengers (no dead-lock where
//     people pile up while every car sits idle), including a fresh pile that
//     arrives after the cars have gone quiet.
//
// Run with:  node --test   (from elevator-sim/)

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSimulator } = require("./load-sim");

const { makeSimulator, SIM_CONST } = loadSimulator();
const { CAPACITY, FLOORS } = SIM_CONST;

const DT = 16; // ms per tick (~60fps)

// Drive the sim for `ticks`, asserting core invariants every tick and tracking
// the peak load and any moment where people wait while all cars are idle.
function drive(sim, ticks) {
  let peakPassengers = 0;
  let idleWhileWaitingTicks = 0;
  for (let i = 0; i < ticks; i++) {
    sim.tick(DT);
    for (const e of sim.state.elevators) {
      assert.ok(
        e.passengers.length <= CAPACITY,
        `car ${e.id} exceeded capacity (${e.passengers.length})`
      );
      const dirs = new Set(e.passengers.map((p) => p.dir));
      assert.ok(
        dirs.size <= 1,
        `car ${e.id} mixed up & down riders: ${[...dirs].join(",")}`
      );
      peakPassengers = Math.max(peakPassengers, e.passengers.length);
    }
    const allIdle = sim.state.elevators.every(
      (e) => e.state === "idle" && e.passengers.length === 0
    );
    if (sim.state.calls.length > 0 && allIdle) idleWhileWaitingTicks += 1;
  }
  return { peakPassengers, idleWhileWaitingTicks };
}

test("same-direction group boards together, up to capacity", () => {
  const sim = makeSimulator();
  // A full car's worth of people in the lobby all heading up to floor 6.
  for (let i = 0; i < CAPACITY; i++) sim.callElevator(1, 1, 6);

  const { peakPassengers, idleWhileWaitingTicks } = drive(sim, 600);

  assert.equal(
    peakPassengers,
    CAPACITY,
    "one car should fill to capacity, not carry people one at a time"
  );
  assert.equal(sim.state.stats.served, CAPACITY, "everyone should arrive");
  assert.equal(sim.state.calls.length, 0);
  assert.equal(idleWhileWaitingTicks, 0);
});

test("hall-call queue is capped per floor+direction", () => {
  const sim = makeSimulator();
  // Press the same call far more times than a car can hold.
  for (let i = 0; i < CAPACITY + 5; i++) sim.callElevator(3, 1, 8);

  const waitingAt3Up = sim.state.calls.filter(
    (c) => c.floor === 3 && c.dir === 1
  ).length;
  assert.ok(
    waitingAt3Up <= CAPACITY,
    `queue should be capped at ${CAPACITY}, got ${waitingAt3Up}`
  );
});

test("never mixes up- and down-bound riders in one car", () => {
  const sim = makeSimulator();
  // Opposite-direction demand on the same floors at the same time.
  sim.callElevator(5, 1, 9); // up
  sim.callElevator(5, -1, 1); // down
  sim.callElevator(6, -1, 2); // down
  sim.callElevator(2, 1, 8); // up

  // drive() asserts the no-mixing invariant on every tick.
  const { idleWhileWaitingTicks } = drive(sim, 1500);

  assert.equal(sim.state.calls.length, 0, "all calls should be served");
  assert.equal(idleWhileWaitingTicks, 0);
});

test("idle cars fetch a passenger waiting above them (no dead-lock)", () => {
  const sim = makeSimulator();
  // All cars start parked at the lobby; a down-call appears five floors up.
  // The bug: a car drives up to reach it, arrives "heading up", refuses to
  // board the down-rider, and every car then sits idle forever.
  sim.callElevator(5, -1, 1);

  const { idleWhileWaitingTicks } = drive(sim, 3000);

  assert.equal(sim.state.stats.served, 1, "the waiting rider must be served");
  assert.equal(sim.state.calls.length, 0);
  assert.equal(
    idleWhileWaitingTicks,
    0,
    "cars must not idle while someone is waiting"
  );
});

test("serves a large mixed backlog completely", () => {
  const sim = makeSimulator();
  for (let i = 0; i < CAPACITY; i++) sim.callElevator(8, -1, 1); // morning-ish
  for (let i = 0; i < CAPACITY; i++) sim.callElevator(1, 1, 8); // evening-ish

  const { idleWhileWaitingTicks } = drive(sim, 4000);

  assert.equal(sim.state.stats.served, 2 * CAPACITY);
  assert.equal(sim.state.calls.length, 0);
  assert.equal(idleWhileWaitingTicks, 0);
});

test("picks up a new pile that arrives after the cars go idle", () => {
  const sim = makeSimulator();

  // Wave 1.
  for (let i = 0; i < 3; i++) sim.callElevator(6, -1, 1);
  drive(sim, 1500);
  const servedAfterWave1 = sim.state.stats.served;
  assert.equal(servedAfterWave1, 3, "first wave should be fully served");
  assert.ok(
    sim.state.elevators.every((e) => e.state === "idle"),
    "cars should be quiet before the second wave"
  );

  // Wave 2 arrives while everything is idle — this is the user-reported case.
  for (let i = 0; i < CAPACITY; i++) sim.callElevator(9, -1, 1);
  const { idleWhileWaitingTicks } = drive(sim, 3000);

  assert.equal(sim.state.stats.served, servedAfterWave1 + CAPACITY);
  assert.equal(sim.state.calls.length, 0);
  assert.equal(
    idleWhileWaitingTicks,
    0,
    "an idle fleet must go fetch a fresh pile of waiting people"
  );
});

test("two down-calls (4▼ & 6▼) ride one car, served 6 before 4", () => {
  const sim = makeSimulator();
  // Down buttons pressed on 6 and on 4 at about the same time. The car should
  // ride up to the higher call, then sweep down — collecting 6 first, then 4 —
  // rather than stopping at 4 on the way up or splitting across two cars.
  sim.callElevator(4, -1, 1); // 4 → lobby
  sim.callElevator(6, -1, 2); // 6 → floor 2

  const boardOrder = []; // {fromFloor, carId} in the order people stepped aboard
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    sim.tick(DT);
    for (const e of sim.state.elevators) {
      for (const p of e.passengers) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        boardOrder.push({ fromFloor: p.fromFloor, carId: e.id });
      }
    }
    if (sim.state.stats.served === 2) break;
  }

  assert.equal(sim.state.stats.served, 2, "both riders should arrive");
  const from6 = boardOrder.find((b) => b.fromFloor === 6);
  const from4 = boardOrder.find((b) => b.fromFloor === 4);
  assert.ok(from6 && from4, "both floors' riders should have boarded");
  assert.equal(
    from6.carId,
    from4.carId,
    "one car should collect both down-calls, not two cars"
  );
  assert.ok(
    boardOrder.indexOf(from6) < boardOrder.indexOf(from4),
    `car should reach 6 before 4; boarding order was ${boardOrder
      .map((b) => b.fromFloor)
      .join(" → ")}`
  );
});

test("a full car ignores hall calls and rides straight to its drop-offs", () => {
  const sim = makeSimulator();
  // Pack one car in the lobby — four riders all bound for the top floor.
  for (let i = 0; i < CAPACITY; i++) sim.callElevator(1, 1, FLOORS);
  // Let it fill and pull away from the lobby.
  drive(sim, 120);

  const lobbyCar = sim.state.elevators.find(
    (e) =>
      e.passengers.length === CAPACITY &&
      e.passengers.every((p) => p.fromFloor === 1)
  );
  assert.ok(lobbyCar, "one car should be packed with the lobby group");

  // A same-direction hall call now appears on the packed car's path.
  sim.callElevator(5, 1, 8);

  const opensByCar = new Map(); // carId → [floors where it opened doors]
  const prevState = new Map();
  for (const e of sim.state.elevators) prevState.set(e.id, e.state);
  let fifthRiderCar = null;

  for (let i = 0; i < 3000; i++) {
    sim.tick(DT);
    for (const e of sim.state.elevators) {
      if (prevState.get(e.id) !== "opening" && e.state === "opening") {
        if (!opensByCar.has(e.id)) opensByCar.set(e.id, []);
        opensByCar.get(e.id).push(e.floor);
      }
      prevState.set(e.id, e.state);
      if (e.passengers.some((p) => p.fromFloor === 5)) fifthRiderCar = e.id;
    }
    if (sim.state.stats.served === CAPACITY + 1) break;
  }

  assert.equal(
    sim.state.stats.served,
    CAPACITY + 1,
    "everyone, including the 5th-floor rider, should be served"
  );
  // The packed car must never open at floor 5 — it can't board anyone, so the
  // stop is pure wasted time.
  const lobbyCarOpens = opensByCar.get(lobbyCar.id) || [];
  assert.ok(
    !lobbyCarOpens.includes(5),
    `full car should skip the hall-call floor; it opened at: ${lobbyCarOpens.join(",")}`
  );
  // The waiter on 5 is fetched by a different car.
  assert.ok(fifthRiderCar != null, "the 5th-floor rider should have boarded");
  assert.notEqual(
    fifthRiderCar,
    lobbyCar.id,
    "a different car should serve the hall call the full car drove past"
  );
});

test("hall calls never light the in-car destination panel", () => {
  const sim = makeSimulator();
  // Empty cars; press the DOWN hall buttons on 6 and 4 (no pre-chosen dest).
  // A real car's interior floor buttons only light when someone aboard presses
  // one — a hall call must not light them. The panel lights `elevator.targets`,
  // so every lit floor must correspond to a real onboard passenger's choice.
  sim.callElevator(6, -1);
  sim.callElevator(4, -1);

  for (let i = 0; i < 2000; i++) {
    sim.tick(DT);
    for (const e of sim.state.elevators) {
      const chosen = new Set(
        e.passengers.map((p) => p.toFloor).filter((f) => f != null)
      );
      for (const t of e.targets) {
        assert.ok(
          chosen.has(t),
          `car ${e.id} lit floor ${t} that no onboard passenger chose ` +
            `(targets={${[...e.targets]}})`
        );
      }
    }
    if (sim.state.stats.served === 2) break;
  }
  assert.equal(sim.state.stats.served, 2);
});

test("a call with a pre-chosen destination rides without a manual pick", () => {
  const sim = makeSimulator();
  // Traffic modes pass a destination so riders board already knowing their floor.
  sim.callElevator(7, -1, 1);

  let sawPresetDestination = false;
  for (let i = 0; i < 3000; i++) {
    sim.tick(DT);
    for (const e of sim.state.elevators) {
      if (e.passengers.some((p) => p.fromFloor === 7 && p.toFloor === 1)) {
        sawPresetDestination = true;
      }
    }
    if (sim.state.stats.served > 0) break;
  }

  assert.ok(sawPresetDestination, "rider should board with toFloor already set");
  assert.equal(sim.state.stats.served, 1);
});
