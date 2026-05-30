// engine.js — render state, the p5 sketch (draw loop + mouse/zoom/resize
// interaction), and the public surface the controls use.
// Depends on window.fractalPalette (palettes.js) and window.fractalIterate
// (iterate.js). Exposes window.Fractal = { state, redraw, syncViewportInputs,
// saveCanvas } for controls.js.

(function(){
  const pal = window.fractalPalette;
  const iterate = window.fractalIterate;

  const state = {
    mode: 'mandelbrot',
    power: 2,
    cRe: -0.7, cIm: 0.27015,
    phoenixP: -0.5,
    iter: 200,
    bailout: 4,
    resolution: 2,
    palette: 'fire',
    colorCycle: 4,
    colorOffset: 0,
    gamma: 1,
    smooth: true,
    invert: false,
    viewX: -0.7, viewY: 0, viewScale: 3.0
  };

  let W = 800, H = 600;
  let dragStart = null, dragEnd = null;
  let needsRedraw = true;
  let p5instance;
  let canvasEl = null;

  const sketch = (p) => {
    p.setup = () => {
      const holder = document.getElementById('canvasHolder');
      const rect = holder.getBoundingClientRect();
      W = Math.floor(rect.width);
      H = Math.floor(rect.height);
      const c = p.createCanvas(W, H);
      c.parent('canvasHolder');
      canvasEl = c.elt;
      p.pixelDensity(1);
      p.noLoop();

      c.elt.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        state.viewScale *= 2.0;
        syncViewportInputs();
        needsRedraw = true;
        p.redraw();
      });

      c.elt.addEventListener('mousemove', (e) => {
        const rect = c.elt.getBoundingClientRect();
        const px = (e.clientX - rect.left) * (W / rect.width);
        const py = (e.clientY - rect.top) * (H / rect.height);
        if (px>=0 && px<W && py>=0 && py<H){
          const aspect = W/H;
          const halfW = state.viewScale/2;
          const halfH = (state.viewScale/aspect)/2;
          const cx = state.viewX - halfW + (px/W)*state.viewScale;
          const cy = state.viewY - halfH + (py/H)*(state.viewScale/aspect);
          document.getElementById('coordInfo').textContent =
            cx.toFixed(6) + (cy >= 0 ? ' + ' : ' − ') + Math.abs(cy).toFixed(6) + 'i';
        }
      });

      window.addEventListener('resize', () => {
        const r = holder.getBoundingClientRect();
        const nw = Math.floor(r.width), nh = Math.floor(r.height);
        if (nw !== W || nh !== H){
          // 중심점(viewX, viewY)을 고정한 채, 세로 복소 높이를 보존한다.
          // viewScale은 가로 폭의 복소 단위이므로 세로 높이 = viewScale*(H/W).
          // 이 높이를 불변량으로 두면 리사이즈가 중간 크기로 여러 번 발생해도
          // (전환 경로에 무관하게) 항상 같은 결과로 수렴한다.
          // → 전체화면(넓은 비율)에서는 창 모드와 같은 세로 프레이밍이 유지되고
          //   여백이 좌우로만 늘어나며 프랙탈이 가운데에 머문다.
          if (W > 0 && H > 0 && nw > 0 && nh > 0){
            const complexHeight = state.viewScale * (H / W);
            state.viewScale = complexHeight * (nw / nh);
          }
          W = nw; H = nh;
          p.resizeCanvas(W, H);
          syncViewportInputs();
          needsRedraw = true;
          p.redraw();
        }
      });
    };

    p.draw = () => {
      if (!needsRedraw) { drawSelection(); return; }
      needsRedraw = false;

      const res = state.resolution;
      const sw = Math.floor(W/res), sh = Math.floor(H/res);

      const aspect = W/H;
      const halfW = state.viewScale/2;
      const halfH = (state.viewScale/aspect)/2;
      const xMin = state.viewX - halfW, xMax = state.viewX + halfW;
      const yMin = state.viewY - halfH, yMax = state.viewY + halfH;

      const buf = p.createImage(sw, sh);
      buf.loadPixels();

      for (let py = 0; py < sh; py++){
        for (let px = 0; px < sw; px++){
          const a = xMin + (px/sw)*(xMax-xMin);
          const b = yMin + (py/sh)*(yMax-yMin);
          let n;
          if (state.mode === 'julia'){
            n = iterate(state, state.cRe, state.cIm, a, b);
          } else {
            n = iterate(state, a, b, 0, 0);
          }

          let r,g,bb;
          if (n >= state.iter){
            r=0; g=0; bb=0;
          } else {
            let t = n / state.iter;
            t = Math.pow(t, state.gamma);
            t = (t * state.colorCycle + state.colorOffset) % 1;
            if (state.invert) t = 1 - t;
            [r,g,bb] = pal(t, state.palette);
          }
          const idx = 4*(py*sw + px);
          buf.pixels[idx]=r; buf.pixels[idx+1]=g; buf.pixels[idx+2]=bb; buf.pixels[idx+3]=255;
        }
      }
      buf.updatePixels();
      p.noSmooth();
      p.image(buf, 0, 0, W, H);
      drawSelection();
      updateZoomInfo();
    };

    function drawSelection(){
      if (dragStart && dragEnd){
        p.noFill();
        p.stroke(255,107,53,230);
        p.strokeWeight(1);
        const x = Math.min(dragStart.x, dragEnd.x);
        const y = Math.min(dragStart.y, dragEnd.y);
        const w = Math.abs(dragEnd.x - dragStart.x);
        const h = Math.abs(dragEnd.y - dragStart.y);
        p.rect(x,y,w,h);
      }
    }

    p.mousePressed = (e) => {
      // 캔버스 위에서 시작한 입력만 처리한다. (전체화면 버튼 등 캔버스 위에
      // 겹쳐 놓인 UI를 클릭했을 때 프랙탈이 재중심/줌되는 것을 막는다.)
      if (e && canvasEl && e.target !== canvasEl) return;
      if (p.mouseX<0||p.mouseX>W||p.mouseY<0||p.mouseY>H) return;
      dragStart = {x: p.mouseX, y: p.mouseY};
      dragEnd = null;
    };
    p.mouseDragged = () => {
      if (!dragStart) return;
      dragEnd = {x: p.mouseX, y: p.mouseY};
      p.redraw();
    };
    p.mouseReleased = () => {
      if (!dragStart){ return; }
      if (!dragEnd){
        const aspect = W/H;
        const halfW = state.viewScale/2;
        const halfH = (state.viewScale/aspect)/2;
        state.viewX = state.viewX - halfW + (p.mouseX/W)*state.viewScale;
        state.viewY = state.viewY - halfH + (p.mouseY/H)*(state.viewScale/aspect);
        state.viewScale *= 0.5;
        dragStart = null;
        syncViewportInputs();
        needsRedraw = true;
        p.redraw();
        return;
      }
      const x1 = Math.min(dragStart.x, dragEnd.x);
      const y1 = Math.min(dragStart.y, dragEnd.y);
      const x2 = Math.max(dragStart.x, dragEnd.x);
      const y2 = Math.max(dragStart.y, dragEnd.y);
      if (x2-x1 < 5 || y2-y1 < 5){ dragStart=null; dragEnd=null; return; }

      const aspect = W/H;
      const halfW = state.viewScale/2;
      const halfH = (state.viewScale/aspect)/2;
      const xMin = state.viewX - halfW, yMin = state.viewY - halfH;
      state.viewX = xMin + ((x1+x2)/2/W)*state.viewScale;
      state.viewY = yMin + ((y1+y2)/2/H)*(state.viewScale/aspect);
      state.viewScale = ((x2-x1)/W) * state.viewScale;

      dragStart = null; dragEnd = null;
      syncViewportInputs();
      needsRedraw = true;
      p.redraw();
    };

    p5instance = p;
  };

  function updateZoomInfo(){
    const z = 3.0 / state.viewScale;
    document.getElementById('zoomInfo').textContent =
      'zoom ' + (z >= 1000 ? z.toExponential(2) : z.toFixed(2)) + '×';
  }

  function syncViewportInputs(){
    document.getElementById('centerX').value = state.viewX.toFixed(8);
    document.getElementById('centerY').value = state.viewY.toFixed(8);
    document.getElementById('scaleIn').value = state.viewScale.toExponential(4);
  }

  function redraw(){ needsRedraw = true; p5instance && p5instance.redraw(); }

  function saveCanvas(base){
    if (p5instance) p5instance.saveCanvas(base, 'png');
  }

  new p5(sketch);

  // Public surface used by controls.js
  window.Fractal = { state, redraw, syncViewportInputs, saveCanvas };
})();
