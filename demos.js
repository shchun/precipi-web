// 데모 목록 — 새 데모는 여기에 객체 하나만 추가하면 됩니다.
// 필드: icon, title, desc, href, path(생략 시 href 사용), install(설치 URL이 있을 때만),
//       tags(필터용 카테고리 배열 — 아래 filters의 id와 일치)
const demos = [
  {
    icon: "🪐",
    title: "태양계 N-body 시뮬레이션",
    titleEn: "Solar System N-body Sim",
    desc: "태양·수성·금성·지구·화성·목성을 실제 질량/거리로 2D(탑뷰)에서 시뮬레이션하고, 탐사선 슬링샷(목성) 경로도 찾아봅니다.",
    descEn: "Simulate the Sun, Mercury, Venus, Earth, Mars, and Jupiter in 2D with real mass/distance ratios. Includes a Jupiter slingshot trajectory finder.",
    href: "solar-system-sim/index.html",
    tags: ["space", "sim"],
  },
  {
    icon: "🌌",
    title: "랜덤 3체 관찰기",
    titleEn: "Random 3-Body Observer",
    desc: "랜덤·안정 궤도 프리셋으로 3체계를 관찰하고, 선택한 물체에서 본 하늘과 질량/속도/중심거리 변화를 함께 봅니다.",
    descEn: "Observe 3-body systems with random or stable orbit presets. Watch the sky from any body and track mass, velocity, and distance changes.",
    href: "three-body-random/index.html",
    tags: ["space", "sim"],
  },
  {
    icon: "🏢",
    title: "엘리베이터 시뮬레이션",
    titleEn: "Elevator Simulation",
    desc: "10층 타워의 여러 엘리베이터가 호출, 탑승, 하차 요청을 처리하는 운영 시뮬레이션입니다.",
    descEn: "An operational simulation of multiple elevators in a 10-floor tower handling call, board, and exit requests.",
    href: "elevator-sim/index.html",
    tags: ["sim"],
  },
  {
    icon: "🌀",
    title: "프랙탈 탐색기",
    titleEn: "Fractal Explorer",
    desc: "p5.js로 만든 카오스 프랙탈을 탐색하는 인터랙티브 페이지입니다.",
    descEn: "An interactive p5.js fractal explorer for diving into chaotic fractal patterns.",
    href: "fractal_explorer/index.html",
    tags: ["art"],
  },
  {
    icon: "🪼",
    title: "네뷸라 생각들",
    titleEn: "Nebula Thoughts",
    desc: "네뷸라 배경에서 떠다니는 생물들이 직장인 속마음을 말풍선으로 보여줍니다. 해파리·문어 중 선택하고 개수와 색상 테마도 바꿀 수 있어요. 터치하면 도망갑니다.",
    descEn: "Creatures floating in a nebula background share thoughts in speech bubbles. Choose jellyfish or octopus, adjust count and color theme. Tap to make them flee.",
    href: "nebula.html",
    download: "https://github.com/shchun/precipi-web/releases/download/screensaver-v1/NebulaThoughts.scr",
    downloadLabel: "🖥️ 윈도우 스크린세이버",
    downloadLabelEn: "🖥️ Windows Screensaver",
    tags: ["art"],
  },
  {
    icon: "🚀",
    title: "Falcon 9 1단 회수 시뮬레이터",
    titleEn: "Falcon 9 Booster Recovery Sim",
    desc: "발사부터 단 분리, 부스트백·역추진·착륙 번까지 Falcon 9 1단의 회수 과정을 시뮬레이션합니다.",
    descEn: "Simulate the Falcon 9 first stage recovery — from launch and separation through boostback, entry burn, and landing.",
    href: "falcon9_sim_10/index.html",
    tags: ["space", "sim"],
  },
  {
    icon: "📦",
    title: "Fold Hologram 3D",
    titleEn: "Fold Hologram 3D",
    desc: "종이를 접듯 3D 도형을 펼치고 접으며 홀로그램처럼 관찰하는 인터랙티브 작품입니다.",
    descEn: "Unfold and fold 3D shapes like paper and observe them like a hologram in this interactive art piece.",
    href: "3d-fold/fold3d-bundle.html",
    tags: ["art"],
  },
  {
    icon: "🎆",
    title: "한강 불꽃축제",
    titleEn: "Han River Fireworks",
    desc: "밤하늘 화면을 클릭하면 불꽃이 터지는 인터랙티브 불꽃놀이 작품입니다.",
    descEn: "Click the night sky to launch fireworks in this interactive fireworks display.",
    href: "hanang_fireworks/index.html",
    tags: ["art"],
  },
  {
    icon: "✏️",
    title: "스크리블",
    titleEn: "Scribble",
    desc: "펜·형광펜·지우개로 그리고 PNG로 저장하는 간단한 브라우저 스케치 앱입니다.",
    descEn: "A simple browser sketch app with pen, highlighter, and eraser tools. Save your drawing as PNG.",
    href: "scribble/index.html",
    install: "scribble/index.html?install",
    tags: ["tool"],
  },
  {
    icon: "🕐",
    title: "데스크 클락",
    titleEn: "Desk Clock",
    desc: "여러 시계 페이스를 넘기며 보는 미니멀 탁상시계입니다. 전체화면·다크 테마로 책상 위 디스플레이에 잘 어울립니다.",
    descEn: "A minimal desk clock with multiple swappable clock faces. Fullscreen, dark-themed — perfect as an always-on desk display.",
    href: "deskclock/index.html",
    install: "deskclock/index.html",
    download: "https://github.com/shchun/precipi-web/releases/download/apks-v1/deskclock-debug.apk",
    downloadLabel: "📱 안드로이드 APK",
    downloadLabelEn: "📱 Android APK",
    tags: ["tool"],
  },
  {
    icon: "🍅",
    title: "뽀모도로 타이머",
    titleEn: "Pomodoro Timer",
    desc: "25분 집중·휴식을 반복하며 생산성을 높이는 미니멀 뽀모도로 타이머입니다.",
    descEn: "A minimal pomodoro timer that cycles focus and break sessions to boost productivity.",
    href: "pomodoro/index.html",
    install: "pomodoro/index.html",
    tags: ["tool"],
  },
  {
    icon: "🧩",
    title: "Jsongo · JSON 린터",
    titleEn: "Jsongo · JSON Linter",
    desc: "JSON을 실시간으로 검사·정렬하고 오류 위치와 원인을 짚어주는 린터입니다.",
    descEn: "A real-time JSON inspector that validates, formats, and pinpoints errors with their exact location and cause.",
    href: "Jsongo.html",
    tags: ["tool"],
  },
  {
    icon: "💬",
    title: "자막",
    titleEn: "Jamak · Live Captions",
    desc: "음성을 실시간으로 자막으로 변환해 주는 웹 앱입니다.",
    descEn: "A web app that converts speech to live captions in real time.",
    href: "https://jamak.precipi.com/",
    path: "jamak.precipi.com",
    install: "https://jamak.precipi.com/?install",
    tags: ["tool"],
  },
];

