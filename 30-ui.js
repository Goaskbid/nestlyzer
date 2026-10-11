/* Workspace UI: controls, results, regional board, overlays */
var PLAIN = { Foundation: 'Basics', Demographics: 'People' };
function shortCat(k) { var s = ENGINE.shortCat(k); return PLAIN[s] || s; }
function plainReason(t) { return String(t || '').replace('Foundation floor', 'basics minimum').replace(/(\w+) floor/, function (m, a) { return a.toLowerCase() + ' minimum'; }).replace('daily-services catchment floor', 'minimum of 50,000 residents within 30 km'); }
function catLabel(k) { return META.categoryLabels[k] || k; }

/* ---------- language / regional reality ---------- */
function belgianArea(r) {
  var B = META.config.belgianLanguage, id = String(r.oid), n = fold(r.name);
  if (id.slice(0, 2) === '21' || /bruxelles|brussel/.test(n)) return 'bilingual';
  if (B.belgian_german_code_contains.some(function (c) { return id.indexOf(c) >= 0; })) return 'belgian_german';
  var p = +id.slice(0, 2);
  if (B.dutch_2digit_prefixes.indexOf(p) >= 0) return 'dutch';
  if (B.french_2digit_prefixes.indexOf(p) >= 0) return 'french';
  if (/ \/ /.test(r.name)) return 'bilingual';
  return 'french';
}
function languageArea(r) {
  if (r.country === 'CH') { if (r.canton === 'TI') return 'italian'; if (['GE', 'VD', 'NE', 'JU'].indexOf(r.canton) >= 0) return 'french'; if (['FR', 'VS', 'BE', 'GR'].indexOf(r.canton) >= 0) return 'bilingual'; return 'german'; }
  if (r.country === 'BE') return belgianArea(r);
  if (r.country === 'LU') return 'luxembourgish';
  var A = META.config.languageAreas, cc = FLAG_CODE[r.country] === 'GR' ? 'GR' : r.country;
  for (var k in A) if ((A[k].countries || []).indexOf(r.country) >= 0 || (A[k].countries || []).indexOf(cc) >= 0) return k;
  return 'single_language';
}
function languageText(r) {
  var a = META.config.languageAreas[languageArea(r)];
  if (a) return a.name + '. ' + a.note;
  if (r.country !== 'CH') return countryName(r.country) + ' is treated as one operating-language market until national language-zone data is joined.';
  return 'Swiss language context depends on municipality and canton.';
}
function languageLabel(r) { var a = META.config.languageAreas[languageArea(r)]; return a ? a.name.replace(' options', '') : 'Local language'; }
function activeLanguageKeys() {
  var conf = META.config.multilingual[S.cc] || [];
  if (!conf.length) return [];
  if (S.cc === 'LU') return conf;
  var base = RES && RES.scored.length ? RES.scored.map(function (x) { return x.r; }) : SCOPE;
  var seen = {}; base.forEach(function (r) { seen[languageArea(r)] = 1; });
  return conf.filter(function (k) { return seen[k]; });
}
function scopeFocused() { return S.region !== 'ALL' || S.area !== 'ALL'; }
function crossBorderForScope() {
  var focused = scopeFocused();
  if (!focused && ['CH', 'LU', 'BE', 'NL', 'LI', 'DK', 'SE'].indexOf(S.cc) < 0) return [];
  var max = focused ? (S.profile === 'commuter' ? 90 : 125) : 95;
  var pts = SCOPE.filter(function (r) { return fin(r.lat); });
  if (pts.length > 1800) { var step = Math.ceil(pts.length / 1800); pts = pts.filter(function (_, i) { return i % step === 0; }); }
  return META.config.crossBorder.filter(function (x) { return x.country !== S.cc; }).map(function (x) {
    var best = Infinity; for (var i = 0; i < pts.length; i++) { var d = km([x.lon, x.lat], [pts[i].lon, pts[i].lat]); if (d < best) best = d; if (best < 18) break; }
    return Object.assign({}, x, { distance: best });
  }).filter(function (x) { return x.distance <= max; }).sort(function (a, b) { return a.distance - b.distance; }).slice(0, focused ? 6 : 5);
}
function crossBorderForRecord(r) {
  if (!fin(r.lat)) return crossBorderForScope().slice(0, 4);
  var max = S.profile === 'commuter' ? 85 : 110;
  return META.config.crossBorder.filter(function (x) { return x.country !== r.country; }).map(function (x) { return Object.assign({}, x, { distance: km([r.lon, r.lat], [x.lon, x.lat]) }); })
    .filter(function (x) { return x.distance <= max; }).sort(function (a, b) { return a.distance - b.distance; }).slice(0, 5);
}
function openCrossBorder(x) {
  var targets = (x.target || []).map(fold);
  loadCountry(x.country).then(function (sh) {
    var hit = null;
    for (var i = 0; i < targets.length && !hit; i++) hit = sh.records.find(function (r) { return fold(stripParen(r.name)) === targets[i]; }) || sh.records.find(function (r) { return fold(r.name).indexOf(targets[i]) === 0; });
    S.cc = x.country; S.region = 'ALL'; S.area = 'ALL';
    if (hit) S.selected = hit.id;
    switchCountry(x.country, { keepSelection: true }).then(function () { if (hit) selectPlace(hit.id, { from: 'xborder' }); });
  });
}

