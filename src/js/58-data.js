/* All data, compare "Show all data" and the data catalogue: the code lives in /assets/more.js and loads the first
   time someone asks for it, so the start page stays light. This file holds the small parts that are needed at once
   and the bridge the lazy module uses to reach the app (names are looked up live, so RES and friends stay current). */
var NZI_LIVE = { SHARDS: function () { return SHARDS; }, S: function () { return S; }, RES: function () { return RES; }, BYID: function () { return BYID; }, ENGINE: function () { return ENGINE; }, META: function () { return META; }, SHARD: function () { return SHARD; }, SCOPE: function () { return SCOPE; }, saved: function () { return saved; }, CURMODE: function () { return CURMODE; }, MAP: function () { return MAP; }, MAPSTATE: function () { return MAPSTATE; } };
var NZI_FN = { EXT_OFF_HTML: EXT_OFF_HTML, observedOf: observedOf, RETIRE_P: RETIRE_P, WD_PROP:WD_PROP,wdSearch:wdSearch,claim:claim,PICON: PICON, truePct: truePct, medal: medal, selectPlace: selectPlace, addMarker: addMarker, declutterMarkers: declutterMarkers, getJSON: getJSON, ART: ART, pathFor: pathFor, walk: walk, scoreColor: scoreColor, signed: signed, tone: tone, activeLanguageKeys: activeLanguageKeys, LANG_LOCAL: LANG_LOCAL, languageArea: languageArea, crossBorderForScope: crossBorderForScope, selected: selected, weightedCats: weightedCats, assetURL: assetURL, cardCopy: cardCopy, storyParagraphs: storyParagraphs, regionParagraphs: regionParagraphs, catLabel: catLabel, printDoc: printDoc, slug: slug, evidenceLine: evidenceLine, assessKind: assessKind, PARAMS: PARAMS, ICON: ICON, PHOTO_SKIP: PHOTO_SKIP, isWorld: isWorld, tzOffsetAt: tzOffsetAt, LOCAL_KIND: LOCAL_KIND, pval: pval, pctOf: pctOf, pfmt: pfmt, placeX: placeX, profileDef: profileDef, scopeName: scopeName, depthKind: depthKind, shortCat: shortCat, fmt: fmt, fmtInt: fmtInt, fin: fin, esc: esc, demonym: demonym, unitWord: unitWord, terrainOf: terrainOf, climateOf: climateOf, countryName: countryName, tzOf: tzOf, languageLabel: languageLabel, nutsName: nutsName, localKind: localKind, localAreaOf: localAreaOf, extOn: extOn, liveFetch: liveFetch, km: km, flagImg: flagImg, climateFor: climateFor, wdFacts: wdFacts, openModal: openModal, closeTools: closeTools, toast: toast, crossBorderForRecord: crossBorderForRecord, TWIN_NAMES: TWIN_NAMES, profileIcon: profileIcon, heroSetProfile: heroSetProfile, $: $, $$: $$, stripTags: stripTags, placeContext: placeContext, jget: jget, stripParen: stripParen, PHOTOS: PHOTOS, TAP: TAP, closeModal: closeModal, setProfile: setProfile, store: store, switchCountry: switchCountry, update: update, hydratePostcards: hydratePostcards, hydratePhotos: hydratePhotos, PARAM: PARAM, inEurope: inEurope, loadCountry: loadCountry, persistShortlist: persistShortlist, renderResults: renderResults, profileName: profileName, isBizKey: isBizKey, cmpAllHTML: cmpAllHTML, scoreBadge: scoreBadge };
var NZI = new Proxy({}, { has: function (t, k) { return NZI_LIVE.hasOwnProperty(k) || NZI_FN.hasOwnProperty(k); }, get: function (t, k) { return NZI_LIVE.hasOwnProperty(k) ? NZI_LIVE[k]() : NZI_FN[k]; } });
var MORE = null, MOREX = null;
function moreLoad() {
  if (!MORE) MORE = loadScript('/assets/more.js?v=' + VERSION).then(function () { MOREX = window.NZX(NZI); return (MOREX.ready || Promise.resolve()).then(function () { return MOREX; }); }).catch(function (e) { MORE = null; throw e; });
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
function kfHydrate(r) { moreLoad().then(function (X) { var es = $('#place [data-evslot="' + r.id + '"]'); if (es && S.selected === r.id && X.evidenceFill) X.evidenceFill(r, es); var s = $('#place [data-kfslot="' + r.id + '"]'); if (s && S.selected === r.id) s.innerHTML = X.keyFactsHTML(r); var rd = $('#place [data-radar="' + r.id + '"]'); if (rd && S.selected === r.id) rd.outerHTML = X.radarSVG(placeX(r)); }, function () {}); }
function scHydrate(r) { moreLoad().then(function (X) { var s = $('#place [data-scslot="' + r.id + '"]'); if (s && S.selected === r.id) s.outerHTML = X.scorecardHTML(r); }, function () { var s = $('#place [data-scslot="' + r.id + '"]'); if (s) s.innerHTML = MORE_FAIL; }); }
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
  if (t.closest('[data-multi-area],[data-evidence],[data-district-evidence],[data-retirement-hotspots],[data-observed],[data-arms]')) { moreLoad().then(function(X){X.featureClick(t);}).catch(function(){toast('Feature unavailable','Could not load this feature. Try again.');});return true; }
  if (t.closest('[data-catalogue]')) { moreLoad().then(function (X) { X.openCatalogue(); }); return true; }
  if ((b = t.closest('[data-cmppdf]'))) { var cl = b.dataset.cmppdf.split(',').map(function (id) { return BYID[id]; }).filter(Boolean); printDoc(function (X) { return X.compareDoc(cl); }, cl, 'nestlyzer-compare.html'); return true; }
  if (MOREX && MOREX.click(t)) return true;
  var pt = t.closest('[data-top10],[data-whatif],[data-bth],[data-mydata]');
  if (pt) { closeTools(); moreLoad().then(function (X) { if (pt.hasAttribute('data-top10')) X.openTop10(); else if (pt.hasAttribute('data-whatif')) X.openWhatIf(); else if (pt.hasAttribute('data-bth')) X.openBetterThanHome(); else X.openMyData(); }); return true; }
  if ((b = t.closest('[data-bizmore]'))) { var bm = bizMoreFill(); if (bm) { var sh = bm.hidden; bm.hidden = !sh; b.setAttribute('aria-expanded', sh); b.querySelector('span').textContent = sh ? 'Fewer business types' : 'More business types'; } return true; }
  if ((b = t.closest('[data-whomore]'))) { moreLoad().then(function (X) { X.whoMore(b); }); return true; }
  return false;
}

/* the business types beyond the first eight, built on first use from the profile config (2.12.3) */
function bizMoreFill() {   // 2.15.15: rendered by the lazy module, which carries the business icons (no generic placeholder icons)
  var g = $('#who-biz-more'); if (g && !g.dataset.filled && META && ENGINE) { g.dataset.filled = '1'; moreLoad().then(function (X) { X.bizMoreHTML(g); }, function () { g.dataset.filled = ''; }); }
  return g;
}
