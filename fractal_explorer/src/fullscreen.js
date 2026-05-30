// fullscreen.js — toggles fullscreen for the canvas viewport only (not the
// whole document), and nudges the engine's resize handler so the canvas
// re-renders at the new size.

(function () {
  var btn = document.getElementById('fsBtn');
  var holder = document.getElementById('canvasHolder');
  if (!btn || !holder) return;
  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  function toggleFullscreen() {
    if (fsElement() !== holder) {
      var req = holder.requestFullscreen || holder.webkitRequestFullscreen;
      if (req) { var p = req.call(holder); if (p && p.catch) p.catch(function(){}); }
    } else {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) { var q = exit.call(document); if (q && q.catch) q.catch(function(){}); }
    }
  }
  function sync() {
    var on = fsElement() === holder;
    btn.textContent = on ? '전체화면 해제' : '전체화면';
    // 컨테이너 크기 변화에 맞춰 캔버스가 다시 그려지도록 resize 핸들러를 깨운다
    window.dispatchEvent(new Event('resize'));
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); toggleFullscreen(); });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
})();
