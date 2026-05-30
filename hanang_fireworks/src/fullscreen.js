(function () {
  var btn = document.getElementById('fsBtn');
  if (!btn) return;
  function isFullscreen() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function toggleFullscreen() {
    if (!isFullscreen()) {
      var el = document.documentElement;
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) { var p = req.call(el); if (p && p.catch) p.catch(function(){}); }
    } else {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) { var q = exit.call(document); if (q && q.catch) q.catch(function(){}); }
    }
  }
  function sync() {
    btn.textContent = isFullscreen() ? '전체화면 해제' : '전체화면';
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleFullscreen();
  });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
})();
