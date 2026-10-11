/* Orchestration, events, boot */
var mapWanted = false;
function update(opts) {
  opts = opts || {};
  if (!SHARD) return;
  runRanking();
  if (S.lang && !SCOPE.length) { var ln = LANG_NAMES[S.lang] || S.lang; S.lang = ''; runRanking(); toast('Language used as a preference', 'No place in ' + scopeName() + ' is ' + ln + '-speaking, so Nestlyzer shows every place instead.'); }
  if (!opts.keepShown) S.shown = 100;
  if (opts.autoSelect && RES.scored.length && !S.selected && window.innerWidth >= 900 && !multiAnswer()) { S.selected = RES.scored[0].id; S.autoSel = S.selected; }
  renderProfileBar(); renderScope(); renderResults(); renderTabs(); renderPlace(); renderTray();
  document.title = profileName(S.profile) + ' in ' + scopeName() + ' | Nestlyzer';
  pushHash(!opts.push);
  if (MAPREADY) MAPREADY.then(function () { return loadCountryGeometry(S.cc); }).then(function () { paintMap(); if (opts.fit) fitScope(); }).catch(function (e) { if (window.console) console.warn('map update', e); });
}
function renderTabs() {
  $$('#listtabs button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.lt === S.listTab); });
  if (S.tab === 'place' && !S.selected) S.tab = 'map';
  var ex = $('#explore'); if (ex.dataset.tab !== S.tab) document.body.classList.remove('chrome-hide'); ex.dataset.tab = S.tab; document.body.dataset.tab = S.view === 'explore' ? S.tab : ''; document.body.dataset.ltab = S.view === 'explore' && (S.tab === 'list' || window.innerWidth >= 900) ? S.listTab : '';
  $$('.mobile-tabs button').forEach(function (b) { var on = b.dataset.mt === 'saved' ? (S.tab === 'list' && S.listTab === 'saved') : b.dataset.mt === 'list' ? (S.tab === 'list' && S.listTab !== 'saved') : b.dataset.mt === S.tab; b.setAttribute('aria-selected', on); });
  var pb = $('.mobile-tabs [data-mt="place"]'); if (pb) pb.disabled = !S.selected;
}
var SWITCH_TOKEN = 0;
function switchCountry(cc, o) {
  o = o || {};
  if (!META.countries.some(function (c) { return c.cc === cc; })) { toast('Country not found', 'That link names a country Nestlyzer does not cover (' + cc + '). Showing Switzerland instead.'); cc = 'CH'; }
  S.cc = cc; S.showAll = false;
  if (!o.keepSelection) S.selected = null;
  var token = ++SWITCH_TOKEN;
  $('#results').innerHTML = '<div class="skeleton" aria-label="Loading ' + esc(countryName(cc)) + '"><i></i><i></i><i></i><i></i><i></i></div>';
  return loadCountry(cc).then(function (sh) {
    if (token !== SWITCH_TOKEN || S.cc !== cc) return;
    SHARD = sh;
    var sp0 = scopeSpecial(); if (sp0 && ((sp0.kind === 'metro' && !metroList().some(function (m) { return m[0] === sp0.name; })) || (sp0.kind === 'group' && !sp0.g) || (sp0.kind === 'near' && !BYID[sp0.id]))) { toast('Area not found', 'That link names an area that does not exist in ' + countryName(cc) + '. Showing the whole country.'); S.region = 'ALL'; }
    if (S.cc === 'CH' && !META.config.swissRegions[S.region] && !scopeSpecial()) S.region = 'ALL';
    var ro = regionOptions().map(function (o) { return o[0]; }); if (ro.indexOf(S.region) < 0) S.region = 'ALL';
    var ao = areaOptions().map(function (o) { return o[0]; }); if (S.area !== 'ALL' && ao.indexOf(S.area) < 0) S.area = 'ALL';
    update({ fit: true, autoSelect: !o.keepSelection, push: true });
  }).catch(function (e) { if (window.console) console.error('switchCountry', e && e.stack); $('#results').innerHTML = '<div class="empty"><h3>Could not load ' + esc(countryName(cc)) + '</h3><p>' + esc(e.message) + '. Check your connection and try again.</p></div>'; });
}
function selectPlace(id, o) {
  o = o || {};
  var r = BYID[id]; if (!r) return;
  if (!o.noHistory) S.autoSel = null;
  S.selected = id;
  renderPlace(); renderTabs();
  $$('.row[aria-current="true"]').forEach(function (el) { el.setAttribute('aria-current', 'false'); });
  var row = $('.row[data-id="' + CSS.escape(id) + '"]'); if (row) { row.setAttribute('aria-current', 'true'); if (o.from === 'map') row.scrollIntoView({ block: 'nearest' }); }
  if (window.innerWidth < 900) { S.tab = 'place'; renderTabs(); }
  if (MAP) { paintSelection(); paintMarkers(); if (o.from !== 'map') flyToRecord(r); }
  if (o.from === 'list' || o.from === 'search' || o.from === 'surprise') { var hd = $('#place h2'); if (hd) { hd.setAttribute('tabindex', '-1'); try { hd.focus({ preventScroll: true }); } catch (e) {} } }
  pushHash(o.noHistory ? true : 'place');
}
function setProfile(k) {
  if (k === S.profile) return;
  S.profile = k; S.selected = null;
  update({ autoSelect: true, push: true });
}
function enterExplore(noMap) {
  S.view = 'explore'; document.body.classList.add('exploring'); document.documentElement.classList.remove('pre-explore'); var hh = $('.site-header'); if (hh) hh.classList.remove('on-dark');
  if (window.innerWidth < 900 && !S.tab) S.tab = 'map';
  if (!noMap) ensureMap().then(function () { loadCountryGeometry(S.cc).then(function () { paintMap(); fitScope(false); }); }).catch(function (e) { mapProgress(100); $('#mapnote').textContent = 'Map engine failed to load (' + e.message + '). Rankings still work.'; });
  refreshShortlistUI(); maybeTour();
}
function leaveExplore() { S.view = 'landing'; document.body.classList.remove('exploring'); document.documentElement.classList.remove('pre-explore'); renderTray(); headerTone(); if (!HERO.canvases) heroInit(); else if (HERO.dirty) { heroResize(); heroDraw(false); } }

function onClick(ev) {
  var t = ev.target, b;
  if (t.closest('.menu-panel a')) { var md = t.closest('details'); if (md) md.open = false; }
  var openMenus = $$('details.menu[open]').filter(function (d) { return !d.contains(t); });
  if (openMenus.length) { openMenus.forEach(function (d) { d.open = false; }); ev.preventDefault(); return; }
  if ($('#modal').classList.contains('open') && builderClick(t)) return;
  if (toolsClick(t, ev)) return;
  if ((b = t.closest('[data-unsave]'))) return toggleSave(b.dataset.unsave);
  if ((b = t.closest('[data-save]'))) return toggleSave(b.dataset.save);
  if ((b = t.closest('[data-cmp]'))) return toggleCompare(b.dataset.cmp);
  if (t.closest('[data-opencmp]')) { closeTools(); return openCompare(); }
  if (t.closest('[data-pickprofile]')) return openProfilePicker();
  if ((b = t.closest('[data-profile]'))) { if ($('#modal').classList.contains('open')) closeModal(); return setProfile(b.dataset.profile); }
  if (t.closest('[data-builder]')) { if ($('#modal').classList.contains('open')) closeModalUI(); return openBuilder(); }
  if ((b = t.closest('[data-more]'))) { S.shown += 100; renderResults(); return; }
  if ((b = t.closest('.row[data-id], .pick[data-id], .alt[data-id], .chip[data-id], .rec[data-id]'))) return selectPlace(b.dataset.id, { from: 'list' });
  if ((b = t.closest('[data-open]'))) { if (t.closest('[data-unsave]')) return; return goToPlace(b.dataset.open); }
  if (t.closest('[data-opencmp]')) { closeTools(); return openCompare(); }
  if (t.closest('[data-clearcmp]')) { S.compare = []; persistShortlist(); refreshShortlistUI(); return; }
  if (t.closest('[data-export]')) return exportCSV();
  if (t.closest('[data-share]')) { var hs = toHash(); if (S.selected && hs.indexOf('sel=') < 0) hs += '&sel=' + encodeURIComponent(S.selected); return share((selected() || {}).name + ' on Nestlyzer', (window.NZ_STANDALONE ? 'https://nestlyzer.com/' : location.origin + location.pathname) + hs); }
  if (t.closest('[data-booklet]')) return openBooklet();
  if (t.closest('[data-print]')) { if (onClick._p) return; onClick._p = setTimeout(function () { onClick._p = 0; }, 1500); return window.print(); }
  if (t.closest('[data-closeplace]')) { if (history.state && history.state.p) { history.back(); return; } S.selected = null; if (window.innerWidth < 900) S.tab = 'list'; renderPlace(); renderTabs(); if (MAP) { paintSelection(); paintMarkers(); if (window.innerWidth >= 900) MAP.easeTo({ padding: { right: 0, left: 0, top: 0, bottom: 0 }, duration: 400 }); } pushHash(true); return; }
  if ((b = t.closest('[data-xb]'))) return openCrossBorder(board_xb[+b.dataset.xb]);
  if ((b = t.closest('[data-pxb]'))) return openCrossBorder(place_xb[+b.dataset.pxb]);
  if ((b = t.closest('[data-def]'))) return defineTerm(b.dataset.def);
  if ((b = t.closest('[data-lt]'))) { if (S.view !== 'explore') return; if (S.listTab !== b.dataset.lt) S.showAll = false; S.listTab = b.dataset.lt; closeTools(); if ($('#modal').classList.contains('open')) closeModal(); if (window.innerWidth < 900) S.tab = 'list'; renderTabs(); renderResults(); var sc = $('.rail .scroll'); if (sc) sc.scrollTop = 0; return; }
  if ((b = t.closest('[data-mt="saved"]'))) { S.tab = 'list'; S.listTab = 'saved'; renderTabs(); renderResults(); return; }
  if ((b = t.closest('[data-mt]'))) { S.tab = b.dataset.mt; renderTabs(); if (S.tab === 'map' && MAP) setTimeout(function () { MAP.resize(); }, 30); if (S.tab === 'map' && !MAP) enterExplore(); return; }
  if ((b = t.closest('[data-near="ALL|R"]'))) { S.region = 'ALL'; S.area = 'ALL'; update({ fit: true, push: true }); return; }
  if ((b = t.closest('[data-near]'))) { var nb = b.dataset.near.split('|'); S.region = nb[1] === 'M' ? 'M:' + nb[0] : 'N:' + nb[0] + ':' + nb[1]; S.area = 'ALL'; S.listTab = 'ranking'; if (window.innerWidth < 900) S.tab = 'map'; update({ fit: true, push: true }); toast(scopeName(), fmtInt(SCOPE.length) + ' places in this scope. Pick “All regions” in the Region menu to go back.'); return; }
  if (t.closest('[data-fit]')) return fitScope();
  if (t.closest('[data-gisco]')) return loadGiscoBoundaries();
  if (t.id === 'scrim' && !$('#tools').hidden) return closeTools();
  if (t.closest('[data-close]') || t.id === 'scrim') return closeModal();
  if (t.closest('[data-search]')) return openPalette();
  if ((b = t.closest('[data-pid]'))) return goToPlace(b.dataset.pid);
  if ((b = t.closest('[data-preg]'))) return goToRegion(b.dataset.preg);
  if ((b = t.closest('[data-pcc]'))) { closePalette(); enterExplore(); S.region = 'ALL'; S.area = 'ALL'; return switchCountry(b.dataset.pcc); }
  if (t.closest('[data-theme-toggle]')) return toggleTheme();
  if (t.closest('[data-home]')) { if (S.view === 'explore') { ev.preventDefault(); history.pushState(null, '', '/'); leaveExplore(); window.scrollTo(0, 0); } return; }
  if ((b = t.closest('[data-start]'))) { ev.preventDefault(); return startFromLanding(b.dataset.start); }
  if ((b = t.closest('.who [data-who]'))) { $$('.who [data-who]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); heroSetProfile(b.dataset.who); var sc = $('#start-country'); if (b.dataset.who === 'coastal' && sc && ['CH', 'AT', 'CZ', 'HU', 'LI', 'LU', 'MK', 'RS', 'SK'].indexOf(sc.value) >= 0) { sc.value = 'PT'; toast('Switched to Portugal', 'Coastal living needs a country with a coastline. Pick any other coastal country in the list.'); } syncStartHref(); return; }
}
function syncStartHref() {
  var a = $('[data-start="go"]'), who = $('.who [aria-pressed="true"]'), sc = $('#start-country');
  if (a && sc) a.setAttribute('href', '/#/explore?cc=' + sc.value + '&p=' + (who ? who.dataset.who : 'young_family'));
}
function startFromLanding(kind) {
  var who = $('.who [aria-pressed="true"]');
  var cc = $('#start-country') ? $('#start-country').value : 'CH';
  if (kind === 'builder') { enterExplore(); S.cc = cc; return switchCountry(cc).then(openBuilder); }
  if (kind && kind !== 'go') { var a = kind.split(':'); S.profile = a[0]; if (a[1]) cc = a[1]; }
  else if (who) S.profile = who.dataset.who;
  S.region = 'ALL'; S.area = 'ALL'; S.selected = null; S.tab = 'map';
  enterExplore(); switchCountry(cc);
  window.scrollTo(0, 0);
}
function onChange(ev) {
  var t = ev.target;
  if (t.id === 'start-country') return syncStartHref();
  if (/^f-(country|region|area|sort)$/.test(t.id) && window.innerWidth < 900) { var rl = $('.rail'); if (rl) { rl.classList.remove('scope-open'); var tg = $('[data-scopetoggle]'); if (tg) tg.setAttribute('aria-expanded', 'false'); } }
  if (t.id === 'f-country') { S.region = 'ALL'; S.area = 'ALL'; return switchCountry(t.value); }
  if (t.id === 'f-region') { S.region = t.value; S.area = 'ALL'; S.selected = null; return update({ fit: true, autoSelect: true, push: true }); }
  if (t.id === 'f-area') { S.area = t.value; S.selected = null; return update({ fit: true, autoSelect: true, push: true }); }
  if (t.id === 'f-layer') { S.layer = t.value; if (MAP) paintMap(); pushHash(true); return; }
  if (t.id === 'f-sort') { S.sort = t.value; sortResults(); renderResults(); pushHash(true); return; }
}
var liveUpdate = debounce(function () { update({ keepShown: false }); updateFilterCount(); }, 160);
function onInput(ev) {
  var t = ev.target;
  if ($('#modal').classList.contains('open') && builderInput(t)) return;
  if (t.id === 'f-conf') { S.minConf = +t.value; $('#o-conf').textContent = S.minConf + '%'; return liveUpdate(); }
  if (t.dataset.f) { S.f[t.dataset.f] = t.dataset.f === 'daywMin' && +t.value <= +t.min ? 0 : +t.value; var o = { popMin: 'o-popmin', cityKm: 'o-city', airportKm: 'o-air', coastKm: 'o-coast' }[t.dataset.f] || ('xo-' + t.dataset.f); var oe = $('#' + o); if (oe) oe.textContent = xfLabel(t.dataset.f, +t.value); return liveUpdate(); }
  if (t.dataset.note) { setNote(t.dataset.note, t.value); return; }
  if (t.id === 'f-q') { S.q = t.value; return liveUpdate(); }
  if (t.id === 'pal-q') return renderPalette(t.value);
}
function onKey(ev) {
  if ((ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') && ev.target.classList && ev.target.classList.contains('pchip')) { var cs = $$('#pchips .pchip'), ci = cs.indexOf(ev.target), nx = cs[(ci + (ev.key === 'ArrowRight' ? 1 : -1) + cs.length) % cs.length]; if (nx) { ev.preventDefault(); cs.forEach(function (c) { c.tabIndex = -1; }); nx.tabIndex = 0; nx.focus(); nx.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } return; }
  if (ev.key === 'Tab') { var trap = !$('#tools').hidden ? $('#tools') : $('#modal').classList.contains('open') ? $('#modal') : null; if (trap) { var f = $$('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])', trap).filter(function (e) { return !e.disabled && e.offsetParent !== null; }); if (f.length) { var i = f.indexOf(document.activeElement); if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); return; } if (!ev.shiftKey && (i === f.length - 1 || i < 0)) { ev.preventDefault(); f[0].focus(); return; } } } }
  if ((ev.key === 'k' && (ev.metaKey || ev.ctrlKey)) || (ev.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName))) { ev.preventDefault(); openPalette(); return; }
  if (!$('#lightbox').hidden) { if (ev.key === 'Escape') return closeLightbox(); if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { var nb = $('#lightbox ' + (ev.key === 'ArrowRight' ? '.next' : '.prev')); if (nb) nb.click(); return; } }
  if (ev.key === 'Escape' && !$('#coach').hidden) return endTour();
  if (ev.key === 'Escape' && !$('#tools').hidden) return closeTools();
  if (ev.key === 'Escape' && !$('#filterpanel').hidden) return toggleFilters(false);
  if (ev.key === 'Escape') {
    var mo = $$('details.menu[open]'); if (mo.length) { mo.forEach(function (d) { d.open = false; }); return; }
    if ($('#palette').classList.contains('open')) { closePalette(); return; }
    if ($('#modal').classList.contains('open')) { closeModal(); return; }
    var ti = $('#tour-invite'); if (ti) { ti.remove(); return; }
    if (S.selected) { var cp = $('[data-closeplace]'); if (cp) cp.click(); else { S.selected = null; renderPlace(); } }
    return;
  }
  if ($('#palette').classList.contains('open') && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp' || ev.key === 'Enter')) {
    var items = $$('#pal-list button'); if (!items.length) return;
    if (ev.key === 'Enter') { ev.preventDefault(); items[palSel].click(); return; }
    ev.preventDefault(); items[palSel].setAttribute('aria-selected', 'false'); palSel = (palSel + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[palSel].setAttribute('aria-selected', 'true'); items[palSel].scrollIntoView({ block: 'nearest' });
    return;
  }
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.row[data-id], .row[data-open], .pick[data-id], [role="button"][data-def]')) { ev.preventDefault(); ev.target.click(); }
}
function toggleTheme() {
  var cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  var next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; store('theme', next);
  $('[data-theme-toggle]').innerHTML = next === 'dark' ? ICON.sun : ICON.moon;
  recolorTheme(); if (MAP) paintMap(); if (S.view === 'explore') { renderResults(); renderPlace(); }
}


function boot() {
  var th = store('theme'); if (th) document.documentElement.dataset.theme = th;
  var tb = $('[data-theme-toggle]'); if (tb) tb.innerHTML = (document.documentElement.dataset.theme === 'dark' || (!th && matchMedia('(prefers-color-scheme: dark)').matches)) ? ICON.sun : ICON.moon;
  // phone filter sheet: a tap outside the sheet only closes it (the sheet dims the page with its own shadow)
  document.addEventListener('click', function (ev) {
    if (window.innerWidth >= 900 || !document.body.classList.contains('filters-open')) return;
    var t = ev.target; if (!t || !t.closest || t.closest('#filterpanel') || t.closest('[data-filters]')) return;
    ev.preventDefault(); ev.stopPropagation(); toggleFilters(false);
  }, true);
  document.addEventListener('click', onClick);
  // the phone menu is a <details>: give it a history entry so Back closes it instead of leaving the page
  document.addEventListener('toggle', function (ev) { var d = ev.target; if (!d || !d.matches || !d.matches('details.menu')) return; if (d.open) layerPush(); else layerPop(); }, true);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', onKey);
  window.addEventListener('popstate', function () { if (syncing) return; if (anyLayerOpen() && !(history.state && history.state.m)) { for (var g = 0; g < 6 && anyLayerOpen(); g++) closeTopLayerUI(); return; } route(); });
  window.addEventListener('hashchange', function () { if (syncing) return; route(); });
  window.addEventListener('resize', debounce(function () { if (MAP) MAP.resize(); }, 150));
  var lastY = {}, chromeQuiet = 0; document.addEventListener('scroll', function (ev) {
    var el = ev.target; if (!el || !el.classList || window.innerWidth >= 900 || S.view !== 'explore') return;
    if (!(el.id === 'placescroll' || (el.classList.contains('scroll') && el.closest('.rail')))) return;
    var y = el.scrollTop, k = el.id || 'rail', d = y - (lastY[k] || 0); lastY[k] = y;
    // hiding the bars changes the panel height, which scrolls the panel a little; ignore that echo and never hide on short lists
    var now = Date.now(); if (now < chromeQuiet) return;
    var cls = document.body.classList, hid = cls.contains('chrome-hide'), want = hid;
    if (y < 40 || el.scrollHeight - el.clientHeight < 240) want = false; else if (d > 6 && y > 80) want = true; else if (d < -12) want = false;
    if (want !== hid) { cls.toggle('chrome-hide', want); chromeQuiet = now + 400; }
  }, true);
  document.addEventListener('focusin', function (ev) { if (window.innerWidth < 900 && /^(INPUT|TEXTAREA)$/.test(ev.target.tagName) && !/range|checkbox|radio/.test(ev.target.type)) document.body.classList.add('typing'); });
  document.addEventListener('focusout', function () { setTimeout(function () { var a = document.activeElement; if (!a || !/^(INPUT|TEXTAREA)$/.test(a.tagName)) document.body.classList.remove('typing'); }, 60); });
  S.builder = store('builder'); var cu = store('custom'); if (cu && !S.custom) S.custom = cu;
  if ('serviceWorker' in navigator && !window.NZ_STANDALONE && (location.protocol === 'https:' || /[?&]sw=1/.test(location.search))) window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.NZ_INSTALL = e; });
  loadMeta().then(function () { route(); landingReady(); var q0 = new URLSearchParams(location.search).get('q'); if (q0) { openPalette(); var inp = $('#pal-q'); inp.value = q0; ensureSearch().then(function () { renderPalette(q0); }); } }).catch(function (e) { toast('Could not load Nestlyzer data', e.message + '. Reload the page to try again.'); });
}
function route() {
  $$('details.menu[open]').forEach(function (d) { d.open = false; });
  if ($('#modal').classList.contains('open') || $('#palette').classList.contains('open')) { $('#modal').classList.remove('open'); $('#palette').classList.remove('open'); $('#scrim').classList.remove('open'); }
  var before = S.view === 'explore' && SHARD ? toHash().replace(/&?sel=[^&]*/, '') : null, prevSel = S.selected;
  if (fromHash()) {
    if (before && SHARD.shard.cc === S.cc && toHash().replace(/&?sel=[^&]*/, '') === before && !S.pendingList && !S.pendingCmp) {
      if (S.selected && BYID[S.selected]) { var ns = S.selected; S.selected = prevSel; selectPlace(ns, { noHistory: true }); }
      else { S.selected = null; if (window.innerWidth < 900 && S.tab === 'place') S.tab = 'list'; renderPlace(); renderTabs(); if (MAP) { paintSelection(); paintMarkers(); if (window.innerWidth >= 900) MAP.easeTo({ padding: { right: 0, left: 0, top: 0, bottom: 0 }, duration: 400 }); } }
      return;
    }
    if (ENGINE.method !== S.method) { ENGINE = new NestEngine(META, { method: S.method }); Object.keys(SHARDS).forEach(function (k) { SHARDS[k].records.forEach(function (r) { delete r._cats; }); }); }
    if (!ENGINE.profiles[S.profile] && S.profile !== 'self_fit') { toast('Profile not found', 'That link names a profile that does not exist (' + S.profile + '). Showing Young family instead.'); S.profile = 'young_family'; }
    if (S.profile === 'self_fit' && !S.custom) S.profile = 'young_family';
    var ccChange = !SHARD || SHARD.shard.cc !== S.cc;
    S.tab = S.selected && window.innerWidth < 900 ? 'place' : S.tab === 'place' ? (ccChange ? 'map' : 'list') : (S.tab || 'map');
    S.listTab = S.pendingTab || 'ranking'; S.pendingTab = null; if (S.listTab !== 'ranking' && window.innerWidth < 900 && !S.selected) S.tab = 'list';
    enterExplore();
    var sel = S.selected;
    var after = function () { if (S.pendingList) { var l = S.pendingList; S.pendingList = null; importList(l); } if (S.pendingCmp) { var c = S.pendingCmp; S.pendingCmp = null; c.forEach(function (id) { if (!isSaved(id) && BYID[id]) saved.push(savedEntry(id)); }); S.compare = c.slice(0, 3); persistShortlist(); refreshShortlistUI(); openCompare(c); } };
    if (!SHARD || SHARD.shard.cc !== S.cc) { var pr = switchCountry(S.cc, { keepSelection: !!sel }); if (pr && pr.then) pr.then(after); }
    else { update({ fit: true, autoSelect: !sel }); after(); }
  } else if (S.view === 'explore') leaveExplore();
}
function headerTone() {
  var h = $('.site-header'), c = $('#cine');
  if (!h || !c) return;
  h.classList.toggle('on-dark', S.view !== 'explore' && window.scrollY < 24);
}
function landingReady() {
  heroInit(); headerTone();
  window.addEventListener('scroll', headerTone, { passive: true });
  $$('.who [data-who]').forEach(function (b) { b.addEventListener('mouseenter', function () { if (matchMedia('(hover: hover)').matches) heroSetProfile(b.dataset.who); }); b.addEventListener('focus', function () { heroSetProfile(b.dataset.who); }); });
  var who = $('.who'); if (who) who.addEventListener('mouseleave', function () { var p = $('.who [aria-pressed="true"]'); if (p) heroSetProfile(p.dataset.who); });
  var sel = $('#start-country');
  setTimeout(syncStartHref, 0);
  if (sel && !sel.options.length) sel.innerHTML = META.countries.slice().sort(function (a, b) { return a.cc === 'CH' ? -1 : b.cc === 'CH' ? 1 : a.name.localeCompare(b.name); }).map(function (c) { return '<option value="' + c.cc + '">' + esc(c.name) + '</option>'; }).join('');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
/* read-only hook for the regression suite and for support debugging */
window.NZ_STORY = function (r) { return storyFor(r); };
window.NZ = { version: VERSION, get state() { return S; }, get res() { return RES; }, get scope() { return SCOPE; }, get meta() { return META; }, get map() { return MAP; }, record: function (id) { return BYID[id]; } };
