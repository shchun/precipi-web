// hanang_fireworks · core: canvas, viewport size, scene layout ratios
// Classic script — shares top-level globals with the other src/*.js via the
// global lexical scope. Load order matters (see index.html).

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
});

// 사진 분위기에 맞춘 풍경 비율
// 상단 ~70%: 하늘, 70~78%: 다리/지평선, 78~100%: 강물
const HORIZON = () => H * 0.74;
const BRIDGE_Y = () => H * 0.74;
const WATER_TOP = () => H * 0.76;
