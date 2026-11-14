/* Place panel: decision facts, context, charts, comparables, enrichment hooks */
function sizeLabel(r) { var p = r.population; if (isWorld(r.country)) return p >= 100000 ? 'large city or city district' : p >= 30000 ? 'large town or district' : p >= 10000 ? 'mid-sized town or district' : p >= 3000 ? 'small town' : 'village'; return p >= 100000 ? (r.country === 'CH' ? 'large Swiss city' : 'large city') : p >= 30000 ? 'large municipality' : p >= 10000 ? 'mid-sized municipality' : p >= 3000 ? 'compact municipality' : 'small municipality'; }
function settingLabel(r) { var fr = r.factorRaw || {}; if (fr.green_open_land_share > 70) return 'open-land setting'; if (fr.wooded_area_share > 35) return 'wooded setting'; if (r.density > 1200) return 'dense local setting'; return 'mixed local setting'; }
function nearbyNames(r, n) {
  if (!fin(r.lat)) return [];
  return SHARD.records.filter(function (x) { return x.id !== r.id && fin(x.lat) && (r.country === 'CH' ? x.canton === r.canton : x.n2 === r.n2); })
    .map(function (x) { return { n: x.name, d: km([r.lon, r.lat], [x.lon, x.lat]) }; }).sort(function (a, b) { return a.d - b.d; }).slice(0, n || 4).map(function (x) { return x.n + ' (' + Math.round(x.d) + ' km)'; });
}
function coastRelevant(r) { var c = shoreKm(r); return fin(c) && c <= 150; }
function placeCurated(r) { var N = META.config.placeNotes; return !!(N[noteKey(r)] || (r.country === 'CH' && N[r.name + '|' + r.canton])); }
function noteKey(r) { return stripParen(r.name) + '|' + (r.canton || ''); }
function placeFacts(r) {
  var N = META.config.placeNotes, key = noteKey(r);
  if (N[key]) return N[key];
  if (r.country === 'CH' && N[r.name + '|' + r.canton]) return N[r.name + '|' + r.canton];
  var near = nearbyNames(r, 3).join(', ');
  var f = {
    setting: r.name + ' is a ' + sizeLabel(r) + ' in ' + localAreaOf(r) + '. The local feel is best checked through its centre, rail or road corridor and surrounding landscape.',
    background: r.country === 'CH' ? cantonSentence(r) : '',
    sights: [], proximity: near ? 'Nearby comparators in the same ' + (r.country === 'CH' ? 'canton' : 'region') + ': ' + near + '.' : '',
    watch: isBizKey(S.profile) ? 'Use the scorecard for fit, then verify the site itself: zoning, available plots or premises, grid and water connection, access roads, permits and local incentives.' : 'Use the scorecard for fit, then verify the street-level details: noise, slope, school catchment, train frequency, local shops and housing cost.'
  };
  var G = META.config.autoFactGroups, n = stripParen(r.name);
  if (r.canton === 'ZH' && G.ZH_gold_coast.indexOf(n) >= 0) { f.setting = r.name + ' is on or above the right bank of Lake Zurich, tied to the Gold Coast and Pfannenstiel landscape.'; f.sights = ['Lake Zurich shore', 'Pfannenstiel paths', 'Zurich Gold Coast villages']; f.watch = 'Lake proximity and Zurich access are positives, but hillside access and housing costs need close inspection.'; }
  if (r.canton === 'ZH' && G.ZH_airport.indexOf(n) >= 0) { f.setting = r.name + ' is part of the Zurich airport and Glattal orbit.'; f.background = 'Airport access, jobs and rail connections are useful, but aircraft noise and traffic exposure should be treated as first-order decision factors.'; f.sights = ['Zurich Airport corridor', 'Glattal connections', 'Zurich north access']; f.watch = 'Inspect official aircraft-noise maps and visit at different times of day.'; }
  return f;
}
function cantonSentence(r) {
  if (r.canton === 'TI') return 'In Ticino, language, climate, lake or valley setting and links to Lugano, Bellinzona or Locarno shape daily life.';
  if (r.canton === 'VD' || r.canton === 'GE') return 'Around Lake Geneva, the decision often turns on lake access, cross-border movement, job access and housing pressure.';
  if (r.canton === 'VS') return 'In Valais, valley position, mountain access, heat exposure and distance to larger service centres matter.';
  return 'In canton ' + r.cantonName + ', compare the municipality with nearby centres and check the exact transport corridor, local services and landscape setting.';
}
function storyParagraphs(r) {
  var f = placeFacts(r), near = nearbyNames(r, 3), lang = languageLabel(r);
  return [
    (f.setting || (r.name + ' sits in ' + localAreaOf(r) + ', with daily life shaped by its local scale, access routes and surrounding settlement pattern.')) + ' The everyday language setting is ' + lang + ', which matters for schools, administration and local networks.',
    ((f.background || (r.name + ' should be read through its wider ' + areaKind(r.country).toLowerCase() + ' context. Administration, schools, taxes, housing pressure and public services change quickly across borders and neighbouring ' + unitWord(r.country, 2) + '.')) + ' ' + (f.proximity || ('For orientation, compare it with ' + (near.join(', ') || 'nearby ' + unitWord(r.country, 2)) + ' before treating the ranking as a final answer.'))).trim(),
    f.watch || 'The final decision depends on micro-location: noise, slope, school route, rail access, walking distance to shops and the exact housing stock.'
  ];
}
function regionParagraphs(r) {
  var a;
  if (r.country === 'CH') {
    a = META.config.cantonLines[r.canton] || [
      'Canton ' + r.cantonName + ' sets the tax frame, school system and many public services.', 'Municipal tax multipliers and housing pressure can differ sharply between neighbours.',
      'Transport corridors decide daily access more than straight-line distance.', 'Compare within the canton before comparing across Switzerland.',
      'Language and school tracks matter for families.', 'Check local services, childcare and doctors before committing.'];
  } else a = [localAreaOf(r) + ' is the local comparison frame for ' + r.name + '. Use it before comparing across the whole country.', 'The relevant trade-offs usually come from transport corridors, service depth, housing pressure and proximity to a real regional centre.', 'For cross-border or language-sensitive moves, check the neighbouring country and the local administrative language before treating distance as simple access.'];
  return [(a[0] || '') + ' ' + (a[1] || ''), (a[2] || '') + ' ' + (a[3] || ''), (a[4] || '') + ' ' + (a[5] || '')].map(function (s) { return s.trim(); }).filter(Boolean);
}
function inputLabel(r) {
  var fs = r.factorScores || {}, off = 0, geo = 0;
  ENGINE.allFactors.forEach(function (f) { if (fin(fs[f.id])) { if (/^geo_/.test(f.id)) geo++; else off++; } });
  return off + ' official + ' + geo + ' geographic factors' + (ENGINE.usesAccess(S.profile, r.country) ? ' + ' + (r.country === 'CH' ? 'access proxy' : 'centre access') : '');
}

