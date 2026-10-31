/* Tools: filters panel, records, saved places, compare, home, surprise, a small game, the tools drawer and the quick tour */

/* ---------- filters panel and phone scope ---------- */
/* On phones the filter panel is a sheet over the page: a named modal dialog that keeps keyboard focus inside.
   On wider screens it is a side panel next to the results, so it stays non-modal (NZ-GLOBAL-050). */
var FP_FROM = null;
function filterSheetRole() {
  var p = $('#filterpanel'); if (!p) return;
  if (!p.hidden && window.innerWidth < 900) { p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', 'Filters'); }
  else { p.removeAttribute('role'); p.removeAttribute('aria-modal'); p.removeAttribute('aria-label'); }
}
window.addEventListener('resize', function () { filterSheetRole(); });
function toggleFilters(open) {
  var p = $('#filterpanel'); if (!p) return;
  var show = open == null ? p.hidden : open;
  var was = !p.hidden;
  p.hidden = !show;
  $$('[data-filters]').forEach(function (b) { if (b.hasAttribute('aria-expanded')) b.setAttribute('aria-expanded', show); });
  document.body.classList.toggle('filters-open', show);
  filterSheetRole();
  if (show && !was) {
    FP_FROM = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    layerPush(); var tt = $('#toast'); if (tt && window.innerWidth < 900) tt.classList.remove('open');
    if (window.innerWidth < 900) { var first = $$('button, a[href], input, select, textarea', p).filter(function (e) { return !e.disabled && e.offsetParent !== null; })[0]; if (first) first.focus(); }
  }
  if (!show && was) { layerPop(); var back = FP_FROM && document.contains(FP_FROM) && FP_FROM.offsetParent !== null ? FP_FROM : $$('[data-filters]').filter(function (e) { return e.offsetParent !== null; })[0]; if (back) { try { back.focus(); } catch (e) {} } FP_FROM = null; }
  if (show) updateFilterCount();
}
function updateFilterCount() { var el = $('#fp-count'); if (el && SHARD) el.textContent = fmtInt(SCOPE.length) + ' places match, ' + fmtInt(RES ? RES.scored.length : 0) + ' fit the profile'; }
function clearFilters() { FKEYS.forEach(function (k) { S.f[k] = 0; }); S.minConf = 0; S.terrain = ''; S.climate = ''; S.q = ''; update({ push: true }); }
function toggleChoice(key, val) { var a = S[key] ? S[key].split(',') : [], i = a.indexOf(val); if (i >= 0) a.splice(i, 1); else a.push(val); S[key] = a.join(','); update({ push: true }); updateFilterCount(); }

/* ---------- places that do not make the ranking ---------- */
function unrankedHTML() {
  if (!RES) return '';
  var notIn = SCOPE.filter(function (r) { return !RES.byId[r.id]; });
  if (!notIn.length) return '';
  var groups = {};
  var rows = notIn.map(function (r) {
    var s = ENGINE.scoreRaw(r, S.profile, 0, S.cc), why = ENGINE.eligibilityFail(r, S.profile, S.cc);
    var reason = why ? plainReason(why) : !s ? 'not enough comparable figures for this profile' : (s.coverage < 40 ? 'not enough comparable figures for this profile' : 'below the profile minimums');
    groups[reason] = (groups[reason] || 0) + 1;
    return { r: r, s: s ? s.score : null, reason: reason };
  }).sort(function (a, b) { return (b.s || -1) - (a.s || -1); });
  var mp = (profileDef(S.profile) || {}).minPop;
  var topScore = RES.scored.length ? RES.scored[0].overall : null, higher = fin(topScore) ? rows.filter(function (o) { return fin(o.s) && o.s > topScore; }).length : 0;
  return '<div class="unranked"><h3>Not in the ranking (' + fmtInt(notIn.length) + ')</h3><p class="small">These places are in scope but miss a minimum this profile sets' + (mp && !(S.f.popMin >= mp) ? ', for example at least ' + fmtInt(mp) + ' residents' : '') + '. They still have a score you can look at.' + (higher ? ' ' + higher + ' of them score higher than the #1 place, but a profile minimum keeps them out of the ranking.' : '') + '</p><div class="pills">' +
    Object.keys(groups).sort(function (a, b) { return groups[b] - groups[a]; }).map(function (k) { return '<span class="chip">' + esc(k) + ' <b>' + fmtInt(groups[k]) + '</b></span>'; }).join('') + '</div>' +
    '<ol class="list">' + rows.slice(0, 60).map(function (o) { return '<li class="row unr" data-id="' + esc(o.r.id) + '" tabindex="0"><span class="rk">–</span><div><div class="nm">' + esc(o.r.name) + '</div><div class="meta">' + esc(localAreaOf(o.r)) + ', ' + fmtInt(o.r.popNow) + ' residents · ' + esc(o.reason) + '</div></div><div class="right">' + (fin(o.s) ? scoreBadge(o.s) : '') + '</div></li>'; }).join('') + '</ol>' +
    (rows.length > 60 ? '<p class="small muted" style="padding:0 12px">Showing the 60 highest scores of ' + fmtInt(rows.length) + '.</p>' : '') + '</div>';
}

/* ---------- records: the extremes of the current scope ---------- */
/* records live in /assets/more.js (src/more/records.js) */
function inEurope(r) { return fin(r.lat) && r.lat > 27 && r.lat < 72 && r.lon > -32 && r.lon < 45; }
function recordsHTML() { if (MOREX) return MOREX.recordsHTML(); moreLoad().then(function () { if (S.listTab === 'records') renderResults(); }); return '<div class="skeleton"><i></i><i></i></div>'; }

/* ---------- saved places ---------- */
function savedHTML() {
  if (!saved.length) return '<div class="empty sl-empty"><h3>Your shortlist is empty</h3><p>' + TAP + ' <b>♥ Save</b> on any place to keep it here. To put places side by side, tick <b>Compare</b> on two or three of them, here or on the place itself.</p><ol class="small"><li>Open a place from the map or the ranking.</li><li>' + TAP + ' <b>♥ Save</b>, or tick <b>Compare</b>.</li><li>Come back here (♥ Shortlist) and press <b>Compare</b>.</li></ol><p class="small muted">Your shortlist stays in this browser, works across countries and profiles, and can be shared as a link.</p></div>';
  var n = S.compare.length;
  return '<div class="board"><div class="grp sl-head"><h3>Your shortlist (' + saved.length + ')</h3><p>Tick two or three places, then compare them side by side. ' + (n ? n + ' of 3 ticked.' : 'Nothing ticked yet.') + '</p><div class="actions"><button class="btn btn-sm btn-primary" type="button" data-opencmp' + (n < 2 ? ' disabled' : '') + '><span>Compare ticked (<span class="n">' + n + '</span>)</span></button><button class="btn btn-sm" type="button" data-share-saved>' + ICON.share + 'Share list</button><button class="btn btn-sm" type="button" data-export>' + ICON.doc + 'Download CSV</button><button class="btn btn-sm" type="button" data-top10>My Top 10</button><button class="btn btn-sm" type="button" data-bth>Better than home?</button></div></div>' +
    '<ol class="list saved">' + saved.map(function (s) {
      var cc = s.id.split(':')[0], on = isCmp(s.id);
      return '<li class="row' + (on ? ' ticked' : '') + '" data-open="' + esc(s.id) + '" tabindex="0"><label class="tick" title="Tick to compare"><input type="checkbox" data-cmp="' + esc(s.id) + '"' + (on ? ' checked' : '') + ' aria-label="Compare ' + esc(s.name) + '"><span>Compare</span></label><div><div class="nm">' + flagImg(cc, 11) + ' ' + esc(s.name) + (S.home === s.id ? ' <span class="chip">🏠 home</span>' : '') + '</div><div class="meta">' + esc(s.area || '') + (s.profile ? ', saved for ' + esc(profileName(s.profile) || s.profile) : '') + '</div>' +
        '<textarea class="note" rows="1" placeholder="Add a note: viewing date, school, rent you saw…" data-note="' + esc(s.id) + '" aria-label="Note for ' + esc(s.name) + '">' + esc(s.note || '') + '</textarea></div><div class="right">' + (function () { var live = RES && RES.byId[s.id] && s.profile === S.profile ? RES.byId[s.id].overall : s.score; return fin(live) ? scoreBadge(live) : ''; })() + '<button class="icon-btn sm" type="button" data-unsave="' + esc(s.id) + '" aria-label="Remove ' + esc(s.name) + ' from the shortlist" title="Remove">' + ICON.close + '</button></div></li>';
    }).join('') + '</ol></div>';
}
function setNote(id, text) { saved.forEach(function (s) { if (s.id === id) s.note = text.slice(0, 500); }); persistShortlist(); }
function shareSaved() { var ids = saved.slice(0, 30).map(function (s) { return s.id; }); share('My Nestlyzer shortlist', (window.NZ_STANDALONE ? 'https://nestlyzer.com/' : location.origin + '/') + '#/explore?cc=' + S.cc + '&p=' + S.profile + '&list=' + encodeURIComponent(ids.join(','))); }
function importList(ids, confirmed) {
  var add = ids.filter(function (id) { return !isSaved(id); });
  if (!add.length) { toast('Already on your shortlist', 'Every place in the shared list is on your shortlist.'); return; }
  Promise.all(add.map(function (id) { return loadCountry(id.split(':')[0]).catch(function () { return null; }); })).then(function () {
    var ok = add.filter(function (id) { return BYID[id]; });
    if (!confirmed) {
      IMPORT_PENDING = ok;
      openModal('A shared shortlist', '<p>Someone shared ' + ok.length + ' place' + (ok.length > 1 ? 's' : '') + ' with you:</p><ul class="implist">' + ok.map(function (id) { var r = BYID[id]; return '<li>' + flagImg(r.country, 11) + ' <b>' + esc(r.name) + '</b> <span class="muted small">' + esc(localAreaOf(r)) + ', ' + esc(countryName(r.country)) + '</span></li>'; }).join('') + '</ul><div class="actions"><button class="btn btn-primary" type="button" data-import-yes>Add to my shortlist</button><button class="btn btn-ghost" type="button" data-close>No thanks</button></div>');
      return;
    }
    ok.forEach(function (id) { if (!isSaved(id)) saved.push(savedEntry(id)); });
    persistShortlist(); refreshShortlistUI(); renderScope(); toast('Added to your shortlist', ok.length + ' shared place' + (ok.length > 1 ? 's are' : ' is') + ' now on your shortlist.');
    S.listTab = 'saved'; renderTabs(); renderResults();
  });
}
var IMPORT_PENDING = null;

/* ---------- compare: the code lives in /assets/more.js (src/more/compare.js) ---------- */
function openCompare(ids) { moreLoad().then(function (X) { X.openCompare(ids); }); }

/* ---------- home ---------- */
function setHome(id) {
  if (S.home === id) { S.home = null; store('home', null); toast('Home cleared', 'Places no longer show the comparison with your home.'); }
  else { S.home = id; store('home', id); var r = BYID[id]; toast('Home set: ' + (r ? r.name : ''), 'Every place now shows how it differs from your home. Change it any time with 🏠.'); }
  renderPlace();
}

/* ---------- surprise me ---------- */
function surprise() {
  var pool = RES && RES.scored.length ? RES.scored.slice(0, Math.max(10, Math.ceil(RES.scored.length * 0.25))).map(function (x) { return x.r; }) : SCOPE;
  if (!pool.length) return toast('Nothing to pick from', 'Widen the scope or relax a filter.');
  var r = pool[Math.floor(Math.random() * pool.length)];
  closeTools(); if (window.innerWidth < 900) S.tab = 'place';
  selectPlace(r.id, { from: 'surprise' });
  var x = RES && RES.byId[r.id];
  toast('How about ' + r.name + '?', (x ? 'Ranked #' + x.rank + ' for ' + profileName(S.profile).toLowerCase() + '. ' : '') + 'Press 🎲 again for another one.');
}

/* ---------- higher or lower: the game lives in /assets/more.js (src/more/game.js) ---------- */
/* ---------- tools drawer ---------- */
function openTools() {
  var d = $('#tools');
  // the tile texts load with the on-demand module (start page budget, 2.11.4); the drawer opens at once
  d.innerHTML = '<div class="drawer-h"><h2>Tools</h2><button class="icon-btn" type="button" data-closetools aria-label="Close tools">' + ICON.close + '</button></div><div class="skeleton" style="margin:16px"><i></i></div>';
  moreLoad().then(function (X) { if (d.hidden) return; d.innerHTML = X.toolsHTML(); scrollHome(d); var c = d.querySelector('[data-closetools]'); if (c) c.focus(); });
  TOOLS_FROM = document.activeElement;
  d.hidden = false; scrollHome(d); $('#scrim').classList.add('open'); document.body.classList.add('tools-open'); layerPush();
  var tt = $('#toast'); if (tt) tt.classList.remove('open'); var ti = $('#tour-invite'); if (ti) ti.remove();
  var c = d.querySelector('[data-closetools]'); if (c) c.focus();
}
var TOOLS_FROM = null;
function closeTools(silent) { var d = $('#tools'); if (!d || d.hidden) return; d.hidden = true; document.body.classList.remove('tools-open'); if (!$('#modal').classList.contains('open') && !$('#palette').classList.contains('open')) $('#scrim').classList.remove('open'); if (!silent) { layerPop(); if (TOOLS_FROM && TOOLS_FROM.focus && document.contains(TOOLS_FROM)) try { TOOLS_FROM.focus(); } catch (e) {} } }

/* ---------- quick tour ---------- */
/* the tour itself lives in /assets/more.js (src/more/tour.js); closing it never needs the module */
function startTour() { closeTools(); moreLoad().then(function (X) { X.startTour(); }); }
function endTour() { var c = $('#coach'); c.hidden = true; c.innerHTML = ''; store('toured', 1); var ti = $('#tour-invite'); if (ti) ti.remove(); }
function maybeTour() {
  if (store('toured') || window.NZ_NO_TOUR || maybeTour._shown) return; maybeTour._shown = 1;
  setTimeout(function () {
    if (S.view !== 'explore' || $('#tour-invite')) return;
    var d = document.createElement('div'); d.id = 'tour-invite'; d.className = 'tour-invite'; d.setAttribute('role', 'status');
    d.innerHTML = '<span>New here? A 30-second tour shows the map, the ranking and your shortlist.</span><button class="btn btn-sm btn-primary" type="button" data-tour>Show me</button><button class="icon-btn sm" type="button" data-tourend aria-label="No thanks">' + ICON.close + '</button>';
    document.body.appendChild(d); setTimeout(function () { if (d.parentNode) d.remove(); }, 20000);
  }, 1200);
}

/* ---------- one click handler for everything above ---------- */
function toolsClick(t, ev) {
  var b;
  if (t.closest('[data-closetools]')) { closeTools(); return true; }
  if ((b = t.closest('[data-filters]'))) { closeTools(); if (window.innerWidth < 900 && S.tab !== 'list') { S.tab = 'list'; renderTabs(); } toggleFilters(); return true; }
  if (t.closest('[data-clearfilters]')) { clearFilters(); updateFilterCount(); return true; }
  if ((b = t.closest('[data-terrain]'))) { toggleChoice('terrain', b.dataset.terrain); return true; }
  if ((b = t.closest('[data-climate]'))) { toggleChoice('climate', b.dataset.climate); return true; }
  if (t.closest('[data-scopetoggle]')) { var rl = $('.rail'); var o = rl.classList.toggle('scope-open'); t.closest('[data-scopetoggle]').setAttribute('aria-expanded', o); return true; }
  if ((b = t.closest('[data-pkscroll]'))) { var pk = b.parentNode.querySelector('.picks'); if (pk) pk.scrollBy({ left: +b.dataset.pkscroll * pk.clientWidth * 0.8, behavior: 'smooth' }); return true; }
  if ((b = t.closest('[data-pscroll]'))) { var pc = $('#pchips'); pc.scrollBy({ left: +b.dataset.pscroll * pc.clientWidth * 0.7, behavior: 'smooth' }); return true; }
  if (t.closest('[data-droplang]')) { S.lang = ''; update({ push: true }); return true; }
  if (t.closest('[data-showall]')) { S.showAll = !S.showAll; renderResults(); if (S.showAll) setTimeout(function () { var u = $('.unranked'); if (u) u.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30); return true; }
  if (t.closest('[data-tools]')) { openTools(); return true; }
  if (t.closest('[data-surprise]')) { surprise(); return true; }
  if (t.closest('[data-game]')) { closeTools(); moreLoad().then(function (X) { X.gameRound(); }); return true; }
  if ((b = t.closest('[data-guess]'))) { if (MOREX) MOREX.gameGuess(b.dataset.guess); return true; }
  if (t.closest('[data-layers]')) { closeTools(); if (window.innerWidth < 900) { S.tab = 'map'; renderTabs(); if (MAP) setTimeout(function () { MAP.resize(); }, 30); } var l = $('#f-layer'); if (l) { l.focus(); if (l.showPicker) try { l.showPicker(); } catch (e) {} } return true; }
  if (t.closest('[data-install]')) { var ip = window.NZ_INSTALL; if (ip) { ip.prompt(); (ip.userChoice || Promise.resolve()).then(function () { window.NZ_INSTALL = null; closeTools(); }); } return true; }
  if (t.closest('[data-install-ios]')) { toast('Add Nestlyzer to your Home Screen', 'In Safari, tap the Share button, then “Add to Home Screen”.'); return true; }
  if (t.closest('[data-undo]')) { undoRemove(); return true; }
  if (t.closest('[data-privacy]')) { closeTools(); setTimeout(function () { var f = document.querySelector('#consent.open button'); if (f) f.focus(); }, 30); return true; }
  if (t.closest('[data-extoggle]')) { var on = !extOn(); store('ext', on); toast(on ? 'Live content on' : 'Live content off', on ? 'Photos, nearby places, weather and local counts load again when you open a place.' : 'Nestlyzer no longer contacts Wikimedia, Wikidata, NASA, OpenStreetMap or Eurostat when you open a place.'); closeTools(); if (S.selected) renderPlace(); return true; }
  if (t.closest('[data-import-yes]')) { var ip = IMPORT_PENDING || []; IMPORT_PENDING = null; closeModal(); importList(ip, true); return true; }
  if (t.closest('[data-retry]')) { var keep = S.ptab; renderPlace(); if (keep) setPlaceTab(keep); return true; }
  if (t.closest('[data-tour]')) { startTour(); return true; }
  if (t.closest('[data-tournext]')) { if (MOREX) MOREX.tourNext(); return true; }
  if (t.closest('[data-tourend]')) { endTour(); return true; }
  if ((b = t.closest('[data-href]'))) { if (window.NZ_STANDALONE) { closeTools(); var a = document.createElement('a'); a.href = b.dataset.href; a.hidden = true; document.body.appendChild(a); a.click(); a.remove(); return true; } location.href = b.dataset.href; return true; }
  if ((b = t.closest('[data-sethome]'))) { setHome(b.dataset.sethome); return true; }
  if ((b = t.closest('[data-ptab]'))) { setPlaceTab(b.dataset.ptab); return true; }
  if ((b = t.closest('[data-photo-open]'))) { openLightbox(b.dataset.photoOf, +b.dataset.photoOpen); return true; }
  if ((b = t.closest('[data-lbgo]'))) { openLightbox(b.dataset.lbid, +b.dataset.lbgo); return true; }
  if (t.closest('[data-lbclose]') || t.id === 'lightbox') { closeLightbox(); return true; }
  if ((b = t.closest('[data-goto]'))) { closeModal(); closeTools(); goToPlace(b.dataset.goto); return true; }
  if ((b = t.closest('[data-cmpdrop]'))) { var drop = b.dataset.cmpdrop; var shown = $$('#modal [data-cmpdrop]').map(function (e) { return e.dataset.cmpdrop; }).filter(function (x) { return x !== drop; }); S.compare = S.compare.filter(function (x) { return x !== drop; }); persistShortlist(); refreshShortlistUI(); if (shown.length >= 2) openCompare(shown); else { closeModal(); toast('Compare needs two places', 'Tick Compare on another place. ' + (BYID[drop] ? BYID[drop].name : 'The place') + ' is still on your shortlist.', { label: 'Open shortlist', attr: 'data-lt="saved"' }); } return true; }
  if ((b = t.closest('[data-cmpreplace]'))) { closeModal(); toggleCompare(b.dataset.cmpnew, b.dataset.cmpreplace); return true; }
  if ((b = t.closest('[data-savecmp]'))) {
    var ids = b.dataset.savecmp.split(',').filter(function (id) { return BYID[id]; }), add = ids.filter(function (id) { return !isSaved(id); });
    add.forEach(function (id) { saved.push(savedEntry(id)); });
    if (add.length) { persistShortlist(); refreshShortlistUI(); }
    toast(add.length ? 'Saved to your shortlist' : 'Already on your shortlist', add.length ? add.length + (add.length === 1 ? ' place' : ' places') + ' added' + (ids.length > add.length ? ', ' + (ids.length - add.length) + ' already there' : '') + '.' : 'Every place in this comparison is already saved.');
    b.disabled = true; return true;
  }
  if ((b = t.closest('[data-share-cmp]'))) { share('Nestlyzer comparison', (window.NZ_STANDALONE ? 'https://nestlyzer.com/' : location.origin + '/') + '#/explore?cc=' + S.cc + '&p=' + S.profile + '&cmp=' + encodeURIComponent(b.dataset.shareCmp)); return true; }
  if (t.closest('[data-share-saved]')) { shareSaved(); return true; }
  if ((b = t.closest('input[data-cmp]'))) { ev && ev.stopPropagation(); toggleCompare(b.dataset.cmp); return true; }
  if (t.closest('label.tick')) return true;
  if (t.closest('textarea.note')) return true;
  return false;
}
