// ui.jsx - Building (architectural cross-section), elevator panels, stats

const { FLOORS, ELEVATORS, CAPACITY } = window.SIM_CONST;

// ---------- People ----------

function PersonIcon({ className = "" }) {
  return (
    <svg className={"person " + className} viewBox="0 0 14 20" aria-hidden="true">
      <circle cx="7" cy="3.6" r="3.1" />
      <path d="M 7 8 C 3 8 1.4 11.5 1.4 15.5 L 1.4 20 L 12.6 20 L 12.6 15.5 C 12.6 11.5 11 8 7 8 Z" />
    </svg>
  );
}

function Person({ call, boarding }) {
  const dirCls = call.dir === 1 ? "up" : "down";
  const arrow = call.dir === 1 ? "\u25B2" : "\u25BC";
  const [spawning, setSpawning] = React.useState(true);
  React.useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setSpawning(false))
    );
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={
        "person-wrap " + dirCls +
        (spawning ? " spawning" : "") +
        (boarding ? " boarding" : "")
      }
    >
      <span className="person-tag">{arrow}</span>
      <PersonIcon />
    </div>
  );
}

// ---------- Building roof + foundation ----------

function Tree({ side = "side" }) {
  return (
    <div className={"tree tree-" + side}>
      <svg viewBox="0 0 24 36" aria-hidden="true">
        <ellipse className="foliage" cx="12" cy="10" rx="11" ry="9" />
        <ellipse className="foliage" cx="6"  cy="14" rx="6"  ry="6" />
        <ellipse className="foliage" cx="18" cy="14" rx="6"  ry="6" />
        <rect className="trunk" x="11" y="17" width="2" height="12" />
        <path className="pot" d="M 6 28 L 18 28 L 17 35 L 7 35 Z" />
      </svg>
    </div>
  );
}

function Roof() {
  return (
    <div className="roof">
      <div className="roof-deck">
        <div className="roof-sign">
          <span className="roof-mark">▲</span>
          <span>TOWER 10</span>
        </div>
        <div className="water-tower" aria-hidden="true">
          <div className="tank">
            <span className="band"></span>
          </div>
          <div className="legs">
            <span></span><span></span><span></span><span></span>
          </div>
        </div>
        <div className="hvac">
          <span className="vent"></span>
          <span className="vent"></span>
          <span className="vent"></span>
        </div>
        <div className="garden">
          <Tree side="garden" />
          <Tree side="garden" />
        </div>
        <div className="roof-mast">
          <div className="dish"></div>
          <div className="antenna">
            <span className="mast"></span>
            <span className="blink"></span>
          </div>
        </div>
      </div>
      <div className="parapet-lights" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>
    </div>
  );
}

function Foundation() {
  return (
    <div className="foundation">
      <div className="ground"></div>
    </div>
  );
}

// ---------- Window pattern (deterministic per floor) ----------

// Two windows per floor (left + right): 1 = lit, 0 = dark
const WINDOW_LIGHTS = {
  2:  [1, 0],
  3:  [0, 1],
  4:  [1, 1],
  5:  [1, 0],
  6:  [0, 1],
  7:  [1, 0],
  8:  [0, 1],
  9:  [1, 1],
  10: [1, 0],
};

function Window({ lit }) {
  return (
    <div className={"window" + (lit ? " lit" : "")}>
      <span className="muntin h"></span>
      <span className="muntin v"></span>
      {lit && <span className="silhouette"></span>}
      <span className="sill"></span>
    </div>
  );
}

function Facade({ floor }) {
  if (floor === 1) {
    return (
      <div className="facade lobby">
        <div className="awning"></div>
        <div className="entrance-frame">
          <div className="entrance-glass"></div>
          <div className="entrance-doors">
            <div className="entrance-door"></div>
            <div className="entrance-door"></div>
          </div>
          <div className="entrance-handle"><span></span><span></span></div>
        </div>
        <Tree side="lobby-left" />
        <Tree side="lobby-right" />
      </div>
    );
  }
  const lights = WINDOW_LIGHTS[floor] || [0, 0];
  return (
    <div className="facade">
      <Window lit={!!lights[0]} />
      <Window lit={!!lights[1]} />
    </div>
  );
}

