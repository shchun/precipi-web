export const PRIZES = [
  "prize",
  "prize_left",
  "prize_right",
  ...[4, 5, 6, 7].map((n) => `prize_${n}`),
];
export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
export function aimDirection(view, x, y, azimuth = 0) {
  if (view === 5) {
    const cosine = Math.cos(azimuth);
    const sine = Math.sin(azimuth);
    return [x * cosine - y * sine, x * sine + y * cosine];
  }
  if (view === 2) return [y, -x];
  if (view === 3) return [-y, x];
  if (view === 4) return [-x, -y];
  return [x, y];
}

export class Claw {
  constructor(mj, xml) {
    this.mj = mj;
    this.model = mj.MjModel.from_xml_string(xml);
    this.data = new mj.MjData(this.model);
    this.dt = this.model.opt.timestep;
    this.joints = {};
    this.actuators = {};
    for (const name of [
      "x",
      "y",
      "z",
      "yaw",
      "finger_a",
      "finger_b",
      "finger_c",
    ]) {
      const joint = mj.mj_name2id(this.model, 3, name);
      this.joints[name] = this.model.jnt_qposadr[joint];
      this.actuators[name] = mj.mj_name2id(this.model, 19, name);
    }
    this.bodies = {};
    for (const name of [
      ...PRIZES,
      "claw",
      "carriage",
      "panel_button",
      "panel_joystick",
    ]) {
      this.bodies[name] = mj.mj_name2id(this.model, 1, name);
    }
    this.swingJoints = ["swing_x", "swing_y"].map((name) =>
      mj.mj_name2id(this.model, 3, name),
    );
    this.leds = [];
    for (let id = 0; id < this.model.ngeom; id++) {
      if ((mj.mj_id2name(this.model, 5, id) || "").startsWith("led_"))
        this.leds.push(id);
    }
    this.reset();
  }
  position(name) {
    return this.data.xpos.subarray(
      this.bodies[name] * 3,
      this.bodies[name] * 3 + 3,
    );
  }
  joint(name) {
    return this.data.qpos[this.joints[name]];
  }
  target(name) {
    return this.data.ctrl[this.actuators[name]];
  }
  setTarget(name, value) {
    const id = this.actuators[name];
    this.data.ctrl[id] = clamp(
      value,
      this.model.actuator_ctrlrange[id * 2],
      this.model.actuator_ctrlrange[id * 2 + 1],
    );
  }
  reset() {
    this.mj.mj_resetData(this.model, this.data);
    const slots = [
      [-0.105, 0.05],
      [-0.105, 0.125],
    ];
    for (const x of [0, 0.105])
      for (const y of [-0.105, -0.03, 0.045, 0.12]) slots.push([x, y]);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    PRIZES.forEach((name, i) => {
      const body = this.bodies[name];
      const address = this.model.jnt_qposadr[this.model.body_jntadr[body]];
      this.data.qpos.set(
        [
          slots[i][0] + (Math.random() - 0.5) * 0.006,
          slots[i][1] + (Math.random() - 0.5) * 0.006,
          0.035,
        ],
        address,
      );
    });
    this.gripForce = 0.065;
    this.holdForce = 0.065;
    this.holdBlend = 0;
    this.returnSpeed = 0;
    this.applyGripForce(this.gripForce);
    this.collected = new Set();
    this.events = [];
    this.phase = "ready";
    this.closed = false;
    this.elapsed = 0;
    this.timer = 0;
    this.celebrationUntil = 0;
    this.message = "인형을 조준해 주세요";
    this.stall = 0;
    this.previousHeight = 0;
    this.nudgeTime = 0;
    this.nudgeDirection = [0, 0];
    this.mj.mj_forward(this.model, this.data);
    this.animateLights();
  }
  start() {
    if (this.phase !== "ready" || this.collected.size === 7) return;
    const [cx, cy] = this.position("claw");
    let best = null,
      distance = 0.03;
    for (const name of PRIZES) {
      if (this.collected.has(name)) continue;
      const [x, y, z] = this.position(name);
      const delta = Math.hypot(x - cx, y - cy);
      if (z > 0 && delta < distance) {
        best = name;
        distance = delta;
      }
    }
    this.pickup = best;
    // Sample motor strength once per attempt. Contacts decide whether a toy slips.
    this.holdForce =
      Math.random() < 0.12
        ? 0.02 + Math.random() * 0.015
        : 0.065 + Math.random() * 0.015;
    this.gripForce = 0.065;
    this.holdBlend = 0;
    this.returnSpeed = 0;
    this.applyGripForce(this.gripForce);
    this.phase = best ? "aligning" : "lowering";
    this.closed = false;
    this.elapsed = 0;
    this.stall = 0;
    this.previousHeight = this.joint("z");
    this.events.push("button");
  }
  applyGripForce(force) {
    for (const name of ["finger_a", "finger_b", "finger_c"]) {
      const id = this.actuators[name];
      this.model.actuator_forcerange[id * 2] = -force;
      this.model.actuator_forcerange[id * 2 + 1] = force;
    }
  }
  nudge(x, y) {
    if (this.phase !== "ready") return;
    this.nudgeDirection = [x, y];
    this.nudgeTime = 0.12;
    this.setTarget("x", this.target("x") + x * 0.001);
    this.setTarget("y", this.target("y") + y * 0.001);
  }
  step(x = 0, y = 0, rotation = 0, fine = false) {
    let z = 0;
    if (this.phase !== "ready") {
      x = y = rotation = 0;
      this.elapsed += this.dt;
      if (this.elapsed > 24) this.phase = "fault";
      const height = this.joint("z");
      switch (this.phase) {
        case "aligning": {
          z = 1;
          if (height < -0.006) break;
          const target = Array.from(this.position(this.pickup).slice(0, 2)).map(
            (v) => clamp(v, -0.128, 0.128),
          );
          ["x", "y"].forEach((axis, i) =>
            this.setTarget(
              axis,
              this.target(axis) +
                clamp(
                  target[i] - this.target(axis),
                  -0.075 * this.dt,
                  0.075 * this.dt,
                ),
            ),
          );
          if (
            target.every(
              (value, i) => Math.abs(this.joint(["x", "y"][i]) - value) < 0.001,
            )
          )
            this.phase = "lowering";
          break;
        }
        case "lowering":
          z = -1;
          this.stall =
            this.previousHeight - height < 0.000005 ? this.stall + this.dt : 0;
          this.previousHeight = height;
          if (height <= -0.249 || this.stall > 0.2) {
            z = 0;
            this.setTarget("z", height);
            this.closed = true;
            this.timer = 0.6;
            this.phase = "gripping";
            this.events.push("grip");
          }
          break;
        case "gripping":
          this.timer -= this.dt;
          if (this.timer <= 0) this.phase = "raising";
          break;
        case "raising":
          z = 1;
          if (height >= -0.006) {
            this.setTarget("z", 0);
            this.timer = 0.12;
            this.phase = "settling";
          }
          break;
        case "settling":
          this.timer -= this.dt;
          if (this.timer <= 0) this.phase = "delivering";
          break;
        case "delivering":
          this.returnSpeed = Math.min(0.18, this.returnSpeed + 0.65 * this.dt);
          for (const axis of ["x", "y"])
            this.setTarget(
              axis,
              this.target(axis) +
                clamp(
                  -0.128 - this.target(axis),
                  -this.returnSpeed * this.dt,
                  this.returnSpeed * this.dt,
                ),
            );
          if (
            ["x", "y"].every(
              (axis) => Math.abs(this.joint(axis) + 0.128) < 0.002,
            )
          ) {
            this.closed = false;
            this.timer = 2;
            this.phase = "releasing";
          }
          break;
        case "releasing":
          this.timer -= this.dt;
          if (this.timer <= 0) {
            const before = this.collected.size;
            for (const name of PRIZES) {
              const [px, py, pz] = this.position(name);
              if (
                Math.abs(px + 0.128) < 0.065 &&
                py > -0.39 &&
                py < -0.058 &&
                pz > -0.24 &&
                pz < -0.035
              )
                this.collected.add(name);
            }
            const gained = this.collected.size > before;
            this.events.push(gained ? "success" : "miss");
            if (gained) this.celebrationUntil = this.data.time + 1.6;
            this.message =
              this.collected.size === 7
                ? "모두 획득했어요! 새 판을 시작해 보세요"
                : gained
                  ? "획득했어요! 다음 인형을 노려보세요"
                  : "아쉬워요! 각도를 바꿔 다시 도전해 보세요";
            this.phase = "ready";
            this.elapsed = 0;
          }
          break;
      }
    }
    const speed = (fine ? 0.008 : 0.12) / Math.max(1, Math.hypot(x, y));
    for (const [name, velocity] of [
      ["x", x * speed],
      ["y", y * speed],
      [
        "z",
        z *
          (this.phase === "raising" || this.phase === "aligning" ? 0.18 : 0.12),
      ],
      ["yaw", rotation * (fine ? 0.2 : 0.85)],
    ]) {
      this.setTarget(name, this.target(name) + velocity * this.dt);
    }
    if (["raising", "settling", "delivering"].includes(this.phase)) {
      this.holdBlend = Math.min(1, this.holdBlend + this.dt / 0.55);
      this.gripForce = 0.065 + (this.holdForce - 0.065) * this.holdBlend;
      this.applyGripForce(this.gripForce);
    }
    for (const name of ["finger_a", "finger_b", "finger_c"])
      this.setTarget(name, this.closed ? 0.95 : 0);
    this.nudgeTime = Math.max(0, this.nudgeTime - this.dt);
    let [sx, sy] =
      this.phase === "ready" && this.nudgeTime > 0
        ? this.nudgeDirection
        : [x, y];
    const length = Math.hypot(sx, sy),
      angle = Math.min(1, length) * 0.35;
    const joy = this.model.body_mocapid[this.bodies.panel_joystick];
    this.data.mocap_quat.set(
      length
        ? [
            Math.cos(angle / 2),
            (-sy / length) * Math.sin(angle / 2),
            (sx / length) * Math.sin(angle / 2),
            0,
          ]
        : [1, 0, 0, 0],
      joy * 4,
    );
    const button = this.model.body_mocapid[this.bodies.panel_button];
    this.data.mocap_pos[button * 3 + 2] =
      0.019 - (!["ready", "fault"].includes(this.phase) ? 0.005 : 0);
    // Stabilize the suspended head during precision contact, then let it sway in transit.
    const steady = [
      "aligning",
      "lowering",
      "gripping",
      "raising",
      "settling",
    ].includes(this.phase);
    for (const joint of this.swingJoints) {
      this.model.jnt_stiffness[joint] = steady ? 30.0 : 0.1;
      const dof = this.model.jnt_dofadr[joint];
      this.model.dof_damping[dof] = steady ? 1.0 : 0.05;
    }
    this.mj.mj_step(this.model, this.data);
    this.animateLights();
  }
  animateLights() {
    this.leds.forEach((id, i) => {
      const phase = this.data.time * 2.2 + i * 0.34;
      const bright = 0.64 + 0.36 * Math.sin(phase * 0.8) ** 2;
      const color =
        this.data.time < this.celebrationUntil
          ? [1, 0.78, 0.9]
          : [
              0.78 + 0.22 * Math.sin(phase),
              0.43 + 0.23 * Math.sin(phase + 2.1),
              0.83 + 0.17 * Math.sin(phase + 4.2),
            ];
      this.model.geom_rgba.set(
        color.map((v) => v * bright),
        id * 4,
      );
    });
  }
  dispose() {
    this.data.delete();
    this.model.delete();
  }
}
