/* All data, compare "Show all data" and the data catalogue: the code lives in /assets/more.js and loads the first
   time someone asks for it, so the start page stays light. This file holds the small parts that are needed at once
   and the bridge the lazy module uses to reach the app (names are looked up live, so RES and friends stay current). */
var NZI_LIVE = { S: function () { return S; }, RES: function () { return RES; }, BYID: function () { return BYID; }, ENGINE: function () { return ENGINE; }, META: function () { return META; } };
var NZI_FN = { PARAMS: PARAMS, ICON: ICON, AMEN_DEF: AMEN_DEF, PHOTO_SKIP: PHOTO_SKIP, pval: pval, pctOf: pctOf, pfmt: pfmt, placeX: placeX, profileDef: profileDef, scopeName: scopeName, depthKind: depthKind, shortCat: shortCat, fmt: fmt, fmtInt: fmtInt, fin: fin, esc: esc, demonym: demonym, unitWord: unitWord, terrainOf: terrainOf, climateOf: climateOf, countryName: countryName, tzOf: tzOf, languageLabel: languageLabel, nutsName: nutsName, localKind: localKind, localAreaOf: localAreaOf, extOn: extOn, liveFetch: liveFetch, km: km, flagImg: flagImg, regionStatsFor: regionStatsFor, amenitiesFor: amenitiesFor, climateFor: climateFor, wdFacts: wdFacts, openModal: openModal, closeTools: closeTools, profileIcon: profileIcon, heroSetProfile: heroSetProfile, $: $, $$: $$, stripTags: stripTags, placeContext: placeContext, jget: jget, stripParen: stripParen, PHOTOS: PHOTOS, jsPick: jsPick, EUROSTAT: EUROSTAT };
var NZI = new Proxy({}, { has: function (t, k) { return NZI_LIVE.hasOwnProperty(k) || NZI_FN.hasOwnProperty(k); }, get: function (t, k) { return NZI_LIVE.hasOwnProperty(k) ? NZI_LIVE[k]() : NZI_FN[k]; } });
var MORE = null, MOREX = null;
function moreLoad() {
  if (!MORE) MORE = loadScript('/assets/more.js?v=' + VERSION).then(function () { MOREX = window.NZX(NZI); return MOREX; }).catch(function (e) { MORE = null; throw e; });
  return MORE;
}
var MORE_FAIL = '<p class="small muted">Could not load. <button class="linkbtn" type="button" data-retry>Try again</button></p>';
function allDataHTML(r) { return '<div data-adslot="' + esc(r.id) + '"><div class="skeleton"><i></i><i></i></div></div>'; }
function adHydrate(r) {
  moreLoad().then(function (X) {
    var slot = $('#place [data-adslot="' + r.id + '"]'); if (!slot || S.selected !== r.id) return;
    slot.outerHTML = X.allDataHTML(r); X.adHydrate(r);
  }, function () { var slot = $('#place [data-adslot="' + r.id + '"]'); if (slot) slot.innerHTML = MORE_FAIL; });
}
function cmpAllHTML(list) { return '<details class="cmp-all" data-cmpall="' + esc(list.map(function (r) { return r.id; }).join(',')) + '"><summary>Show all data: every figure for ' + (list.length === 2 ? 'both places' : 'all ' + list.length + ' places') + ', side by side</summary><div data-caslot><div class="skeleton"><i></i></div></div></details>'; }
document.addEventListener('toggle', function (ev) {
  var d = ev.target; if (!d || !d.matches || !d.matches('details.cmp-all') || !d.open || d.dataset.done) return; d.dataset.done = '1';
  moreLoad().then(function (X) {
    var list = d.dataset.cmpall.split(',').map(function (id) { return BYID[id]; }).filter(Boolean), slot = d.querySelector('[data-caslot]'); if (!slot) return;
    slot.outerHTML = X.cmpAllHTML(list); X.cmpAllHydrate(d);
  }, function () { var slot = d.querySelector('[data-caslot]'); if (slot) slot.innerHTML = MORE_FAIL; d.dataset.done = ''; });
}, true);
/* clicks for these parts; returns true when handled */
function dataClick(t) {
  var b;
  if (t.closest('[data-catalogue]')) { moreLoad().then(function (X) { X.openCatalogue(); }); return true; }
  if ((b = t.closest('[data-adcsv]'))) { if (MOREX) MOREX.adCSV(b.dataset.adcsv); return true; }
  if ((b = t.closest('[data-adall]'))) { if (MOREX) MOREX.adAll(b); return true; }
  if ((b = t.closest('[data-whomore]'))) { moreLoad().then(function (X) { var g = $('#who-more'); if (!g) return; X.whoMoreFill(g); var show = g.hidden; g.hidden = !show; b.setAttribute('aria-expanded', show); var sp = b.querySelector('span'); if (sp) sp.textContent = show ? 'Fewer households' : 'More households'; if (show) { var f = g.querySelector('button'); if (f) f.focus(); } }); return true; }
  return false;
}
