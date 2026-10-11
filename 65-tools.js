/* Tools: filters panel, records, saved places, compare, home, surprise, a small game, the tools drawer and the quick tour */

/* ---------- filters panel and phone scope ---------- */
function toggleFilters(open) {
  var p = $('#filterpanel'); if (!p) return;
  var show = open == null ? p.hidden : open;
  var was = !p.hidden;
  p.hidden = !show;
  $$('[data-filters]').forEach(function (b) { if (b.hasAttribute('aria-expanded')) b.setAttribute('aria-expanded', show); });
  document.body.classList.toggle('filters-open', show);
  if (show && !was) { layerPush(); var tt = $('#toast'); if (tt && window.innerWidth < 900) tt.classList.remove('open'); }
  if (!show && was) layerPop();
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
    var reason = why ? plainReason(why) : !s ? 'too little data for this profile' : (s.coverage < 40 ? 'too little data for this profile' : 'below the profile minimums');
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
var RECORDS_DEF = [
  ['alt', 'max', 'Highest terrain', '🏔️'], ['relief', 'max', 'Most dramatic landscape', '⛰️'], ['alt', 'min', 'Lowest-lying', '🌾'],
  ['g5', 'max', 'Fastest growing', '📈'], ['g5', 'min', 'Shrinking fastest', '📉'], ['dens', 'max', 'Most crowded', '🏙️'], ['dens', 'min', 'Most room to breathe', '🌲'],
  ['area', 'max', 'Largest territory', '🗺️'], ['area', 'min', 'Smallest territory', '📍'], ['pop10', 'max', 'Most people within 10 km', '👥'], ['nbp', 'min', 'Fewest neighbours within 10 km', '🏝️'],
  ['rail', 'max', 'Furthest from a railway', '🚫'], ['city', 'max', 'Furthest from a big city', '🧭'], ['coast', 'max', 'Furthest from the sea', '🏜️'], ['lake', 'min', 'Closest to a large lake', '💧'],
  ['border', 'min', 'Right on the border', '🛂'], ['cap', 'max', 'Furthest from the capital', '🛤️'], ['pop', 'min', 'Smallest population', '🐑'],
  ['dayw', 'min', 'Shortest winter days', '🌑'], ['setw', 'max', 'Latest winter sunset', '🌇'], ['sets', 'max', 'Latest summer sunset', '🌅']
];
var REC_UNIT = { dens: [' resident per km²', ' residents per km²'], pop: [' resident', ' residents'], pop10: [' person', ' people'], nbp: [' person outside the place itself', ' people outside the place itself'] };
/* records only make sense in mainland Europe and for plausible values: no overseas territories, no zero areas, no "nearest lake 600 km away" */
var REC_OK = { area: function (v) { return v > 0.05; }, dens: function (v) { return v > 0; }, lake: function (v, d) { return d[1] === 'max' || v <= 30; }, border: function (v) { return v <= 60; }, rail: function (v) { return v < 400; }, coast: function (v) { return v < 1500; }, cap: function (v) { return v < 2500; } };
function inEurope(r) { return fin(r.lat) && r.lat > 27 && r.lat < 72 && r.lon > -32 && r.lon < 45; }
function recVal(r, k) { if (k === 'nbp') { var x = r.x || {}; return fin(x.pop10) ? Math.max(0, x.pop10 - (r.popNow || 0)) : null; } return pval(r, k); }
function recUnit(k, v) { var u = REC_UNIT[k]; return u ? u[Math.round(v) === 1 ? 0 : 1] : ''; }
function recordsHTML() {
  var pool = SCOPE.filter(function (r) { return r.popNow > 0 && inEurope(r); });
  if (!pool.length) return '<div class="empty"><h3>No places in scope</h3></div>';
  var cards = RECORDS_DEF.map(function (d) {
    var best = null, bv = null;
    pool.forEach(function (r) { var v = recVal(r, d[0]); if (v == null) return; if (d[0] === 'g5' && Math.abs(v) > 40) return; if (bv == null || (d[1] === 'max' ? v > bv : v < bv)) { bv = v; best = r; } });
    if (!best || (REC_OK[d[0]] && !REC_OK[d[0]](bv, d))) return '';
    return '<button class="rec" type="button" data-id="' + esc(best.id) + '"><span class="ri" aria-hidden="true">' + d[3] + '</span><span class="rt">' + esc(d[2]) + '</span><b>' + esc(best.name) + '</b><small>' + esc((d[0] === 'nbp' ? fmtInt(bv) : pfmt(d[0], bv)) + recUnit(d[0], bv)) + (PARAM[d[0]] && PARAM[d[0]].name && PARAM[d[0]].name(best) ? ' · ' + esc(PARAM[d[0]].name(best)) : '') + '</small></button>';
  }).join('');
  return '<div class="records"><p class="small muted">The extremes of ' + esc(scopeName()) + ' (' + fmtInt(pool.length) + ' places with data' + (pool.length < SCOPE.length ? '; overseas territories and places without residents are left out' : '') + '). Change the region or filters and the records change with them. Growth records leave out jumps of more than 40%, which usually come from mergers.</p><div class="recgrid">' + cards + '</div></div>';
}

/* ---------- saved places ---------- */
function savedHTML() {
  if (!saved.length) return '<div class="empty sl-empty"><h3>Your shortlist is empty</h3><p>' + TAP + ' <b>♥ Save</b> on any place to keep it here. To put places side by side, tick <b>Compare</b> on two or three of them, here or on the place itself.</p><ol class="small"><li>Open a place from the map or the ranking.</li><li>' + TAP + ' <b>♥ Save</b>, or tick <b>Compare</b>.</li><li>Come back here (♥ Shortlist) and press <b>Compare</b>.</li></ol><p class="small muted">Your shortlist stays in this browser, works across countries and profiles, and can be shared as a link.</p></div>';
  var n = S.compare.length;
  return '<div class="board"><div class="grp sl-head"><h3>Your shortlist (' + saved.length + ')</h3><p>Tick two or three places, then compare them side by side. ' + (n ? n + ' of 3 ticked.' : 'Nothing ticked yet.') + '</p><div class="actions"><button class="btn btn-sm btn-primary" type="button" data-opencmp' + (n < 2 ? ' disabled' : '') + '><span>Compare ticked (<span class="n">' + n + '</span>)</span></button><button class="btn btn-sm" type="button" data-share-saved>' + ICON.share + 'Share list</button><button class="btn btn-sm" type="button" data-export>' + ICON.doc + 'Download CSV</button></div></div>' +
    '<ol class="list saved">' + saved.map(function (s) {
      var cc = s.id.split(':')[0], on = isCmp(s.id);
      return '<li class="row' + (on ? ' ticked' : '') + '" data-open="' + esc(s.id) + '" tabindex="0"><label class="tick" title="Tick to compare"><input type="checkbox" data-cmp="' + esc(s.id) + '"' + (on ? ' checked' : '') + ' aria-label="Compare ' + esc(s.name) + '"><span>Compare</span></label><div><div class="nm">' + flagImg(cc, 11) + ' ' + esc(s.name) + (S.home === s.id ? ' <span class="chip">🏠 home</span>' : '') + '</div><div class="meta">' + esc(s.area || '') + (s.profile ? ', saved for ' + esc(profileName(s.profile) || s.profile) : '') + '</div>' +
        '<textarea class="note" rows="1" placeholder="Add a note: viewing date, school, rent you saw…" data-note="' + esc(s.id) + '" aria-label="Note for ' + esc(s.name) + '">' + esc(s.note || '') + '</textarea></div><div class="right">' + (function () { var live = RES && RES.byId[s.id] && s.profile === S.profile ? RES.byId[s.id].overall : s.score; return fin(live) ? scoreBadge(live) : ''; })() + '<button class="icon-btn sm" type="button" data-unsave="' + esc(s.id) + '" aria-label="Remove ' + esc(s.name) + ' from the shortlist" title="Remove">' + ICON.close + '</button></div></li>';
    }).join('') + '</ol></div>';
}
function setNote(id, text) { saved.forEach(function (s) { if (s.id === id) s.note = text.slice(0, 500); }); store('saved', saved); }
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

/* ---------- compare, side by side ---------- */
function openCompare(ids) {
  ids = (ids || S.compare).slice(0, 3);
  Promise.all(ids.map(function (id) { return loadCountry(id.split(':')[0]).catch(function () { return null; }); })).then(function () {
    var list = ids.map(function (id) { return BYID[id]; }).filter(Boolean);
    if (list.length < 2) { toast('Tick at least two places', 'Tick Compare on two or three places, on the place itself or in your shortlist.', { label: 'Open shortlist', attr: 'data-lt="saved"' }); return; }
    var xs = list.map(function (r) { var x = RES && RES.byId[r.id]; return x || { r: r, id: r.id, catScores: ENGINE.categories(r), overall: (ENGINE.scoreRaw(r, S.profile, 0, r.country) || {}).score }; });
    var wins = xs.map(function () { return []; }), ties = xs.map(function () { return []; });
    var mixed = xs.some(function (x) { return x.r.country !== xs[0].r.country; });
    function row(label, vals, show, better, key, relative) {
      var shown = vals; if (relative) vals = vals.map(function (v) { return fin(v) ? Math.round(v) : v; });
      var nums = vals.filter(fin), best = null;
      if (relative && mixed) better = null;
      if (better && nums.length > 1 && Math.max.apply(null, nums) !== Math.min.apply(null, nums)) best = better === 'max' ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
      var nb = best == null ? 0 : vals.filter(function (v) { return v === best; }).length;
      if (best != null && key) vals.forEach(function (v, i) { if (v === best) (nb > 1 ? ties : wins)[i].push(key); });
      return '<tr><th scope="row">' + esc(label) + '</th>' + vals.map(function (v, i) { return '<td class="' + (best != null && v === best ? 'best' : '') + '">' + (show ? show(shown[i], i) : fin(shown[i]) ? fmt(shown[i]) : '–') + '</td>'; }).join('') + '</tr>';
    }
    function prow(k, label, better, key) { return row(label, xs.map(function (x) { return pval(x.r, k); }), function (v) { return esc(pfmt(k, v)); }, better, key); }
    var allFar = function (k, lim) { return xs.every(function (x) { var v = pval(x.r, k); return v == null || v > lim; }); };
    var w = ENGINE.weightsFor(xs[0].r, S.profile);
    var ck = Object.keys(w).filter(function (k) { return xs.some(function (x) { return fin(x.catScores[k]); }); }).sort(function (a, b) { return w[b] - w[a]; });
    var head = '<thead><tr><th></th>' + xs.map(function (x) {
      return '<th><div class="cmp-ph" data-photo="' + esc(x.id) + '" data-postcard="' + esc(x.id) + '" data-w="260" data-h="140"></div>' + flagImg(x.r.country) + ' <b>' + esc(x.r.name) + '</b><div class="small muted">' + esc(localAreaOf(x.r)) + ', ' + esc(countryName(x.r.country)) + '</div><div class="cmp-acts"><button class="btn btn-sm" type="button" data-goto="' + esc(x.id) + '">Open</button><button class="icon-btn sm" type="button" data-cmpdrop="' + esc(x.id) + '" aria-label="Remove ' + esc(x.r.name) + ' from compare">' + ICON.close + '</button></div></th>';
    }).join('') + '</tr></thead>';
    var body = '<tbody>' +
      '<tr class="grp"><th colspan="' + (xs.length + 1) + '">Fit for ' + esc(profileName(S.profile)) + '</th></tr>' +
      row('Score', xs.map(function (x) { return x.overall; }), function (v) { return fin(v) ? scoreBadge(v) : '–'; }, 'max', 'overall fit', true) +
      row('Rank', xs.map(function (x) { return x.rank ? '#' + x.rank : 'not ranked here'; }), function (v) { return esc(v); }) +
      row('Data depth', xs.map(function (x) { return depthKind(x.r.country)[1]; }), function (v) { return esc(v); }) +
      ck.map(function (k) { return row(shortCat(k) + ' (weight ' + w[k] + ')', xs.map(function (x) { return x.catScores[k]; }), function (v) { return fin(v) ? fmt(v) : '–'; }, 'max', shortCat(k).toLowerCase(), true); }).join('') +
      '<tr class="grp"><th colspan="' + (xs.length + 1) + '">People</th></tr>' +
      prow('pop', 'Residents') + prow('dens', 'Residents per km²') + prow('g5', 'Change in 5 years', 'max', 'growth') + prow('pop10', 'Residents within 10 km') +
      '<tr class="grp"><th colspan="' + (xs.length + 1) + '">Getting around</th></tr>' +
      prow('city', 'City of 100,000+', 'min', 'city access') + prow('air', 'Hub airport', 'min', 'flights') + prow('rail', 'Main railway line', 'min', 'rail') + prow('mway', 'Motorway', 'min') + prow('cap', 'Capital', 'min') +
      '<tr class="grp"><th colspan="' + (xs.length + 1) + '">Land and water</th></tr>' +
      row('Terrain', xs.map(function (x) { var t = terrainOf(x.r); return t ? t.name : '–'; }), function (v) { return esc(v); }) +
      prow('alt', 'Surrounding terrain height') +
      row('Climate', xs.map(function (x) { var c = climateOf(x.r); return c ? c.name : '–'; }), function (v) { return esc(v); }) +
      (allFar('coast', 150) ? '' : prow('coast', 'Sea', 'min', 'the sea')) + (allFar('lake', 40) ? '' : prow('lake', 'Large lake', 'min', 'lakes')) +
      '</tbody>';
    var verdict = (mixed ? '<p class="small cmp-note">These places are in different countries. Scores and category values are measured against each place\'s own country, so they are not compared here; distances, sizes and the setting are.</p>' : '') + '<div class="verdicts">' + xs.map(function (x, i) { var wl = wins[i].filter(function (v, j, a) { return a.indexOf(v) === j; }), tl = ties[i].filter(function (v, j, a) { return a.indexOf(v) === j && wl.indexOf(v) < 0; }); return '<div class="verdict"><b>' + esc(x.r.name) + '</b> ' + (wl.length ? 'wins on ' + esc(wl.slice(0, 5).join(', ')) + (tl.length ? '; ties on ' + esc(tl.slice(0, 3).join(', ')) : '') + '.' : tl.length ? 'ties on ' + esc(tl.slice(0, 3).join(', ')) + '.' : 'wins no single row, but check the details.') + '</div>'; }).join('') + '</div>';
    openModal('Compare places', verdict + '<div class="tablewrap"><table class="cmp">' + head + body + '</table></div><div class="actions" style="margin-top:12px"><button class="btn btn-sm" type="button" data-share-cmp="' + esc(ids.join(',')) + '">' + ICON.share + 'Share this comparison</button></div><p class="small muted" style="margin-top:12px">Green marks the best value in a row when the places differ. Scores use the ' + esc(profileName(S.profile)) + ' profile; places in other countries are scored with their own country\'s data depth.</p>');
    hydratePostcards($('#modal')); hydratePhotos($('#modal'));
  });
}

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

/* ---------- higher or lower: a small game with real data ---------- */
var GAME = { streak: 0, best: store('gamebest') || 0, q: null };
var GAME_Q = [['pop', 'Which one has <b>more residents</b>?'], ['alt', 'Which one sits on <b>higher ground</b>?'], ['cap', 'Which one is <b>further from the capital</b>?'], ['pop10', 'Which one has <b>more people within 10 km</b>?'], ['coast', 'Which one is <b>closer to the sea</b>?', 'min'], ['g5', 'Which one <b>grew faster</b> in the last five years?'], ['area', 'Which one covers <b>more land</b>?'], ['rail', 'Which one is <b>further from a railway line</b>?'], ['dayw', 'Which one gets <b>more daylight</b> on the shortest day?'], ['setw', 'Where does the sun <b>set later</b> in December?']];
function gameRound() {
  var pool = SHARD ? SHARD.records.filter(function (r) { return r.popNow >= 2000 && r.x; }) : [];
  if (pool.length < 10) return toast('Not enough places', 'Pick a bigger country to play.');
  var q, a, b, va, vb, tries = 0;
  do { q = GAME_Q[Math.floor(Math.random() * GAME_Q.length)]; a = pool[Math.floor(Math.random() * pool.length)]; b = pool[Math.floor(Math.random() * pool.length)]; va = pval(a, q[0]); vb = pval(b, q[0]); tries++; } while ((a === b || va == null || vb == null || (q[0] === 'g5' && (Math.abs(va) > 40 || Math.abs(vb) > 40)) || Math.abs(va - vb) < (q[0] === 'setw' || q[0] === 'dayw' ? 0.15 : Math.max(Math.abs(va), Math.abs(vb)) * 0.08)) && tries < 60);
  GAME.q = { q: q, a: a, b: b, va: va, vb: vb };
  function card(r, side) { return '<button class="gcard" type="button" data-guess="' + side + '"><div class="cmp-ph" data-photo="' + esc(r.id) + '" data-postcard="' + esc(r.id) + '" data-w="300" data-h="170"></div><b>' + esc(r.name) + '</b><small>' + esc(localAreaOf(r)) + '</small><span class="gval" hidden></span></button>'; }
  openModal('Higher or lower', '<p class="gq">' + q[1] + '</p><div class="ggrid">' + card(a, 'a') + card(b, 'b') + '</div><p class="small muted gs">Streak: <b>' + GAME.streak + '</b> · best: <b>' + GAME.best + '</b> · all ' + esc(countryName(S.cc)) + ', real data</p>');
  hydratePostcards($('#modal')); hydratePhotos($('#modal'));
}
function gameGuess(side) {
  var g = GAME.q; if (!g || g.done) return; g.done = true;
  var aWins = g.q[2] === 'min' ? g.va < g.vb : g.va > g.vb, right = (side === 'a') === aWins;
  GAME.streak = right ? GAME.streak + 1 : 0; if (GAME.streak > GAME.best) { GAME.best = GAME.streak; store('gamebest', GAME.best); }
  $$('#modal .gcard').forEach(function (c) { var s = c.dataset.guess, v = s === 'a' ? g.va : g.vb, win = (s === 'a') === aWins; c.classList.add(win ? 'win' : 'lose'); var o = c.querySelector('.gval'); o.hidden = false; o.textContent = pfmt(g.q[0], v); });
  var gs = $('#modal .gs'); if (gs) gs.innerHTML = (right ? '✅ Right! ' : '❌ Not this time. ') + 'Streak: <b>' + GAME.streak + '</b> · best: <b>' + GAME.best + '</b> <button class="btn btn-sm btn-primary" type="button" data-game>Next pair</button>';
}

/* ---------- tools drawer ---------- */
function openTools() {
  var d = $('#tools');
  var tiles = [
    ['data-surprise', '🎲', 'Surprise me', 'A random place from the top quarter of the ranking.'],
    ['data-lt="records"', '🏆', 'Records', 'Highest, emptiest, fastest growing and more, for your scope.'],
    ['data-lt="saved"', '♥', 'Shortlist (' + saved.length + ')', 'Your saved places, with notes. Tick two or three to compare them side by side' + (S.compare.length ? ' (' + S.compare.length + ' ticked)' : '') + '.'],
    ['data-game', '🃏', 'Higher or lower', 'Guess which of two places has more of something. Real data.'],
    ['data-builder', '✨', 'Build my own profile', 'Answer a few questions and get your own weights.'],
    ['data-filters', '🎚️', 'Filters', 'Railway, lake, terrain, climate, border and more.'],
    ['data-layers', '🗺️', 'Map layers', 'Colour the map by terrain, lakes, rail, growth and more.'],
    ['data-tour', '🧭', 'Quick tour', 'Thirty seconds on how this works.'],
    ['data-export', '⬇️', 'Download CSV', 'Your saved places as a spreadsheet.'],
    ['data-href="/method/"', '📐', 'How scores work', 'Every weight, factor and source.'],
    ['data-theme-toggle', '🌓', 'Light or dark', 'Switch the colour theme.'],
    ['data-href="/legal/"', '§', 'Imprint and privacy', 'Who runs Nestlyzer, the privacy policy and the terms.'],
    ['data-extoggle', '🛡️', 'Live content: ' + (extOn() ? 'on' : 'off'), extOn() ? 'Photos, weather and local counts come from Wikimedia, NASA, OpenStreetMap and Eurostat. Switch them off for more privacy.' : 'Off: Nestlyzer contacts none of these services. Switch on to see photos, weather and local counts again.']
  ];
  if (window.NZConsent) tiles.splice(tiles.length - 1, 0, ['data-privacy', '🔒', 'Privacy settings', 'Change your choice about visit statistics and ads at any time.']);
  var standaloneApp = window.matchMedia && matchMedia('(display-mode: standalone)').matches;
  if (window.NZ_INSTALL) tiles.push(['data-install', '📲', 'Install the app', 'Add Nestlyzer to your home screen or desktop. Opens full-screen, no app store needed.']);
  else if (!standaloneApp && /iPhone|iPad|iPod/.test(navigator.userAgent)) tiles.push(['data-install-ios', '📲', 'Add to Home Screen', 'In Safari tap Share, then “Add to Home Screen”. Nestlyzer then opens like an app.']);
  d.innerHTML = '<div class="drawer-h"><h2>Tools</h2><button class="icon-btn" type="button" data-closetools aria-label="Close tools">' + ICON.close + '</button></div><div class="tgrid">' + tiles.map(function (t) { return '<button class="tool" type="button" ' + t[0] + '><span class="ti" aria-hidden="true">' + t[1] + '</span><b>' + esc(t[2]) + '</b><small>' + esc(t[3]) + '</small></button>'; }).join('') + '</div>' +
    (S.home && BYID[S.home] ? '<p class="small muted" style="padding:0 16px">🏠 Your home: ' + esc(BYID[S.home].name) + '. Every place shows how it differs.</p>' : '<p class="small muted" style="padding:0 16px">Tip: open the place you live now and tap 🏠. Every other place then shows how it differs from home.</p>');
  TOOLS_FROM = document.activeElement;
  d.hidden = false; $('#scrim').classList.add('open'); document.body.classList.add('tools-open'); layerPush();
  var tt = $('#toast'); if (tt) tt.classList.remove('open'); var ti = $('#tour-invite'); if (ti) ti.remove();
  var c = d.querySelector('[data-closetools]'); if (c) c.focus();
}
var TOOLS_FROM = null;
function closeTools(silent) { var d = $('#tools'); if (!d || d.hidden) return; d.hidden = true; document.body.classList.remove('tools-open'); if (!$('#modal').classList.contains('open') && !$('#palette').classList.contains('open')) $('#scrim').classList.remove('open'); if (!silent) { layerPop(); if (TOOLS_FROM && TOOLS_FROM.focus && document.contains(TOOLS_FROM)) try { TOOLS_FROM.focus(); } catch (e) {} } }

/* ---------- quick tour ---------- */
var TOUR = [
  ['.profilebar', 'Who is moving?', 'Pick a household. Each one weighs costs, schools, quiet, jobs and access differently, and everything updates at once.'],
  ['.rail .scope, .rail .scope-summary', 'Where to look', 'Choose a country and region. Filters narrow it down: railway within 5 km, near a lake, mountainous, mild climate and more.'],
  ['#map', 'The map', 'Darker blue means a better fit. Numbered pins mark the best-ranked places you can see; zoom in for more. ' + TAP + ' any place to open it.'],
  ['.picks, .list', 'The ranking', 'Top picks first, then everything that fits. ' + TAP + ' a place to open it. ♥ puts it on your shortlist.'],
  ['.sl-btn, .mobile-tabs [data-mt="saved"]', 'Your shortlist', 'Everything you save lands here. Tick Compare on two or three places and see them side by side.'],
  ['[data-tools]', 'Tools', 'Records, surprise me, a small game, filters and map layers live here.']
];
var tourStep = 0;
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
  if (t.closest('[data-game]')) { closeTools(); gameRound(); return true; }
  if ((b = t.closest('[data-guess]'))) { gameGuess(b.dataset.guess); return true; }
  if (t.closest('[data-layers]')) { closeTools(); if (window.innerWidth < 900) { S.tab = 'map'; renderTabs(); if (MAP) setTimeout(function () { MAP.resize(); }, 30); } var l = $('#f-layer'); if (l) { l.focus(); if (l.showPicker) try { l.showPicker(); } catch (e) {} } return true; }
  if (t.closest('[data-install]')) { var ip = window.NZ_INSTALL; if (ip) { ip.prompt(); (ip.userChoice || Promise.resolve()).then(function () { window.NZ_INSTALL = null; closeTools(); }); } return true; }
  if (t.closest('[data-install-ios]')) { toast('Add Nestlyzer to your Home Screen', 'In Safari, tap the Share button, then “Add to Home Screen”.'); return true; }
  if (t.closest('[data-undo]')) { undoRemove(); return true; }
  if (t.closest('[data-privacy]')) { closeTools(); setTimeout(function () { var f = document.querySelector('#consent.open button'); if (f) f.focus(); }, 30); return true; }
  if (t.closest('[data-extoggle]')) { var on = !extOn(); store('ext', on); toast(on ? 'Live content on' : 'Live content off', on ? 'Photos, nearby places, weather and local counts load again when you open a place.' : 'Nestlyzer no longer contacts Wikimedia, Wikidata, NASA, OpenStreetMap or Eurostat when you open a place.'); closeTools(); if (S.selected) renderPlace(); return true; }
  if (t.closest('[data-import-yes]')) { var ip = IMPORT_PENDING || []; IMPORT_PENDING = null; closeModal(); importList(ip, true); return true; }
  if (t.closest('[data-retry]')) { var keep = S.ptab; renderPlace(); if (keep) setPlaceTab(keep); return true; }
  if (t.closest('[data-tour]')) { startTour(); return true; }
  if (t.closest('[data-tournext]')) { tourStep++; showTourStep(); return true; }
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
  if ((b = t.closest('[data-share-cmp]'))) { share('Nestlyzer comparison', (window.NZ_STANDALONE ? 'https://nestlyzer.com/' : location.origin + '/') + '#/explore?cc=' + S.cc + '&p=' + S.profile + '&cmp=' + encodeURIComponent(b.dataset.shareCmp)); return true; }
  if (t.closest('[data-share-saved]')) { shareSaved(); return true; }
  if ((b = t.closest('input[data-cmp]'))) { ev && ev.stopPropagation(); toggleCompare(b.dataset.cmp); return true; }
  if (t.closest('label.tick')) return true;
  if (t.closest('textarea.note')) return true;
  return false;
}
