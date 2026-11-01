/* Personal decision tools (2.7, part of the lazy module /assets/more.js):
   Scorecard, My Top 10 (shortlist status, manual order, ranking by your current preferences), What-if rankings,
   Better than home, and Your saved data (download, restore, delete).
   Storage: this browser only (localStorage, nz: keys). Nestlyzer has no server; the download file is the way to move
   your data to another browser or device. Nothing here is sent anywhere, and nothing here changes a place's data:
   a score that moves only reflects changed preferences. */
var PT_STATUS = [['', 'No status'], ['interested', 'Interested'], ['favourite', 'Favourite'], ['visited', 'Visited'], ['excluded', 'Excluded']];
function ptSaved() { return saved; }
function ptScore(r, key) {
  key = key || S.profile;
  var s = ENGINE.scoreRaw(r, key, 55, r.country); if (!s) return null;
  var why = ENGINE.eligibilityFail(r, key, r.country);
  return { score: s.score, coverage: s.coverage, weighted: s.weighted, measured: s.measured, cats: s.cats, fail: why, must: ENGINE.profiles[key] && ENGINE.profiles[key].must ? ENGINE.mustStatus(r, ENGINE.profiles[key]) : null };
}
function ptWeights(key) { var p = profileDef(key || S.profile) || {}; return p.weights || {}; }
function ptCats(r, key) {
  var w = ptWeights(key), c = ENGINE.categoriesFor(r, key || S.profile), tot = 0, k, out = [];
  for (k in w) tot += w[k];
  for (k in w) out.push({ k: k, w: w[k], share: tot ? w[k] / tot : 0, v: fin(c[k]) ? c[k] : null });
  return out.sort(function (a, b) { return b.w - a.w; });
}
function ptBar(v) { return fin(v) ? '<span class="ptbar"><i style="width:' + Math.max(2, Math.min(100, v)) + '%;background:' + (v >= 70 ? '#1D7A55' : v >= 45 ? '#C8742A' : '#B23A3A') + '"></i></span>' : '<span class="ptbar none">weight shared by the other criteria</span>'; }
function ptMoveSteps(r) {
  var c = countryName(r.country), tips = [
    'Residence and work: check the permit rules for your nationality in ' + c + ' before signing a lease.',
    'Housing: compare current listings in ' + r.name + ' with the rent and price figures above.',
    'Schools and childcare: ask the municipality about places and teaching languages.',
    'Health insurance and doctor: register with the national scheme or a local insurer after the move.',
    'Commute: test the trip to work or study at rush hour.'];
  return '<h4>Next steps before moving</h4><ul class="ptmust">' + tips.map(function (t) { return '<li class="check"><b>☐</b> ' + esc(t) + '</li>'; }).join('') + '</ul>';
}
function ptMustRows(ms) {
  if (!ms || !ms.length) return '';
  var known = ms.filter(function (m) { return m.status !== 'unknown' && m.k !== 'none'; }), local = ms.filter(function (m) { return m.status === 'unknown' || m.k === 'none'; });
  return (known.length ? '<h4>Must-haves</h4><ul class="ptmust">' + known.map(function (m) {
    return '<li class="' + m.status + '"><b>' + (m.status === 'pass' ? '✓ met' : '✗ not met') + '</b> ' + esc(m.label) +
      ' (' + (m.k === 'catch30' ? fmtInt(m.val) + ' people' : m.k === 'pop' ? fmtInt(m.val) + ' residents' : fmt(m.val, 1) + ' km') + ')</li>';
  }).join('') + '</ul>' : '') +
    (local.length ? '<h4>Next steps on site</h4><ul class="ptmust">' + local.map(function (m) { return '<li class="check"><b>☐</b> ' + esc(m.label.replace(/ \(.*\)$/, '')) + '</li>'; }).join('') + '</ul><p class="small muted">Confirm these with the municipality\'s economic development office, the grid operator and the land registry before you commit.</p>' : '') +
    '<p class="small muted">Straight-line distances from Natural Earth 1:10m; people within 30 km from municipality or place centres.</p>';
}

