// controls.js — wires the side-panel inputs (formula, compute, color, viewport,
// locations, export) to the render state and triggers redraws.
// Reads the shared state and helpers from window.Fractal (engine.js).

(function () {
  const { state, redraw, syncViewportInputs, saveCanvas } = window.Fractal;

  function bindRange(id, valId, key, fmt){
    const el = document.getElementById(id), v = document.getElementById(valId);
    el.addEventListener('input', () => {
      state[key] = parseFloat(el.value);
      v.textContent = fmt ? fmt(state[key]) : state[key];
    });
    el.addEventListener('change', redraw);
  }

  bindRange('power', 'powerVal', 'power', x => x.toFixed(1));
  bindRange('cRe', 'cReVal', 'cRe', x => x.toFixed(3));
  bindRange('cIm', 'cImVal', 'cIm', x => x.toFixed(3));
  bindRange('phoenixP', 'phoenixPVal', 'phoenixP', x => x.toFixed(3));
  bindRange('iter', 'iterVal', 'iter', x => x|0);
  bindRange('bailout', 'bailoutVal', 'bailout', x => x|0);
  bindRange('colorCycle', 'colorCycleVal', 'colorCycle', x => x.toFixed(1));
  bindRange('colorOffset', 'colorOffsetVal', 'colorOffset', x => x.toFixed(2));
  bindRange('gamma', 'gammaVal', 'gamma', x => x.toFixed(2));

  document.getElementById('mode').addEventListener('change', e => {
    state.mode = e.target.value;
    document.getElementById('juliaControls').classList.toggle('hidden', state.mode !== 'julia');
    document.getElementById('phoenixControls').classList.toggle('hidden', state.mode !== 'phoenix');
    redraw();
  });

  document.getElementById('juliaPreset').addEventListener('change', e => {
    if (!e.target.value) return;
    const [r, i] = e.target.value.split(',').map(parseFloat);
    state.cRe = r; state.cIm = i;
    document.getElementById('cRe').value = r;
    document.getElementById('cIm').value = i;
    document.getElementById('cReVal').textContent = r.toFixed(3);
    document.getElementById('cImVal').textContent = i.toFixed(3);
    redraw();
  });

  document.getElementById('resolution').addEventListener('change', e => {
    state.resolution = parseInt(e.target.value); redraw();
  });
  document.getElementById('palette').addEventListener('change', e => {
    state.palette = e.target.value; redraw();
  });
  document.getElementById('smooth').addEventListener('change', e => {
    state.smooth = e.target.checked; redraw();
  });
  document.getElementById('invert').addEventListener('change', e => {
    state.invert = e.target.checked; redraw();
  });

  document.getElementById('apply').addEventListener('click', () => {
    state.viewX = parseFloat(document.getElementById('centerX').value);
    state.viewY = parseFloat(document.getElementById('centerY').value);
    state.viewScale = parseFloat(document.getElementById('scaleIn').value);
    redraw();
  });

  document.getElementById('reset').addEventListener('click', () => {
    if (state.mode === 'julia'){
      state.viewX = 0; state.viewY = 0; state.viewScale = 3.5;
    } else if (state.mode === 'burningship'){
      state.viewX = -0.5; state.viewY = -0.5; state.viewScale = 3.5;
    } else {
      state.viewX = -0.7; state.viewY = 0; state.viewScale = 3.0;
    }
    syncViewportInputs();
    redraw();
  });

  document.getElementById('randomBtn').addEventListener('click', () => {
    state.mode = 'julia';
    document.getElementById('mode').value = 'julia';
    document.getElementById('juliaControls').classList.remove('hidden');
    document.getElementById('phoenixControls').classList.add('hidden');
    state.cRe = (Math.random()*2 - 1) * 0.9;
    state.cIm = (Math.random()*2 - 1) * 0.9;
    document.getElementById('cRe').value = state.cRe;
    document.getElementById('cIm').value = state.cIm;
    document.getElementById('cReVal').textContent = state.cRe.toFixed(3);
    document.getElementById('cImVal').textContent = state.cIm.toFixed(3);
    state.viewX = 0; state.viewY = 0; state.viewScale = 3.5;
    syncViewportInputs();
    redraw();
  });

  const locations = {
    seahorse: { x: -0.745, y: 0.113, s: 0.02, iter: 400 },
    elephant: { x: 0.275, y: 0, s: 0.04, iter: 300 },
    mini:     { x: -1.7499, y: 0, s: 0.005, iter: 500 },
    spiral:   { x: -0.088, y: 0.654, s: 0.01, iter: 400 },
    needle:   { x: -1.77, y: 0, s: 0.1, iter: 300 },
    deep:     { x: -0.743643887037151, y: 0.131825904205330, s: 0.000003, iter: 1000 }
  };

  document.querySelectorAll('[data-loc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const loc = locations[btn.dataset.loc];
      state.mode = 'mandelbrot';
      document.getElementById('mode').value = 'mandelbrot';
      document.getElementById('juliaControls').classList.add('hidden');
      document.getElementById('phoenixControls').classList.add('hidden');
      state.viewX = loc.x; state.viewY = loc.y; state.viewScale = loc.s;
      if (loc.iter){
        state.iter = loc.iter;
        document.getElementById('iter').value = loc.iter;
        document.getElementById('iterVal').textContent = loc.iter;
      }
      syncViewportInputs();
      redraw();
    });
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const name = `fractal_${state.mode}_${Date.now()}`;
    saveCanvas(name);
  });

  document.getElementById('copyParams').addEventListener('click', () => {
    const params = JSON.stringify(state, null, 2);
    navigator.clipboard.writeText(params).then(() => {
      const btn = document.getElementById('copyParams');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = orig, 1200);
    });
  });
})();
