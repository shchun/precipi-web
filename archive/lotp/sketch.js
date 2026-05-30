let numCircles = 0;
let circles = [];
let winnerIdx = -1;
let state = 'input'; // 'input', 'playing', 'win'
let congratsImg, congratsSound;
let confettis = [];
let canvas;
const CANVAS_W = 800, CANVAS_H = 600;

// 사전 로드
function preload() {
  congratsImg = loadImage('congrats.png');
  congratsSound = loadSound('congrats.mp3');
}

function setup() {
  canvas = createCanvas(CANVAS_W, CANVAS_H);
  canvas.parent('sketch-holder');
  showInputPrompt();
  setupRestartButton();
  loop();
}

function showInputPrompt() {
  setTimeout(() => {
    let input = prompt('추첨할 캐릭터(원)의 개수를 입력하세요 (3~15):', '7');
    if (input === null) {
      input = 7;
    }
    input = int(input);
    if (isNaN(input) || input < 3 || input > 15) {
      alert('3~15 사이의 숫자를 입력해주세요.');
      showInputPrompt();
      return;
    }
    numCircles = input;
    startGame();
  }, 100);
}

function startGame() {
  state = 'playing';
  circles = [];
  confettis = [];
  winnerIdx = floor(random(numCircles));
  let centerX = width/2, centerY = height/2;
  let radius = min(width, height) * 0.33;
  let angleStep = TWO_PI / numCircles;
  for (let i = 0; i < numCircles; i++) {
    let angle = i * angleStep - PI/2;
    let x = centerX + cos(angle) * radius;
    let y = centerY + sin(angle) * radius;
    circles.push(new CuteCircle(x, y, 80, i));
  }
  document.getElementById('restart-btn').style.display = 'none';
  loop();
}

function draw() {
  background('#f7f7fc');
  if (state === 'playing' || state === 'win') {
    for (let c of circles) {
      // 눌림 애니메이션: 마우스가 해당 원 위에 있고, 마우스가 눌렸으면 pressed = true
      if (state === 'playing' && c.isMouseOver(mouseX, mouseY) && mouseIsPressed && !c.clicked) {
        c.pressed = true;
      } else {
        c.pressed = false;
      }
      c.display();
    }
  }
  if (state === 'win') {
    for (let conf of confettis) conf.updateAndDraw();
    imageMode(CENTER);
    image(congratsImg, width/2, height/2, 512, 512);
  }
}

function mousePressed() {
  if (state !== 'playing') return;
  for (let i = 0; i < circles.length; i++) {
    let c = circles[i];
    if (c.isMouseOver(mouseX, mouseY) && !c.clicked) {
      c.clicked = true; // 이미 클릭한 버튼 표시
      if (i === winnerIdx) {
        triggerWin();
      }
      // 당첨 아니면 표시만 남고 아무 일 없음
      break;
    }
  }
}

function touchStarted() {
  mousePressed();
}

function triggerWin() {
  state = 'win';
  // 컨페티 생성
  for (let i = 0; i < 90; i++) {
    confettis.push(new Confetti(width/2, height/2));
  }
  // 사운드
  if (congratsSound && congratsSound.isLoaded()) {
    congratsSound.play();
  }
  document.getElementById('restart-btn').style.display = 'block';
  loop();
}

function setupRestartButton() {
  const btn = document.getElementById('restart-btn');
  btn.onclick = () => {
    state = 'input';
    showInputPrompt();
  };
}

// -------------------------------
// 원형 캐릭터 클래스
class CuteCircle {
  constructor(x, y, r, idx) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.idx = idx;
    this.pressed = false;   // 마우스 눌림 애니메이션
    this.clicked = false;   // 이미 클릭한 상태
    // 랜덤 얼굴 표정
    this.eyeType = random(['dot', 'oval']);
    this.mouthType = random(['smile', 'open', 'flat']);
    this.faceColor = color(random(180,255), random(180,255), random(180,255));
    this.blink = random() < 0.2;
  }
  display() {
    push();
    translate(this.x, this.y);
    // 눌림 상태면 살짝 작아지고(0.9배), 밝아짐
    let scaleAmt = this.pressed ? 0.9 : 1;
    scale(scaleAmt);
    let faceCol = this.pressed ? lerpColor(this.faceColor, color(255), 0.2) : this.faceColor;
    noStroke();
    fill(faceCol);
    ellipse(0, 0, this.r, this.r);

    // 이미 클릭한 경우 반투명 회색 오버레이 + X표시
    if (this.clicked && !(state === 'win' && this.idx === winnerIdx)) {
      fill(80, 80, 80, 90);
      ellipse(0, 0, this.r, this.r);
      stroke(120, 80, 80, 180);
      strokeWeight(6);
      line(-this.r*0.25, -this.r*0.25, this.r*0.25, this.r*0.25);
      line(this.r*0.25, -this.r*0.25, -this.r*0.25, this.r*0.25);
    }

    // 볼터치
    fill(255, 180, 180, 120);
    ellipse(-this.r*0.27, this.r*0.18, this.r*0.18, this.r*0.11);
    ellipse(this.r*0.27, this.r*0.18, this.r*0.18, this.r*0.11);
    // 눈
    fill(40);
    if (this.eyeType === 'dot') {
      ellipse(-this.r*0.19, -this.r*0.12, this.r*0.13, this.r*0.13);
      ellipse(this.r*0.19, -this.r*0.12, this.r*0.13, this.r*0.13);
    } else {
      ellipse(-this.r*0.19, -this.r*0.13, this.r*0.11, this.r*0.17);
      ellipse(this.r*0.19, -this.r*0.13, this.r*0.11, this.r*0.17);
    }
    // 입
    stroke(60);
    strokeWeight(3);
    noFill();
    if (this.mouthType === 'smile') {
      arc(0, this.r*0.12, this.r*0.28, this.r*0.17, 0, PI);
    } else if (this.mouthType === 'open') {
      fill(255,100,100);
      ellipse(0, this.r*0.13, this.r*0.13, this.r*0.13);
    } else {
      line(-this.r*0.08, this.r*0.13, this.r*0.08, this.r*0.13);
    }
    // 당첨 원이면 빛남
    if (state === 'win' && this.idx === winnerIdx) {
      noFill();
      stroke(255, 220, 80, 190);
      strokeWeight(7);
      ellipse(0, 0, this.r*1.18, this.r*1.18);
    }
    pop();
  }
  isMouseOver(mx, my) {
    return dist(mx, my, this.x, this.y) < this.r/2;
  }
}

// -------------------------------
// 컨페티 클래스
class Confetti {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    let angle = random(TWO_PI);
    let speed = random(4, 10);
    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed - random(2, 7);
    this.size = random(10, 22);
    this.color = color(random(255), random(255), random(255));
    this.gravity = 0.18;
    this.life = 0;
    this.maxLife = random(55, 90);
    this.shapeType = random(['circle', 'rect']);
  }
  updateAndDraw() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.life++;
    push();
    noStroke();
    fill(this.color);
    if (this.shapeType === 'circle') {
      ellipse(this.x, this.y, this.size, this.size);
    } else {
      rectMode(CENTER);
      rect(this.x, this.y, this.size, this.size*0.7, 6);
    }
    pop();
  }
}