/* ---------- Scorecard ---------- */
function scorecardHTML(r) {
  var key = S.profile, p = profileDef(key) || {}, s = ptScore(r), cats = ptCats(r);
  if (!s) return '<div data-scslot="' + esc(r.id) + '" class="ptcard"><p>' + esc(r.name) + ' is not scored for ' + esc(p.name || key) + ': the profile needs a few more comparable figures here. Open Key facts and All data for what is known.</p></div>';
  var have = cats.filter(function (c) { return c.v != null; }), miss = cats.filter(function (c) { return c.v == null; });
  var strong = have.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 3), weak = have.slice().sort(function (a, b) { return a.v - b.v; }).slice(0, 3);
  var x = RES && RES.byId[r.id], rankTxt = x ? '#' + x.rank + ' of ' + fmtInt(RES.scored.length) + ' in ' + scopeName() : s.fail ? 'not ranked: ' + s.fail : 'outside the current scope';
  var sv = ptSaved().filter(function (e) { return BYID[e.id]; }).map(function (e) { var q = ptScore(BYID[e.id]); return q ? { id: e.id, v: q.score } : null; }).filter(Boolean).sort(function (a, b) { return b.v - a.v; });
  var pos = sv.map(function (o) { return o.id; }).indexOf(r.id);
  return '<div data-scslot="' + esc(r.id) + '" class="ptcard">' +
    '<div class="pthead"><div><span class="ptbig">' + Math.round(s.score) + '</span><span class="muted"> of 100 for ' + esc(p.name || key) + '</span></div><div class="small muted">' + esc(rankTxt) + '<br>' + esc(evidenceLine(s)) + ' · ' + esc(assessKind(s)[1]) + ' · ' + fmt(r.sourceConfidence) + '% source confidence</div></div>' +
    (isBizKey(key) ? '<p class="small ptscreen"><b>Preliminary location screening, not a site approval.</b> The score compares places on public data; grid capacity, plots, permits and staff for your project are checked on site (list below).</p>' : '') +
    ptMustRows(s.must) + (isBizKey(key) ? '' : ptMoveSteps(r)) +
    '<h4>Your criteria</h4><table class="pttable"><thead><tr><th>Criterion</th><th class="num">Weight</th><th>Score</th><th class="num">Rank</th></tr></thead><tbody>' +
    cats.map(function (c) { var rk = RES && RES.categoryRanks[c.k] && RES.categoryRanks[c.k][r.id]; return '<tr><td>' + esc(shortCat(c.k)) + '</td><td class="num">' + Math.round(c.share * 100) + '%</td><td>' + ptBar(c.v) + (c.v != null ? ' ' + Math.round(c.v) : '') + '</td><td class="num">' + (rk ? '#' + rk : '–') + '</td></tr>'; }).join('') + '</tbody></table>' +
    '<div class="ptcols"><div><h4>Strongest</h4><ul>' + strong.map(function (c) { return '<li>' + esc(shortCat(c.k)) + ' <b class="' + tone(c.v) + '">' + Math.round(c.v) + '</b></li>'; }).join('') + '</ul></div><div><h4>Weakest</h4><ul>' + weak.map(function (c) { return '<li>' + esc(shortCat(c.k)) + ' <b class="' + tone(c.v) + '">' + Math.round(c.v) + '</b></li>'; }).join('') + '</ul></div></div>' +
    (miss.length ? '<p class="small muted ptnote">The score uses your other criteria; ' + miss.map(function (c) { return esc(shortCat(c.k)); }).join(', ') + ' (' + Math.round(miss.reduce(function (a, c) { return a + c.share; }, 0) * 100) + '% of your weights) is compared where ' + esc(countryName(r.country)) + ' publishes it.</p>' : '') +
    (sv.length >= 2 && pos >= 0 ? '<p class="small">On your shortlist it is <b>#' + (pos + 1) + ' of ' + sv.length + '</b> for these preferences.</p>' : '') +
    '<p class="small muted">A decision aid from public data, not a statement that the place is objectively best. Category scores compare the place with the other ' + esc(unitWord(r.country, 2)) + ' of ' + esc(countryName(r.country)) + '.</p></div>';
}

