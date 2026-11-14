/* The place story: key facts as small snacks, then the good, the bad, the unusual, the interesting and the nice to know.
   Written from the data, in plain words. Templates rotate per place so two places never read the same. */
var DEMONYM = { CH: 'Swiss', DE: 'German', AT: 'Austrian', FR: 'French', IT: 'Italian', ES: 'Spanish', PT: 'Portuguese', NL: 'Dutch', BE: 'Belgian', LU: 'Luxembourg', LI: 'Liechtenstein', UK: 'British', IE: 'Irish', DK: 'Danish', SE: 'Swedish', NO: 'Norwegian', FI: 'Finnish', IS: 'Icelandic', EE: 'Estonian', LV: 'Latvian', LT: 'Lithuanian', PL: 'Polish', CZ: 'Czech', SK: 'Slovak', HU: 'Hungarian', SI: 'Slovenian', HR: 'Croatian', RS: 'Serbian', MK: 'North Macedonian', AL: 'Albanian', EL: 'Greek', BG: 'Bulgarian', RO: 'Romanian', CY: 'Cypriot', MT: 'Maltese' };
function demonym(cc) { return DEMONYM[cc] || countryName(cc); }
function hashStr(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function pick(arr, seed) { return arr[hashStr(seed) % arr.length]; }
function fill(t, o) { return t.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : ''; }); }
function nWord(n) { return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || fmtInt(n); }
function pctTxt(p) { return p >= 99 ? '99' : p <= 1 ? '1' : String(p); }

/* ---------- snacks: the six things you want to know first ---------- */
function snacks(r) {
  var out = [], x = r.x || {}, fr = r.factorRaw || {}, g = growth5(r), t = terrainOf(r), c = climateOf(r), geo = r.geo || {};
  out.push({ i: '👥', k: 'Residents', v: fmtInt(r.popNow), s: g == null ? '' : (g > 0.3 ? '▲ ' : g < -0.3 ? '▼ ' : '') + signed(g, 1) + '% in 5 years', tone: g == null ? '' : g > 0.3 ? 'good' : g < -2 ? 'bad' : '' });
  if (t) out.push({ i: t.cls === 'flat' ? '🌾' : t.cls === 'hills' ? '⛰️' : '🏔️', k: 'Terrain', v: t.name, s: 'around ' + fmt(Math.round(t.alt / 10) * 10) + ' m on average' });
  if (c) out.push({ i: c.group === 'med' ? '☀️' : c.group === 'cold' ? '❄️' : c.group === 'dry' ? '🌵' : '🌦️', k: 'Climate', v: c.name, s: c.code });
  var water = waterSnack(r); if (water) out.push(water);
  if (fin(fr.geo_major_city_km)) out.push({ i: '🏙️', k: 'Big city', v: fr.geo_major_city_km === 0 ? 'This is one' : pfmt('city', fr.geo_major_city_km), s: fr.geo_major_city_km === 0 ? '100,000+ residents' : 'to a city of 100,000+' });
  if (fin(x.rail_km)) out.push({ i: '🚆', k: 'Railway', v: pfmt('rail', x.rail_km), s: 'to a main line', tone: x.rail_km < 2 ? 'good' : x.rail_km > 15 ? 'bad' : '' });
  var sw = sunDay(r, false); if (sw && sw.set != null) out.push({ i: '🌅', k: 'Winter sunset', v: clock(sw.set), s: pfmt('dayw', sw.len) + ' of daylight on 21 Dec' });
  if (fin(fr.geo_hub_airport_km)) out.push({ i: '✈️', k: 'Hub airport', v: pfmt('air', fr.geo_hub_airport_km), s: geo.hubAirport || '' });
  if (fin(x.border_km) && x.border_km < 40 && x.border) out.push({ i: '🛂', k: 'Border', v: pfmt('border', x.border_km), s: 'to ' + x.border });
  return out;
}
function waterSnack(r) {
  var x = r.x || {}, sea = (r.factorRaw || {}).geo_coast_km;
  var sn = x.sea || 'the coast';
  if (fin(sea) && sea <= 10) return { i: '🌊', k: 'Sea', v: sea < 2 ? 'On the coast' : pfmt('coast', sea), s: sea < 2 ? sn : 'to ' + sn, tone: 'good' };
  if (fin(x.lake_km) && x.lake_km <= 8 && x.lake) return { i: '💧', k: 'Lake', v: x.lake_km < 1 ? 'On the shore' : pfmt('lake', x.lake_km), s: x.lake, tone: 'good' };
  if (fin(sea) && sea <= 40) return { i: '🌊', k: 'Sea', v: pfmt('coast', sea), s: 'to ' + sn };
  if (fin(x.river_km) && x.river_km <= 3 && x.river) return { i: '🏞️', k: 'River', v: x.river, s: x.river_km < 1 ? 'runs through or past it' : pfmt('river', x.river_km) + ' away' };
  return null;
}
function snacksHTML(r) {
  return '<div class="snacks">' + snacks(r).slice(0, 8).map(function (s) { return '<div class="snack' + (s.tone ? ' ' + s.tone : '') + '"><span class="si" aria-hidden="true">' + s.i + '</span><span class="sk">' + esc(s.k) + '</span><b>' + esc(s.v) + '</b>' + (s.s ? '<small>' + esc(s.s) + '</small>' : '') + '</div>'; }).join('') + '</div>';
}
function snackLine(r) {
  var bits = [], t = terrainOf(r), w = waterSnack(r), x = r.x || {};
  if (t && t.cls !== 'flat') bits.push(t.name);
  if (w) bits.push(w.k === 'River' ? w.v : w.k + ' ' + w.v.toLowerCase());
  if (fin(x.rail_km) && x.rail_km < 2) bits.push('rail ' + pfmt('rail', x.rail_km));
  if (bits.length < 2 && climateOf(r)) bits.push(climateOf(r).name);
  return bits.length ? '<div class="snackline">' + bits.slice(0, 3).map(function (b) { return '<span>' + esc(b) + '</span>'; }).join('') + '</div>' : '';
}

