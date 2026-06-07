// 데모 목록 — 새 데모는 여기에 객체 하나만 추가하면 됩니다.
// 필드: icon, title, desc, href, path(생략 시 href 사용), install(설치 URL이 있을 때만)
const demos = [
  {
    icon: "🪐",
    title: "태양계 N-body 시뮬레이션",
    desc: "태양·수성·금성·지구·화성·목성을 실제 질량/거리로 2D(탑뷰)에서 시뮬레이션하고, 탐사선 슬링샷(목성) 경로도 찾아봅니다.",
    href: "solar-system-sim/index.html",
  },
  {
    icon: "🌌",
    title: "랜덤 3체 관찰기",
    desc: "랜덤·안정 궤도 프리셋으로 3체계를 관찰하고, 선택한 물체에서 본 하늘과 질량/속도/중심거리 변화를 함께 봅니다.",
    href: "three-body-random/index.html",
  },
  {
    icon: "🏢",
    title: "엘리베이터 시뮬레이션",
    desc: "10층 타워의 여러 엘리베이터가 호출, 탑승, 하차 요청을 처리하는 운영 시뮬레이션입니다.",
    href: "elevator-sim/index.html",
  },
  {
    icon: "🌀",
    title: "프랙탈 탐색기",
    desc: "p5.js로 만든 카오스 프랙탈을 탐색하는 인터랙티브 페이지입니다.",
    href: "fractal_explorer/index.html",
  },
  {
    icon: "🐙",
    title: "문어 네뷸라",
    desc: "네뷸라 배경에서 떠다니는 문어들이 생각을 말풍선으로 보여주는 인터랙티브 작품입니다.",
    href: "octo.html",
  },
  {
    icon: "🚀",
    title: "Falcon 9 1단 회수 시뮬레이터",
    desc: "발사부터 단 분리, 부스트백·역추진·착륙 번까지 Falcon 9 1단의 회수 과정을 시뮬레이션합니다.",
    href: "falcon9_sim_10/index.html",
  },
  {
    icon: "🎆",
    title: "한강 불꽃축제",
    desc: "밤하늘 화면을 클릭하면 불꽃이 터지는 인터랙티브 불꽃놀이 작품입니다.",
    href: "hanang_fireworks/index.html",
  },
  {
    icon: "✏️",
    title: "스크리블",
    desc: "펜·형광펜·지우개로 그리고 PNG로 저장하는 간단한 브라우저 스케치 앱입니다.",
    href: "scribble/index.html",
    install: "scribble/index.html?install",
  },
  {
    icon: "🧩",
    title: "Jsongo · JSON 린터",
    desc: "JSON을 실시간으로 검사·정렬하고 오류 위치와 원인을 짚어주는 린터입니다.",
    href: "Jsongo.html",
  },
  {
    icon: "💬",
    title: "자막",
    desc: "음성을 실시간으로 자막으로 변환해 주는 웹 앱입니다.",
    href: "https://jamak.precipi.com/",
    path: "jamak.precipi.com",
    install: "https://jamak.precipi.com/?install",
  },
];

function renderDemos(grid) {
  for (const d of demos) {
    const card = document.createElement("a");
    card.href = d.href;
    card.className = "demo-card";

    const h2 = document.createElement("h2");
    h2.textContent = `${d.icon} ${d.title}`;
    card.appendChild(h2);

    const p = document.createElement("p");
    p.textContent = d.desc;
    card.appendChild(p);

    const pathLabel = d.path || d.href;
    const path = document.createElement("span");
    path.className = "path";
    path.textContent = pathLabel;

    if (d.install) {
      const actions = document.createElement("div");
      actions.className = "card-actions";
      actions.appendChild(path);

      const pill = document.createElement("span");
      pill.className = "install-pill";
      pill.setAttribute("role", "button");
      pill.textContent = "⬇ 설치";
      pill.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        location.href = d.install;
      });
      actions.appendChild(pill);

      card.appendChild(actions);
    } else {
      card.appendChild(path);
    }

    grid.appendChild(card);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("demos-grid");
  if (grid) renderDemos(grid);
});