// 필터 버튼 정의. id가 "all"이면 전체, "installable"이면 install 필드가 있는 카드,
// 그 외에는 demo.tags에 해당 id가 포함된 카드만 보여줍니다.
const filters = [
  { id: "all",         label: "전체",        labelEn: "All" },
  { id: "space",       label: "🪐 우주",     labelEn: "🪐 Space" },
  { id: "sim",         label: "⚙️ 시뮬레이션", labelEn: "⚙️ Simulation" },
  { id: "art",         label: "🎨 아트",     labelEn: "🎨 Art" },
  { id: "tool",        label: "🛠 도구",     labelEn: "🛠 Tool" },
  { id: "installable", label: "⬇ 설치 가능", labelEn: "⬇ Installable" },
];

function demoMatchesFilter(demo, filterId) {
  if (filterId === "all") return true;
  if (filterId === "installable") return Boolean(demo.install);
  return Array.isArray(demo.tags) && demo.tags.includes(filterId);
}

function renderDemos(grid) {
  for (let i = 0; i < demos.length; i++) {
    const d = demos[i];
    const card = document.createElement("a");
    card.href = d.href;
    card.className = "demo-card";
    card._demo = d;
    card.dataset.demoIdx = i;

    const h2 = document.createElement("h2");
    h2.className = "card-title";
    h2.textContent = `${d.icon} ${d.title}`;
    card.appendChild(h2);

    const p = document.createElement("p");
    p.className = "card-desc";
    p.textContent = d.desc;
    card.appendChild(p);

    const pathLabel = d.path || d.href;
    const path = document.createElement("span");
    path.className = "path";
    path.textContent = pathLabel;

    if (d.install || d.download) {
      const actions = document.createElement("div");
      actions.className = "card-actions";
      actions.appendChild(path);

      if (d.install) {
        const pill = document.createElement("span");
        pill.className = "install-pill";
        pill.setAttribute("role", "button");
        pill.textContent = "⬇ 설치";
        pill.dataset.installPill = "1";
        pill.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          location.href = d.install;
        });
        actions.appendChild(pill);
      }

      if (d.download) {
        const dl = document.createElement("span");
        dl.className = "install-pill";
        dl.setAttribute("role", "button");
        const _lang = localStorage.getItem('lang') || 'ko';
        dl.textContent = (_lang === 'en' && d.downloadLabelEn) ? d.downloadLabelEn : (d.downloadLabel || "⬇ 다운로드");
        dl.dataset.dlPill = "1";
        dl.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.gtag) gtag("event", "screensaver_download", { demo: d.title });
          location.href = d.download;
        });
        actions.appendChild(dl);
      }

      card.appendChild(actions);
    } else {
      card.appendChild(path);
    }

    grid.appendChild(card);
  }
}

function renderFilters(bar, grid) {
  const buttons = [];

  function applyFilter(filterId) {
    for (const btn of buttons) {
      btn.classList.toggle("is-active", btn.dataset.filter === filterId);
    }
    for (const card of grid.children) {
      const show = demoMatchesFilter(card._demo, filterId);
      card.style.display = show ? "" : "none";
    }
  }

  for (const f of filters) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-btn";
    btn.dataset.filter = f.id;
    btn.textContent = f.label;
    btn.addEventListener("click", () => applyFilter(f.id));
    bar.appendChild(btn);
    buttons.push(btn);
  }

  applyFilter("all");
}

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("demos-grid");
  if (grid) renderDemos(grid);

  const bar = document.getElementById("demo-filters");
  if (bar && grid) renderFilters(bar, grid);

  // 렌더 완료 후 언어 적용 (index.html의 applyLang 호출)
  if (window.applyLang) window.applyLang(window.currentLang || localStorage.getItem('lang') || 'ko');
});