/* ---------- the story ---------- */
var STORY_T = {
  goodCat: [
    '{Ev}. In this profile that counts toward {catl} ({score}/100).',
    '{Ev}, which lifts {catl} to {score} out of 100.',
    'For {who}, a plus: {ev}. It counts toward {catl}.',
    '{Ev}. That is the main reason {catl} scores {score}.'
  ],
  badCat: [
    '{Ev}, which holds {catl} back ({score}/100).',
    'The weaker side is {catl} ({score}/100): {ev}.',
    '{Ev}, so {catl} only reaches {score}.'
  ],
  rare: [
    '{Phrase} than {p}% of {dem} {units}.',
    'Few {dem} places match this: {phrase} than {p}% of them.',
    'Rare for {country}: {phrase} than {p}% of its {units}.'
  ],
  twin: [
    'Its closest match elsewhere is {t1}, with {t2} and {t3} not far behind. Similar size, surroundings and terrain.',
    'If you like it here, look at {t1}. Places like {t2} and {t3} share the same size, setting and terrain.',
    'Look-alikes elsewhere: {t1}, {t2} and {t3} come closest on size, surroundings and terrain.'
  ],
  light: ['On the shortest day the sun is up for {dw} and sets around {sw}. In late June it sets around {ss}.', 'Winter light: {dw} of daylight and sunset near {sw} in late December. Summer evenings stay bright until about {ss}.', 'Daylight runs from {dw} in December to {ds} in June; the latest summer sunsets come around {ss}.'],
  land: ['The landscape here belongs to {theland}.', 'Geographically, this is part of {theland}.', '{Theland} shapes the views and the weather here.'],
  metro: ['It counts as part of Greater {m}, {d} from the centre.', 'Greater {m} starts here: the city centre is {d} away.'],
  lakeOn: ['It sits on {lake}.', '{lake} is right there, under a kilometre away.', 'The shore of {lake} is part of daily life here.'],
  lakeNear: ['{lake} is {d} away.', 'For a swim, {lake} is the nearest large lake, {d} away.'],
  river: ['The {river} runs {d} from the centre.', 'The {river} passes {d} away.'],
  riverOn: ['The {river} runs through or right past it.', 'This is a {river} town: the river passes within a kilometre.'],
  border: ['{border} starts {d} away, close enough for shopping, work or a different language on the doorstep.', 'The border with {border} is {d} away.', 'Cross into {border} in {d}.'],
  neighboursMany: ['{n} other {mun} lie within 10 km, home to {p} people in all. It is a busy patchwork rather than a standalone town.', 'Dense surroundings: {p} people live within 10 km, spread over {n} {mun}.'],
  neighboursFew: ['Only {nw} other {mun} within 10 km. Most errands mean a drive.', 'Quiet surroundings: {nw} neighbouring {mun} within 10 km and {p} people in total.'],
  capital: ['{cap} is {d} away.', 'The capital, {cap}, is {d} away.'],
  capitalHere: ['This is where the capital is.'],
  climate: ['Climate type {code}, {name}: {text}.', 'Expect {text} ({name}, Köppen {code}).'],
  airport: ['{air} is the nearest hub airport, {d} away.', 'Flights: {air}, {d}.'],
  port: ['The nearest seaport is {port}, {d} away.']
};
/* plain words for each measured factor: what a good and a bad value look like */
var FPLAIN = {
  population_growth_pct: ['a growing population', 'a shrinking or flat population'], at_population_growth_5y: ['a growing population', 'a shrinking or flat population'], at_population_yoy: ['growth in the latest year', 'a decline in the latest year'],
  density_people_km2: ['a comfortable density', 'a density far from the comfortable middle'],
  youth_share_pct: ['many children and young people', 'few children and young people'], at_youth_share: ['many children and young people', 'few children and young people'],
  working_age_share_pct: ['a large working-age population', 'a small working-age population'], at_working_age_share: ['a large working-age population', 'a small working-age population'],
  elderly_share_balance: ['a balanced share of people over 65', 'an unusual share of people over 65'], at_elderly_share_balance: ['a balanced share of people over 65', 'an unusual share of people over 65'],
  birth_rate_per_1000: ['a high birth rate', 'a low birth rate'], divorce_rate_per_1000: ['a low divorce rate', 'a high divorce rate'],
  household_size_balance: ['family-sized households', 'household sizes away from the family norm'],
  green_open_land_share: ['plenty of green and open land', 'little green or open land'], wooded_area_share: ['plenty of forest', 'little forest'], settlement_area_balance: ['a balanced built-up area', 'a built-up area out of balance'],
  jobs_per_1000_residents: ['many local jobs', 'few local jobs'], workplaces_per_1000_residents: ['many local businesses', 'few local businesses'], tertiary_jobs_share: ['a strong service sector', 'a small service sector'], secondary_jobs_balance: ['a balanced share of industrial jobs', 'an unbalanced share of industrial jobs'],
  vacancy_rate_balance: ['a healthy share of empty flats', 'a housing market that is very tight or very loose'], new_housing_per_1000: ['a lot of new housing being built', 'little new housing being built'],
  low_social_assistance_rate: ['a low social-assistance rate', 'a high social-assistance rate'],
  single_income_tax_100k: ['low income tax for a single person on CHF 100k', 'high income tax for a single person on CHF 100k'], single_income_tax_150k: ['low income tax for a single person on CHF 150k', 'high income tax for a single person on CHF 150k'],
  family_income_tax_100k: ['low income tax for a family on CHF 100k', 'high income tax for a family on CHF 100k'], retiree_tax_100k: ['low tax on a CHF 100k pension', 'high tax on a CHF 100k pension'],
  wealth_tax_1m: ['low wealth tax on CHF 1 million', 'high wealth tax on CHF 1 million'], wealth_tax_5m: ['low wealth tax on CHF 5 million', 'high wealth tax on CHF 5 million'],
  commuter_major_city_access: ['easy access to a major job centre', 'a long way to a major job centre'], student_campus_access: ['a university within reach', 'a long way to a university']
};
function catEvidence(r, cat, good) {
  var best = null;
  ENGINE.allFactors.forEach(function (f) {
    if (f.category !== cat || /^common_|^geo_/.test(f.id) || f.score_role === 'historical_context') return;
    var allowed = META.config.evidenceCategoryAllow && META.config.evidenceCategoryAllow[cat]; if (allowed && allowed.indexOf(f.id) < 0) return;
    var v = ENGINE.factorValue(r, f); if (!fin(v)) return;
    var raw = (r.factorRaw || {})[f.id], lv = (r.factorLevel || {})[f.id] || 0, loc = lv === 0 || lv === 3 ? 1 : 0;
    if (lv === 9) return;   // a national figure is the same for every place in the country: never evidence for one place
    // local evidence first: a regional or national figure is the same for every place around, so it only leads when nothing local exists
    if (!best || loc > best.loc || (loc === best.loc && (good ? v > best.v : v < best.v))) best = { f: f, v: v, raw: raw, loc: loc, lv: lv };
  });
  if (!best) return null;
  var p = Math.round(best.v), pl = FPLAIN[best.f.id], name = pl ? pl[best.v >= 50 ? 0 : 1] : best.f.name.replace(/ proxy$/i, '').replace(/ balance$/i, '').toLowerCase();
  var u = best.f.unit && !/score/.test(best.f.unit) ? best.f.unit : '';
  var rawTxt = fin(best.raw) && u === 'km' && best.raw < 0.5 ? ' (in the place itself)' : fin(best.raw) ? ' (' + fmt(best.raw, Math.abs(best.raw) < 100 ? 1 : 0) + (u ? (u.charAt(0) === '%' || u.charAt(0) === '‰' ? '' : ' ') + u : '') + ')' : '';
  if ((best.lv === 2 || best.lv === 1) && !/region|district/i.test(name)) rawTxt += ' in the region'; else if (best.lv === 3 && !/county|district/i.test(name)) rawTxt += ' in the county or district, not the municipality'; else if (best.lv === 9 && !/national/i.test(name)) rawTxt += ' nationally';
  var tp = truePct(r, best.f.id, function (x) { return ENGINE.factorValue(x, best.f); });
  if (tp == null) return name + rawTxt + ' (model score ' + p + ' of 100)';
  return name + rawTxt + (tp >= 50 ? ', better than about ' + pctTxt(tp) : ', weaker than about ' + pctTxt(100 - tp)) + '% of ' + demonym(r.country) + ' ' + unitWord(r.country);
}
function geoEvidence(r, cat) {
  var fr = r.factorRaw || {}, x = r.x || {};
  if (cat === 'mobility' || cat === 'commuter_access') { var b = []; if (fin(fr.geo_major_city_km)) b.push(fr.geo_major_city_km === 0 ? 'it is a city of 100,000+ itself' : 'a city of 100,000+ is ' + pfmt('city', fr.geo_major_city_km) + ' away'); if (fin(x.rail_km)) b.push('the nearest main railway line is ' + pfmt('rail', x.rail_km) + ' away'); if (String(r.id).split('').reduce(function (a, ch) { return a + ch.charCodeAt(0); }, 0) % 2) b.reverse(); return b.join(' and '); }
  if (cat === 'coast' && fin(shoreKm(r))) { var sk = shoreKm(r), sn2 = shoreName(r); return sk < 2 ? 'it is right on the shore of ' + sn2 : sn2.charAt(0).toUpperCase() + sn2.slice(1) + ' is ' + pfmt('coast', sk) + ' away'; }
  if (cat === 'student_access' && r.geo && r.geo.studentAnchor) return stripParen(r.geo.studentAnchor).split(',')[0] === stripParen(r.name).split(',')[0] ? 'it is a university town itself' : 'the nearest campus town is ' + r.geo.studentAnchor;
  if (cat === 'jobs' && fin(fr.geo_catchment_30km)) return fmtInt(fr.geo_catchment_30km) + ' people live within 30 km';
  var d10 = fr.geo_density10_km2;
  if (cat === 'environment' && fin(d10) && !fin(r.density)) return 'about ' + fmtInt(d10) + ' people per km² live within 10 km; this is density, not measured environmental quality';
  if (cat === 'foundation') { var g = growth5(r); if (g == null && !fin(r.density)) return 'it has ' + fmtInt(r.popNow) + ' residents' + (r.popYear ? ' (' + r.popYear + ')' : '') + (fin(d10) ? ' and about ' + fmtInt(d10) + ' people per km² within 10 km' : ''); return (g == null ? 'it has ' + fmtInt(r.popNow) + ' residents' + (r.popYear ? ' (' + r.popYear + ')' : '') : 'the population ') + (g == null ? '' : g >= 0 ? 'grew ' + fmt(g, 1) + '% in five years' : 'shrank ' + fmt(-g, 1) + '% in five years') + (fin(r.density) ? ', with ' + fmtInt(r.density) + ' residents per km²' : ''); }
  return null;
}
function storyFor(r, xr) {
  var x = xr || placeX(r), cats = x.catScores || ENGINE.categories(r), w = ENGINE.weightsFor(r, S.profile), p = profileDef(S.profile) || {};
  var seed = r.id, used = {}, out = { good: [], bad: [], unusual: [], interesting: [], nice: [] };
  function say(list, key, o, i) { var tpls = STORY_T[key].filter(function (t) { return !used[t]; }); if (!tpls.length) tpls = STORY_T[key]; var t = pick(tpls, seed + key + (i || 0)); used[t] = 1; var s = fill(t, o); list.push(s.charAt(0).toUpperCase() + s.slice(1)); }
  var dem = demonym(r.country), who = (p.name || 'this profile').toLowerCase();
  // good and bad: weighted categories with evidence
  var ranked = Object.keys(w).filter(function (k) { return fin(cats[k]) && !(k === 'coast' && !(shoreKm(r) <= 150)); }).sort(function (a, b) { return cats[b] - cats[a]; });
  var usedEv = {};
  ranked.filter(function (k) { return cats[k] >= 62; }).slice(0, 3).forEach(function (k, i) {
    // mobility has both geography and measured evidence (stations, broadband...): alternate between places so stories do not all open alike
    var alt = k === 'mobility' && (String(r.id).split('').reduce(function (a, ch) { return a + ch.charCodeAt(0); }, 0) % 2) ? catEvidence(r, k, true) : null;
    var ev = alt || geoEvidence(r, k); if (ev && /shrank/.test(ev)) ev = null; ev = ev || catEvidence(r, k, true); if (!ev || usedEv[ev]) return; usedEv[ev] = 1;
    say(out.good, 'goodCat', { cat: shortCat(k), catl: shortCat(k).toLowerCase(), name: r.name, ev: ev, Ev: ev.charAt(0).toUpperCase() + ev.slice(1), score: Math.round(cats[k]), who: who }, i);
  });
  ranked.slice().reverse().filter(function (k) { return cats[k] <= 42; }).slice(0, 2).forEach(function (k, i) {
    var ev = geoEvidence(r, k) || catEvidence(r, k, false); if (!ev || usedEv[ev] || /grew|growing/.test(ev) && !/shr/.test(ev)) return; usedEv[ev] = 1;
    say(out.bad, 'badCat', { cat: shortCat(k), catl: shortCat(k).toLowerCase(), ev: ev, Ev: ev.charAt(0).toUpperCase() + ev.slice(1), score: Math.round(cats[k]) }, i);
  });
  var fr = r.factorRaw || {}, xx = r.x || {}, g = growth5(r);
  var hh = !isBizKey(S.profile);   // household advice (noise, flight paths, schools) does not belong on a business site
  if (hh && fin(xx.mway_km) && xx.mway_km < 0.8) out.bad.push('A motorway passes within ' + pfmt('mway', xx.mway_km) + '. Handy for driving, but check traffic noise street by street.');
  if (hh && fin(fr.geo_hub_airport_km) && fr.geo_hub_airport_km < 9) out.bad.push('The hub airport is only ' + pfmt('air', fr.geo_hub_airport_km) + ' away. Look up the flight paths before you sign anything.');
  if (hh && g != null && g < -4) out.bad.push('The population fell ' + fmt(-g, 1) + '% in five years. Shops, schools and services tend to follow people out.');
  if (fin(fr.geo_major_city_km) && fr.geo_major_city_km > 70) out.bad.push('The nearest city of 100,000+ is ' + pfmt('city', fr.geo_major_city_km) + ' away, so specialist doctors, big shops and airports take planning.');
  if (g != null && g > 40) out.unusual.push('The population jumped ' + fmt(g, 0) + '% in five years. A jump this size usually means neighbouring municipalities merged into this one.');
  else if (g != null && g > 6 && out.good.length < 4) out.good.push('People are moving in: ' + signed(g, 1) + '% more residents in five years.');
  // unusual: extremes within the country
  var rare = [];
  [['alt', 'has higher surrounding terrain', 'has lower surrounding terrain'], ['relief', 'has steeper, more varied terrain', 'has flatter terrain'], ['pop10', 'has more people within 10 km', 'has fewer people within 10 km'], ['nb10', 'has more neighbours within 10 km', 'has fewer neighbours within 10 km'], ['rail', 'lies further from a main railway line', 'lies closer to a main railway line'], ['city', 'lies further from a big city', 'lies closer to a big city'], ['g5', 'is growing faster', 'is shrinking faster'], ['dens', 'is more densely settled', 'is more thinly settled'], ['area', 'covers more land', 'covers less land'], ['lake', 'lies further from any large lake', 'lies closer to a large lake'], ['border', 'lies further from a land border', 'lies closer to a land border'], ['cap', 'lies further from the capital', 'lies closer to the capital']].forEach(function (a) {
    var pc = pctOf(r, a[0]); if (pc == null) return;
    if (a[0] === 'g5' && g != null && Math.abs(g) > 40) return;
    if (pc >= 97) rare.push({ k: a[0], p: pc, phrase: a[1] });
    else if (pc <= 3) rare.push({ k: a[0], p: 100 - pc, phrase: a[2] });
  });
  rare.sort(function (a, b) { return b.p - a.p; }).slice(0, 3).forEach(function (o, i) {
    if (o.k === 'city' && /closer/.test(o.phrase) && (r.popNow >= 100000 || (r.factorRaw || {}).geo_major_city_km < 2)) return;
    say(out.unusual, 'rare', { Phrase: 'It ' + o.phrase, phrase: 'it ' + o.phrase, p: pctTxt(o.p), dem: dem, units: unitWord(r.country), country: countryName(r.country) }, i);
  });
  if (r.area_km2 && r.popNow && r.popNow / r.area_km2 < 5) out.unusual.push('Fewer than five people per km². Neighbours are a long walk away.');
  // interesting
  if (fin(xx.lake_km) && xx.lake) { if (xx.lake_km < 1) say(out.interesting, 'lakeOn', { lake: xx.lake }); else if (xx.lake_km < 15) say(out.interesting, 'lakeNear', { lake: xx.lake, d: pfmt('lake', xx.lake_km) }); }
  if (fin(xx.river_km) && xx.river && xx.river_km < 6) say(out.interesting, xx.river_km < 1 ? 'riverOn' : 'river', { river: xx.river, d: pfmt('river', xx.river_km) });
  if (fin(xx.border_km) && xx.border && xx.border_km < 30) say(out.interesting, 'border', { border: xx.border, d: pfmt('border', xx.border_km) });
  if (fin(xx.cap_km) && capitalOf(r.country)) { if (xx.cap_km < 6 && r.popNow > 50000) say(out.interesting, 'capitalHere', {}); else say(out.interesting, 'capital', { cap: capitalOf(r.country), d: pfmt('cap', xx.cap_km) }); }
  if (fin(xx.nb10)) { if (xx.nb10 >= 15) say(out.interesting, 'neighboursMany', { n: fmtInt(xx.nb10), p: fmtInt(xx.pop10), mun: unitWord(r.country, 2) }); else if (xx.nb10 === 0) out.interesting.push('No other ' + unitWord(r.country, 1) + ' lies within 10 km. Most errands mean a drive.'); else if (xx.nb10 <= 2) say(out.interesting, 'neighboursFew', { nw: nWord(xx.nb10), p: fmtInt(xx.pop10), mun: unitWord(r.country, xx.nb10) }); }
  var tw = (xx.twin || []).map(function (id) { return twinLink(id); });
  if (tw.length === 3) say(out.interesting, 'twin', { t1: tw[0], t2: tw[1], t3: tw[2] });
  // nice to know
  var c = climateOf(r); if (c && c.text) say(out.nice, 'climate', { code: c.code, name: c.name.toLowerCase(), text: c.text });
  var sw = sunDay(r, false), ss = sunDay(r, true);
  if (sw && ss && sw.set != null && ss.set != null) say(out.nice, 'light', { dw: pfmt('dayw', sw.len), sw: clock(sw.set), ds: pfmt('days', ss.len), ss: clock(ss.set) });
  else if (ss && ss.len >= 24) out.nice.push('Around midsummer the sun does not set at all here, and in midwinter it barely rises.');
  if (xx.land) { var l1 = xx.land.split(', ')[0], th = /Mountains|Alps|Apennines|Pyrenees|Plain|Delta|Riviera|Islands|Lakeland|Upland|Forest|Ardennes|Harz|Sudetes|Balkans|Massif|Peloponnese|Lofoten|Vesterålen|Cyclades|Hebrides|Vosges|Sierra|Steppe/.test(l1) ? 'the ' + l1 : l1; say(out.interesting, 'land', { theland: th, Theland: th.charAt(0).toUpperCase() + th.slice(1) }); }
  if (xx.metro && fin(xx.metro_km) && xx.metro_km > 4) say(out.nice, 'metro', { m: xx.metro, d: pfmt('metro', xx.metro_km) });
  if (r.geo && r.geo.hubAirport && fin(fr.geo_hub_airport_km)) say(out.nice, 'airport', { air: r.geo.hubAirport, d: pfmt('air', fr.geo_hub_airport_km) });
  if (fin(xx.port_km) && xx.port && xx.port_km < 60) say(out.nice, 'port', { port: xx.port, d: pfmt('port', xx.port_km) });
  out.nice.push('Everyday language: ' + languageLabel(r) + '.');
  return out;
}
var TWIN_NAMES = {};
function twinLink(id) { return '<button class="linkbtn" type="button" data-goto="' + esc(id) + '" data-twin="' + esc(id) + '">' + esc(TWIN_NAMES[id] || id.split(':')[0]) + '</button>'; }
/* lookalike names live in other countries' shards; the search index has every name */
function resolveTwinNames(ids, root) {
  var need = ids.filter(function (id) { return !TWIN_NAMES[id]; });
  var done = function () { $$('[data-twin]', root).forEach(function (b) { var id = b.dataset.twin; if (TWIN_NAMES[id]) b.innerHTML = flagImg(id.split(':')[0], 11) + ' ' + esc(TWIN_NAMES[id]); }); };
  if (!need.length) return done();
  ensureSearch().then(function () { need.forEach(function (id) { var hit = SEARCH_BY[id]; if (hit) TWIN_NAMES[id] = hit.name + ' (' + countryName(hit.cc) + ')'; }); done(); });
}
function storyHTML(r, xr) {
  var st = storyFor(r, xr);
  var why = whyReasons(r, xr); st = { good: st.good.filter(function (g) { return why.indexOf(g) < 0; }), bad: st.bad.filter(function (g) { return why.indexOf(g) < 0; }), unusual: st.unusual, interesting: st.interesting, nice: st.nice };
  var blocks = [['good', 'More good points', '👍'], ['bad', 'More to weigh', '⚠️'], ['unusual', 'The unusual', '🔎'], ['interesting', 'The interesting', '✨'], ['nice', 'Nice to know', '📌']];
  return '<div class="story">' + blocks.map(function (b) {
    var items = st[b[0]]; if (!items.length && b[0] !== 'nice') return '';
    return '<section class="st st-' + b[0] + '"><h4><span aria-hidden="true">' + b[2] + '</span>' + b[1] + '</h4><ul' + (b[0] === 'nice' ? ' data-nice="' + esc(r.id) + '"' : '') + '>' + items.map(function (t) { return '<li>' + (/<button/.test(t) ? t : esc(t)) + '</li>'; }).join('') + '</ul></section>';
  }).join('') + '</div>';
}
/* "Why it fits" in three reasons and one watch-out */
function whyReasons(r, xr) { var st = storyFor(r, xr); return st.good.slice(0, 3).concat(st.bad.slice(0, 1)); }
function whyHTML(r, xr) {
  var st = storyFor(r, xr), x = xr || placeX(r), ranked = RES && RES.byId[r.id];
  var reasons = st.good.slice(0, 3), watch = st.bad[0];
  if (!reasons.length) {
    var top = weightedCats(x, false, 2).filter(function (c) { return fin(c[1]); });
    if (top.length) reasons = ['Its best sides for this profile are ' + top.map(function (c) { return shortCat(c[0]).toLowerCase() + ' (' + Math.round(c[1]) + ')'; }).join(' and ') + ', though neither stands out strongly against the rest of ' + countryName(r.country) + '.'];
  }
  if (!reasons.length && !watch) return '';
  return '<div class="whycard"><h3>' + (ranked ? 'Why #' + ranked.rank + ' for ' + esc(profileName(S.profile).toLowerCase()) : 'How it fits ' + esc(profileName(S.profile).toLowerCase())) + '</h3>' +
    (reasons.length ? '<ul class="plus">' + reasons.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
    (watch ? '<p class="watch"><b>Watch out:</b> ' + esc(watch) + '</p>' : '') + '</div>';
}

/* 2.15.20 "What the evidence says" on every place, every profile: the rank set against what people (households) or
   firms (business) actually do. When the place's own outcome is missing, the next-best observed signal is used and named
   (regional migration, regional population change, rents as a sign of demand, older residents for retiree profiles,
   regional employment for business). Nothing is invented: every line names its measure and its level. */
var RETIRE_P = { pensioner: 1, single_pensioner: 1, early_retiree: 1, sun_retiree: 1, healthcare_first: 1 };
function evidenceLevel(r, k) { var l=(r.factorLevel||{})[k];return l===9?'country':l===3?'district or county':l===2?'region':l===1?'large region':'geographic support unresolved'; }
function observedOfRaw(r, biz) {
  var f=r.factorRaw||{},v,k;
  if(biz){ k='cluster_'+S.profile;if(fin(f[k]))return {k:k,v:f[k],lab:'Industry concentration (location quotient)',u:' location quotient',lvl:evidenceLevel(r,k),period:'',note:'Existing concentration is not new investment, business success or site feasibility. It may also be an input to this profile.'};return null; }
  var ap=r.trend&&r.trend.annual_population;
  if(r.country==='CH'&&Array.isArray(ap)){var a=ap.filter(function(x){return x.year===2019&&fin(x.population)&&x.population>0}),b=ap.filter(function(x){return x.year===2024&&fin(x.population)&&x.population>=0});
   if(a.length===1&&b.length===1)return {k:'population_2019_2024',v:100*(b[0].population/a[0].population-1),lab:'Resident population change',u:'%',lvl:'municipality',period:'2019-2024',note:'Calculated from retained annual counts. Births, deaths, migration and boundary changes can affect growth; this is not migration by profile.'}; }
  if(fin(f.common_population_growth_5y))return {k:'common_population_growth_5y',v:f.common_population_growth_5y,lab:'Population change',u:'%',lvl:evidenceLevel(r,'common_population_growth_5y'),period:'2019-2024 in the factor definition; country source period needs reconciliation',note:'All-age context, not evidence that this profile chooses the place.'};
  if(r.country==='CH'&&fin(f.population_growth_pct))return {k:'population_growth_pct',v:f.population_growth_pct,lab:'Population change',u:'%',lvl:'municipality',period:'2010-2019',note:'Historical all-age context, not profile-specific movement.'};
  if(RETIRE_P[S.profile]&&fin(f.n_age65_us))return {k:'n_age65_us',v:f.n_age65_us,lab:'Residents aged 65 and over',u:'%',lvl:evidenceLevel(r,'n_age65_us'),period:'',note:'Age share is a population stock, not pension receipt or retiree migration. It is not a ranking-validation outcome.'};
  if(fin(f.n_net_migration_region))return {k:'n_net_migration_region',v:f.n_net_migration_region,lab:'Net migration into the region',u:' (source units)',lvl:evidenceLevel(r,'n_net_migration_region'),period:'',note:'All-age regional context. Unit and period require the source contract; it cannot certify this municipality or profile.'};
  return null;
}
/* 2.15.23: exact, period-correct outcomes (Swiss annual series first; historical 2010-2019 change labelled as such;
   age share and industry quotient never called migration), plus plain words for the verdict */
var OBS_WORDS = { strongH: 'people are moving here or staying', weakH: 'people are leaving', strongB: 'firms of this kind already operate here', weakB: 'little of this industry operates here yet',
  strongA: 'many older residents already live here', weakA: 'few older residents live here' };
function observedOfDecorated(r, biz) { var o = observedOfRaw(r, biz); if (!o) return null;
  var age = /age65/.test(o.k), ind = /^cluster_/.test(o.k);
  o.sign = !age && !ind ? 1 : 0; o.strong = ind ? OBS_WORDS.strongB : age ? OBS_WORDS.strongA : OBS_WORDS.strongH; o.weak = ind ? OBS_WORDS.weakB : age ? OBS_WORDS.weakA : OBS_WORDS.weakH;
  o.lab2 = o.lab + (o.period ? ', ' + o.period : ''); return o; }
function observedOf(r, biz) { return observedOfDecorated(r, biz); }
var OBSV = {};
function evidenceHTML(r, xr) {
  var biz = !!(META.config.profiles[S.profile] || {}).business, o = observedOf(r, biz), ranked = RES && RES.byId[r.id], x = xr || placeX(r);
  var head = '<div class="evcard"><h3>What the evidence says</h3>', tail = '<div data-evslot="' + esc(r.id) + '"></div></div>';
  if (!o) return head + '<p>No observed outcome is recorded for this place yet' + (biz ? ' (no industry register or labour data).' : '.') + ' Every score below still shows the measured fact behind it.</p>' + tail;
  var k = S.cc + '|' + S.profile + '|' + o.k + '|' + (RES ? RES.scored.length : 0);
  if (!OBSV[k]) { OBSV = {}; OBSV[k] = (RES ? RES.scored : []).map(function (s) { var q = observedOf(s.r, biz); return q && q.k === o.k ? q.v : null; }).filter(fin).sort(function (a, b) { return a - b; }); }
  var v = OBSV[k], lo = 0, hi = v.length; while (lo < hi) { var m = (lo + hi) >> 1; if (v[m] < o.v) lo = m + 1; else hi = m; }
  var q = v.length > 1 ? lo / (v.length - 1) : 0.5, n = RES ? RES.scored.length : 0, rq = ranked && n ? ranked.rank / n : null, sv = o.show != null ? o.show : o.v;
  var fact = (o.lab2 || o.lab) + ': ' + (o.sign && sv > 0 ? '+' : '') + (Math.round(sv * 10) / 10).toLocaleString('en-GB') + o.u + ', ' + (q >= 0.8 ? 'among the strongest fifth' : q >= 0.6 ? 'above the middle' : q > 0.4 ? 'around the middle' : q > 0.2 ? 'below the middle' : 'among the weakest fifth') + ' of ' + fmtInt(v.length) + ' places with this measure here.' + (o.lvl !== 'place' ? ' Measured for the ' + o.lvl + ', not the place itself.' : '');
  var w = ENGINE.weightsFor(r, S.profile), tw = 0, wk; for (wk in w) tw += w[wk];
  var share = w.observed && tw ? Math.round(w.observed / tw * 100) : 0, own = o.k === 'cluster' ? 'cluster' : 'observed';
  var cls = q >= 0.6 ? 'ev-ok' : q <= 0.2 ? 'ev-lo' : 'ev-n';
  var verdict = q >= 0.6 ? 'Backed by what really happens: ' + o.strong + '.' : q <= 0.2 ? 'Weaker on what really happens: ' + o.weak + '.' : 'Observed reality is in the middle range here.';
  var counts = own === 'cluster' ? 'Existing industry counts in this score.' : share ? 'It counts ' + share + '% of this score.' : '';
  return head + '<p class="' + cls + '"><b>' + esc(verdict) + '</b> ' + esc(counts) + '</p>' + evChart(v, o.v, sv, o, q) +
    '<p class="small muted">' + (!/municipal|place/.test(o.lvl) ? esc('Measured at ' + o.lvl + ' level, not for the place itself. ') : '') + 'Agreement, not proof. <a href="/evidence-lab/">Evidence Lab</a></p>' + tail;
}

/* 2.15.22 evidence charts: where this place sits among all places with the same measure, and its rank next to its evidence */
function evChart(v, x, shown, o, q) {
  if (!v || v.length < 10) return '';
  var lo = v[Math.floor(v.length * 0.02)], hi = v[Math.floor(v.length * 0.98)]; if (!(hi > lo)) return '';
  var N = 24, bins = new Array(N).fill(0), i; v.forEach(function (y) { var b = Math.floor((Math.min(hi, Math.max(lo, y)) - lo) / (hi - lo) * N); bins[Math.min(N - 1, b)]++; });
  var mx = Math.max.apply(null, bins), W = 300, H = 64, bw = W / N, px = Math.max(2, Math.min(W - 2, (Math.min(hi, Math.max(lo, x)) - lo) / (hi - lo) * W)), svg = '';
  for (i = 0; i < N; i++) { var h = Math.max(1, bins[i] / mx * (H - 16)), mid = lo + (i + 0.5) / N * (hi - lo); svg += '<rect x="' + (i * bw + 1).toFixed(1) + '" y="' + (H - 12 - h).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + scoreColor(Math.round((i + 0.5) / N * 100)) + '" opacity=".55"/>'; }
  svg += '<line x1="' + px.toFixed(1) + '" x2="' + px.toFixed(1) + '" y1="2" y2="' + (H - 12) + '" stroke="var(--ink,#132238)" stroke-width="2"/><circle cx="' + px.toFixed(1) + '" cy="4" r="4" fill="var(--ink,#132238)"/>';
  var f = function (y) { return (o.sign && y > 0 ? '+' : '') + (Math.round(y * 10) / 10).toLocaleString('en-GB') + o.u; };
  svg += '<text x="0" y="' + (H - 1) + '" font-size="10" fill="currentColor" opacity=".7">' + esc(f(o.show != null ? -lo : lo)) + '</text><text x="' + W + '" y="' + (H - 1) + '" font-size="10" text-anchor="end" fill="currentColor" opacity=".7">' + esc(f(o.show != null ? -hi : hi)) + '</text>';
  return '<figure class="evfig"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc((o.lab2 || o.lab) + ': this place ' + f(shown) + ', higher than ' + Math.round(q * 100) + '% of places') + '">' + svg + '</svg><figcaption>' + esc((o.lab2 || o.lab).replace(/ \(.*$/, '')) + ': this place <b>' + esc(f(shown)) + '</b>, higher than ' + Math.round(q * 100) + '% of places here</figcaption></figure>';
}
function evBars(rp, q, rank, n) {
  var bar = function (lab, p, txt) { p = Math.max(0, Math.min(1, p)); return '<div class="evb"><span>' + lab + '</span><i><b style="width:' + Math.round(p * 100) + '%;background:' + scoreColor(Math.round(p * 100)) + '"></b></i><em>' + txt + '</em></div>'; };
  return '<div class="evbars">' + bar('Rank', rp, '#' + rank + ' of ' + fmtInt(n)) + bar('Evidence', q, 'top ' + Math.max(1, Math.round((1 - q) * 100)) + '%') + '</div>';
}
