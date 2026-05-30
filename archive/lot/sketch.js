let characters = [];
let winnerIndex;
let isWinnerShown = false;
let img, sound;
let confetti = [];
let numCharacters = 0;

function preload() {
  img = loadImage("congrats.png");
  sound = loadSound("congrats.mp3");
}

function setup() {
  createCanvas(800, 600);

  askUserForCount();

  const resetBtn = select("#reset-btn");
  resetBtn.mousePressed(() => {
    isWinnerShown = false;
    characters = [];
    confetti = [];
    askUserForCount();
    resetBtn.hide();
  });
}

function askUserForCount() {
  let input = prompt("원(캐릭터)을 몇 개로 할까요? (3~15 사이)", "12");
  numCharacters = constrain(int(input), 3, 15);
  setupCharacters();
}

function setupCharacters() {
  let radius = 250;
  let centerX = width / 2;
  let centerY = height / 2;

  for (let i = 0; i < numCharacters; i++) {
    let angle = TWO_PI * i / numCharacters;
    let x = centerX + cos(angle) * radius;
    let y = centerY + sin(angle) * radius;
    characters.push({ x, y, touched: false });
  }

  winnerIndex = floor(random(numCharacters));
}

function draw() {
  background(255);

  for (let i = 0; i < characters.length; i++) {
    let c = characters[i];
    drawCharacter(c.x, c.y, i, c.touched || (i === winnerIndex && isWinnerShown));
  }

  if (isWinnerShown) {
    imageMode(CENTER);
    image(img, width / 2, height / 2, 200, 200);

    for (let conf of confetti) {
      conf.update();
      conf.show();
    }

    select("#reset-btn").show();
  }
}

function mousePressed() {
  if (isWinnerShown) return;

  for (let i = 0; i < characters.length; i++) {
    let c = characters[i];
    let d = dist(mouseX, mouseY, c.x, c.y);

    if (d < 40) {
      c.touched = true;

      if (i === winnerIndex) {
        isWinnerShown = true;
        sound.play();
        for (let j = 0; j < 100; j++) {
          confetti.push(new Confetti());
        }
      }
      break;
    }
  }
}

function drawCharacter(x, y, id, highlight) {
  push();
  translate(x, y);
  stroke(0);
  strokeWeight(2);
  fill(highlight ? color(255, 204, 0) : 255);
  ellipse(0, 0, 60, 60); // 얼굴
  fill(0);
  ellipse(-10, -5, 8, 8); // 눈
  ellipse(10, -5, 8, 8);
  noFill();
  strokeWeight(2);
  arc(0, 10, 30, 20, 0, PI); // 입
  pop();
}

class Confetti {
  constructor() {
    this.x = random(width);
    this.y = random(-100, 0);
    this.size = random(5, 10);
    this.speed = random(1, 5);
    this.color = color(random(255), random(255), random(255));
  }

  update() {
    this.y += this.speed;
  }

  show() {
    noStroke();
    fill(this.color);
    ellipse(this.x, this.y, this.size);
  }
}
