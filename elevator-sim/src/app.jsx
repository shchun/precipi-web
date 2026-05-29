// app.jsx - root component, wires simulator <-> UI, runs the tick loop

const { useState, useEffect, useRef, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "speed": 1,
  "autoTraffic": false,
  "autoIntervalSec": 5
}/*EDITMODE-END*/;

// Traffic modes — each drives auto-generated calls with a pre-chosen destination
// so passengers board and ride without manual floor picks.
//   off     : 수동 (manual hall calls only)
//   morning : 아침 — everyone heads down to the lobby (floor 1)
//   day     : 낮 — random mix of going out / coming home / inter-floor
//   evening : 저녁 — everyone rides up from the lobby to their home floor
//   night   : 밤 — no new traffic; cars settle to idle
const TRAFFIC_MODES = [
  { key: "off",     label: "수동", desc: "직접 호출" },
  { key: "morning", label: "아침", desc: "모두 1층으로" },
  { key: "day",     label: "낮",   desc: "랜덤 이동" },
  { key: "evening", label: "저녁", desc: "각자 귀가" },
  { key: "night",   label: "밤",   desc: "정지" },
];
const MODE_INTERVAL_MS = { morning: 1200, evening: 1200, day: 2000 };

function randFloor() {
  // 2..FLOORS (an upper, residential floor)
  return 2 + Math.floor(Math.random() * 9);
}

function ModeBar({ mode, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        padding: "10px 14px",
        margin: "0 0 12px",
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "12px",
      }}
    >
      <span
        style={{
          alignSelf: "center",
          marginRight: "4px",
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        시간대
      </span>
      {TRAFFIC_MODES.map((m) => {
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "1px",
              padding: "6px 12px",
              borderRadius: "9px",
              cursor: "pointer",
              fontFamily: "var(--display)",
              border: active ? "1px solid var(--amber)" : "1px solid var(--line-2)",
              background: active ? "var(--amber)" : "var(--panel-2)",
              color: active ? "#1a1206" : "var(--ink-2)",
              boxShadow: active ? "0 0 0 3px var(--amber-glow)" : "none",
              transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700 }}>{m.label}</span>
            <span style={{ fontSize: "10px", opacity: 0.8 }}>{m.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

function App() {
  const { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakButton } = window;

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [mode, setMode] = useState("off");

  const simRef = useRef(null);
  if (simRef.current == null) {
    simRef.current = window.makeSimulator();
  }
  const sim = simRef.current;

  // Render snapshot - we copy fields the UI needs and bump on each tick.
  const [, forceRender] = useState(0);
  const lastTickRef = useRef(performance.now());

  // Apply tweak speed to sim
  useEffect(() => {
    sim.setSpeed(tweaks.speed);
  }, [tweaks.speed, sim]);

  // Tick loop
  useEffect(() => {
    let raf;
    let cancelled = false;
    function loop() {
      if (cancelled) return;
      const now = performance.now();
      const dt = Math.min(60, now - lastTickRef.current); // clamp to 60ms to avoid huge jumps
      lastTickRef.current = now;
      sim.tick(dt);
      forceRender((v) => v + 1);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sim]);

  // Auto traffic generator
  useEffect(() => {
    if (!tweaks.autoTraffic) return;
    const interval = setInterval(() => {
      // generate a random hall call
      const floor = 1 + Math.floor(Math.random() * 10);
      let dir;
      if (floor === 1) dir = 1;
      else if (floor === 10) dir = -1;
      else dir = Math.random() < 0.5 ? 1 : -1;
      sim.callElevator(floor, dir);
    }, Math.max(1000, tweaks.autoIntervalSec * 1000));
    return () => clearInterval(interval);
  }, [tweaks.autoTraffic, tweaks.autoIntervalSec, sim]);

  // Traffic-mode generator: emits hall calls with pre-chosen destinations.
  useEffect(() => {
    const interval = MODE_INTERVAL_MS[mode];
    if (!interval) return; // off / night → no auto traffic
    const gen = () => {
      if (mode === "morning") {
        // upper floor → lobby
        sim.callElevator(randFloor(), -1, 1);
      } else if (mode === "evening") {
        // lobby → home floor
        sim.callElevator(1, 1, randFloor());
      } else if (mode === "day") {
        const r = Math.random();
        if (r < 0.4) {
          sim.callElevator(randFloor(), -1, 1);          // going out
        } else if (r < 0.8) {
          sim.callElevator(1, 1, randFloor());           // coming home
        } else {
          let from = randFloor();
          let to = randFloor();
          if (to === from) to = from >= 10 ? from - 1 : from + 1;
          sim.callElevator(from, to > from ? 1 : -1, to); // inter-floor
        }
      }
    };
    gen();
    const id = setInterval(gen, interval);
    return () => clearInterval(id);
  }, [mode, sim]);

  const state = sim.state;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo"></span>
          <div>
            <h1>Tower&nbsp;10</h1>
          </div>
          <span className="sub">Elevator Operations · Live</span>
        </div>
        <StatsBar stats={state.stats} />
      </header>

      <ModeBar mode={mode} onChange={setMode} />

      <main className="main">
        <Building state={state} onCall={(f, d) => sim.callElevator(f, d)} />

        <section>
          <div className="panels">
            {state.elevators.map((e) => (
              <ElevatorPanel
                key={e.id}
                elevator={e}
                onPickDestination={(eid, f) => sim.chooseDestination(eid, f)}
              />
            ))}
          </div>
          <EventLog log={state.log} />
        </section>
      </main>

      <div className="hint">
        <span><span className="k">▲ / ▼</span> Press a hall-call button on any floor</span>
        <span><span className="k">1–10</span> Then choose a destination inside the called car</span>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Simulation">
          <TweakSlider
            label="Speed"
            value={tweaks.speed}
            onChange={(v) => setTweak("speed", v)}
            min={0.25}
            max={3}
            step={0.25}
            suffix="×"
          />
        </TweakSection>
        <TweakSection title="Auto traffic">
          <TweakToggle
            label="Generate random calls"
            value={tweaks.autoTraffic}
            onChange={(v) => setTweak("autoTraffic", v)}
          />
          <TweakSlider
            label="Interval"
            value={tweaks.autoIntervalSec}
            onChange={(v) => setTweak("autoIntervalSec", v)}
            min={1}
            max={15}
            step={1}
            suffix="s"
          />
        </TweakSection>
        <TweakSection title="Demo">
          <TweakButton
            label="Lobby rush ×5"
            onClick={() => {
              for (let i = 0; i < 5; i++) {
                setTimeout(() => sim.callElevator(1, 1), i * 120);
              }
            }}
          />
          <TweakButton
            label="Random call"
            onClick={() => {
              const floor = 1 + Math.floor(Math.random() * 10);
              const dir = floor === 1 ? 1 : floor === 10 ? -1 : (Math.random() < 0.5 ? 1 : -1);
              sim.callElevator(floor, dir);
            }}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
