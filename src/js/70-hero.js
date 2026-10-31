/* Landing hero: a slowly turning night globe, every ranked place a point of light coloured by fit for the chosen household.
   The drawing code lives in /assets/globe.js and loads once the start page is idle, so the start page stays light. */
var HERO = { canvases: null, g: null, meta: null, prof: 'young_family' };
function heroInit() {
  var wrap = $('#cine'); if (!wrap || HERO.canvases) return;
  if (S.view === 'explore') return;
  HERO.canvases = [$('#cine-a')];
  var fail = function () { wrap.classList.add('static'); if (HERO.canvases[0]) HERO.canvases[0].style.opacity = 0; };
  if ((navigator.connection || {}).saveData) { fail(); return; }
  var p = $('.who [aria-pressed="true"]'); if (p) HERO.prof = p.dataset.heroprof || p.dataset.who;
  var go = function () {
    loadScript('/assets/globe.js?v=' + VERSION).then(function () {
      HERO.g = window.NZGLOBE({ wrap: wrap, canvas: HERO.canvases[0], v: VERSION, prof: HERO.prof, active: function () { return S.view !== 'explore'; }, fail: fail,
        ready: function (meta) { HERO.meta = meta; HERO.canvases[0].style.opacity = 1; wrap.classList.add('globe-on'); } });
    }, fail);
  };
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 900 }); else setTimeout(go, 200);
}
function heroWake() { if (HERO.g) HERO.g.wake(); }
function heroSetProfile(k) {
  HERO.prof = k;
  var known = HERO.g ? HERO.g.set(k) : true;
  var cap = $('#cine-prof'); if (cap && known && ENGINE && ENGINE.profiles[k]) cap.textContent = ENGINE.profiles[k].name.toLowerCase();
}
