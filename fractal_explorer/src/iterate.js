// iterate.js — the per-pixel escape-time loop.
// Runs zₙ₊₁ = f(zₙ) + c for the selected formula and returns the (optionally
// smoothed) iteration count at which the orbit escapes, or state.iter if it
// never does. Pure: reads everything it needs from the passed-in `state`.
// Exposed as window.fractalIterate.

(function () {
  function iterate(state, x0, y0, zx0, zy0){
    let x = zx0, y = zy0;
    let xPrev = 0, yPrev = 0;
    const bail = state.bailout;
    const max = state.iter;
    const mode = state.mode;
    const pw = state.power;
    const isInt2 = Math.abs(pw - 2) < 0.001;
    const logBase = Math.log(Math.max(2, pw));

    for (let i = 0; i < max; i++){
      const r2 = x*x + y*y;
      if (r2 > bail) {
        if (state.smooth){
          const logZn = Math.log(r2) / 2;
          const nu = Math.log(logZn / Math.LN2) / logBase;
          return i + 1 - nu;
        }
        return i;
      }

      let nx, ny;
      if (mode === 'tricorn'){
        const cy = -y;
        nx = x*x - cy*cy + x0;
        ny = 2*x*cy + y0;
      } else if (mode === 'burningship'){
        const ax = Math.abs(x), ay = Math.abs(y);
        nx = ax*ax - ay*ay + x0;
        ny = 2*ax*ay + y0;
      } else if (mode === 'phoenix'){
        nx = x*x - y*y + x0 + state.phoenixP * xPrev;
        ny = 2*x*y + y0 + state.phoenixP * yPrev;
        xPrev = x; yPrev = y;
      } else {
        if (isInt2){
          nx = x*x - y*y + x0;
          ny = 2*x*y + y0;
        } else {
          const r = Math.sqrt(r2);
          const theta = Math.atan2(y, x);
          const rn = Math.pow(r, pw);
          const tn = theta * pw;
          nx = rn * Math.cos(tn) + x0;
          ny = rn * Math.sin(tn) + y0;
        }
      }
      x = nx; y = ny;
    }
    return max;
  }

  window.fractalIterate = iterate;
})();