// ---------- Corridor decor (office furniture silhouettes) ----------

function Desk() {
  return (
    <svg className="furn" viewBox="0 0 32 22" aria-hidden="true">
      <rect x="2" y="11" width="24" height="3" />
      <rect x="3" y="14" width="2" height="7" />
      <rect x="23" y="14" width="2" height="7" />
      <rect x="20" y="5" width="8" height="6" rx="0.5" />
      <rect x="22" y="11" width="4" height="1" />
    </svg>
  );
}
function Sofa() {
  return (
    <svg className="furn" viewBox="0 0 32 22" aria-hidden="true">
      <rect x="3" y="11" width="26" height="8" rx="1.5" />
      <rect x="1" y="9" width="4" height="11" rx="1" />
      <rect x="27" y="9" width="4" height="11" rx="1" />
      <rect x="6" y="8" width="20" height="5" rx="1" />
    </svg>
  );
}
function Plant() {
  return (
    <svg className="furn" viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="8" rx="9" ry="7" />
      <path d="M 8 18 L 9 22 L 15 22 L 16 18 Z" />
    </svg>
  );
}
function Meeting() {
  return (
    <svg className="furn" viewBox="0 0 36 22" aria-hidden="true">
      <ellipse cx="18" cy="13" rx="14" ry="4" />
      <rect x="3" y="9" width="3" height="4" rx="0.5" />
      <rect x="30" y="9" width="3" height="4" rx="0.5" />
      <rect x="11" y="6" width="3" height="4" rx="0.5" />
      <rect x="22" y="6" width="3" height="4" rx="0.5" />
    </svg>
  );
}
function Reception() {
  return (
    <svg className="furn lobby-furn" viewBox="0 0 44 22" aria-hidden="true">
      <rect x="2" y="11" width="32" height="9" rx="1" />
      <rect x="2" y="9" width="32" height="3" />
      <circle cx="38" cy="10" r="3" />
      <rect x="36.5" y="13" width="3" height="7" rx="1.5" />
    </svg>
  );
}

function CorridorDecor({ floor }) {
  if (floor === 1) return <Reception />;
  const set = [Plant, Desk, Meeting, Sofa, Plant, Desk, Meeting, Sofa, Plant];
  const F = set[(floor - 2) % set.length];
  return <F />;
}

// ---------- Building ----------

function Building({ state, onCall }) {
  const floorsTopDown = [];
  for (let f = FLOORS; f >= 1; f--) floorsTopDown.push(f);

  const activeCalls = new Set();
  for (const c of state.calls) activeCalls.add(c.floor + ":" + c.dir);
  const waitersByFloor = {};
  for (const c of state.calls) {
    if (!waitersByFloor[c.floor]) waitersByFloor[c.floor] = [];
    waitersByFloor[c.floor].push(c);
  }

  return (
    <div className="building-card">
      <div className="card-header">
        <span><span className="dot"></span>Building · 10 floors · 3 cars</span>
        <span>{state.calls.length} waiting</span>
      </div>

      <div className="building-wrap">
        <Roof />

        <div className="building">
          {floorsTopDown.map((f) => (
            <FloorRow
              key={f}
              floor={f}
              isTop={f === FLOORS}
              isBottom={f === 1}
              activeCalls={activeCalls}
              waiters={waitersByFloor[f] || []}
              elevators={state.elevators}
              onCall={onCall}
            />
          ))}

          {state.elevators.map((e, i) => (
            <ElevatorCar key={e.id} elevator={e} shaftIndex={i} />
          ))}
        </div>

        <Foundation />
        <ShaftHeaders elevators={state.elevators} />
      </div>
    </div>
  );
}