/* ---------- controls ---------- */
function renderProfileBar() {
  var keys = ENGINE ? META.config.order.filter(function (k) { return ENGINE.profiles[k]; }) : [];
  var html = keys.map(function (k) {
    return '<button class="pchip" type="button" data-profile="' + k + '" aria-pressed="' + (S.profile === k) + '" title="' + esc(profileDef(k).intro || profileDef(k).desc) + '"><span aria-hidden="true">' + profileIcon(k) + '</span>' + esc(profileDef(k).name) + '</button>';
  }).join('');
  html = '<button class="pchip custom" type="button" data-builder aria-pressed="' + (S.profile === 'self_fit') + '"><span aria-hidden="true">✨</span>' + (S.profile === 'self_fit' ? 'My guided fit' : 'Build my own') + '</button>' + html;
  $('#pchips').innerHTML = html;
  var a = $('.pchip[aria-pressed="true"]'); if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest', inline: 'center' });
  // one tab stop for the whole chip row; arrow keys move between chips
  $$('#pchips .pchip').forEach(function (b) { b.tabIndex = b === (a || $('#pchips .pchip')) ? 0 : -1; });
  var pp = $('#profpill'); if (pp) pp.innerHTML = profileIcon(S.profile, 15) + esc(profileName(S.profile));
}
var PROFILE_GROUPS = [['Families', ['young_family', 'single_parent', 'low_income_family', 'first_home']], ['Work and study', ['single', 'young_professional', 'dinks', 'remote', 'commuter', 'student', 'expat_professional']], ['Retirement', ['pensioner', 'single_pensioner', 'early_retiree', 'healthcare_first']], ['Budget', ['low_income', 'budget', 'rural_value']], ['Lifestyle', ['urban', 'car_free', 'nature', 'coastal', 'climate']], ['Wealth', ['hnw', 'swiss_lottery']]];
function openProfilePicker() {
  var seen = {}, groups = PROFILE_GROUPS.map(function (g) { var ks = g[1].filter(function (k) { if (!ENGINE.profiles[k]) return false; seen[k] = 1; return true; }); return [g[0], ks]; });
  var rest = META.config.order.filter(function (k) { return ENGINE.profiles[k] && !seen[k]; }); if (rest.length) groups.push(['More', rest]);
  openModal('Who is moving?', '<div class="ppick">' + groups.map(function (g) { return g[1].length ? '<h4>' + esc(g[0]) + '</h4><div class="ppgrid">' + g[1].map(function (k) { var p = profileDef(k); return '<button type="button" class="ppi" data-profile="' + k + '" aria-pressed="' + (S.profile === k) + '"><span class="ppic">' + profileIcon(k, 20) + '</span><span><b>' + esc(p.name) + '</b><small>' + esc((p.intro || p.desc || '').split('. ')[0]) + '</small></span></button>'; }).join('') + '</div>' : ''; }).join('') +
    '<h4>Your own</h4><div class="ppgrid"><button type="button" class="ppi" data-builder><span class="ppic">✨</span><span><b>Build my own profile</b><small>Answer a few questions and get your own weights.</small></span></button></div></div>');
}
function renderScope() {
  var cs = META.countries.slice().sort(function (a, b) { return a.cc === 'CH' ? -1 : b.cc === 'CH' ? 1 : a.name.localeCompare(b.name); });
  $('#f-country').innerHTML = cs.map(function (c) { return '<option value="' + c.cc + '"' + (c.cc === S.cc ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
  var ro = SHARD ? regionOptions() : [];
  var og = null;
  $('#f-region').innerHTML = ro.map(function (o) { var pre = ''; if (o[3] !== og) { pre = (og ? '</optgroup>' : '') + (o[3] ? '<optgroup label="' + esc(o[3]) + '">' : ''); og = o[3]; } return pre + '<option value="' + esc(o[0]) + '"' + (o[0] === S.region ? ' selected' : '') + '>' + esc(o[1]) + (o[2] != null && o[0] !== 'ALL' ? ' (' + fmtInt(o[2]) + ')' : '') + '</option>'; }).join('') + (og ? '</optgroup>' : '');
  $('#f-region').disabled = ro.length < 2;
  var ao = SHARD ? areaOptions() : [];
  $('#f-area').innerHTML = ao.length ? ao.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === S.area ? ' selected' : '') + '>' + esc(o[1]) + (o[2] != null ? ' (' + fmtInt(o[2]) + ')' : '') + '</option>'; }).join('') : '<option value="ALL">' + (S.region === 'ALL' ? 'Pick a region first' : 'Whole area') + '</option>';
  $('#f-area').disabled = ao.length < 2;
  $('#l-area').textContent = S.cc === 'CH' ? 'Canton' : 'Local area';
  var lopt = function (l) { var has = layerHasData(l[0]); return '<option value="' + l[0] + '"' + (l[0] === S.layer ? ' selected' : '') + (has || l[0] === S.layer ? '' : ' disabled') + '>' + l[1] + (has ? '' : ' (no data in ' + esc(countryName(S.cc)) + ')') + '</option>'; };
  $('#f-layer').innerHTML = '<optgroup label="Scores">' + LAYERS.map(lopt).join('') + '</optgroup><optgroup label="Place facts">' + PLAYERS.map(lopt).join('') + '</optgroup>';
  $('#f-sort').value = S.sort;
  $('#f-conf').value = S.minConf; $('#o-conf').textContent = S.minConf + '%';
  var F = S.f;
  [['popMin', 'o-popmin', function (v) { return xfLabel('popMin', v); }], ['cityKm', 'o-city', function (v) { return xfLabel('cityKm', v); }], ['airportKm', 'o-air', function (v) { return xfLabel('airportKm', v); }], ['coastKm', 'o-coast', function (v) { return xfLabel('coastKm', v); }]].forEach(function (a) {
    var inp = $('[data-f="' + a[0] + '"]'); if (inp) inp.value = F[a[0]] || 0; $('#' + a[1]).textContent = a[2](F[a[0]]);
  });
  var xf = $('#xfilters');
  if (xf && !xf.dataset.built) { xf.dataset.built = 1; xf.innerHTML = XFILTERS.map(function (f) { return '<div class="range"><label for="xf-' + f.k + '">' + esc(f.label) + '</label><output id="xo-' + f.k + '">any</output><input id="xf-' + f.k + '" data-f="' + f.k + '" type="range" min="0" max="' + f.max + '" step="' + f.step + '" value="0"></div>'; }).join(''); }
  var dw = $('#xf-daywMin');
  if (dw && SHARD) { var vals = SHARD.records.map(function (r) { return pval(r, 'dayw'); }).filter(fin); if (vals.length) { var lo = Math.floor(Math.min.apply(null, vals) * 20) / 20, hi = Math.ceil(Math.max.apply(null, vals) * 20) / 20; dw.min = lo; dw.max = Math.max(hi, lo + 0.05); dw.step = 0.05; } }
  XFILTERS.forEach(function (f) { var inp = $('#xf-' + f.k); if (inp) inp.value = F[f.k] || inp.min || 0; var o = $('#xo-' + f.k); if (o) o.textContent = xfLabel(f.k, F[f.k]); });
  var tsel = S.terrain ? S.terrain.split(',') : [], csel = S.climate ? S.climate.split(',') : [];
  $('#f-terrain').innerHTML = [['flat', 'Flat'], ['hills', 'Hilly'], ['mountains', 'Mountainous'], ['alpine', 'High mountains']].map(function (o) { return '<button type="button" data-terrain="' + o[0] + '" aria-pressed="' + (tsel.indexOf(o[0]) >= 0) + '">' + o[1] + '</button>'; }).join('');
  $('#f-climate').innerHTML = CLIMATE_GROUPS.map(function (o) { return '<button type="button" data-climate="' + o[0] + '" aria-pressed="' + (csel.indexOf(o[0]) >= 0) + '">' + o[1] + '</button>'; }).join('');
  var active = ['popMin', 'cityKm', 'airportKm', 'coastKm'].filter(function (k) { return F[k]; }).length + (S.minConf ? 1 : 0) + xfilterCount() + (S.q ? 1 : 0);
  $('#filtercount').textContent = active ? '(' + active + ')' : '';
  $$('.fcount').forEach(function (e) { e.textContent = active ? 'Filters (' + active + ')' : 'Filters'; });
  $('#f-q').value = S.q;
  var sc = $('#savedcount'); if (sc) sc.textContent = saved.length;
  var sum = $('#scopesum'); if (sum) sum.innerHTML = flagImg(S.cc) + ' <b>' + esc(countryName(S.cc)) + '</b> · ' + esc(scopeName().replace('All ' + countryName(S.cc), 'everywhere')) + (active ? ' · ' + active + ' filter' + (active > 1 ? 's' : '') : '');
}
function xfLabel(k, v) { if (!v) return 'any'; if (k === 'pop10Min' || k === 'popMin') return fmtInt(v); if (k === 'daywMin') { var m = Math.round(v * 60); return Math.floor(m / 60) + ' h ' + ('0' + m % 60).slice(-2) + ' min'; } return v + ' km'; }
function depthKind(cc) { var d = countryMeta(cc).depth; return d === 'detailed' ? ['rich', 'Rich data', 'Official local statistics on taxes, jobs, age, land use and more.'] : d === 'partial' ? ['partial', 'Partial data', 'Official population and age data plus geography.'] : ['early', 'Early indication', 'Population, density, growth and geography only. Taxes, schools, safety and prices are not in yet, so use this as a first filter.']; }
function renderDepthNote() {
  var cm = countryMeta(S.cc);
  var el = $('#depthnote');
  var depth = cm.depth === 'detailed' ? '<b>Detailed module.</b> 28 official Swiss factors (FSO portraits, ESTV tax burden) plus 4 geographic measures.' :
    cm.depth === 'partial' ? '<b>Partial module.</b> Official population, age structure and growth (Statistics Austria) plus 4 geographic measures.' :
      '<b>Foundation data.</b> Population, density and 5-year growth (Eurostat GISCO LAU) plus 4 geographic measures. No local tax, school, safety, health or housing data is joined yet, so treat these rankings as a first filter.';
  var p = profileDef(S.profile);
  var cov = RES && RES.scored.length ? Math.round(RES.scored.reduce(function (a, x) { return a + x.coverage; }, 0) / RES.scored.length) : null;
  el.innerHTML = '<details class="dn"><summary>' + flagImg(S.cc) + ' <span>' + esc(depthKind(S.cc)[1]) + ' for ' + esc(countryName(S.cc)) + '</span><span class="muted"> · what is in the score?</span></summary><p>' + depth + (cov != null ? ' Average coverage for ' + esc(p.name) + ': ' + cov + '%.' : '') + ' <button class="info" type="button" data-def="method" aria-label="How scores work">i</button></p></details>';
  var db = $('#depthbadge'); if (db) { var k = depthKind(S.cc); db.innerHTML = '<button class="dbadge ' + k[0] + '" type="button" data-def="depth" title="' + esc(k[2]) + '">' + esc(k[1]) + '</button>'; }
}
function renderResultsHead() {
  var n = RES ? RES.scored.length : 0;
  var hidden = RES ? SCOPE.length - n : 0;
  $('#rcount').innerHTML = RES ? fmtInt(n) + ' of ' + fmtInt(SCOPE.length) + (SCOPE.length === 1 ? ' place fits' : ' places fit') + (hidden > 0 ? ' · <button class="linkbtn" type="button" data-showall>' + (S.showAll ? 'hide the other ' + fmtInt(hidden) : 'why not the other ' + fmtInt(hidden) + '?') + '</button>' : '') : '';
  $('#scopename').innerHTML = esc(scopeName()) + (S.lang ? ' <button class="chip langchip" type="button" data-droplang title="Remove the language filter">' + esc(LANG_NAMES[S.lang]) + '-speaking only ✕</button>' : '');
}
function chipHTML(label, score, rank, def) {
  return '<span class="chip ' + tone(score) + '"' + (def ? ' data-def="' + esc(def) + '" role="button" tabindex="0"' : '') + '>' + esc(label) + ' <b>' + fmt(score) + '</b>' + (rank ? ' #' + rank : '') + '</span>';
}
function nestBars(x, big) {
  var w = ENGINE.weightsFor(x.r || x, S.profile);
  var c = x.catScores || ENGINE.categories(x.r || x);
  var keys = Object.keys(w).filter(function (k) { return fin(c[k]); }).sort(function (a, b) { return w[b] - w[a]; }).slice(0, big ? 8 : 6);
  return '<span class="nestbars' + (big ? ' lg' : '') + '" role="img" aria-label="Category scores: ' + esc(keys.map(function (k) { return shortCat(k) + ' ' + Math.round(c[k]); }).join(', ')) + '">' +
    keys.map(function (k) { return '<i title="' + esc(shortCat(k) + ' ' + Math.round(c[k])) + '" style="height:' + Math.max(8, c[k]) + '%;background:' + scoreColor(c[k]) + '"></i>'; }).join('') + '</span>';
}
function trendLine(r) {
  var t = r.trend || {}, fr = r.factorRaw || {}, bits = [];
  if (fin(t.population_yoy_pct)) bits.push('YoY ' + signed(t.population_yoy_pct) + '%');
  var five = fin(t.population_5y_pct) ? t.population_5y_pct : fr.common_population_growth_5y;
  if (fin(five)) bits.push('5 yrs ' + signed(five) + '%');
  if (r.country === 'CH' && fin(fr.population_growth_pct)) bits.push('long signal ' + signed(fr.population_growth_pct) + '%');
  if (fin(t.population_growth_rank_latest)) bits.push('growth rank #' + t.population_growth_rank_latest);
  return bits.join(', ');
}
function weightedCats(x, asc, n) {
  var w = ENGINE.weightsFor(x.r || x, S.profile), c = x.catScores || ENGINE.categories(x.r || x);
  return Object.keys(w).filter(function (k) { return fin(c[k]); }).map(function (k) { return [k, c[k]]; }).sort(function (a, b) { return asc ? a[1] - b[1] : b[1] - a[1]; }).slice(0, n);
}
function cardCopy(x) {
  var top = weightedCats(x, false, 3), weak = weightedCats(x, true, 1), r = x.r;
  if (!top.length) return '';
  var t0 = shortCat(top[0][0]).toLowerCase(), t1 = top[1] ? shortCat(top[1][0]).toLowerCase() : 'local fit', w0 = weak[0] ? shortCat(weak[0][0]).toLowerCase() : 'local detail';
  if (depthKind(r.country)[0] === 'early') {
    var b = [], g = growth5(r), fr = r.factorRaw || {}, xx = r.x || {};
    if (g != null) b.push(g >= 0.3 ? 'growing (' + signed(g, 1) + '% in 5 years)' : g <= -0.3 ? 'shrinking (' + signed(g, 1) + '% in 5 years)' : 'a stable population');
    if (fin(fr.geo_major_city_km)) b.push(fr.geo_major_city_km === 0 ? 'a city of 100,000+ itself' : pfmt('city', fr.geo_major_city_km) + ' to a city of 100,000+');
    if (fin(xx.rail_km) && xx.rail_km < 5) b.push('a railway line ' + pfmt('rail', xx.rail_km) + ' away');
    if (fin(fr.geo_coast_km) && fr.geo_coast_km < 10) b.push('near the sea');
    return 'Ranked on what is known so far: ' + (b.join(', ') || 'size and location') + '. Local costs, schools and safety are not in the data for ' + countryName(r.country) + ' yet.';
  }
  if (S.profile === 'swiss_lottery' && r.country !== 'CH') return 'Place quality leads with ' + t0 + ' and ' + t1 + '. Windfall tax treatment needs the country tax module before any tax claim.';
  var v = [
    r.name + ' works best when you value ' + t0 + ' and ' + t1 + '. The main check is ' + w0 + '.',
    shortCat(top[0][0]) + ' is the lead signal here. ' + (top[1] ? shortCat(top[1][0]) : 'Local fit') + ' supports the fit; inspect ' + w0 + ' before deciding.',
    'A practical option for this profile, led by ' + t0 + '. It is less convincing on ' + w0 + ', so compare the nearby alternatives.',
    r.name + ' is strongest on ' + t0 + ' and ' + t1 + '. If you care most about ' + w0 + ', open the comparables.'
  ];
  var h = Array.from(String(r.id)).reduce(function (a, c) { return a + c.charCodeAt(0); }, 0) % v.length;
  return v[h];
}
function rowHTML(x) {
  var r = x.r, cr = RES.categoryRanks, frk = RES.factorRanks;
  var cats = weightedCats(x, false, 4).map(function (c) { return chipHTML(shortCat(c[0]), c[1], cr[c[0]] && cr[c[0]][x.id], c[0]); }).join('');
  var wts = ENGINE.weightsFor(r, S.profile);
  var facs = ENGINE.allFactors.filter(function (f) { return wts[f.category]; }).map(function (f) { return { f: f, v: ENGINE.factorValue(r, f) }; }).filter(function (o) { return fin(o.v); }).sort(function (a, b) { return b.v - a.v; }).slice(0, 3)
    .map(function (o) { return chipHTML(o.f.name, o.v, frk[o.f.id] && frk[o.f.id][x.id], 'factor:' + o.f.id); }).join('');
  var tl = trendLine(r);
  return '<li class="row" data-id="' + esc(x.id) + '" tabindex="0" aria-current="' + (S.selected === x.id) + '">' +
    '<span class="rk">' + x.rank + '</span>' +
    '<div><div class="nm">' + esc(r.name) + '</div><div class="meta">' + esc(localAreaOf(r)) + (inEurope(r) ? '' : ' (overseas)') + ', ' + fmtInt(r.popNow) + ' residents, ' + fmt(r.sourceConfidence) + '% confidence</div>' +
    '<div class="subs">' + cats + '</div><div class="subs f">' + facs + '</div>' + (tl ? '<div class="trend">' + esc(tl) + '</div>' : '') + '</div>' +
    '<div class="right">' + scoreBadge(x.overall) + nestBars(x) + '<span class="rowacts">' + saveBtn(x.id, true) + '</span></div></li>';
}
function renderResults() {
  var box = $('#results');
  if (!RES) { box.innerHTML = '<div class="skeleton" aria-label="Loading"><i></i><i></i><i></i><i></i></div>'; return; }
  renderResultsHead(); renderDepthNote();
  if (S.listTab === 'board') { box.innerHTML = boardHTML(); return; }
  if (S.listTab === 'saved') { box.innerHTML = savedHTML(); return; }
  if (S.listTab === 'records') { box.innerHTML = recordsHTML(); return; }
  if (!SCOPE.length) {
    var anyF = FKEYS.some(function (k) { return S.f[k]; }) || S.terrain || S.climate || S.q || S.minConf;
    box.innerHTML = '<div class="empty"><h3>' + (anyF ? 'Your filters leave no place in ' + esc(scopeName()) : 'No place in ' + esc(scopeName())) + '</h3><p>' + (anyF ? 'Loosen a filter or clear them all; the ranking comes straight back.' : 'Pick a wider region.') + '</p><div class="actions">' + (anyF ? '<button class="btn btn-primary" type="button" data-clearfilters>Clear all filters</button>' : '') + '<button class="btn" type="button" data-near="ALL|R">Whole country</button></div></div>';
    return;
  }
  if (!RES.scored.length) {
    var reasons = Object.keys(RES.reasons).sort(function (a, b) { return RES.reasons[b] - RES.reasons[a]; }).slice(0, 3).map(function (k) { return fmtInt(RES.reasons[k]) + ' failed the ' + k; }).join(', ');
    var coastal = S.profile === 'coastal' && !SCOPE.some(function (r) { return (r.factorRaw || {}).geo_coast_km <= 60; });
    box.innerHTML = '<div class="empty"><h3>' + (coastal ? countryName(S.cc) + ' has no coast' : 'No place in ' + esc(scopeName()) + ' passes this profile') + '</h3><p>' + (coastal ? 'No municipality lies within 60 km of the sea, so a coastal ranking would be invented. Try a country with a coastline:' : 'Widen the region, relax a filter, or try a related profile.') + '</p>' + (coastal ? '<div class="actions">' + ['IT', 'FR', 'ES', 'PT', 'HR', 'EL'].map(function (c) { return '<button class="btn btn-sm" type="button" data-pcc="' + c + '">' + flagImg(c, 11) + ' ' + esc(countryName(c)) + '</button>'; }).join('') + '</div>' : '') + (reasons ? '<p class="small muted">' + esc(plainReason(reasons)) + '.</p>' : '') + '</div>' + unrankedHTML();
    return;
  }
  var picks = RES.scored.slice(0, 9).map(function (x) {
    return '<div class="pick" role="button" tabindex="0" data-id="' + esc(x.id) + '"><div class="ph" data-photo="' + esc(x.id) + '" data-postcard="' + esc(x.id) + '" data-w="420" data-h="230"><span class="rk">#' + x.rank + '</span>' + scoreBadge(x.overall) + '<span class="pickacts">' + saveBtn(x.id, true) + '</span></div><div class="bd"><div class="nm"><b>' + esc(x.r.name) + '</b></div><div class="small muted">' + flagImg(x.r.country, 11) + ' ' + esc(localAreaOf(x.r)) + ', ' + fmtInt(x.r.popNow) + ' residents</div>' + snackLine(x.r) + nestBars(x) + '<p>' + esc(cardCopy(x)) + '</p></div></div>';
  }).join('');
  var view = RES.view || RES.scored;
  var shown = view.slice(0, S.shown);
  var ma = multiAnswer() ? '<div class="banner"><span>' + (S.profile === 'student' ? 'Students rarely have one answer: campus, language and city matter.' : S.profile === 'expat_professional' ? 'Expat moves depend on language and employer location.' : esc(countryName(S.cc)) + ' is multilingual, so the best place depends on your language.') + ' Compare the groups side by side.</span><button class="btn btn-sm" type="button" data-lt="board">Regional reality</button></div>' : '';
  box.innerHTML = ma + (S.sort === 'score' ? '<div class="picks-wrap"><button class="pk-nav prev" type="button" data-pkscroll="-1" aria-label="Previous top picks">‹</button><div class="picks" aria-label="Top picks">' + picks + '</div><button class="pk-nav next" type="button" data-pkscroll="1" aria-label="More top picks">›</button></div>' : '') +
    '<ol class="list" aria-label="Ranking">' + shown.map(rowHTML).join('') + '</ol>' +
    (view.length > S.shown ? '<button class="btn more-btn" type="button" data-more>Show ' + Math.min(100, view.length - S.shown) + ' more of ' + fmtInt(view.length - S.shown) + '</button>' : '') +
    (S.showAll ? unrankedHTML() : '');
  hydratePostcards(box); hydratePhotos(box);
}
var LANG_LOCAL = {
  CH: { german: 'Zurich, Bern, Basel, Lucerne and Central and Eastern Switzerland.', french: 'Romandy: Geneva, Vaud, Neuchâtel, Jura and the French-speaking parts of Fribourg, Valais and the Bernese Jura.', italian: 'Ticino and the Italian-speaking valleys of Graubünden.', bilingual: 'Fribourg, Valais, Biel/Bienne in Bern and Graubünden: two languages in daily life, schools and administration.' },
  BE: { dutch: 'Flanders, from the coast to Limburg.', french: 'Wallonia, from Hainaut to Luxembourg province.', bilingual: 'Brussels: French and Dutch side by side.', belgian_german: 'East Belgium around Eupen and Sankt Vith.' },
  LU: { luxembourgish: 'Luxembourgish, French and German are all official; schools switch between them.' }
};
function boardHTML() {
  if (!RES) return '';
  var out = [], keys = activeLanguageKeys();
  if (keys.length > 1 || S.cc === 'LU') {
    out.push('<div class="grp"><h3>Top five by language context</h3><p>' + esc(countryName(S.cc)) + ' is multilingual. Daily life, schools and administration change with the language area, so there is more than one answer.</p></div>');
    keys.forEach(function (k) {
      var A = META.config.languageAreas[k] || { name: k, note: '' };
      var loc = (LANG_LOCAL[S.cc] || {})[k]; if (loc) A = { name: A.name, note: loc };
      var top = RES.scored.filter(function (x) { return languageArea(x.r) === k; }).slice(0, 5);
      out.push('<div class="grp"><h3>' + esc(A.name) + '</h3><p>' + esc(A.note || '') + '</p><div class="opts">' + (top.length ? top.map(function (x) { return '<button class="chip ' + tone(x.overall) + '" data-id="' + esc(x.id) + '">' + esc(x.r.name) + ' <b>' + Math.round(x.overall) + '</b></button>'; }).join('') : '<span class="small muted">No ranked place in this language area.</span>') + '</div></div>');
    });
  } else {
    out.push('<div class="grp"><h3>Regional centre checks</h3><p>The strongest results in the largest places of ' + esc(scopeName()) + '. Use them as anchors before going small.</p><div class="opts">' +
      RES.scored.slice().sort(function (a, b) { return b.r.population - a.r.population; }).slice(0, 6).map(function (x) { return '<button class="chip ' + tone(x.overall) + '" data-id="' + esc(x.id) + '">' + esc(x.r.name) + ' <b>' + Math.round(x.overall) + '</b> #' + x.rank + '</button>'; }).join('') + '</div></div>');
  }
  if (S.profile === 'student' && S.cc === 'CH') {
    out.push('<div class="grp"><h3>Swiss university anchor check</h3><p>Campus access scores for the eleven university cities.</p><div class="opts">' + META.config.studentHubsCH.map(function (n) {
      var r = SHARD.records.find(function (x) { return x.name === n || stripParen(x.name) === n; }); if (!r) return '';
      var v = ENGINE.categories(r).student_access, x = RES.byId[r.id];
      return '<button class="chip ' + tone(v) + '" data-id="' + esc(r.id) + '">' + esc(r.name) + ' <b>' + fmt(v) + '</b>' + (x ? ' #' + x.rank : '') + '</button>';
    }).join('') + '</div></div>');
  }
  var xb = crossBorderForScope();
  out.push('<div class="grp"><h3>Cross-border commuter clusters</h3><p>Nearby places across the border that people use for work, shopping, airports or universities. They never change scores.</p><div class="opts">' +
    (xb.length ? xb.map(function (x, i) { return '<button class="chip" data-xb="' + i + '" title="' + esc(x.note) + '">' + flagImg(x.country) + ' ' + esc(x.label) + ' <b>' + Math.round(x.distance) + ' km</b></button>'; }).join('') : '<span class="small muted">No cross-border cluster within reach of this scope.</span>') + '</div></div>');
  board_xb = xb;
  return '<div class="board">' + out.join('') + '</div>';
}
var board_xb = [];
/* ---------- overlays: toast, definitions, modal, palette ---------- */
function toast(title, body, action) {
  var t = $('#toast'); t.innerHTML = '<div><b>' + esc(title) + '</b>' + esc(body || '') + (action ? '<div><button class="btn btn-sm toast-act" type="button" ' + action.attr + '>' + esc(action.label) + '</button></div>' : '') + '</div><button type="button" class="toast-x" aria-label="Close">×</button>';
  t.classList.add('open'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('open'); }, action ? 9000 : 7000);
  t.querySelector('.toast-x').onclick = function () { t.classList.remove('open'); };
  var ab = t.querySelector('.toast-act'); if (ab) ab.addEventListener('click', function () { setTimeout(function () { t.classList.remove('open'); }, 0); });
}
function defineTerm(key) {
  var T = META.config.terms, m;
  if (key === 'method') return toast('How scores work', 'Each profile weights categories; a category is the mean of its 0–100 factor scores. Strict floors and population minimums keep weak fits out. ' + (S.method === 'v2' ? 'Method v2: ' + NestEngine.METHOD_V2[0] : 'Legacy method v1.'));
  if ((m = /^factor:(.+)$/.exec(key))) { var f = ENGINE.factorById[m[1]]; return f && toast(f.name, f.description + ' Source: ' + ((META.sources[f.source_id] || {}).name || f.source_id) + '.'); }
  if ((m = /^profile:(.+)$/.exec(key))) { var p = profileDef(m[1]); return p && toast(p.name, (p.intro ? p.intro + ' ' : '') + p.desc); }
  if (key === 'depth') { var k = depthKind(S.cc); return toast(k[1] + ' for ' + countryName(S.cc), k[2]); }
  if (key === 'depthplace') { var r = selected(), x = r && placeX(r), kk = depthKind(r ? r.country : S.cc); return toast('Data depth: ' + kk[1], kk[2] + ' Confidence ' + (r ? fmt(r.sourceConfidence) : '–') + '% says how solid the sources are. Coverage ' + (x && fin(x.coverage) ? x.coverage + '%' : '–') + ' says how much of this profile could be scored here.'); }
  if (key === 'confidence') return toast('Confidence', T.confidence);
  if (key === 'coverage') return toast('Coverage', "Coverage is the share of this profile's weighted factors that can be scored for this municipality. It is separate from confidence and separate from the rank.");
  toast(catLabel(key), T[key] || T.score);
}
function openModal(title, html, onClose) {
  var tt = $('#toast'); if (tt) tt.classList.remove('open');
  if (typeof closeTools === 'function') closeTools(true);
  if ($('#palette').classList.contains('open')) closePalette(true);
  layerPush();
  $('#modal').innerHTML = '<div class="modal-h"><h2>' + esc(title) + '</h2><button class="icon-btn" type="button" data-close aria-label="Close">' + ICON.close + '</button></div><div class="modal-b">' + html + '</div>';
  $('#modal').classList.add('open'); $('#scrim').classList.add('open');
  $('#modal')._onClose = onClose; lastFocus = document.activeElement;
  setTimeout(function () { var b = $('#modal [data-close]'); if (b) b.focus(); }, 30);
}
var lastFocus = null;
function closeModal() { closeModalUI(); layerPop(); }
function closeModalUI() { $('#modal').classList.remove('open'); $('#scrim').classList.remove('open'); closePalette(); if ($('#modal')._onClose) $('#modal')._onClose(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }

var SEARCH = null, REGIONS = null, palSel = 0;
var EXONYM = { lisbon: 'lisboa', athens: 'athina', thessaloniki: 'thessaloniki', patras: 'patra', heraklion: 'irakleio', piraeus: 'peiraias', rome: 'roma', milan: 'milano', naples: 'napoli', florence: 'firenze', venice: 'venezia', turin: 'torino', genoa: 'genova', munich: 'munchen', cologne: 'koln', nuremberg: 'nurnberg', vienna: 'wien', prague: 'praha', warsaw: 'warszawa', krakow: 'krakow', cracow: 'krakow', brussels: 'bruxelles', antwerp: 'antwerpen', ghent: 'gent', bruges: 'brugge', 'the hague': "'s-gravenhage", copenhagen: 'kobenhavn', gothenburg: 'goteborg', seville: 'sevilla', saragossa: 'zaragoza', geneva: 'geneve', lucerne: 'luzern', basle: 'basel', berne: 'bern', bucharest: 'bucuresti', belgrade: 'beograd', nicosia: 'lefkosia', reykjavik: 'reykjavikurborg', 'st gallen': 'st. gallen', 'sankt gallen': 'st. gallen', 'saint gallen': 'st. gallen', luxemburg: 'luxembourg', londres: 'london', oporto: 'porto', lisbonne: 'lisboa', athen: 'athina', 'saint-gall': 'st. gallen', 'saint gall': 'st. gallen', 'st-gall': 'st. gallen', genf: 'geneve', sofia: 'stolichna', skopje: 'skopski', belgrad: 'beograd', warschau: 'warszawa', prag: 'praha', mailand: 'milano', rom: 'roma', venedig: 'venezia', florenz: 'firenze', neapel: 'napoli', wenen: 'wien' };
var PAL_FROM = null;
function openPalette() {
  PAL_FROM = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  layerPush(); var ti = $('#tour-invite'); if (ti) ti.remove();
  $('#palette').classList.add('open'); $('#scrim').classList.add('open');
  var inp = $('#pal-q'); inp.value = ''; inp.focus(); renderPalette('');
  if (!SEARCH) ensureSearch().then(function () { renderPalette(inp.value); });
}
var SEARCH_BY = {}, SEARCH_P = null;
function ensureSearch() {
  if (!SEARCH_P) SEARCH_P = getJSON('/data/search.json?v=' + VERSION).then(function (j) {
    SEARCH = j.rows.map(function (r) { var nm = NestData.cleanName(r[2], r[0]); var o = { cc: r[0], oid: r[1], name: nm, latin: /[\u0370-\u04ff]/.test(nm) ? NestData.translit(nm) : '', pop: r[3], f: fold(nm) }; SEARCH_BY[r[0] + ':' + r[1]] = o; return o; });
    REGIONS = (j.regions || []).map(function (r) { return { cc: r[0], code: r[1], name: r[2], n: r[3], f: fold(r[2]) + (/^M:/.test(r[1]) ? ' ' + fold(r[1].slice(2)) : '') }; });
    CITY_GROUPS.forEach(function (g) { var n = SEARCH.filter(function (o) { return o.cc === g.cc && g.test(o); }).length; if (n) REGIONS.unshift({ cc: g.cc, code: 'G:' + g.name, name: g.name + ', the whole city', n: n, f: fold(g.name) + ' ' + g.alias.join(' '), group: g }); });
    return SEARCH;
  });
  return SEARCH_P;
}
function closePalette(keep) { var was = $('#palette').classList.contains('open'); $('#palette').classList.remove('open'); if (!$('#modal').classList.contains('open')) $('#scrim').classList.remove('open'); if (was && !keep) layerPop(); if (was && !keep && PAL_FROM && document.contains(PAL_FROM) && PAL_FROM.offsetParent) try { PAL_FROM.focus(); } catch (e) {} PAL_FROM = null; }
function wordStart(f, q) { var k = f.indexOf(q); while (k >= 0) { if (k === 0 || /[\s\-'(\/]/.test(f[k - 1])) return true; k = f.indexOf(q, k + 1); } return false; }
function renderPalette(q) {
  var ul = $('#pal-list'); q = fold(q.trim());
  if (!SEARCH) { ul.innerHTML = '<li class="hint">Loading every place…</li>'; return; }
  var qs = [q]; Object.keys(EXONYM).forEach(function (k) { if (q.length >= 3 && k.indexOf(q) === 0 && qs.indexOf(EXONYM[k]) < 0) qs.push(EXONYM[k]); });
  if (/ae|oe|ue/.test(q)) { var tq = q.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u'); if (qs.indexOf(tq) < 0) qs.push(tq); }
  function isExact(f) { if (qs.indexOf(f) >= 0) return true; var parts = f.split(/\s*\/\s*|,\s*/); return parts.some(function (p) { return qs.indexOf(p) >= 0; }); }
  var res = [], regs = [];
  var countries = META.countries.filter(function (c) { return q && fold(c.name).indexOf(q) === 0; }).map(function (c) { return { country: c }; });
  if (q.length >= 2) {
    for (var i = 0; i < SEARCH.length && res.length < 500; i++) { var s = SEARCH[i]; for (var j = 0; j < qs.length; j++) if (wordStart(s.f, qs[j])) { res.push(s); break; } }
    var shortQ = q.length <= 4;
    res.sort(function (a, b) { var ea = isExact(a.f) && (!shortQ || a.pop >= 20000) ? 1 : 0, eb = isExact(b.f) && (!shortQ || b.pop >= 20000) ? 1 : 0; return (eb - ea) || (b.pop - a.pop); });
    var seen = {};
    regs = REGIONS.filter(function (r) { return qs.some(function (x) { return wordStart(r.f, x); }); }).sort(function (a, b) { return ((b.group ? 1 : 0) - (a.group ? 1 : 0)) || (b.n - a.n); }).filter(function (r) { var k = r.cc + '|' + r.f.replace(/[\s\/-]/g, ''); if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 4).map(function (r) { return { region: r }; });
  }
  var exact = res.filter(function (x) { return (isExact(x.f) && (q.length > 4 || x.pop >= 20000)) || (x.pop >= 50000 && qs.some(function (z) { return x.f.indexOf(z) === 0; })); }).slice(0, 5), rest = res.filter(function (x) { return exact.indexOf(x) < 0; });
  var metroFirst = regs.filter(function (r) { return /^G:/.test(r.region.code) && qs.some(function (z) { return fold(r.region.code.slice(2)) === z || r.region.group.alias.indexOf(z) >= 0; }); }).concat(regs.filter(function (r) { return /^M:/.test(r.region.code) && qs.some(function (z) { return fold(r.region.code.slice(2)) === z; }); }));
  var items = exact.concat(metroFirst, countries, regs.filter(function (r) { return metroFirst.indexOf(r) < 0; }), rest.slice(0, 30 - exact.length));
  palSel = 0;
  ul.innerHTML = items.length ? items.map(function (s, i) {
    if (s.country) return '<li><button type="button" data-pcc="' + s.country.cc + '" aria-selected="' + (i === 0) + '"><span>' + flagImg(s.country.cc) + ' ' + esc(s.country.name) + '</span><span class="muted small">Country, ' + fmtInt(s.country.n) + ' municipalities</span></button></li>';
    if (s.region) return '<li><button type="button" data-preg="' + esc(s.region.cc + ':' + s.region.code) + '" aria-selected="' + (i === 0) + '"><span>' + flagImg(s.region.cc) + ' ' + esc(s.region.name) + '</span><span class="muted small">' + (/^G:/.test(s.region.code) ? 'City in ' + esc(countryName(s.region.cc)) + ', ' + fmtInt(s.region.n) + ' districts' : (/^M:/.test(s.region.code) ? 'Greater area' : 'Region') + ' in ' + esc(countryName(s.region.cc)) + ', ' + fmtInt(s.region.n) + ' places') + '</span></button></li>';
    return '<li><button type="button" data-pid="' + esc(s.cc + ':' + s.oid) + '" aria-selected="' + (i === 0) + '"><span>' + flagImg(s.cc) + ' ' + esc(s.name) + (s.latin ? ' <span class="muted small">' + esc(s.latin) + '</span>' : '') + '</span><span class="muted small">' + esc(countryName(s.cc)) + ', ' + fmtInt(s.pop) + '</span></button></li>';
  }).join('') : '<li class="hint">' + (q.length < 2 ? 'Type a town, city, region or country. Every municipality in ' + META.countries.length + ' countries is here.' : (/^\d{3,6}$/.test(q) ? 'Postcodes are not searchable yet. Type the town name instead.' : 'No place matches “' + esc(q) + '”. Try the local spelling or the region.')) + '</li>';
}
function goToRegion(key) {
  closePalette(); $('#scrim').classList.remove('open');
  var cc = key.split(':')[0], code = key.slice(cc.length + 1);
  enterExplore();
  loadCountry(cc).then(function () {
    var lvl = regionLevel(cc);
    S.selected = null;
    if (code.indexOf('M:') === 0 || code.indexOf('G:') === 0) { S.region = code; S.area = 'ALL'; return switchCountry(cc); }
    if (code.length === 5) { S.area = code; S.region = lvl === 'n1' ? code.slice(0, 3) : lvl === 'n2' ? code.slice(0, 4) : 'ALL'; }
    else if (lvl === 'n1') { S.region = code.slice(0, 3); S.area = 'ALL'; }
    else if (lvl === 'n2' && code.length >= 4) { S.region = code.slice(0, 4); S.area = 'ALL'; }
    else { S.region = 'ALL'; S.area = 'ALL'; }
    switchCountry(cc);
  });
}
function goToPlace(id) {
  closePalette(); $('#scrim').classList.remove('open');
  var cc = id.split(':')[0];
  enterExplore();
  if (cc !== S.cc || !SHARD || SHARD !== SHARDS[cc]) { S.region = 'ALL'; S.area = 'ALL'; S.selected = id; switchCountry(cc, { keepSelection: true }).then(function () { selectPlace(id, { from: 'search' }); }); }
  else { var r = BYID[id]; if (r && !inScope(r)) { S.region = 'ALL'; S.area = 'ALL'; update({}); } selectPlace(id, { from: 'search' }); }
}

/* ---------- one shortlist: save places, tick two or three of them to compare ---------- */
var UNDO = null;
function undoRemove() { if (!UNDO || !UNDO.entry || isSaved(UNDO.entry.id)) return; saved.splice(Math.min(UNDO.at || 0, saved.length), 0, UNDO.entry); if (UNDO.cmp && S.compare.length < 3) S.compare.push(UNDO.entry.id); UNDO = null; persistShortlist(); refreshShortlistUI(); toast('Back on your shortlist', ''); }
function isSaved(id) { return saved.some(function (s) { return s.id === id; }); }
function isCmp(id) { return S.compare.indexOf(id) >= 0; }
function savedEntry(id) { var r = BYID[id], x = RES && RES.byId[id]; return { id: id, name: r.name, area: localAreaOf(r) + ', ' + countryName(r.country), profile: S.profile, score: x ? x.overall : null, t: Date.now() }; }
function persistShortlist() { store('saved', saved); store('cmp', S.compare); }
function refreshShortlistUI() {
  $$('[data-save]').forEach(function (b) { var id = b.dataset.save, on = isSaved(id); b.setAttribute('aria-pressed', on); if (b.classList.contains('lbl')) b.innerHTML = (on ? ICON.heartFill : ICON.heart) + '<span>' + (on ? 'Saved' : 'Save') + '</span>'; else b.innerHTML = on ? ICON.heartFill : ICON.heart; b.setAttribute('aria-label', (on ? 'Remove from' : 'Save to') + ' shortlist'); b.title = on ? 'On your shortlist' : 'Save to shortlist'; });
  $$('[data-cmp]').forEach(function (b) { var on = isCmp(b.dataset.cmp); b.setAttribute('aria-pressed', on); if (b.type === 'checkbox') b.checked = on; else if (b.classList.contains('lbl')) b.innerHTML = '<span class="cbox" aria-hidden="true">' + (on ? '✓' : '') + '</span><span>Compare</span>'; });
  $$('[data-opencmp]').forEach(function (b) { if (b.classList.contains('pa-cmp')) b.hidden = S.compare.length < 2; else b.disabled = S.compare.length < 2; var n = b.querySelector('.n'); if (n) n.textContent = S.compare.length; });
  $$('.sl-n').forEach(function (e) { e.textContent = saved.length; e.hidden = !saved.length; });
  var sc = $('#savedcount'); if (sc) sc.textContent = saved.length;
  renderTray();
  if (S.listTab === 'saved' && S.view === 'explore') renderResults();
}
function toggleSave(id) {
  var r = BYID[id] || saved.filter(function (s) { return s.id === id; })[0]; if (!r) return;
  if (isSaved(id)) { var was = saved.filter(function (s) { return s.id === id; })[0], wasCmp = isCmp(id), wasAt = saved.indexOf(was); saved = saved.filter(function (s) { return s.id !== id; }); S.compare = S.compare.filter(function (c) { return c !== id; }); UNDO = { entry: was, cmp: wasCmp, at: wasAt }; toast('Removed from your shortlist', r.name + '.', { label: 'Undo', attr: 'data-undo' }); }
  else { saved.unshift(savedEntry(id)); toast('Saved to your shortlist', r.name + '. You have ' + saved.length + ' saved place' + (saved.length > 1 ? 's' : '') + '.', { label: 'View shortlist', attr: 'data-lt="saved"' }); }
  persistShortlist(); refreshShortlistUI();
}
function saveBtn(id, small) { var on = isSaved(id); return '<button class="icon-btn' + (small ? ' sm' : '') + '" type="button" data-save="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove from' : 'Save to') + ' shortlist" title="' + (on ? 'On your shortlist' : 'Save to shortlist') + '">' + (on ? ICON.heartFill : ICON.heart) + '</button>'; }
function saveBtnL(id) { var on = isSaved(id); return '<button class="btn btn-sm lbl save-l" type="button" data-save="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove from' : 'Save to') + ' shortlist">' + (on ? ICON.heartFill : ICON.heart) + '<span>' + (on ? 'Saved' : 'Save') + '</span></button>'; }
function cmpBtn(id) { var on = isCmp(id); return '<button class="btn btn-sm lbl cmp-l" type="button" data-cmp="' + esc(id) + '" aria-pressed="' + on + '" title="Tick to compare side by side (up to three)"><span class="cbox" aria-hidden="true">' + (on ? '✓' : '') + '</span><span>Compare</span></button>'; }
function toggleCompare(id, replaceId) {
  var r = BYID[id] || saved.filter(function (s) { return s.id === id; })[0]; if (!r && !isSaved(id)) return;
  if (isCmp(id)) { S.compare = S.compare.filter(function (c) { return c !== id; }); persistShortlist(); refreshShortlistUI(); toast((r ? r.name : 'Place') + ' unticked', S.compare.length + ' of 3 places ticked for compare. It stays on your shortlist.'); return; }
  if (S.compare.length >= 3 && !replaceId) return askReplace(id);
  if (replaceId) S.compare = S.compare.filter(function (c) { return c !== replaceId; });
  if (!isSaved(id) && r) saved.unshift(savedEntry(id));
  S.compare.push(id); persistShortlist(); refreshShortlistUI();
  var n = S.compare.length, nm = r ? r.name : id;
  if (n >= 2) toast(nm + ' ticked for compare', n + ' of 3 places ticked. It is also on your shortlist.', { label: 'Compare ' + n + ' now', attr: 'data-opencmp' });
  else toast(nm + ' ticked for compare', 'Tick one or two more, then compare. It stays on your shortlist.', { label: 'View shortlist', attr: 'data-lt="saved"' });
}
function askReplace(id) {
  var r = BYID[id];
  // the box the visitor just clicked ticked itself; it only stays ticked if they choose a place to replace
  $$('input[type="checkbox"][data-cmp]').forEach(function (el) { el.checked = isCmp(el.dataset.cmp); });
  openModal('Compare holds three places', '<p>Which one should make room for <b>' + esc(r ? r.name : id) + '</b>? The one you replace stays on your shortlist.</p><div class="actions" style="flex-direction:column;align-items:stretch">' + S.compare.map(function (c) { var o = BYID[c], sv = saved.filter(function (s) { return s.id === c; })[0]; return '<button class="btn" type="button" data-cmpreplace="' + esc(c) + '" data-cmpnew="' + esc(id) + '">Replace ' + esc(o ? o.name : sv ? sv.name : c) + '</button>'; }).join('') + '<button class="btn btn-ghost" type="button" data-close>Keep the three I have</button></div>');
}
function renderTray() {
  var t = $('#tray'); if (!t) return; var n = S.compare.length;
  var on = n > 0 && S.view === 'explore';
  t.classList.toggle('open', on); document.body.classList.toggle('has-tray', on);
  if (!on) { t.innerHTML = ''; return; }
  var names = S.compare.map(function (id) { var r = BYID[id], sv = saved.filter(function (s) { return s.id === id; })[0], se = SEARCH_BY[id]; return r ? r.name : sv ? sv.name : se ? se.name : 'a place in ' + countryName(id.split(':')[0]); });
  t.innerHTML = '<span class="tray-t"><b>Compare ' + n + ' of 3</b><small>' + esc(names.join(', ')) + '</small></span><button class="btn btn-sm btn-primary" type="button" data-opencmp' + (n < 2 ? ' disabled title="Tick at least two places"' : '') + '>Compare</button><button class="btn btn-sm btn-ghost" style="color:inherit" type="button" data-lt="saved">Shortlist</button><button class="icon-btn sm" style="color:inherit" type="button" data-clearcmp aria-label="Untick all">' + ICON.close + '</button>';
}
function exportCSV() {
  if (!saved.length) { toast('Your shortlist is empty', 'Save a few places first, then download them as a spreadsheet.'); return; }
  var rows = [['id', 'name', 'area', 'profile', 'score', 'ticked for compare', 'note']].concat(saved.map(function (s) { var live = RES && RES.byId[s.id] && s.profile === S.profile ? RES.byId[s.id].overall : s.score; return [s.id, s.name, s.area, profileName(s.profile) || s.profile, fin(live) ? Math.round(live) : '', isCmp(s.id) ? 'yes' : '', s.note || '']; }));
  var csv = rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'nestlyzer-shortlist.csv'; document.body.appendChild(a); a.click(); a.remove();
}
function share(title, url) {
  if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link copied', /[?&]list=/.test(url) ? 'Anyone with the link can add these places to their own shortlist.' : 'Anyone with the link sees the same profile, scope and place.'); }, function () { prompt('Copy this link', url); });
  else prompt('Copy this link', url);
}