/* ---------- My Top 10 ---------- */
function ptEnsure() { var ccs = {}; ptSaved().forEach(function (e) { ccs[e.id.split(':')[0]] = 1; }); return Promise.all(Object.keys(ccs).map(function (cc) { return loadCountry(cc).catch(function () { return null; }); })); }
function openTop10() { ptEnsure().then(function () { openModal('My Top 10', '<div id="pt-top10">' + top10Body() + '</div>'); }); }
function top10Body() {
  var list = ptSaved(), order = store(CURMODE === 'biz' ? 'biztoporder' : 'toporder') || 'fit', p = profileDef(S.profile) || {};
  if (!list.length) return '<p>Your shortlist is empty. Save places with ♥, then come back: this view ranks them by your current preferences or in your own order.</p>';
  var rows = list.map(function (e, i) { var r = BYID[e.id], q = r ? ptScore(r) : null; return { e: e, r: r, q: q, i: i }; });
  if (order === 'fit') rows.sort(function (a, b) { var ea = a.e.status === 'excluded', eb = b.e.status === 'excluded'; if (ea !== eb) return ea ? 1 : -1; var va = a.q && !a.q.fail ? a.q.score : -1, vb = b.q && !b.q.fail ? b.q.score : -1; return vb - va || a.i - b.i; });
  return '<p class="small">' + (order === 'fit' ? 'Ranked by your current preferences: <b>' + esc(p.name || S.profile) + '</b>. Change the profile or weights and this order follows; your own order is kept separately.' : 'Your own order. Use ↑ and ↓ to move places; the fit score is shown for reference.') + '</p>' +
    '<div class="actions"><button class="chip" type="button" data-ptorder="fit" aria-pressed="' + (order === 'fit') + '">By fit</button><button class="chip" type="button" data-ptorder="mine" aria-pressed="' + (order === 'mine') + '">My order</button></div>' +
    '<ol class="pttop">' + rows.map(function (o, k) {
      var c = o.r ? ptCats(o.r).filter(function (x) { return x.v != null; }).sort(function (a, b) { return b.v * b.share - a.v * a.share; })[0] : null;
      var reason = !o.r ? 'country not loaded' : !o.q ? 'too few measures for this profile' : o.q.fail ? 'not ranked: ' + o.q.fail : c ? 'led by ' + shortCat(c.k).toLowerCase() + ' (' + Math.round(c.v) + ')' : '';
      return '<li class="' + (o.e.status || '') + (k >= 10 && order === 'fit' ? ' beyond' : '') + '"><span class="ptn">' + (k + 1) + '</span><span class="ptname"><b>' + esc(o.e.name) + '</b><small>' + esc(o.e.area || '') + ' · ' + esc(reason) + '</small></span>' +
        '<span class="ptsc">' + (o.q && !o.q.fail ? Math.round(o.q.score) : '–') + '</span>' +
        '<select data-ptstatus="' + esc(o.e.id) + '" aria-label="Status of ' + esc(o.e.name) + '">' + PT_STATUS.map(function (s) { return '<option value="' + s[0] + '"' + ((o.e.status || '') === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select>' +
        (order === 'mine' ? '<button class="icon-btn sm" type="button" data-ptmove="' + esc(o.e.id) + '|-1" aria-label="Move up">↑</button><button class="icon-btn sm" type="button" data-ptmove="' + esc(o.e.id) + '|1" aria-label="Move down">↓</button>' : '') + '</li>';
    }).join('') + '</ol>' + (order === 'fit' && rows.length > 10 ? '<p class="small muted">Places beyond 10 are shown greyed.</p>' : '') +
    '<p class="small muted">Excluded places stay on your list but sort to the end. Saved in this browser only.</p>';
}
function ptRefreshTop10() { var b = document.getElementById('pt-top10'); if (b) b.innerHTML = top10Body(); }

/* ---------- What-if ---------- */
var WI = null;
function openWhatIf() {
  if (!RES || !SCOPE) return toast('Open a country first', 'What-if works on the ranking you are looking at.');
  var base = ptWeights(), p = profileDef(S.profile) || {};
  WI = { key: S.profile, base: Object.assign({}, base), w: Object.assign({}, base), name: p.name || S.profile };
  openModal('What if…', '<div id="pt-wi">' + whatIfBody() + '</div>');
}
/* ranks under the real profile key, so every rule tied to that profile (minimums, gates, coastal floor) still applies;
   only the weights are swapped for the duration of the call */
function whatIfRank() {
  var p = ENGINE.profiles[WI.key]; if (!p) return { scored: [], reasons: {} };
  var keep = p.weights; p.weights = WI.w;
  try { return ENGINE.rank(SCOPE, WI.key, { country: S.cc, subRanks: false }); } finally { p.weights = keep; }
}
function whatIfBody() {
  var keys = Object.keys(WI.base), extra = ['affordability', 'safety', 'family', 'health', 'jobs', 'mobility', 'commuter_access', 'environment', 'lifestyle', 'tax', 'coast', 'freight'].filter(function (k) { return !(k in WI.base) && ENGINE.meta.categoryLabels[k] && (k !== 'freight' || isBizKey(WI.key)); });
  var res = whatIfRank(), baseRank = {}; RES.scored.forEach(function (x) { baseRank[x.id] = x.rank; });
  var totB = 0, totW = 0, k; for (k in WI.base) totB += WI.base[k]; for (k in WI.w) totW += WI.w[k];
  var top = res.scored.slice(0, 10).map(function (x) {
    var was = baseRank[x.id], d = was ? was - x.rank : null, best = null;
    for (var c in x.catScores) { var dw = (WI.w[c] || 0) / (totW || 1) - (WI.base[c] || 0) / (totB || 1); var eff = dw * x.catScores[c]; if (!best || eff > best[1]) best = [c, eff]; }
    return '<li><span class="ptn">' + x.rank + '</span><span class="ptname"><b>' + esc(x.r.name) + '</b><small>' + esc(localAreaOf(x.r)) + (best && best[1] > 0.5 ? ' · lifted by ' + esc(shortCat(best[0]).toLowerCase()) : '') + '</small></span><span class="ptsc">' + Math.round(x.overall) + '</span><span class="ptmove ' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">' + (d == null ? 'new' : d > 0 ? '▲ ' + d : d < 0 ? '▼ ' + (-d) : '=') + '</span></li>';
  }).join('');
  var sc = store('scenarios') || [];
  return '<p class="small">Change what matters and watch the ranking of <b>' + esc(scopeName()) + '</b> respond. This changes your preferences only; the places and their data stay the same. Baseline: <b>' + esc(WI.name) + '</b>.</p>' +
    '<div class="ptsliders">' + keys.concat(extra).map(function (c) { var v = WI.w[c] || 0; return '<label><span>' + esc(shortCat(c)) + (c in WI.base ? '' : ' <small>(new)</small>') + '</span><input type="range" min="0" max="50" value="' + v + '" data-wiw="' + c + '"><output>' + v + '</output></label>'; }).join('') + '</div>' +
    '<div class="actions"><button class="btn btn-sm" type="button" data-wireset>Reset to baseline</button><button class="btn btn-sm" type="button" data-wisave>Save scenario</button>' + (!isBizKey(WI.key) ? '<button class="btn btn-sm btn-primary" type="button" data-wiapply>Use as my profile</button>' : '') + '</div>' +
    '<h4>Top 10 with these preferences (' + fmtInt(res.scored.length) + ' places ranked)</h4><ol class="pttop wi">' + top + '</ol><p class="small muted">▲ ▼ show the change against the baseline ranking. "Lifted by" names the criterion whose extra weight helped most.</p>' +
    (sc.length ? '<h4>Saved scenarios</h4><ul class="ptsc-list">' + sc.map(function (s, i) { return '<li><b>' + esc(s.name) + '</b> <small class="muted">' + esc(profileName(s.profile) || s.profile) + (s.profile !== WI.key ? ', opened here with this profile\'s rules' : '') + '</small> <button class="linkbtn" type="button" data-wiload="' + i + '">open</button> <button class="linkbtn" type="button" data-wicmp="' + i + '">compare with current</button> <button class="linkbtn" type="button" data-widel="' + i + '">delete</button></li>'; }).join('') + '</ul><div id="pt-wicmp"></div>' : '');
}
function wiRedraw(keepFocus) { var b = document.getElementById('pt-wi'); if (!b) return; var a = document.activeElement, kf = a && a.dataset ? a.dataset.wiw : null; b.innerHTML = whatIfBody(); if (kf) { var el = b.querySelector('[data-wiw="' + kf + '"]'); if (el) el.focus(); } }
function wiCompare(i) {
  var sc = (store('scenarios') || [])[i]; if (!sc) return;
  var keep = WI.w; WI.w = sc.weights; var a = whatIfRank().scored.slice(0, 10); WI.w = keep; var b = whatIfRank().scored.slice(0, 10);
  var ida = a.map(function (x) { return x.id; }), idb = b.map(function (x) { return x.id; });
  var col = function (l, other) { return '<ol>' + l.map(function (x) { return '<li' + (other.indexOf(x.id) < 0 ? ' class="only"' : '') + '>' + esc(x.r.name) + ' <b>' + Math.round(x.overall) + '</b></li>'; }).join('') + '</ol>'; };
  var box = document.getElementById('pt-wicmp'); if (box) box.innerHTML = '<div class="ptcols"><div><h4>' + esc(sc.name) + '</h4>' + col(a, idb) + '</div><div><h4>Current sliders</h4>' + col(b, ida) + '</div></div><p class="small muted">Highlighted places are in one top 10 only.</p>';
}

/* ---------- Better than home ---------- */
var BTH_PARAMS = ['pop', 'pop10', 'city', 'air', 'rail', 'coast', 'lake', 'alt', 'dayw'];
function openBetterThanHome(refId) {
  ptEnsure().then(function () {
    var ref = refId || S.home, list = ptSaved().filter(function (e) { return e.id !== ref && BYID[e.id] && e.status !== 'excluded'; });
    var opts = (S.home && BYID[S.home] ? [S.home] : []).concat(ptSaved().map(function (e) { return e.id; })).filter(function (v, i, a) { return BYID[v] && a.indexOf(v) === i; });
    if (!ref || !BYID[ref]) {
      return openModal('Better than home?', '<p>Pick the place to compare against: your home, or any saved place. Nothing is assumed about where you live.</p>' + (opts.length ? '<div class="ptpick">' + opts.map(function (id) { return '<button class="btn btn-sm" type="button" data-bthref="' + esc(id) + '">' + esc(BYID[id].name) + '</button>'; }).join('') + '</div>' : '<p class="small muted">Save a few places first, or open a place and tap 🏠 to set it as your home.</p>'));
    }
    if (!list.length) return openModal('Better than home?', '<p>Save some alternatives to your shortlist first; they are compared with ' + esc(BYID[ref].name) + '.</p>');
    openModal('Better than ' + BYID[ref].name + '?', bthBody(BYID[ref], list.slice(0, 6).map(function (e) { return BYID[e.id]; }), opts));
  });
}
function bthBody(h, alts, opts) {
  var hs = ptScore(h), cats = ptCats(h).map(function (c) { return c.k; });
  var head = '<tr><th></th><th>' + esc(h.name) + ' <small>(reference)</small></th>' + alts.map(function (a) { return '<th>' + esc(a.name) + '</th>'; }).join('') + '</tr>';
  var cell = function (v, ref) { if (!fin(v)) return '<td class="muted">–</td>'; var d = fin(ref) ? v - ref : null; return '<td>' + Math.round(v) + (d != null && Math.abs(d) >= 1 ? ' <span class="' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '+' : '') + Math.round(d) + '</span>' : '') + '</td>'; };
  var rows = '<tr class="tot"><th>Fit for ' + esc((profileDef(S.profile) || {}).name || S.profile) + '</th>' + cell(hs && hs.score, null) + alts.map(function (a) { var q = ptScore(a); return cell(q && q.score, hs && hs.score); }).join('') + '</tr>' +
    cats.map(function (k) { var hc = ENGINE.categories(h)[k]; return '<tr><th>' + esc(shortCat(k)) + '</th>' + cell(hc, null) + alts.map(function (a) { return cell(ENGINE.categories(a)[k], hc); }).join('') + '</tr>'; }).join('') +
    BTH_PARAMS.map(function (pk) { var P = PARAM[pk]; if (!P) return ''; var hv = pval(h, pk); var any = fin(hv) || alts.some(function (a) { return fin(pval(a, pk)); }); if (!any) return ''; return '<tr class="raw"><th>' + esc(P.label) + '</th><td>' + (fin(hv) ? esc(pfmt(pk, hv)) : '–') + '</td>' + alts.map(function (a) { var v = pval(a, pk); return '<td>' + (fin(v) ? esc(pfmt(pk, v)) : '–') + '</td>'; }).join('') + '</tr>'; }).join('');
  var notes = alts.map(function (a) {
    var hc = ENGINE.categories(h), ac = ENGINE.categories(a), pros = [], cons = [], miss = [];
    cats.forEach(function (k) { if (!fin(hc[k]) || !fin(ac[k])) { miss.push(shortCat(k)); return; } var d = ac[k] - hc[k]; if (d >= 8) pros.push(shortCat(k).toLowerCase() + ' +' + Math.round(d)); else if (d <= -8) cons.push(shortCat(k).toLowerCase() + ' ' + Math.round(d)); });
    return '<li><b>' + esc(a.name) + '</b>: ' + (pros.length ? 'better on ' + esc(pros.join(', ')) : 'no clear gain') + '; ' + (cons.length ? 'worse on ' + esc(cons.join(', ')) : 'no clear loss') + '' + (a.country !== h.country ? '. Different countries: category scores are measured within each country, so compare the raw figures below them too' : '') + '.</li>';
  }).join('');
  return '<p class="small">Same criteria and the same scoring for every place. Differences of less than 8 points are treated as no clear difference. No saving, cost or commute change is claimed unless a measured figure shows it.</p>' +
    '<div class="ptpick">Reference: ' + opts.map(function (id) { return '<button class="chip" type="button" data-bthref="' + esc(id) + '" aria-pressed="' + (id === h.id) + '">' + esc(BYID[id].name) + '</button>'; }).join('') + '</div>' +
    '<div class="scroll"><table class="pttable bth">' + head + rows + '</table></div><h4>Trade-offs</h4><ul class="small">' + notes + '</ul>';
}

/* ---------- Your saved data: download, restore, delete ---------- */
var PT_KEYS = ['saved', 'cmp', 'bizsaved', 'bizcmp', 'home', 'custom', 'builder', 'scenarios', 'lasthome', 'lastbiz', 'toporder', 'biztoporder'];
function openMyData() {
  var n = (store('saved') || []).length, nb = (store('bizsaved') || []).length, ns = (store('scenarios') || []).length;
  openModal('Your saved data', '<p>Nestlyzer keeps your shortlists, notes, statuses, home place, own profile and saved scenarios <b>in this browser only</b>. There is no account and nothing is sent to a server. A normal restart keeps them; clearing the browser data, a private window or another device does not have them.</p>' +
    '<ul class="small"><li>Places to live: ' + n + ' saved</li><li>Business locations: ' + nb + ' saved</li><li>Scenarios: ' + ns + '</li><li>Home place: ' + (S.home && BYID[S.home] ? esc(BYID[S.home].name) : S.home ? 'set' : 'not set') + '</li></ul>' +
    '<div class="actions"><button class="btn btn-sm btn-primary" type="button" data-mydl>Download my data (file)</button><label class="btn btn-sm">Restore from file<input type="file" accept="application/json,.json" data-myup hidden></label><button class="btn btn-sm" type="button" data-mydel>Delete my saved data</button></div>' +
    '<p class="small muted">The file holds only these personal settings, no identity. Keep it like a key: anyone who has it can restore your lists. To move to another device, download here and restore there.</p><p class="small" id="pt-mystatus" role="status"></p>');
}
function myDataDownload() {
  var data = {}; PT_KEYS.forEach(function (k) { var v = store(k); if (v != null) data[k] = v; });
  var blob = new Blob([JSON.stringify({ schema: 'nestlyzer-personal-v1', exported_at: new Date().toISOString(), data: data }, null, 1)], { type: 'application/json' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nestlyzer-my-data.json'; document.body.appendChild(a); a.click(); a.remove();
}
var PT_ID = /^[A-Z]{2}:[^\s<>"']{1,60}$/;
function ptCleanList(l) {
  if (!Array.isArray(l)) return null;
  return l.filter(function (e) { return e && typeof e === 'object' && PT_ID.test(e.id); }).slice(0, 300).map(function (e) {
    var o = { id: e.id, name: String(e.name || e.id).slice(0, 120), area: String(e.area || '').slice(0, 160), profile: String(e.profile || '').slice(0, 40), score: fin(e.score) ? e.score : null, t: fin(e.t) ? e.t : Date.now() };
    if (e.note) o.note = String(e.note).slice(0, 500);
    if (['interested', 'favourite', 'visited', 'excluded'].indexOf(e.status) >= 0) o.status = e.status;
    return o;
  });
}
function myDataRestore(file) {
  var st = document.getElementById('pt-mystatus');
  var fr = new FileReader();
  fr.onload = function () {
    try {
      var j = JSON.parse(fr.result); if (!j || j.schema !== 'nestlyzer-personal-v1' || typeof j.data !== 'object') throw new Error('not a Nestlyzer data file');
      var d = j.data, w = {};
      ['saved', 'bizsaved'].forEach(function (k) { if (d[k] != null) { var l = ptCleanList(d[k]); if (!l) throw new Error(k + ' is not a list'); w[k] = l; } });
      ['cmp', 'bizcmp'].forEach(function (k) { if (Array.isArray(d[k])) w[k] = d[k].filter(function (id) { return PT_ID.test(id); }).slice(0, 3); });
      if ('home' in d && (d.home == null || PT_ID.test(d.home))) w.home = d.home || null;
      if (Array.isArray(d.scenarios)) w.scenarios = d.scenarios.filter(function (s) { return s && typeof s.weights === 'object'; }).slice(0, 30).map(function (s) { var ww = {}; Object.keys(s.weights).slice(0, 20).forEach(function (k) { if (/^[a-z_]{2,30}$/.test(k) && fin(+s.weights[k])) ww[k] = Math.max(0, Math.min(50, +s.weights[k])); }); return { name: String(s.name || 'Scenario').slice(0, 60), profile: String(s.profile || '').slice(0, 40), weights: ww, t: fin(s.t) ? s.t : Date.now() }; });
      if (d.custom && typeof d.custom === 'object' && d.custom.weights && typeof d.custom.weights === 'object') {
        var cw = {}; Object.keys(d.custom.weights).slice(0, 20).forEach(function (k) { if (/^[a-z_]{2,30}$/.test(k) && fin(+d.custom.weights[k])) cw[k] = Math.max(0, Math.min(50, +d.custom.weights[k])); });
        if (Object.keys(cw).length) w.custom = { name: String(d.custom.name || 'My guided fit').slice(0, 60), desc: String(d.custom.desc || '').slice(0, 400), intro: String(d.custom.intro || '').slice(0, 400), weights: cw, strict: {}, minPop: fin(+d.custom.minPop) ? Math.max(0, Math.min(100000, +d.custom.minPop)) : 1200 };
      }
      var BG = META.config.builder && META.config.builder.groups, bd = d.builder;
      if (bd && typeof bd === 'object' && BG && Array.isArray(bd.targets)) {
        var okB = {}; Object.keys(BG).forEach(function (k) { if (BG[k].choices.some(function (c) { return c[0] === bd[k]; })) okB[k] = bd[k]; });
        okB.targets = bd.targets.filter(function (c) { return /^[A-Z]{2}$/.test(c) && META.countries.some(function (m) { return m.cc === c; }); }).slice(0, 45);
        okB.mobilityPlus = !!bd.mobilityPlus; okB.coast = !!bd.coast;
        if (Object.keys(BG).every(function (k) { return k in okB; }) && okB.targets.length) w.builder = okB;
      }
      ['lasthome', 'lastbiz', 'toporder', 'biztoporder'].forEach(function (k) { if (typeof d[k] === 'string' && /^[a-z_]{1,40}$/.test(d[k])) w[k] = d[k]; });
      Object.keys(w).forEach(function (k) { store(k, w[k]); });
      if (st) st.textContent = 'Restored. Reloading…'; setTimeout(function () { location.reload(); }, 600);
    } catch (e) { if (st) st.textContent = 'This file could not be restored: ' + e.message + '. Nothing was changed.'; }
  };
  fr.readAsText(file);
}
function myDataDelete() {
  if (!window.confirm('Delete your shortlists, notes, statuses, home place, own profile and scenarios from this browser? This cannot be undone unless you downloaded your data.')) return;
  PT_KEYS.forEach(function (k) { try { localStorage.removeItem('nz:' + k); } catch (e) { } });
  var st = document.getElementById('pt-mystatus'); if (st) st.textContent = 'Deleted. Reloading…'; setTimeout(function () { location.reload(); }, 600);
}

/* clicks and inputs inside these tools; return true when handled */
function ptClick(t) {
  var b;
  if ((b = t.closest('[data-ptorder]'))) { store(CURMODE === 'biz' ? 'biztoporder' : 'toporder', b.dataset.ptorder); ptRefreshTop10(); return true; }
  if ((b = t.closest('[data-ptmove]'))) {
    var a = b.dataset.ptmove.split('|'), l = ptSaved(), i = l.map(function (e) { return e.id; }).indexOf(a[0]), j = i + (+a[1]);
    if (i >= 0 && j >= 0 && j < l.length) { var tmp = l[i]; l[i] = l[j]; l[j] = tmp; persistShortlist(); ptRefreshTop10(); if (S.listTab === 'saved') renderResults(); }
    return true;
  }
  if (t.closest('[data-wireset]')) { WI.w = Object.assign({}, WI.base); wiRedraw(); return true; }
  if (t.closest('[data-wisave]')) { var nm = window.prompt('Name this scenario', WI.name + ' (my weights)'); if (!nm) return true; var sc = store('scenarios') || []; sc.unshift({ name: nm.slice(0, 60), profile: WI.key, weights: Object.assign({}, WI.w), t: Date.now() }); store('scenarios', sc.slice(0, 30)); wiRedraw(); toast('Scenario saved', nm + ' is saved in this browser.'); return true; }
  if ((b = t.closest('[data-wiload]'))) { var s0 = (store('scenarios') || [])[+b.dataset.wiload]; if (s0) { WI.w = Object.assign({}, s0.weights); wiRedraw(); } return true; }
  if ((b = t.closest('[data-widel]'))) { var s1 = store('scenarios') || []; s1.splice(+b.dataset.widel, 1); store('scenarios', s1); wiRedraw(); return true; }
  if ((b = t.closest('[data-wicmp]'))) { wiCompare(+b.dataset.wicmp); return true; }
  if (t.closest('[data-wiapply]')) { var p = profileDef(WI.key) || {}; S.custom = { name: 'My what-if profile', desc: 'Weights set in What if, based on ' + WI.name + '.', intro: 'Weights set in What if, based on ' + WI.name + '.', weights: Object.assign({}, WI.w), strict: {}, minPop: p.minPop || 1200 }; store('custom', S.custom); if (S.builder) { S.builder.language = 'flexible'; store('builder', S.builder); } S.lang = ''; closeModal(); S.profile = 'self_fit'; S.selected = null; update({ push: true }); toast('Your what-if weights are now your profile', 'Your shortlists are unchanged.'); return true; }
  if ((b = t.closest('[data-bthref]'))) { openBetterThanHome(b.dataset.bthref); return true; }
  if (t.closest('[data-mydl]')) { myDataDownload(); return true; }
  if (t.closest('[data-mydel]')) { myDataDelete(); return true; }
  return false;
}
function ptInput(t) {
  if (t.matches('[data-wiw]')) { var v = +t.value; if (v) WI.w[t.dataset.wiw] = v; else delete WI.w[t.dataset.wiw]; t.nextElementSibling.textContent = t.value; clearTimeout(ptInput._t); ptInput._t = setTimeout(wiRedraw, 120); return true; }
  if (t.matches('[data-ptstatus]')) { var e = ptSaved().filter(function (x) { return x.id === t.dataset.ptstatus; })[0]; if (e) { if (t.value) e.status = t.value; else delete e.status; persistShortlist(); ptRefreshTop10(); if (S.listTab === 'saved') renderResults(); } return true; }
  if (t.matches('[data-myup]') && t.files && t.files[0]) { myDataRestore(t.files[0]); return true; }
  return false;
}
(function () { var st = document.createElement('style'); st.id = 'nz-pt-css'; st.textContent = ".ptcard{padding:2px 0}.pthead{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:8px}.ptbig{font:700 2.4rem/1 var(--font-display)}.ptcard h4,#modal h4{margin:14px 0 6px;font-size:var(--step-0)}.pttable{width:100%;border-collapse:collapse;font-size:13px}.pttable th,.pttable td{padding:5px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}.pttable .num{text-align:right}.ptbar{display:inline-block;width:110px;height:8px;border-radius:4px;background:var(--surface-2);vertical-align:middle;overflow:hidden}.ptbar i{display:block;height:100%}.ptcols li b[class^=tone-]{padding:0 5px;border-radius:5px}.ptbar.none{width:auto;height:auto;background:none;color:var(--ink-3);font-size:12px}.ptcols{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ptcols ul,.ptcols ol{margin:0;padding-left:18px}.ptmust{list-style:none;padding:0;margin:0}.ptmust li{padding:3px 0;font-size:13px}.ptmust .pass b{color:#1D7A55}.ptmust .fail b{color:#B23A3A}.ptmust .unknown b{color:#8a5a12}.ptmust .check b{color:var(--ink-3)}.pttop{list-style:none;padding:0;margin:8px 0}.pttop li{display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid var(--line)}.pttop .ptn{width:24px;text-align:right;font-weight:700;color:var(--ink-3)}.pttop .ptname{flex:1;min-width:0}.pttop .ptname b{display:block}.pttop .ptname small{color:var(--ink-3)}.pttop .ptsc{font:700 1.1rem var(--font-display);width:34px;text-align:right}.pttop select{width:auto;max-width:120px;padding:4px;font-size:12px}.pttop li.excluded{opacity:.5}.pttop li.favourite .ptname b::after{content:' ★';color:#C8742A}.pttop li.beyond{opacity:.55}.ptmove{width:44px;font-size:12px;text-align:right}.ptmove.up{color:#1D7A55}.ptmove.down{color:#B23A3A}.ptsliders{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px 16px}.ptsliders label{display:grid;grid-template-columns:1fr 110px 26px;align-items:center;gap:6px;font-size:13px}.ptsliders output{text-align:right;font-weight:700}.ptsc-list{padding-left:18px;font-size:13px}#pt-wicmp li.only{font-weight:700}.ptpick{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0}.bth td .up{color:#1D7A55;font-size:12px}.bth td .down{color:#B23A3A;font-size:12px}.bth tr.tot th,.bth tr.tot td{font-weight:700}.bth tr.raw th{font-weight:400;color:var(--ink-2)}@media (max-width:640px){.pttable{font-size:12.5px}.pttable .ptbar{width:52px}.pttable td:first-child,.pttable th:first-child{min-width:118px}.pttable td:nth-child(3){white-space:nowrap}.bth th,.bth td{padding:5px 4px}}@media (max-width:600px){.ptcols{grid-template-columns:1fr}.ptsliders label{grid-template-columns:1fr 90px 24px}}"; document.head.appendChild(st); })();