function FloorRow({ floor, isTop, isBottom, activeCalls, waiters, elevators, onCall }) {
  return (
    <div className="floor-row">
      <Facade floor={floor} />
      <div className={"floor-num" + (floor === 1 ? " ground" : "")}>
        {floor === 1 ? "L" : floor}
      </div>
      <div className="floor-calls">
        {!isTop && (
          <button
            className={"call-btn up" + (activeCalls.has(floor + ":1") ? " active" : "")}
            onClick={() => onCall(floor, 1)}
            aria-label={`Call elevator up from floor ${floor}`}
          >▲</button>
        )}
        {!isBottom && (
          <button
            className={"call-btn down" + (activeCalls.has(floor + ":-1") ? " active" : "")}
            onClick={() => onCall(floor, -1)}
            aria-label={`Call elevator down from floor ${floor}`}
          >▼</button>
        )}
      </div>
      <div className={"floor-corridor" + (floor === 1 ? " lobby" : "")}>
        <div className="decor">
          <CorridorDecor floor={floor} />
        </div>
        {waiters.map((c) => {
          const e = c.assignedTo != null ? elevators.find((x) => x.id === c.assignedTo) : null;
          const boarding =
            e != null && e.floor === floor && (e.state === "opening" || e.state === "open");
          return <Person key={c.id} call={c} boarding={boarding} />;
        })}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="shaft-cell">
          <div className="floor-door-mark"></div>
        </div>
      ))}
    </div>
  );
}

// ---------- Elevator car ----------

function ElevatorCar({ elevator, shaftIndex }) {
  const FLOOR_H = 66;
  const top = (FLOORS - elevator.position) * FLOOR_H + 4;
  const SHAFT_W = 60;
  const CAR_INSET = 4;
  const leftCalc = `calc(100% - ${SHAFT_W * 3}px + ${shaftIndex * SHAFT_W + CAR_INSET}px)`;
  const widthCalc = `${SHAFT_W - CAR_INSET * 2}px`;

  const lit = elevator.doorProgress > 0.05 || elevator.passengers.length > 0;
  const doorOffset = elevator.doorProgress * 50;
  const isActive = elevator.state !== "idle";

  const pax = elevator.passengers;
  const paxClass = "pax-row count-" + Math.min(pax.length, 4);

  return (
    <div
      className={"car" + (isActive ? " active" : "")}
      style={{
        top: top + "px",
        left: leftCalc,
        right: "auto",
        width: widthCalc,
      }}
    >
      <div className="car-label">C{elevator.id + 1}</div>
      <div className={"car-interior" + (lit ? " lit" : "")}>
        {pax.length > 0 && (
          <div className={paxClass}>
            {pax.slice(0, 4).map((p, i) => (
              <svg key={p.id} className="person in-car in" viewBox="0 0 14 20" aria-hidden="true">
                <circle cx="7" cy="3.6" r="3.1" />
                <path d="M 7 8 C 3 8 1.4 11.5 1.4 15.5 L 1.4 20 L 12.6 20 L 12.6 15.5 C 12.6 11.5 11 8 7 8 Z" />
              </svg>
            ))}
          </div>
        )}
      </div>
      <div className="door left" style={{ transform: `translateX(-${doorOffset}%)` }}></div>
      <div className="door right" style={{ transform: `translateX(${doorOffset}%)` }}></div>
    </div>
  );
}

