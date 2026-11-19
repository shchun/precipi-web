import { Claw, PRIZES, aimDirection } from "./physics.js";

const $ = (id) => document.getElementById(id);
const CDN = "https://cdn.jsdelivr.net/npm/";
const keys = new Set();
const touches = new Map();
let claw, THREE, renderer, scene, camera;
let started = false,
  fine = false,
  view = 0,
  sound = true;
let previous = performance.now(),
  lag = 0;
const meshes = [];
const geometries = new Map();
const sounds = {};
let music;
const labels = {
  aligning: "중심을 맞추고 있어요",
  lowering: "집게가 내려가요",
  gripping: "꼭 잡아요!",
  raising: "들어 올리는 중",
  settling: "인형을 잡고 있어요",
  delivering: "출구로 이동 중",
  releasing: "상품이 나오는 중",
  fault: "동작이 멈췄어요. 새 판을 눌러 주세요",
};

function initializeAudio() {
  music = new Audio("./assets/pickdoll-theme.wav");
  music.loop = true;
  music.volume = 0.4;
  for (const name of ["button", "grip", "success", "miss"]) {
    sounds[name] = new Audio(`./assets/${name}.wav`);
    sounds[name].volume = 0.65;
  }
}
function playMusic() {
  if (sound && started && !document.hidden) music?.play().catch(() => {});
}
function playEffect(name) {
  if (!sound || !sounds[name]) return;
  sounds[name].currentTime = 0;
  sounds[name].play().catch(() => {});
}
function toggleSound() {
  sound = !sound;
  $("sound").textContent = sound ? "소리 켜짐" : "소리 꺼짐";
  $("sound").setAttribute("aria-pressed", String(sound));
  if (sound) playMusic();
  else {
    music?.pause();
    for (const audio of Object.values(sounds)) audio.pause();
  }
}
function setCamera(index) {
  view = index;
  $("camera").value = String(index);
  const positions = [
    [0, -1.04, 0.59],
    [0, 0, 0.94],
    [-1.04, 0, 0.59],
    [1.04, 0, 0.59],
    [0, 1.04, 0.59],
  ];
  camera.position.fromArray(positions[index]);
  camera.up.set(0, index === 1 ? 1 : 0, index === 1 ? 0 : 1);
  camera.lookAt(0, 0, index === 1 ? 0 : 0.075);
}
function geometryFor(id) {
  const m = claw.model;
  const type = m.geom_type[id],
    size = Array.from(m.geom_size.slice(id * 3, id * 3 + 3));
  const dataid = m.geom_dataid[id];
  const key = [type, ...size, dataid].join(",");
  if (geometries.has(key)) return geometries.get(key);
  let geometry;
  switch (type) {
    case 0:
      geometry = new THREE.PlaneGeometry(4, 4);
      break;
    case 2:
      geometry = new THREE.SphereGeometry(size[0], 20, 14);
      break;
    case 3:
      geometry = new THREE.CapsuleGeometry(size[0], size[1] * 2, 5, 12);
      geometry.rotateX(Math.PI / 2);
      break;
    case 4:
      geometry = new THREE.SphereGeometry(1, 20, 14);
      geometry.scale(...size);
      break;
    case 5:
      geometry = new THREE.CylinderGeometry(size[0], size[0], size[1] * 2, 24);
      geometry.rotateX(Math.PI / 2);
      break;
    case 6:
      geometry = new THREE.BoxGeometry(...size.map((v) => v * 2));
      break;
    case 7: {
      geometry = new THREE.BufferGeometry();
      const start = m.mesh_vertadr[dataid] * 3,
        count = m.mesh_vertnum[dataid] * 3;
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          m.mesh_vert.slice(start, start + count),
          3,
        ),
      );
      const face = m.mesh_faceadr[dataid] * 3,
        number = m.mesh_facenum[dataid] * 3;
      geometry.setIndex(Array.from(m.mesh_face.slice(face, face + number)));
      geometry.computeVertexNormals();
      break;
    }
    default:
      throw new Error(`지원하지 않는 모델 형상 ${type}`);
  }
  geometries.set(key, geometry);
  return geometry;
}
let cable, marker, particles, matrix;
function initializeScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#251b31");
  scene.fog = new THREE.Fog("#251b31", 1.6, 4.0);
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  $("viewport").appendChild(renderer.domElement);
  camera = new THREE.PerspectiveCamera(40, 1, 0.01, 10);
  scene.add(new THREE.HemisphereLight(0xffe8f8, 0x47314b, 2.2));
  const light = new THREE.DirectionalLight(0xffebed, 2.4);
  light.position.set(-0.5, -0.6, 1.3);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, {
    left: -0.55,
    right: 0.55,
    top: 0.55,
    bottom: -0.55,
    near: 0.1,
    far: 3,
  });
  light.shadow.bias = -0.0003;
  light.shadow.normalBias = 0.001;
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xc8c4ff, 1.3);
  fill.position.set(0.6, 0.5, 0.7);
  scene.add(fill);
  const m = claw.model;
  for (let id = 0; id < m.ngeom; id++) {
    const rgba = m.geom_rgba.slice(id * 4, id * 4 + 4);
    const led = claw.leds.includes(id);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(rgba[0], rgba[1], rgba[2]),
      roughness: 0.48,
      metalness: 0.06,
      opacity: rgba[3],
      transparent: rgba[3] < 1,
      depthWrite: rgba[3] >= 1,
      side: THREE.DoubleSide,
    });
    if (led) {
      material.emissive.copy(material.color);
      material.emissiveIntensity = 1.7;
    }
    const mesh = new THREE.Mesh(geometryFor(id), material);
    mesh.castShadow = !led && rgba[3] > 0.9 && m.geom_type[id] !== 0;
    mesh.receiveShadow = rgba[3] > 0.9;
    mesh.userData = { id, led, upper: m.geom_group[id] === 3 };
    if (rgba[3] < 1) mesh.renderOrder = 2;
    scene.add(mesh);
    meshes.push(mesh);
  }
  cable = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]),
    new THREE.LineBasicMaterial({ color: 0xb4a9b7 }),
  );
  scene.add(cable);
  marker = new THREE.Mesh(
    new THREE.RingGeometry(0.034, 0.038, 36),
    new THREE.MeshBasicMaterial({
      color: 0xb8ffb1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  marker.position.z = 0.002;
  scene.add(marker);
  particles = new THREE.Group();
  const sparkleGeometry = new THREE.SphereGeometry(0.0025, 6, 4);
  for (let i = 0; i < 20; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: i % 2 ? 0xffb6e1 : 0xffeab3,
      transparent: true,
    });
    particles.add(new THREE.Mesh(sparkleGeometry, material));
  }
  scene.add(particles);
  matrix = new THREE.Matrix4();
  setCamera(0);
  new ResizeObserver(resize).observe($("viewport"));
  resize();
}
function resize() {
  const box = $("viewport").getBoundingClientRect();
  if (!renderer || !box.width || !box.height) return;
  renderer.setSize(box.width, box.height);
  camera.aspect = box.width / box.height;
  // Keep the complete cabinet in the narrow portrait view.
  camera.fov = camera.aspect < 0.75 ? 48 : 44;
  camera.updateProjectionMatrix();
}
function draw() {
  const data = claw.data;
  for (const mesh of meshes) {
    const { id, led, upper } = mesh.userData;
    mesh.visible = !(view === 1 && upper);
    mesh.position.fromArray(data.geom_xpos, id * 3);
    const a = data.geom_xmat.slice(id * 9, id * 9 + 9);
    matrix.set(
      a[0],
      a[1],
      a[2],
      0,
      a[3],
      a[4],
      a[5],
      0,
      a[6],
      a[7],
      a[8],
      0,
      0,
      0,
      0,
      1,
    );
    mesh.quaternion.setFromRotationMatrix(matrix);
    if (led) {
      const colors = claw.model.geom_rgba.slice(id * 4, id * 4 + 3);
      mesh.material.color.setRGB(...colors);
      mesh.material.emissive.copy(mesh.material.color);
    }
  }
  const top = claw.position("carriage"),
    bottom = claw.position("claw");
  const points = cable.geometry.attributes.position;
  points.setXYZ(0, top[0], top[1], top[2] - 0.014);
  points.setXYZ(1, bottom[0], bottom[1], bottom[2] + 0.009);
  points.needsUpdate = true;
  cable.visible = view !== 1;
  marker.position.x = bottom[0];
  marker.position.y = bottom[1];
  const remaining = claw.celebrationUntil - data.time;
  particles.visible = remaining > 0;
  if (remaining > 0) {
    const elapsed = 1.6 - remaining;
    particles.children.forEach((mesh, i) => {
      const angle = i * 2.39996,
        radius = 0.025 + elapsed * (0.035 + (i % 4) * 0.01);
      mesh.position.set(
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        0.16 + elapsed * 0.15 - elapsed ** 2 * 0.1,
      );
      mesh.material.opacity = Math.min(1, remaining);
    });
  }
  renderer.render(scene, camera);
  const busy = claw.phase !== "ready";
  $("pick").disabled = !started || busy || claw.collected.size === 7;
  $("pick").textContent = busy ? "진행 중" : "뽑기";
  $("score").textContent = `${claw.collected.size} / 7`;
  const status = labels[claw.phase] || claw.message;
  if ($("status").textContent !== status) $("status").textContent = status;
}
function input() {
  let h = Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"));
  let v = Number(keys.has("ArrowUp")) - Number(keys.has("ArrowDown"));
  const stepping = keys.has("ControlLeft") || keys.has("ControlRight");
  if (stepping) h = v = 0;
  let rotation = Number(keys.has("KeyX")) - Number(keys.has("KeyZ"));
  for (const action of touches.values()) {
    if (action === "up") v += 1;
    if (action === "down") v -= 1;
    if (action === "right") h += 1;
    if (action === "left") h -= 1;
    if (action === "rotate1") rotation += 1;
    if (action === "rotate-1") rotation -= 1;
  }
  const [x, y] = aimDirection(
    view,
    Math.max(-1, Math.min(1, h)),
    Math.max(-1, Math.min(1, v)),
  );
  return [
    x,
    y,
    Math.max(-1, Math.min(1, rotation)),
    fine || keys.has("ShiftLeft") || keys.has("ShiftRight"),
  ];
}
function loop(now) {
  if (started && !document.hidden) {
    lag += Math.min((now - previous) / 1000, 0.08);
    const values = input();
    while (lag >= claw.dt) {
      claw.step(...values);
      lag -= claw.dt;
    }
    for (const event of claw.events) playEffect(event);
    claw.events.length = 0;
  }
  previous = now;
  draw();
  requestAnimationFrame(loop);
}
function reset() {
  keys.clear();
  touches.clear();
  claw.reset();
  lag = 0;
  previous = performance.now();
}
function bindControls() {
  $("start").onclick = () => {
    started = true;
    $("welcome").hidden = true;
    previous = performance.now();
    playMusic();
  };
  $("pick").onclick = () => {
    if (started) {
      playMusic();
      claw.start();
    }
  };
  $("reset").onclick = () => {
    reset();
    playMusic();
  };
  $("sound").onclick = toggleSound;
  $("help").onclick = () => {
    const open = $("instructions").hidden;
    $("instructions").hidden = !open;
    $("help").setAttribute("aria-expanded", String(open));
  };
  $("fine").onclick = () => {
    fine = !fine;
    $("fine").setAttribute("aria-pressed", String(fine));
  };
  $("camera").onchange = (event) => {
    setCamera(Number(event.target.value));
    event.target.blur();
  };
  document.querySelectorAll("[data-move],[data-rotate]").forEach((button) => {
    const release = (event) => {
      touches.delete(event.pointerId);
      button.classList.remove("active");
    };
    button.addEventListener("pointerdown", (event) => {
      if (!started || event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      button.classList.add("active");
      const move = button.dataset.move;
      if (move && fine) {
        const directions = {
          up: [0, 1],
          down: [0, -1],
          left: [-1, 0],
          right: [1, 0],
        };
        claw.nudge(...aimDirection(view, ...directions[move]));
      } else
        touches.set(event.pointerId, move || `rotate${button.dataset.rotate}`);
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      button.addEventListener(type, release);
  });
  addEventListener("keydown", (event) => {
    if (!started) return;
    if (event.target instanceof HTMLSelectElement) return;
    const key = event.code;
    const handled = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Enter",
      "Tab",
      "KeyR",
      "KeyM",
      "KeyZ",
      "KeyX",
      "Digit1",
      "Digit2",
      "Digit3",
      "Digit4",
      "Digit5",
    ];
    if (handled.includes(key)) event.preventDefault();
    keys.add(key);
    if (event.repeat) return;
    if (event.ctrlKey && key.startsWith("Arrow")) {
      const directions = {
        ArrowUp: [0, 1],
        ArrowDown: [0, -1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      claw.nudge(...aimDirection(view, ...directions[key]));
    } else if (key === "Enter") claw.start();
    else if (key === "Tab") setCamera((view + 1) % 5);
    else if (/^Digit[1-5]$/.test(key)) setCamera(Number(key.slice(-1)) - 1);
    else if (key === "KeyR") reset();
    else if (key === "KeyM") toggleSound();
  });
  addEventListener("keyup", (event) => keys.delete(event.code));
  addEventListener("blur", () => {
    keys.clear();
    touches.clear();
  });
  document.addEventListener("visibilitychange", () => {
    keys.clear();
    touches.clear();
    lag = 0;
    previous = performance.now();
    if (document.hidden) {
      music.pause();
      for (const audio of Object.values(sounds)) audio.pause();
    } else playMusic();
  });
  addEventListener("pagehide", () => {
    music.pause();
    for (const audio of Object.values(sounds)) audio.pause();
  });
}
async function boot() {
  try {
    const [graphics, physics, xml] = await Promise.all([
      import(CDN + "three@0.187.0/build/three.module.js"),
      import(CDN + "@mujoco/mujoco@4.0.1/mujoco.js"),
      fetch("./claw.xml").then((response) => {
        if (!response.ok) throw new Error("모델을 불러오지 못했어요");
        return response.text();
      }),
    ]);
    THREE = graphics;
    $("loading").textContent = "인형이 움직일 준비를 하고 있어요…";
    const mj = await physics.default({
      locateFile: (file) => CDN + "@mujoco/mujoco@4.0.1/" + file,
    });
    claw = new Claw(mj, xml);
    initializeScene();
    initializeAudio();
    bindControls();
    $("loading").textContent =
      "일곱 인형을 모아보세요. 소리는 시작 후 재생돼요.";
    $("start").disabled = false;
    $("start").textContent = "게임 시작";
    requestAnimationFrame(loop);
  } catch (error) {
    console.error(error);
    $("loading").textContent =
      "게임을 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.";
    $("start").disabled = false;
    $("start").textContent = "다시 불러오기";
    $("start").onclick = () => location.reload();
    $("status").textContent = "게임 로딩에 실패했어요";
  }
}
boot();
