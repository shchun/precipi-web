// palettes.js — color palettes for the fractal renderer.
// Maps a normalized escape value t ∈ [0,1] to an [r, g, b] triple (0–255).
// Exposed as window.fractalPalette so the engine can look it up by name.

(function () {
  function pal(t, name){
    t = Math.max(0, Math.min(1, t));
    if (name === 'fire'){
      return [Math.min(255, 255*Math.pow(t,0.4))|0, (255*Math.pow(t,1.5))|0, (80*Math.pow(t,3))|0];
    } else if (name === 'ocean'){
      return [(20*t)|0, (180*Math.pow(t,0.7))|0, Math.min(255,(120+135*Math.pow(t,0.5)))|0];
    } else if (name === 'psyche'){
      return [
        (127+127*Math.sin(t*Math.PI*2))|0,
        (127+127*Math.sin(t*Math.PI*2+2.094))|0,
        (127+127*Math.sin(t*Math.PI*2+4.188))|0
      ];
    } else if (name === 'electric'){
      return [(200*Math.pow(t,2))|0, (100+155*t)|0, (255*Math.pow(t,0.3))|0];
    } else if (name === 'forest'){
      return [(60+80*t)|0, (180*Math.pow(t,0.5))|0, (40+60*t)|0];
    } else if (name === 'ember'){
      return [Math.min(255,(180+75*Math.pow(t,0.3)))|0, (60*Math.pow(t,1.2))|0, (20*Math.pow(t,3))|0];
    } else if (name === 'rainbow'){
      const h = t * 360;
      const s = 0.8, v = 0.95;
      const c = v*s, x = c*(1-Math.abs((h/60)%2-1)), m = v-c;
      let r,g,b;
      if (h<60){r=c;g=x;b=0;} else if (h<120){r=x;g=c;b=0;}
      else if (h<180){r=0;g=c;b=x;} else if (h<240){r=0;g=x;b=c;}
      else if (h<300){r=x;g=0;b=c;} else {r=c;g=0;b=x;}
      return [((r+m)*255)|0, ((g+m)*255)|0, ((b+m)*255)|0];
    } else {
      const v = (255*Math.pow(t,0.5))|0;
      return [v,v,v];
    }
  }

  window.fractalPalette = pal;
})();
