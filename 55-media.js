/* More to look at: photos taken in and around the place (Wikimedia Commons, with author and licence),
   notable places nearby (Wikidata), local climate (NASA POWER) and small facts (Wikidata).
   Runtime only, cached, fail soft, never part of a score. */
var PHOTOS = {}, NEARBY = {}, CLIMATE = {}, WDFACTS = {};
function stripTags(h) { var d = document.createElement('div'); d.innerHTML = String(h || ''); return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
var PHOTO_SKIP = /\b(map|karte|carte|mapa|plan|wappen|coat[ _]of[ _]arms|blason|escudo|stemma|herb|logo|flag|fahne|diagram|chart|locator|location|position|lage|signature|svg|scan|document|seal|grafik|graph|panorama-?map|relief|topograf|satellite|orthophoto|sentinel|landsat|openstreetmap|osm|stadtplan|lageplan|grundriss|floor[ _]plan|blueprint|cadastr|kataster|schema|übersicht|overview|timetable|fahrplan|stamp|briefmarke|coin|münze|banknote|screenshot|render|rendering|icon|emblem|badge|poster|plakat)/i;
/* photos: the picture filter (no people, no black and white, nothing off-topic, no near-copies) lives in /assets/more.js */
function photoKit() { return moreLoad(); }
function photosFor(r) {
  if (PHOTOS[r.id]) return PHOTOS[r.id];
  PHOTOS[r.id] = photoKit().then(function (X) { return X.photosWith(r, X); }, function () { delete PHOTOS[r.id]; var o = []; o.failed = true; return o; });
  return PHOTOS[r.id];
}
function creditText(p) { var b = []; if (p.author) b.push(p.author); if (p.licence) b.push(p.licence); b.push('Wikimedia Commons'); return b.join(' · '); }
function photoStripHTML(list, id) {
  return list.map(function (p, i) { return '<button class="ph-item" type="button" data-photo-open="' + i + '" data-photo-of="' + esc(id) + '" aria-label="Open photo ' + (i + 1) + '"><img src="' + esc(p.src) + '" alt="' + esc(p.title || '') + '" loading="lazy" decoding="async" referrerpolicy="no-referrer"></button>'; }).join('');
}
function openLightbox(id, i) {
  if ($('#lightbox').hidden) layerPush();
  var r = BYID[id]; if (!r) return;
  photosFor(r).then(function (list) {
    var p = list[i]; if (!p) return;
    var lb = $('#lightbox');
    lb.innerHTML = '<div class="lb-in"><button class="icon-btn lb-x" type="button" data-lbclose aria-label="Close photo">' + ICON.close + '</button>' +
      (list.length > 1 ? '<button class="lb-nav prev" type="button" data-lbgo="' + ((i - 1 + list.length) % list.length) + '" data-lbid="' + esc(id) + '" aria-label="Previous photo">‹</button><button class="lb-nav next" type="button" data-lbgo="' + ((i + 1) % list.length) + '" data-lbid="' + esc(id) + '" aria-label="Next photo">›</button>' : '') +
      '<img src="' + esc(p.full || p.src) + '" alt="' + esc(p.title || r.name) + '" referrerpolicy="no-referrer"><div class="lb-cap"><b>' + esc(p.title || r.name) + '</b><span>' + esc(creditText(p)) + (p.page ? ' · <a href="' + esc(p.page) + '" target="_blank" rel="noopener">Photo page and licence</a>' : '') + '</span><span class="muted">' + (i + 1) + ' of ' + list.length + '</span></div></div>';
    lb.hidden = false; document.body.classList.add('lb-open');
    var x = lb.querySelector('[data-lbclose]'); if (x) x.focus();
  });
}
function closeLightbox() { var lb = $('#lightbox'); var was = !lb.hidden; lb.hidden = true; lb.innerHTML = ''; document.body.classList.remove('lb-open'); if (was) layerPop(); }

/* notable places nearby: Wikidata items with a photo and articles in several languages, ranked by how well known they are */
function nearbyFor(r) {
  if (NEARBY[r.id]) return NEARBY[r.id];
  if (!fin(r.lat)) return Promise.resolve([]);
  var q = 'SELECT ?item ?itemLabel ?img ?dist ?sl ?typeLabel ?whs WHERE { SERVICE wikibase:around { ?item wdt:P625 ?loc . bd:serviceParam wikibase:center "Point(' + r.lon + ' ' + r.lat + ')"^^geo:wktLiteral . bd:serviceParam wikibase:radius "' + (r.area_km2 > 80 ? 18 : 12) + '" . bd:serviceParam wikibase:distance ?dist . } ?item wdt:P18 ?img ; wikibase:sitelinks ?sl . FILTER(?sl >= 3) FILTER NOT EXISTS { ?item wdt:P1082 ?popu } OPTIONAL { ?item wdt:P31 ?type } OPTIONAL { ?item wdt:P1435 wd:Q9259 . BIND(true AS ?whs) } SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de,fr,it,es,nl,pt,pl,sv,da,cs" . } } ORDER BY DESC(?sl) LIMIT 60';
  NEARBY[r.id] = jget('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q)).then(function (j) {
    var seen = {}, out = [];
    ((j.results || {}).bindings || []).forEach(function (b) {
      var id = b.item.value; if (seen[id]) { if (b.typeLabel && !seen[id].types.includes(b.typeLabel.value)) seen[id].types.push(b.typeLabel.value); return; }
      var name = b.itemLabel && b.itemLabel.value; if (!name || /^Q\d+$/.test(name)) return;
      var o = { id: id.split('/').pop(), name: name, img: b.img.value.replace('http://', 'https://') + '?width=480', d: +b.dist.value, sl: +b.sl.value, types: b.typeLabel ? [b.typeLabel.value] : [], whs: !!b.whs };
      seen[id] = o; out.push(o);
    });
    return out.filter(function (o) { return !/municipality|commune|human settlement|village|town|city|district|canton|region|county|parish/i.test(o.types.join(' ')); }).slice(0, 12);
  }).catch(function () { delete NEARBY[r.id]; var e = []; e.failed = true; return e; });
  return NEARBY[r.id];
}
/* climate normals: NASA POWER monthly climatology (public domain), about 50 km grid */
function climateFor(r) {
  if (CLIMATE[r.id]) return CLIMATE[r.id];
  if (!fin(r.lat)) return Promise.resolve(null);
  var url = 'https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN&community=RE&longitude=' + r.lon.toFixed(3) + '&latitude=' + r.lat.toFixed(3) + '&format=JSON';
  CLIMATE[r.id] = jget(url).then(function (j) {
    var P = j && j.properties && j.properties.parameter; if (!P || !P.T2M_MAX) return null;
    var M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], days = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var hi = M.map(function (m) { return P.T2M_MAX[m]; }), lo = M.map(function (m) { return P.T2M_MIN[m]; }), rain = M.map(function (m, i) { return P.PRECTOTCORR[m] * days[i]; }), sun = M.map(function (m) { return P.ALLSKY_SFC_SW_DWN ? P.ALLSKY_SFC_SW_DWN[m] : null; });
    if (!hi.every(fin)) return null;
    return { hi: hi, lo: lo, rain: rain, sun: sun, year: rain.reduce(function (a, b) { return a + b; }, 0), sunAnn: P.ALLSKY_SFC_SW_DWN ? P.ALLSKY_SFC_SW_DWN.ANN : null };
  }).catch(function () { delete CLIMATE[r.id]; return null; });
  return CLIMATE[r.id];
}
function climateChart(c) {
  var W = 440, H = 170, L = 30, B = 22, T = 10, Rr = 30, n = 12, iw = (W - L - Rr) / n;
  var tmin = Math.min.apply(null, c.lo), tmax = Math.max.apply(null, c.hi), t0 = Math.floor(Math.min(tmin, 0) / 5) * 5, t1 = Math.ceil(Math.max(tmax, 20) / 5) * 5;
  var rmax = Math.max(100, Math.ceil(Math.max.apply(null, c.rain) / 50) * 50);
  function ty(v) { return T + (H - T - B) * (1 - (v - t0) / (t1 - t0)); }
  function ry(v) { return H - B - (H - T - B) * v / rmax; }
  var bars = c.rain.map(function (v, i) { var x = L + i * iw + iw * 0.22, y = ry(v); return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (iw * 0.56).toFixed(1) + '" height="' + (H - B - y).toFixed(1) + '" rx="2" fill="var(--blue)" opacity=".28"/>'; }).join('');
  var line = function (arr, col) { return '<polyline fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round" points="' + arr.map(function (v, i) { return (L + i * iw + iw / 2).toFixed(1) + ',' + ty(v).toFixed(1); }).join(' ') + '"/>'; };
  var area = '<polygon fill="color-mix(in srgb,var(--amber) 20%,transparent)" points="' + c.hi.map(function (v, i) { return (L + i * iw + iw / 2).toFixed(1) + ',' + ty(v).toFixed(1); }).concat(c.lo.slice().reverse().map(function (v, j) { var i = 11 - j; return (L + i * iw + iw / 2).toFixed(1) + ',' + ty(v).toFixed(1); })).join(' ') + '"/>';
  var grid = []; for (var t = t0; t <= t1; t += 5) grid.push('<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + ty(t).toFixed(1) + '" y2="' + ty(t).toFixed(1) + '" stroke="var(--line)"' + (t === 0 ? ' stroke-width="1.4"' : '') + '/><text x="' + (L - 4) + '" y="' + (ty(t) + 3).toFixed(1) + '" text-anchor="end">' + t + '°</text>');
  var months = 'JFMAMJJASOND'.split('').map(function (m, i) { return '<text x="' + (L + i * iw + iw / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + m + '</text>'; }).join('');
  var rl = '<text x="' + (W - Rr + 4) + '" y="' + (ry(rmax) + 3) + '">' + rmax + '</text><text x="' + (W - Rr + 4) + '" y="' + (ry(0) + 3) + '">0 mm</text>';
  return '<svg class="climate" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Average monthly temperature range and rainfall">' + grid.join('') + bars + area + line(c.hi, 'var(--amber)') + line(c.lo, 'var(--blue)') + months + rl + '</svg>';
}
function climateSummary(c) {
  var M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var warm = c.hi.indexOf(Math.max.apply(null, c.hi)), cold = c.lo.indexOf(Math.min.apply(null, c.lo)), wet = c.rain.indexOf(Math.max.apply(null, c.rain)), dry = c.rain.indexOf(Math.min.apply(null, c.rain));
  var frost = c.lo.filter(function (v) { return v < 0; }).length;
  var bits = [M[warm] + ' days reach about ' + Math.round(c.hi[warm]) + ' °C', M[cold] + ' nights drop to about ' + Math.round(c.lo[cold]) + ' °C'];
  bits.push('about ' + fmtInt(Math.round(c.year / 10) * 10) + ' mm of rain a year, most in ' + M[wet] + ', least in ' + M[dry]);
  if (frost) bits.push(frost === 1 ? 'one month averages below freezing at night' : frost + ' months average below freezing at night');
  else bits.push('night frost is rare on average');
  return bits.join('; ') + '.';
}
/* small facts from Wikidata: altitude, postcode, founded, sister cities, mayor, demonym */
function wdFacts(r) {
  if (WDFACTS[r.id]) return WDFACTS[r.id];
  WDFACTS[r.id] = wikidataFor(r).then(function (e) {
    if (!e) return null;
    var f = {}, ids = [];
    var elev = claim(e, 'P2044'); if (elev && fin(+elev.amount)) f.elev = Math.round(+elev.amount);
    var pc = claim(e, 'P281'); if (pc) f.postcode = pc;
    var inc = claim(e, 'P571'); if (inc && inc.time) { var y = +inc.time.slice(1, 5); if (y && y < 2100) f.founded = (inc.time[0] === '-' ? -y : y); }
    var sis = (e.claims.P190 || []).map(function (c) { return c.mainsnak.datavalue && c.mainsnak.datavalue.value.id; }).filter(Boolean).slice(0, 8);
    var mayor = claim(e, 'P6'); if (mayor && mayor.id) { f.mayorId = mayor.id; ids.push(mayor.id); }
    var dem = (e.claims.P1549 || []).map(function (c) { return c.mainsnak.datavalue && c.mainsnak.datavalue.value; }).filter(function (v) { return v && (v.language === 'en' || v.language === 'de' || v.language === 'fr'); })[0];
    if (dem) f.demonym = dem.text;
    var hp = claim(e, 'P610'); if (hp && hp.id) { f.highId = hp.id; ids.push(hp.id); }
    ids = ids.concat(sis);
    if (!ids.length) return f;
    return jget('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + ids.join('|') + '&props=labels&languages=en|de|fr|it|es&format=json&origin=*').then(function (j) {
      var L = function (id) { var en = j.entities[id] && j.entities[id].labels; return en ? (en.en || en.de || en.fr || en.it || en.es || {}).value : null; };
      if (f.mayorId) f.mayor = L(f.mayorId);
      if (f.highId) f.high = L(f.highId);
      f.sisters = sis.map(L).filter(Boolean);
      return f;
    }).catch(function () { return f; });
  }).catch(function () { return null; });
  return WDFACTS[r.id];
}
function wdFactLines(f) {
  if (!f) return [];
  var out = [];
  if (fin(f.elev)) out.push('Official altitude: ' + fmtInt(f.elev) + ' m.');
  if (f.postcode) out.push('Postcode ' + f.postcode + '.');
  if (fin(f.founded)) out.push((f.founded < 0 ? 'Records go back to ' + Math.abs(f.founded) + ' BC.' : f.founded < 1800 ? 'First recorded or founded in ' + f.founded + '.' : 'The municipality in its current form dates from ' + f.founded + '.'));
  if (f.high) out.push('Highest point: ' + f.high + '.');
  if (f.demonym) out.push('Locals are called ' + f.demonym + '.');
  if (f.mayor) out.push('Head of the local government: ' + f.mayor + '.');
  if (f.sisters && f.sisters.length) out.push('Sister towns: ' + f.sisters.join(', ') + '.');
  return out;
}