function ShaftHeaders({ elevators }) {
  return (
    <div className="shaft-headers">
      <div className="spacer"></div>
      <div className="spacer"></div>
      <div className="spacer"></div>
      <div className="spacer corridor"></div>
      {elevators.map((e) => {
        const dirCls =
          e.direction === 1 ? "up" : e.direction === -1 ? "down" : "idle";
        const arrow =
          e.direction === 1 ? "▲" : e.direction === -1 ? "▼" : "—";
        return (
          <div className="shaft-head" key={e.id}>
            <span className="num">C{e.id + 1}</span>
            <span className={"dir " + dirCls}>
              {arrow}{e.floor === 1 ? "L" : e.floor}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Elevator interior panel (compact) ----------

function ElevatorPanel({ elevator, onPickDestination }) {
  const isOpen = elevator.state === "open";
  const unchosen = elevator.passengers.filter((p) => p.toFloor == null).length;
  const canPick = isOpen && unchosen > 0;
  const paxCount = elevator.passengers.length;

  const status =
    elevator.state === "idle" ? { cls: "idle", label: "Idle" } :
    elevator.state === "moving" ? { cls: "moving", label: "Moving" } :
    elevator.state === "opening" ? { cls: "doors", label: "Opening" } :
    elevator.state === "open" ?
      (unchosen > 0
        ? { cls: "wait", label: "Choose " + unchosen }
        : { cls: "doors", label: "Open" }) :
    elevator.state === "closing" ? { cls: "doors", label: "Closing" } :
    { cls: "idle", label: elevator.state };

  const dirCls =
    elevator.direction === 1 ? "up" :
    elevator.direction === -1 ? "down" : "";
  const arrow =
    elevator.direction === 1 ? "▲" :
    elevator.direction === -1 ? "▼" : "—";

  const buttons = [];
  for (let f = FLOORS; f >= 1; f--) buttons.push(f);

  // floors that are "lit" — committed targets of this elevator
  const litTargets = elevator.targets || new Set();

  return (
    <div className={"panel" + (elevator.state !== "idle" ? " active" : "")}>
      <div className="panel-head">
        <div className="panel-row">
          <span className="panel-name">C{elevator.id + 1}</span>
          <span className={"pax-count-big" + (paxCount === 0 ? " empty" : "")}>
            <svg className="person-mini" viewBox="0 0 14 20" aria-hidden="true">
              <circle cx="7" cy="3.6" r="3.1" />
              <path d="M 7 8 C 3 8 1.4 11.5 1.4 15.5 L 1.4 20 L 12.6 20 L 12.6 15.5 C 12.6 11.5 11 8 7 8 Z" />
            </svg>
            <span className="num">{paxCount}</span>
            <span className="cap">/{CAPACITY}</span>
          </span>
        </div>
        <div className="display-row">
          <div className="floor-display">
            {elevator.floor === 1 ? "L" : elevator.floor.toString().padStart(2, "0")}
          </div>
          <div className={"direction-arrow " + dirCls}>{arrow}</div>
        </div>
        <div className={"status-banner " + status.cls}>{status.label}</div>
      </div>

      <div className="btn-grid">
        {buttons.map((f) => {
          const isCurrent = !canPick && elevator.floor === f && elevator.state !== "moving";
          const isLit = litTargets.has(f);
          const disabled = !canPick || f === elevator.floor;
          return (
            <button
              key={f}
              className={
                "floor-btn" +
                (isLit ? " lit" : "") +
                (isCurrent && !isLit ? " current" : "")
              }
              disabled={disabled}
              onClick={() => onPickDestination(elevator.id, f)}
            >
              {f === 1 ? "L" : f}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Stats + log ----------

function StatsBar({ stats }) {
  const avgWait =
    stats.servedSamples > 0
      ? (stats.totalWaitMs / stats.servedSamples / 1000).toFixed(1) + "s"
      : "—";
  return (
    <div className="stats">
      <div className="stat">
        <span className="k">Served</span>
        <span className="v">{stats.served}</span>
      </div>
      <div className="stat">
        <span className="k">Waiting</span>
        <span className="v amber">{stats.pending}</span>
      </div>
      <div className="stat">
        <span className="k">Avg wait</span>
        <span className="v">{avgWait}</span>
      </div>
    </div>
  );
}

function EventLog({ log }) {
  const recent = log.slice(0, 6);
  return (
    <div className="log-card">
      <h3>Event log</h3>
      <div className="log-list">
        {recent.map((entry) => (
          <div key={entry.id} className={"line ev-" + entry.kind}>
            <span className="t">{Math.floor(entry.t / 1000).toString().padStart(3, "0")}s</span>
            <span className="label">{entry.kind.toUpperCase()}</span>
            <span>{entry.text}</span>
          </div>
        ))}
        {recent.length === 0 && (
          <div className="line ev-idle">
            <span className="t">000s</span>
            <span className="label">READY</span>
            <span>Awaiting hall calls…</span>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Building, ElevatorPanel, StatsBar, EventLog });
