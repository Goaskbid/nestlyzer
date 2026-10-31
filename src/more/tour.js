/* The quick tour (part of the lazy module /assets/more.js since 2.7) */
var TOUR = [
  ['.profilebar', 'Who is moving?', 'Pick a household. Each one weighs costs, schools, quiet, jobs and access differently, and everything updates at once.'],
  ['.rail .scope, .rail .scope-summary', 'Where to look', 'Choose a country and region. Filters narrow it down: railway within 5 km, near a lake, mountainous, mild climate and more.'],
  ['#map', 'The map', 'Darker blue means a better fit. Numbered pins mark the best-ranked places you can see; zoom in for more. ' + TAP + ' any place to open it.'],
  ['.picks, .list', 'The ranking', 'Top picks first, then everything that fits. ' + TAP + ' a place to open it. ♥ puts it on your shortlist.'],
  ['.sl-btn, .mobile-tabs [data-mt="saved"]', 'Your shortlist', 'Everything you save lands here. Tick Compare on two or three places and see them side by side.'],
  ['[data-tools]', 'Tools', 'Records, surprise me, a small game, filters and map layers live here.']
];
var tourStep = 0;
function tourNext() { tourStep++; showTourStep(); }
function startTour() { closeTools(); var ti = $('#tour-invite'); if (ti) ti.remove(); tourStep = 0; showTourStep(); }
function visibleEl(sel) { return $$(sel).filter(function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; })[0]; }
function showTourStep() {
  var c = $('#coach');
  while (tourStep < TOUR.length && !visibleEl(TOUR[tourStep][0])) tourStep++;
  if (tourStep >= TOUR.length) return endTour();
  var t = TOUR[tourStep], el = visibleEl(t[0]), b = el.getBoundingClientRect();
  var pad = 6, box = { l: Math.max(4, b.left - pad), t: Math.max(4, b.top - pad), w: Math.min(innerWidth - 8, b.width + pad * 2), h: Math.min(innerHeight - 8, b.height + pad * 2) };
  var below = box.t + box.h + 190 < innerHeight, tipTop = below ? box.t + box.h + 10 : Math.max(10, box.t - 180);
  if (box.h > innerHeight * 0.6) tipTop = Math.min(innerHeight - 200, box.t + 24);
  var tipLeft = Math.min(Math.max(10, box.l), innerWidth - Math.min(340, innerWidth - 20) - 10);
  c.innerHTML = '<div class="coach-hole" style="left:' + box.l + 'px;top:' + box.t + 'px;width:' + box.w + 'px;height:' + box.h + 'px"></div><div class="coach-tip" role="dialog" aria-live="polite" style="left:' + tipLeft + 'px;top:' + tipTop + 'px"><span class="small muted">' + (tourStep + 1) + ' of ' + TOUR.length + '</span><h3>' + esc(t[1]) + '</h3><p>' + esc(t[2]) + '</p><div class="actions"><button class="btn btn-sm btn-ghost" type="button" data-tourend>Skip</button><button class="btn btn-sm btn-primary" type="button" data-tournext>' + (tourStep === TOUR.length - 1 ? 'Done' : 'Next') + '</button></div></div>';
  c.hidden = false;
  var nb = c.querySelector('[data-tournext]'); if (nb) nb.focus();
}
function endTour() { var c = $('#coach'); c.hidden = true; c.innerHTML = ''; store('toured', 1); var ti = $('#tour-invite'); if (ti) ti.remove(); }