function sparkSVG(vals, invert, label) {
  vals = vals.filter(function (p) { return fin(p[1]); });
  if (vals.length < 2) return '';
  var ys = vals.map(function (p) { return p[1]; }), mn = Math.min.apply(null, ys), mx = Math.max.apply(null, ys), W = 300, H = 72;
  var pts = vals.map(function (p, i) { var x = 6 + i * (W - 12) / (vals.length - 1); var t = mx === mn ? .5 : (p[1] - mn) / (mx - mn); if (invert) t = 1 - t; return [x, H - 6 - t * (H - 12)]; });
  return '<figure><figcaption>' + esc(label) + '</figcaption><svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label + ': ' + vals.map(function (p) { return p[0] + ' ' + p[1]; }).join(', ')) + '"><polyline fill="none" stroke="var(--blue)" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '"/>' + pts.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="var(--blue)"/>'; }).join('') + '</svg><div class="small muted">' + vals[0][0] + ': ' + fmtInt(vals[0][1]) + ' → ' + vals[vals.length - 1][0] + ': ' + fmtInt(vals[vals.length - 1][1]) + '</div></figure>';
}
function trendsHTML(r) {
  var t = r.trend, fr = r.factorRaw || {};
  var chips = [];
  if (t && fin(t.population_yoy_pct)) chips.push('<span class="chip ' + tone(50 + t.population_yoy_pct * 4) + '">YoY ' + signed(t.population_yoy_pct) + '%</span>');
  var five = t && fin(t.population_5y_pct) ? t.population_5y_pct : fr.common_population_growth_5y;
  if (fin(five)) chips.push('<span class="chip ' + tone(50 + five * 2) + '">5 yrs ' + signed(five) + '%</span>');
  if (r.country === 'CH' && fin(fr.population_growth_pct)) chips.push('<span class="chip ' + tone(50 + fr.population_growth_pct) + '" title="Swiss FSO portrait population growth 2010–2019, background context">Long signal ' + signed(fr.population_growth_pct) + '%</span>');
  var sp = '';
  if (t && t.annual_population) {
    sp = '<div class="sparks">' + sparkSVG(t.annual_population.map(function (p) { return [p.year, p.population]; }), false, 'Residents') +
      sparkSVG((t.population_rank_series || []).map(function (p) { return [p.year, p.rank]; }), true, 'Size rank in Switzerland') +
      sparkSVG((t.population_growth_rank_series || []).map(function (p) { return [p.year, p.rank]; }), true, 'Growth rank in Switzerland') + '</div>' +
      '<details class="yby"><summary>Year by year</summary><div class="pills">' + t.annual_population.map(function (p) { return '<span class="chip">' + p.year + ': ' + fmtInt(p.population) + '</span>'; }).join('') + '</div></details>';
  }
  if (!chips.length && !sp) return '';
  return '<section class="sec"><h3>Population trend</h3><div class="pills">' + chips.join('') + '</div>' + sp + '</section>';
}
function companyHTML(r) {
  var ids = ['workplaces_per_1000_residents', 'jobs_per_1000_residents', 'tertiary_jobs_share', 'working_age_share_pct', 'low_social_assistance_rate', 'secondary_jobs_balance'];
  var rows = ids.map(function (id) { var f = ENGINE.factorById[id], raw = (r.factorRaw || {})[id], sc = (r.factorScores || {})[id]; if (!f || (!fin(raw) && !fin(sc))) return ''; return '<tr><td>' + esc(f.name) + '</td><td class="num">' + (fin(raw) ? fmt(raw, 1) + ' ' + esc(f.unit || '') : '–') + '</td><td class="num">' + (fin(sc) ? '<span class="chip ' + tone(sc) + '">' + fmt(sc) + '</span>' : '') + '</td></tr>'; }).join('');
  return rows ? '<section class="sec"><h3>Jobs and company signals</h3><div class="tablewrap"><table class="table"><tbody>' + rows + '</tbody></table></div></section>' : '';
}
function accessHTML(r) {
  var fr = r.factorRaw || {}, g = r.geo || {}, cats = ENGINE.categories(r);
  var rows = [];
  if (fin(fr.geo_hub_airport_km)) rows.push(['Hub airport', (g.hubAirport || '') + ', ' + fmt(fr.geo_hub_airport_km) + ' km']);
  if (fin(fr.geo_airport_km) && g.airport && g.airport !== g.hubAirport) rows.push(['Nearest scheduled airport', g.airport + ', ' + fmt(fr.geo_airport_km) + ' km']);
  if (fin(fr.geo_major_city_km)) rows.push(['Nearest city of 100,000+', fr.geo_major_city_km === 0 ? 'This place is one' : fmt(fr.geo_major_city_km) + ' km']);
  if (fin(fr.geo_catchment_30km)) rows.push(['Residents within 30 km', fmtInt(fr.geo_catchment_30km)]);
  var sk = seaKm(r); if (fin(sk)) rows.push(['Sea coast', sk < 2 ? 'On the coast' : fmt(sk) + ' km']);
  if (fin(fr.geo_shore_km) && seaKm(r) > fr.geo_shore_km + 1) rows.push(['Lake shore', (fr.geo_shore_km < 2 ? 'On the shore' : fmt(fr.geo_shore_km) + ' km') + ' (' + shoreName(r) + ')']);
  if (fin(cats.commuter_access)) rows.push(['Commute access score', fmt(cats.commuter_access) + (g.commuterAnchor ? ' (nearest centre: ' + g.commuterAnchor + ', ' + fmt(fr.commuter_anchor_km) + ' km)' : '')]);
  if (fin(cats.student_access)) rows.push(['Campus access score', fmt(cats.student_access) + (g.studentAnchor ? ' (nearest: ' + g.studentAnchor + ', ' + fmt(fr.student_anchor_km) + ' km)' : '')]);
  if (!rows.length) return '';
  return '<section class="sec"><h3>Getting around <button class="info" type="button" data-def="mobility" aria-label="About mobility">i</button></h3><p class="sub">' + (isWorld(r.country) ? 'Straight-line distances from the centre of the place.' : 'Straight-line distances from where people live in the municipality.') + ' Travel times are not joined yet.</p><dl class="kv">' + rows.map(function (a) { return '<dt>' + esc(a[0]) + '</dt><dd>' + esc(a[1]) + '</dd>'; }).join('') + '</dl></section>';
}
function comparablesHTML(x) {
  var r = x.r; if (!fin(r.lat)) return '';
  var src = (RES && RES.scored.length ? RES.scored.map(function (y) { return y.r; }) : SCOPE).filter(function (o) { return o.id !== r.id && fin(o.lat); });
  var pool = src.filter(function (o) { return r.country === 'CH' ? o.canton === r.canton : (o.n2 && o.n2 === r.n2); });
  if (pool.length < 3) pool = src;
  var arr = pool.map(function (o) { return { r: o, d: km([r.lon, r.lat], [o.lon, o.lat]) }; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 3);
  if (!arr.length) return '';
  return '<section class="sec"><h3>Close comparables</h3><div class="alts">' + arr.map(function (o) {
    var y = RES && RES.byId[o.r.id] || { r: o.r, catScores: ENGINE.categories(o.r) };
    var delta = fin(x.overall) && fin(y.overall) ? y.overall - x.overall : null, rd = x.rank && y.rank ? y.rank - x.rank : null;
    var gain = weightedCats(y, false, 1)[0], give = weightedCats(y, true, 1)[0];
    return '<button class="alt" type="button" data-id="' + esc(o.r.id) + '"><span><b>' + esc(o.r.name) + '</b>, ' + Math.round(o.d) + ' km</span>' + (fin(delta) ? '<span class="delta ' + (delta >= 0 ? 'good' : 'bad') + '">' + (Math.abs(delta) < 0.5 ? 'same score' : fmt(Math.abs(delta), 0) + (delta > 0 ? ' points higher' : ' points lower')) + '</span>' : '<span class="small muted">not ranked</span>') +
      '<small>' + (fin(rd) && rd !== 0 ? fmtInt(Math.abs(rd)) + (rd > 0 ? ' places further down' : ' places further up') + '. ' : '') + (gain ? 'Best on ' + esc(shortCat(gain[0]).toLowerCase()) + ' (' + fmt(gain[1], 0) + ')' : '') + (give ? ', weakest on ' + esc(shortCat(give[0]).toLowerCase()) + ' (' + fmt(give[1], 0) + ')' : '') + '</small></button>';
  }).join('') + '</div></section>';
}
function crossBorderHTML(r) {
  var xb = crossBorderForRecord(r); if (!xb.length) return '';
  place_xb = xb;
  return '<section class="sec"><h3>Cross-border context</h3><p class="sub">This does not change the score. It flags nearby places people often consider because work, shopping, airports, universities or services cross the border in daily life.</p><div class="alts">' +
    xb.map(function (x, i) { return '<button class="alt" type="button" data-pxb="' + i + '"><span>' + flagImg(x.country) + ' <b>' + esc(x.label) + '</b></span><span class="small">≈ ' + Math.round(x.distance) + ' km</span><small>' + esc(x.note) + '</small></button>'; }).join('') + '</div></section>';
}
var place_xb = [];
function breakdownHTML(x) {
  var r = x.r, w = ENGINE.weightsFor(r, S.profile), cats = x.catScores || ENGINE.categories(r), cr = RES ? RES.categoryRanks : {}, frk = RES ? RES.factorRanks : {};
  var ck = Object.keys(cats).filter(function (k) { return fin(cats[k]) && !(k === 'coast' && !coastRelevant(r)); }).sort(function (a, b) { return (w[b] || 0) - (w[a] || 0) || cats[b] - cats[a]; });
  var crow = ck.map(function (k) { var rk = cr[k] && cr[k][r.id]; return '<tr><td><span class="chip ' + tone(cats[k]) + '" role="button" tabindex="0" data-def="' + k + '">' + esc(shortCat(k)) + '</span></td><td class="num"><b>' + fmt(cats[k]) + '</b></td><td class="num">' + (rk ? medal(rk) + '#' + rk : '–') + '</td><td class="num">' + (w[k] ? w[k] : '–') + '</td></tr>'; }).join('');
  var facs = ENGINE.allFactors.map(function (f) { return { f: f, v: ENGINE.factorValue(r, f) }; }).filter(function (o) { return fin(o.v); }).sort(function (a, b) { return b.v - a.v; });
  var frow = facs.map(function (o) { var raw = (r.factorRaw || {})[o.f.id], rk = frk[o.f.id] && frk[o.f.id][r.id]; return '<tr><td><button class="chip" type="button" data-def="factor:' + o.f.id + '">' + esc(o.f.name) + '</button><div class="small muted">' + esc(shortCat(o.f.category)) + '</div></td><td class="num"><b class="' + tone(o.v) + '">' + fmt(o.v) + '</b></td><td class="num">' + (rk ? '#' + rk : '–') + '</td><td class="num small">' + (fin(raw) ? fmt(raw, Math.abs(raw) < 100 ? 1 : 0) + ' ' + esc(o.f.unit || '') : '') + '</td></tr>'; }).join('');
  return '<section class="sec"><h3>Full score and sub-rankings</h3><p class="sub">Sub-ranks are positions among the ' + (RES ? fmtInt(RES.scored.length) : '') + ' places that pass this profile in ' + esc(scopeName()) + '.</p><div class="tablewrap"><table class="table brk brkc"><thead><tr><th>Category</th><th class="num">Score</th><th class="num">Rank</th><th class="num">Weight</th></tr></thead><tbody>' + crow + '</tbody></table></div>' +
    '<details style="margin-top:10px"><summary class="small" style="cursor:pointer;font-weight:600">All ' + facs.length + ' factors with raw values</summary><div class="tablewrap"><table class="table brk brkf"><thead><tr><th>Factor</th><th class="num">Score</th><th class="num">Rank</th><th class="num">Raw</th></tr></thead><tbody>' + frow + '</tbody></table></div></details></section>';
}
function lotteryHTML(r) {
  if (!(S.profile === 'swiss_lottery' || (S.profile === 'self_fit' && S.builder && S.builder.tax === 'lottery'))) return '';
  if (r.country === 'CH') return '<div class="lot"><h3>Tax module joined locally</h3><p>Swiss municipal and cantonal tax-burden factors are joined. Personal residence facts still need a separate tax check.</p>' + NZ_NOTE_TAX + '<div class="pills"><span class="chip tone-good">tax factors joined</span><span class="chip">country-specific treatment</span></div></div>';
  return '<div class="lot"><h3>Country tax module required</h3><p>The municipality ranking remains valid as a place-quality ranking. Lottery, wealth, inheritance, capital-gains, property and windfall tax treatment must come from the specific country module before a tax ranking is claimed.</p><div class="pills"><span class="chip tone-mid">tax module pending</span></div></div>';
}

function selected() { return S.selected ? BYID[S.selected] : null; }
function placeX(r) { return (RES && RES.byId[r.id]) || { r: r, id: r.id, catScores: ENGINE.categoriesFor(r, S.profile), overall: S.profile ? ((ENGINE.scoreRaw(r, S.profile, 0, S.cc) || {}).score) : null, coverage: (ENGINE.scoreRaw(r, S.profile, 0, S.cc) || {}).coverage, weighted: (ENGINE.scoreRaw(r, S.profile, 0, S.cc) || {}).weighted, measured: (ENGINE.scoreRaw(r, S.profile, 0, S.cc) || {}).measured }; }
var PTABS = [['overview', 'Overview'], ['score', 'Scorecard'], ['photos', 'Photos'], ['facts', 'Facts'], ['around', 'Around'], ['similar', 'Similar'], ['data', 'All data']];
function factsTableHTML(r) {
  var groups = [['people', 'People and size'], ['access', 'Getting around'], ['nature', 'Land and water'], ['sky', 'Light through the year']];
  return '<section class="sec"><h3>All the numbers</h3><p class="sub">Each bar shows where ' + esc(r.name) + ' sits among all ' + esc(demonym(r.country)) + ' ' + unitWord(r.country) + '.</p>' + groups.map(function (g) {
    var rows = PARAMS.filter(function (p) { return p.group === g[0]; }).map(function (p) {
      var v = pval(r, p.k); if (v == null) return '';
      var pc = pctOf(r, p.k), nm = p.name ? p.name(r) : null;
      if (p.k === 'city' && v < 1 && r.popNow >= 100000) return '<tr><th scope="row">' + esc(p.label) + '</th><td class="num"><b>it is one</b></td><td></td></tr>';
      return '<tr data-pk="' + p.k + '"><th scope="row">' + esc(p.label) + (nm ? '<div class="small muted">' + esc(nm) + '</div>' : '') + '</th><td class="num"><b>' + esc(pfmt(p.k, v)) + '</b></td><td class="pbar" title="' + (pc != null ? 'Higher than ' + pc + '% of ' + esc(demonym(r.country)) + ' municipalities' : '') + '">' + (pc != null ? '<span><i style="left:' + pc + '%"></i></span>' : '') + '</td></tr>';
    }).join('');
    return rows ? '<h4 class="fh">' + g[1] + '</h4><div class="tablewrap"><table class="table facts"><tbody>' + rows + '</tbody></table></div>' : '';
  }).join('') + landSeaHTML(r) + '<p class="small muted">Low ← position among ' + esc(demonym(r.country)) + ' ' + unitWord(r.country, 2) + ' → high. Sources: ' + esc(isWorld(r.country) ? PARAM_SOURCES.world : PARAM_SOURCES.stat) + '; ' + esc(PARAM_SOURCES.ne) + '; ' + esc(PARAM_SOURCES.terrain) + '; ' + esc(PARAM_SOURCES.sun) + '.</p>' +
    (climateOf(r) ? '<p class="small">Climate type ' + esc(climateOf(r).code) + ' (' + esc(climateOf(r).name) + ')' + (climateOf(r).text ? ': ' + esc(climateOf(r).text) : '') + '. Köppen-Geiger classification, Rubel et al. 2017.</p>' : '') + '</section>';
}
function landSeaHTML(r) {
  var x = r.x || {}, bits = [];
  if (x.land) bits.push('<span class="chip">⛰️ ' + esc(x.land) + '</span>');
  if (x.sea) bits.push('<span class="chip">🌊 ' + esc(x.sea) + '</span>');
  if (x.metro) bits.push('<button class="chip" type="button" data-near="' + esc(x.metro) + '|M">🏙️ Greater ' + esc(x.metro) + '</button>');
  return bits.length ? '<div class="pills" style="margin:8px 0">' + bits.join('') + '</div>' : '';
}
function homeDeltaHTML(r) {
  var h = S.home && BYID[S.home];
  if (!h || h.id === r.id) return '';
  var rows = [];
  function d(k, label, better) {
    var a = pval(r, k), b = pval(h, k); if (a == null || b == null) return;
    var diff = a - b, P = PARAM[k]; if (Math.abs(diff) < (P.unit === 'km' ? 1 : P.unit === 'm' ? 50 : Math.max(1, Math.abs(b) * 0.05))) return;
    var txt = P.unit === 'km' ? (diff < 0 ? pfmt(k, -diff) + ' closer to ' : pfmt(k, diff) + ' further from ') + label : P.unit === 'm' ? fmt(Math.abs(Math.round(diff / 10) * 10)) + ' m ' + (diff > 0 ? 'higher terrain' : 'lower terrain') : (b > 0 && a / b >= 1.5 ? fmt(a / b, 1) + '× as many ' : b > 0 && b / a >= 1.5 ? fmt(b / a, 1) + '× fewer ' : (diff > 0 ? fmtInt(diff) + ' more ' : fmtInt(-diff) + ' fewer ')) + label;
    rows.push('<li class="' + (better == null ? '' : ((diff < 0) === (better < 0) ? 'up' : 'down')) + '">' + esc(txt) + '</li>');
  }
  d('pop', 'residents'); d('pop10', 'people within 10 km'); d('city', 'a big city', -1); d('rail', 'a railway line', -1); d('lake', 'a large lake', -1); d('coast', 'the sea', -1); d('alt', 'terrain');
  var xa = placeX(r), xb = placeX(h);
  var sd = fin(xa.overall) && fin(xb.overall) ? xa.overall - xb.overall : null;
  var sdr = sd != null ? Math.round(sd) : null;
  return '<div class="homecard"><b>🏠 ' + esc(r.name) + ' against your home, ' + esc(h.name) + '</b>' + (sdr != null ? ' <span class="delta ' + (sdr >= 0 ? 'good' : 'bad') + '">' + (sdr === 0 ? 'same score' : esc(r.name) + ' scores ' + Math.abs(sdr) + (sdr > 0 ? ' more' : ' less')) + '</span>' : '') + (rows.length ? '<ul>' + rows.slice(0, 6).join('') + '</ul>' : '<p class="small muted">Very similar on the basics.</p>') + '</div>';
}
function lookalikesHTML(r) {
  var tw = (r.x && r.x.twin) || [];
  if (!tw.length) return '';
  return '<section class="sec"><h3>Look-alikes ' + (isWorld(r.country) ? 'in other countries' : 'elsewhere in Europe') + '</h3><p class="sub">The places most similar in size, surroundings, terrain and water. One per country.</p><div class="alts">' + tw.map(function (id) { return '<button class="alt" type="button" data-goto="' + esc(id) + '"><span data-twin="' + esc(id) + '"><b>' + esc(TWIN_NAMES[id] || id) + '</b></span><span class="small muted">open</span></button>'; }).join('') + '</div></section>';
}
function neighboursHTML(r) {
  if (!fin(r.lat) || !SHARD) return '';
  var list = SHARD.records.filter(function (o) { return o.id !== r.id && fin(o.lat); }).map(function (o) { return { r: o, d: km([r.lon, r.lat], [o.lon, o.lat]) }; }).filter(function (o) { return o.d <= 12; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 12);
  if (!list.length) return '';
  return '<section class="sec"><h3>Next door</h3><p class="sub">Municipalities within 12 km. ' + TAP + ' one to open it.</p><div class="pills">' + list.map(function (o) { var y = RES && RES.byId[o.r.id]; return '<button class="chip" type="button" data-id="' + esc(o.r.id) + '">' + esc(o.r.name) + ' <span class="muted">' + fmt(o.d, 0) + ' km</span>' + (y ? ' <b>' + Math.round(y.overall) + '</b>' : '') + '</button>'; }).join('') + '</div></section>';
}
function renderPlace() {
  var el = $('#place'), r = selected();
  if (!r) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); document.body.classList.remove('place-open'); return; }
  el.classList.add('open'); el.removeAttribute('aria-hidden'); document.body.classList.add('place-open');
  var x = placeX(r), p = profileDef(S.profile), ranked = RES && RES.byId[r.id];
  var why = ranked ? '' : (function () { var s = ENGINE.scoreRaw(r, S.profile, 55, S.cc); if (!s) return 'Not ranked for this profile: it needs a few more comparable figures here.'; var w = ENGINE.eligibilityFail(r, S.profile, S.cc); if (w) return 'Not ranked for ' + p.name + ': it misses the ' + plainReason(w) + '.'; if (!inScope(r)) return 'Outside the current scope.'; if (!passFilters(r)) return 'Hidden by your filters.'; return ''; })();
  var mapsQ = encodeURIComponent(r.name + ', ' + countryName(r.country));
  var osm = fin(r.lat) ? 'https://www.openstreetmap.org/?mlat=' + r.lat + '&mlon=' + r.lon + '#map=12/' + r.lat + '/' + r.lon : 'https://www.openstreetmap.org/search?query=' + mapsQ;
  var f = placeFacts(r), dk = depthKind(r.country), tab = S.ptab || 'overview';
  var isHome = S.home === r.id;
  var acts = saveBtnL(r.id) + cmpBtn(r.id) + '<button class="icon-btn" type="button" data-sethome="' + esc(r.id) + '" aria-pressed="' + isHome + '" aria-label="' + (isHome ? 'This is your home' : 'Set as my home') + '" title="' + (isHome ? 'Your home' : 'Set as my home') + '">🏠</button><button class="icon-btn" type="button" data-share aria-label="Share link" title="Share">' + ICON.share + '</button>';
  var panels = {
    score: '<div data-scslot="' + esc(r.id) + '"><div class="skeleton"><i></i><i></i></div></div>',
    overview: storyHTML(r, x) +
      '<section class="sec"><h3>Decision facts</h3><div class="why">' + catBars(x) + '<div><p style="margin:0 0 6px">' + (ranked ? '<b>#' + ranked.rank + '.</b> ' : '') + esc(cardCopy(x)) + '</p><div class="small muted">Profile: ' + esc(p.name) + '. ' + esc(p.intro || '') + '</div>' + (languageSensitive() ? '<div class="small" style="margin-top:4px">Language reality: ' + esc(languageText(r)) + '</div>' : '') + '</div></div>' + trendChipsInline(r) + '</section>' +
      lotteryHTML(r) +
      '<section class="sec"><h3>Local explainer</h3><p class="sub">' + (isWorld(r.country) ? 'Place' : 'Municipality') + ' and ' + esc(areaKind(r.country).toLowerCase()) + ' context. Text and images never affect the score.</p><div class="cards2">' +
      '<article class="ctx"><div class="cv" data-story-photo="' + esc(r.id) + '"><span>' + (isWorld(r.country) ? 'Place' : 'Municipality') + '</span></div><div class="cb"><div class="wiki" data-wiki="' + esc(r.id) + '"></div>' + (placeCurated(r) ? storyParagraphs(r) : storyParagraphs(r).slice(1)).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
      '<div class="pills"><span class="chip">' + fmtInt(r.popNow) + ' residents</span><span class="chip">' + esc(languageLabel(r)) + '</span><span class="chip">' + esc(sizeLabel(r)) + '</span>' + (r.country === 'CH' ? '<span class="chip">' + esc(settingLabel(r)) + '</span>' : '') + '</div>' +
      (f.sights && f.sights.length ? '<p class="small" style="margin-top:8px"><b>Known for:</b> ' + esc(f.sights.join(', ')) + '</p>' : '') +
      '<div class="sights" data-sights="' + esc(r.id) + '"></div>' +
      (f.sources && f.sources.length ? '<p class="small">Curated local checks: ' + f.sources.map(function (s) { return '<a href="' + esc(s[1]) + '" target="_blank" rel="noopener">' + esc(s[0]) + '</a>'; }).join(', ') + '</p>' : '') + '</div></article>' +
      '<article class="ctx"><div class="cv" data-region-photo="' + esc(r.id) + '"><span>' + esc(localKind(r.country)) + ': ' + esc(localAreaOf(r)) + '</span></div><div class="cb">' + regionParagraphs(r).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '<div class="pills"><span class="chip">' + esc(localAreaOf(r)) + '</span><span class="chip">' + esc(languageLabel(r)) + '</span><span class="chip">' + (r.country === 'CH' ? 'Swiss canton context' : isWorld(r.country) ? localKind(r.country) + ' context' : 'European local region') + '</span></div><div class="wiki" data-wiki-region="' + esc(r.id) + '"></div></div></article></div></section>',
    photos: '<section class="sec"><h3>Photos in and around ' + esc(r.name) + '</h3><p class="sub">Taken within a few kilometres, from Wikimedia Commons. ' + TAP + ' a photo for the author and licence.</p><div class="pgrid" data-pgrid="' + esc(r.id) + '"><div class="skeleton"><i></i><i></i></div></div></section><div data-gallery="' + esc(r.id) + '"></div>',
    facts: factsTableHTML(r) + '<section class="sec"><h3>The wider region at a glance</h3><div data-regstat="' + esc(r.id) + '"><div class="skeleton"><i></i></div></div></section>' + accessHTML(r) + '<div data-radar="' + esc(r.id) + '"></div>' + trendsHTML(r) + companyHTML(r) + breakdownHTML(x),
    around: '<section class="sec"><h3>Everyday life within walking distance</h3><div data-amen="' + esc(r.id) + '"><div class="skeleton"><i></i></div></div></section>' +
      '<section class="sec"><h3>Programmes in this country</h3><div data-prog></div></section>' +
      '<section class="sec"><h3>Infrastructure and industry nearby</h3><p class="sub">Seaports, rail-road terminals, chemical parks and refineries, nuclear power stations and learning cities within 60 km (straight line).</p><div data-fac="' + esc(r.id) + '"><div class="skeleton"><i></i></div></div></section>' +
      '<section class="sec"><h3>Worth a look nearby</h3><p class="sub">Well-known places within about 12 km, from Wikidata, most famous first.</p><div class="nearby" data-nearby="' + esc(r.id) + '"><div class="skeleton"><i></i><i></i></div></div></section>' +
      '<section class="sec"><h3>Weather through the year</h3><div data-clim="' + esc(r.id) + '"><div class="skeleton"><i></i></div></div></section>' +
      neighboursHTML(r) + crossBorderHTML(r) + '<div data-contact="' + esc(r.id) + '"></div>',
    similar: lookalikesHTML(r) + comparablesHTML(x) + '<p class="small muted">To put places side by side, tick <b>Compare</b> on two or three of them. They stay on your shortlist.</p>',
    data: allDataHTML(r)
  };
  var html =
    '<div class="place-top"><button class="icon-btn" type="button" data-closeplace aria-label="Close place">' + ICON.back + '</button><span class="grow small muted pt-n"><b>' + esc(r.name) + '</b> · ' + (ranked ? '#' + ranked.rank + ' · ' : '') + esc(p ? p.name : '') + '</span>' + acts + '</div>' +
    '<div class="scroll" id="placescroll"><div class="ph-hero" data-hero="' + esc(r.id) + '" data-postcard="' + esc(r.id) + '" data-w="480" data-h="240"><div class="shade"></div><button class="ph-count" type="button" data-ptab="photos" hidden>📷 <span></span></button><div class="ttl"><span class="ctry">' + flagImg(r.country, 12) + ' ' + esc(countryName(r.country)) + '</span><h2>' + esc(r.name) + '</h2>' + (r.latin ? '<div class="latin">' + esc(r.latin) + '</div>' : '') + '<div class="sub">' + esc(localAreaOf(r)) + ', ' + popLabel(r) + '</div></div></div>' +
    '<div class="pstrip" data-pstrip="' + esc(r.id) + '"></div>' +
    '<div class="pbody">' +
    '<div class="ids" data-ids="' + esc(r.id) + '"><button type="button" class="arms-auto" data-arms="' + esc(r.id) + '" aria-label="Coat of arms of ' + esc(r.name) + '">' + placeEmblemHTML(r) + '</button>' + flagImg(r.country) + '</div>' +
    '<div class="scorebox">' + scoreRing(x.overall, 96) +
    '<div class="metrics">' +
    cardMetricHTML(r, x, { reason: why || 'Outside this ranking or eligibility unresolved' }) +
    '</div></div>' +
    '<p class="nz-note nz-note-1" role="note">General information, not advice. <a href="/legal/#disclaimer">Limits</a></p>' + (NZ_CNOTE[r.country] || '') +
    (why ? '<p class="small" style="margin:0;color:var(--bad)">' + esc(why) + '</p>' : '') +
    propertyContextHTML(r, true) + whyHTML(r, x) + '<div data-kfslot="' + esc(r.id) + '"></div>' + evidenceHTML(r, x) + snacksHTML(r) + aroundHereHTML(r) + homeDeltaHTML(r) +
    '<div class="ptabs" role="tablist" aria-label="Place sections">' + PTABS.map(function (t) { return '<button type="button" role="tab" data-ptab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    PTABS.map(function (t) { return '<div class="ppanel" role="tabpanel" data-pp="' + t[0] + '"' + (t[0] === tab ? '' : ' hidden') + '>' + panels[t[0]] + '</div>'; }).join('') +
    '<div class="actions"><button class="btn btn-sm" type="button" data-booklet>' + ICON.doc + 'PDF booklet</button><button class="btn btn-sm" type="button" data-print>' + ICON.print + 'Print profile</button><a class="btn btn-sm" href="' + osm + '" target="_blank" rel="noopener">' + ICON.map + 'OpenStreetMap</a><a class="btn btn-sm" href="https://www.google.com/maps/search/?api=1&query=' + mapsQ + '" target="_blank" rel="noopener">' + ICON.pin + 'Google Maps</a>' + '<a class="btn btn-sm" hidden data-pagelink="' + esc(r.id) + '">' + ICON.ext + 'Place page</a>' + '</div>' +
    '<p class="small muted">Photos, flags, coats of arms, public text, contact links and sights never affect the score. Data: ' + esc(isWorld(r.country) ? 'GeoNames places and population (CC BY 4.0); regions Natural Earth admin-1' : (r.country === 'CH' ? 'Swiss FSO regional portraits, ESTV tax burden, Eurostat GISCO LAU' : 'Eurostat GISCO LAU ' + ((META.population || {}).year || 2024) + (r.country === 'AT' ? ', Statistics Austria' : '')) + '; locations EDJNet LAU centres') + '; airports OurAirports; coastline, lakes, rivers, railways, roads and ports Natural Earth; terrain Mapzen; climate zones Köppen-Geiger (Rubel et al. 2017).</p>' +
    '</div></div>' +
    '<div class="place-actions">' + saveBtnL(r.id) + cmpBtn(r.id) + '<button class="icon-btn" type="button" data-sethome="' + esc(r.id) + '" aria-pressed="' + isHome + '" aria-label="' + (isHome ? 'This is your home' : 'Set as my home') + '">🏠</button><button class="icon-btn" type="button" data-share aria-label="Share link">' + ICON.share + '</button><button class="btn btn-sm btn-primary pa-cmp" type="button" data-opencmp' + (S.compare.length < 2 ? ' hidden' : '') + '><span>Compare <span class="n">' + S.compare.length + '</span></span></button></div>';
  el.innerHTML = html;
  scrollHome($('#placescroll'));
  hydratePostcards(el); countUp(el);
  hydratePlace(r); linkPage(r); hydratePlaceMore(r);
  resolveTwinNames((r.x && r.x.twin) || [], el);
  if (tab === 'data') adHydrate(r);
  if (tab === 'score') scHydrate(r);
  kfHydrate(r);
}
function aroundHereHTML(r) {
  if (!fin(r.lat)) return '';
  var m = r.x && r.x.metro;
  return '<div class="aroundhere"><span class="small muted">Explore around ' + esc(r.name) + ':</span>' + [10, 25, 50].map(function (k) { return '<button class="chip" type="button" data-near="' + esc(r.id) + '|' + k + '">' + k + ' km</button>'; }).join('') + (m ? '<button class="chip" type="button" data-near="' + esc(m) + '|M">Greater ' + esc(m) + '</button>' : '') + '</div>';
}
function setPlaceTab(t) {
  S.ptab = t; pushHash(true);
  $$('#place [data-ptab][role="tab"]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.ptab === t); });
  $$('#place .ppanel').forEach(function (p) { p.hidden = p.dataset.pp !== t; });
  if (t === 'data' && selected()) adHydrate(selected());
  if (t === 'score' && selected()) scHydrate(selected());
  var tabs = $('#place .ptabs'); if (tabs && $('#placescroll')) { var top = tabs.offsetTop - 8; if ($('#placescroll').scrollTop > top) $('#placescroll').scrollTop = top; }
}
function hydratePlaceMore(r) {
  // 2.15: own reference list (no third-party request), so it also loads when external content is off
  moreLoad().then(function (X) { X.facilitiesHTML(r).then(function (h) { if (S.selected !== r.id) return; var el = $('#place [data-fac]'); if (el) el.innerHTML = h; }); X.programmesHTML(r).then(function (h) { var el = $('#place [data-prog]'); if (el && S.selected === r.id) { if (h) el.innerHTML = h; else el.closest('.sec').remove(); } }); }, function () {});
  if (!extOn()) { ['[data-pgrid]', '[data-nearby]', '#place [data-clim]', '#place [data-amen]', '#place [data-regstat]'].forEach(function (q) { var el = $(q); if (el) el.innerHTML = EXT_OFF_HTML; }); var st = $('[data-pstrip]'); if (st) st.remove(); return; }
  var id = r.id; function still() { return S.selected === id; }
  photosFor(r).then(function (list) {
    if (!still()) return;
    var strip = $('[data-pstrip]'), grid = $('[data-pgrid]'), cnt = $('#place .ph-count');
    if (list.length) {
      if (strip) strip.innerHTML = photoStripHTML(list.slice(0, 10), id);
      if (grid) grid.innerHTML = list.map(function (p, i) { return '<figure><button type="button" data-photo-open="' + i + '" data-photo-of="' + esc(id) + '"><img src="' + esc(p.src) + '" alt="' + esc(p.title || r.name) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer"></button><figcaption>' + esc(creditText(p)) + '</figcaption></figure>'; }).join('');
      if (cnt) { cnt.hidden = false; cnt.querySelector('span').textContent = list.length; }
      var hero = $('#place [data-hero]'); if (hero && !hero.querySelector('img') && list[0]) setImg(hero, list[0].src, r.name);
      if (hero && list[0] && !hero.querySelector('.credit')) { var c = document.createElement('a'); c.className = 'credit'; c.href = list[0].page || '#'; c.target = '_blank'; c.rel = 'noopener'; c.textContent = list[0].author ? '© ' + list[0].author + (list[0].licence ? ', ' + list[0].licence : '') : 'Wikimedia Commons'; hero.appendChild(c); }
    } else {
      if (strip) strip.remove();
      if (grid) grid.innerHTML = list.failed ? '<p class="small muted">Photos could not be loaded right now (Wikimedia Commons did not answer). <button class="linkbtn" type="button" data-retry>Try again</button></p>' : '<p class="small muted">No openly licensed photos were found within a few kilometres. The map postcard above shows the outline instead.</p>';
    }
  });
  nearbyFor(r).then(function (list) {
    if (!still()) return; var el = $('[data-nearby]'); if (!el) return;
    el.innerHTML = list.length ? '<div class="nb">' + list.map(function (o) { return '<a class="nbi" href="https://www.wikidata.org/wiki/' + esc(o.id) + '" target="_blank" rel="noopener"><img src="' + esc(o.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer"><span><b>' + esc(o.name) + '</b>' + (o.whs ? '<em class="whs">UNESCO World Heritage</em>' : '') + '<small>' + esc((o.types[0] || '').replace(/^./, function (c) { return c.toUpperCase(); })) + (o.types[0] ? ' · ' : '') + fmt(o.d, 1) + ' km</small></span></a>'; }).join('') + '</div><p class="small muted">Photos via Wikimedia Commons; open an item for its licence.</p>' : list.failed ? '<p class="small muted">Notable places could not be loaded right now (Wikidata did not answer). <button class="linkbtn" type="button" data-retry>Try again</button></p>' : '<p class="small muted">Nothing widely documented within 12 km. Quiet places have their charm.</p>';
  });
  climateFor(r).then(function (c) {
    if (!still()) return; var el = $('#place [data-clim]'); if (!el) return;
    el.innerHTML = c ? climateChart(c) + '<div class="clegend"><span><i style="background:var(--amber)"></i>Average daily high</span><span><i style="background:var(--blue)"></i>Average nightly low</span><span><i style="background:var(--blue);opacity:.3"></i>Rain per month</span></div><p class="small">' + esc(climateSummary(c)) + '</p><p class="small muted">NASA POWER climatology for the surrounding area (about 50 km grid), public domain. Valleys and slopes can differ.</p>' : '<p class="small muted">Monthly weather could not be loaded right now (NASA POWER did not answer). <button class="linkbtn" type="button" data-retry>Try again</button>' + (climateOf(r) ? '<br>Climate type: ' + esc(climateOf(r).name) + ', ' + esc(climateOf(r).text) + '.' : '') + '</p>';
  });
  // everyday life nearby and the regional snapshot load with the on-demand module (moved out of the start page in 2.10.1)
  moreLoad().then(function (X) {
    X.amenitiesFor(r).then(function (a) { if (!still()) return; var el = $('#place [data-amen]'); if (el) el.innerHTML = X.amenitiesHTML(r, a); });
    X.regionStatsFor(r).then(function (l) { if (!still()) return; var el = $('#place [data-regstat]'); if (el) el.innerHTML = X.regionStatsHTML(r, l); });
  }, function () {});
  wdFacts(r).then(function (f) {
    if (!still()) return; var ul = $('[data-nice]'); if (!ul) return;
    wdFactLines(f).forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
  });
}
function trendChipsInline(r) { var t = trendLine(r); return t ? '<div class="small muted" style="margin-top:6px">' + esc(t) + '</div>' : ''; }
var PAGES_P = null;
function linkPage(r) {
  if (!PAGES_P) PAGES_P = getJSON('/data/pages.json?v=' + VERSION).catch(function () { return {}; });
  PAGES_P.then(function (m) { var a = $('[data-pagelink="' + CSS.escape(r.id) + '"]'); if (a && m[r.id]) { a.href = m[r.id]; a.hidden = false; } });
}

function catBars(x) {
  var w = ENGINE.weightsFor(x.r, S.profile), c = x.catScores || ENGINE.categories(x.r);
  var keys = Object.keys(w).filter(function (k) { return !(k === 'coast' && !coastRelevant(x.r)); }).sort(function (a, b) { return w[b] - w[a]; });
  return '<p class="cb-legend small muted">Bar = score out of 100 · small number = how much this profile weighs it · tap a bar to see what is in it</p><div class="catbars" aria-label="Category scores for this profile">' + keys.map(function (k) {
    var v = c[k];
    return '<div role="button" tabindex="0" aria-expanded="false" data-catopen="' + k + '" title="' + esc(catLabel(k)) + ', weight ' + w[k] + ': show the measures behind it"><b>' + (fin(v) ? Math.round(v) : '–') + '</b><span class="b">' + (fin(v) ? '<i style="height:' + Math.max(4, v) + '%;background:' + scoreColor(v) + '"></i>' : '') + '</span><span>' + esc(shortCat(k)) + '</span><span class="w">×' + w[k] + '</span></div>';
  }).join('') + '</div><div class="catdetail" data-catdetail hidden></div>';
}

function popLabel(r) {
  var t = r.trend && r.trend.annual_population, last = t && t[t.length - 1];
  return last ? fmtInt(last.population) + ' residents (' + last.year + ')' : fmtInt(r.popNow) + ' residents';
}
