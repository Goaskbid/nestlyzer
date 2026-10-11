/* Public enrichment (Wikidata, Wikipedia, Wikimedia Commons, OpenStreetMap Overpass).
   Runtime only, cached, never affects scores. Every call fails soft. */
var WD = {}, WP = {}, CM = {}, IMGCACHE = store('img') || {};
var WD_PROP = { CH: 'P771', DE: 'P439', FR: 'P374', IT: 'P635', ES: 'P772', AT: 'P964', NL: 'P382', BE: 'P1567' };
function jget(url) { return liveFetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
var queue = [], active = 0;
function limited(fn) { return new Promise(function (res, rej) { queue.push([fn, res, rej]); pump(); }); }
function pump() { while (active < 4 && queue.length) { var q = queue.shift(); active++; q[0]().then(q[1], q[2]).then(function () { active--; pump(); }, function () { active--; pump(); }); } }

function wdSearch(q) { return jget('https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(q) + '&srlimit=3&format=json&origin=*').then(function (j) { return ((j.query || {}).search || []).map(function (s) { return s.title; }); }); }
function wikidataFor(r) {
  if (WD[r.id]) return WD[r.id];
  var prop = WD_PROP[r.country];
  var tries = [];
  if (prop) tries.push('haswbstatement:' + prop + '=' + r.oid);
  tries.push('haswbstatement:P782=' + (r.gisco || '').replace(/^[A-Z]{2}_/, ''));
  WD[r.id] = (function next(i) {
    if (i >= tries.length) return nameSearch();
    return wdSearch(tries[i]).then(function (ids) { return ids.length === 1 ? ids[0] : next(i + 1); }, function () { return next(i + 1); });
  })(0).then(function (qid) {
    if (!qid) return null;
    return jget('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + qid + '&props=claims|sitelinks&format=json&origin=*').then(function (j) { var e = j.entities[qid]; e.qid = qid; return e; });
  }).catch(function () { return null; });
  function nameSearch() {
    return jget('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' + encodeURIComponent(stripParen(r.name)) + '&language=en&limit=7&format=json&origin=*').then(function (j) {
      var hit = (j.search || []).find(function (x) { return /municip|commune|comune|gemeinde|city|town|village|municipio|gmina|obec/i.test(x.description || '') && (x.description || '').toLowerCase().indexOf(countryName(r.country).toLowerCase()) >= 0; }) || (j.search || []).find(function (x) { return /municip|commune|city|town|village/i.test(x.description || ''); });
      return hit ? hit.id : null;
    });
  }
  return WD[r.id];
}
function claim(e, p) { var c = e && e.claims && e.claims[p]; if (!c || !c[0] || !c[0].mainsnak.datavalue) return null; return c[0].mainsnak.datavalue.value; }
function commonsFile(name, w) { return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(String(name).replace(/ /g, '_')) + (w ? '?width=' + w : ''); }
function wikiSummary(lang, title) {
  var k = lang + ':' + title;
  if (!WP[k]) WP[k] = jget('https://' + lang + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_'))).then(function (j) { return j && j.type !== 'disambiguation' ? j : null; }).catch(function () { return null; });
  return WP[k];
}
function placeContext(r) {
  var key = 'ctx:' + r.id;
  if (WP[key]) return WP[key];
  WP[key] = wikidataFor(r).then(function (e) {
    var sl = (e && e.sitelinks) || {};
    var order = ['enwiki', 'dewiki', 'frwiki', 'itwiki', 'eswiki', 'nlwiki', 'ptwiki', 'plwiki'];
    for (var i = 0; i < order.length; i++) if (sl[order[i]]) return wikiSummary(order[i].replace('wiki', ''), sl[order[i]].title).then(function (s) { return { s: s, e: e }; });
    var c = countryName(r.country), titles = [stripParen(r.name) + ', ' + c, stripParen(r.name), stripParen(r.name) + ' (' + c + ')'];
    return (function next(i) { if (i >= titles.length) return { s: null, e: e }; return wikiSummary('en', titles[i]).then(function (s) { return s && /municip|commune|town|city|village|comune|gemeinde|district|parish/i.test((s.description || '') + (s.extract || '')) ? { s: s, e: e } : next(i + 1); }); })(0);
  }).then(function (o) {
    var s = o.s || {}, e = o.e;
    var img = (s.originalimage && s.originalimage.source) || (s.thumbnail && s.thumbnail.source) || (claim(e, 'P18') ? commonsFile(claim(e, 'P18'), 1200) : '');
    return { extract: s.extract || '', url: s.content_urls && s.content_urls.desktop ? s.content_urls.desktop.page : '', image: img, title: s.title || '', entity: e };
  }).catch(function () { return { extract: '', url: '', image: '' }; });
  return WP[key];
}
function placeImage(r) {
  if (IMGCACHE[r.id] !== undefined) return Promise.resolve(IMGCACHE[r.id]);
  return placeContext(r).then(function (c) {
    if (c.image) return c.image;
    return commonsImages(r, 1).then(function (a) { return a[0] || ''; });
  }).then(function (u) { IMGCACHE[r.id] = u; var keys = Object.keys(IMGCACHE); if (keys.length > 400) delete IMGCACHE[keys[0]]; store('img', IMGCACHE); return u; });
}
function commonsImages(r, limit) {
  var k = r.id + ':' + limit; if (CM[k]) return CM[k];
  var q = stripParen(r.name) + ' ' + localAreaOf(r) + ' ' + countryName(r.country);
  CM[k] = jget('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=' + encodeURIComponent(q) + '&gsrlimit=' + (limit + 6) + '&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=720&format=json&origin=*').then(function (j) {
    return Object.values((j.query || {}).pages || {}).map(function (p) { return p.imageinfo && p.imageinfo[0]; }).filter(function (x) { return x && /^image\/(jpeg|png|webp)/.test(x.mime || ''); })
      .map(function (x) { return { src: x.thumburl || x.url, page: x.descriptionurl }; }).slice(0, limit);
  }).catch(function () { return []; });
  return CM[k].then(function (a) { return a.map(function (x) { return limit === 1 ? x.src : x; }); });
}
function setImg(el, src, alt) {
  if (!el || !src || el.querySelector('img') || (/^https?:/.test(src) && src.indexOf(location.origin) !== 0 && !extOn())) return;
  var img = new Image(); img.alt = alt; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
  img.onload = function () { el.insertBefore(img, el.firstChild); };
  img.src = src;
}
function hydratePhotos(root) {
  if (!extOn()) return;
  $$('[data-photo]', root).forEach(function (el) {
    var r = BYID[el.dataset.photo]; if (!r || el.dataset.done) return; el.dataset.done = '1';
    limited(function () { return placeImage(r); }).then(function (u) { setImg(el, u, r.name); });
  });
}
function hydratePlace(r) {
  if (!extOn()) return;
  var id = r.id;
  function still() { return S.selected === id; }
  placeContext(r).then(function (c) {
    if (!still()) return;
    setImg($('[data-hero]'), c.image, r.name + ', public image');
    setImg($('[data-story-photo]'), c.image, r.name);
    var w = $('[data-wiki]');
    if (w && c.extract) { var t = c.extract.split('. ').slice(0, 2).join('. '); w.innerHTML = '<p>' + esc(t) + (/\.$/.test(t) ? '' : '.') + '</p>' + (c.url ? '<a class="small" href="' + esc(c.url) + '" target="_blank" rel="noopener">Public article</a>' : ''); }
    if (!c.image) commonsImages(r, 1).then(function (a) { if (still() && a[0]) { setImg($('[data-hero]'), a[0], r.name); setImg($('[data-story-photo]'), a[0], r.name); } });
    identity(r, c.entity);
    contact(r, c.entity);
  });
  regionContext(r).then(function (c) {
    if (!still() || !c) return;
    setImg($('[data-region-photo]'), c.image, localAreaOf(r));
    var w = $('[data-wiki-region]');
    if (w && c.extract) { var t = c.extract.split('. ').slice(0, 2).join('. '); w.innerHTML = '<p>' + esc(t) + (/\.$/.test(t) ? '' : '.') + '</p>' + (c.url ? '<a class="small" href="' + esc(c.url) + '" target="_blank" rel="noopener">Regional article</a>' : ''); }
  });
  sights(r);
  commonsImages(r, 6).then(function (imgs) {
    if (!still()) return; var el = $('[data-gallery]'); if (!el || !imgs.length) return;
    el.innerHTML = '<section class="sec"><h3>Image gallery</h3><p class="sub">Wikimedia Commons search results. Check each image page for the licence and author.</p><div class="gallery">' + imgs.map(function (x) { return '<a href="' + esc(x.page || x.src) + '" target="_blank" rel="noopener"><img src="' + esc(x.src) + '" alt="' + esc(r.name) + ' public image" loading="lazy" referrerpolicy="no-referrer"></a>'; }).join('') + '</div></section>';
  });
}
function regionContext(r) {
  var name = r.country === 'CH' ? ('Canton of ' + (r.cantonName || '')) : localAreaOf(r);
  var langs = r.country === 'CH' ? [['en', name], ['de', 'Kanton ' + r.cantonName]] : [['en', name]];
  return (function next(i) {
    if (i >= langs.length) return Promise.resolve(null);
    return wikiSummary(langs[i][0], langs[i][1]).then(function (s) { if (!s) return next(i + 1); return { extract: s.extract || '', url: s.content_urls && s.content_urls.desktop.page, image: (s.originalimage && s.originalimage.source) || (s.thumbnail && s.thumbnail.source) || '' }; });
  })(0);
}
function identity(r, e) {
  var box = $('[data-ids]'); if (!box || box.dataset.done) return; box.dataset.done = '1';
  var coa = claim(e, 'P94'), cands = [];
  if (coa) cands.push(commonsFile(coa, 120));
  var n = stripParen(r.name), a = n.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  if (r.country === 'CH') [n + ' COA.svg', 'CHE ' + n + ' COA.svg', 'CHE ' + n + ' ' + r.canton + ' COA.svg', 'CHE ' + a + ' COA.svg', 'Wappen ' + n + '.svg'].forEach(function (f) { cands.push(commonsFile(f, 120)); });
  else ['Coat of arms of ' + n + '.svg', 'Wappen ' + n + '.svg', 'Blason ville fr ' + n + '.svg', 'Escudo de ' + n + '.svg', 'Stemma di ' + n + '.svg', 'Herb ' + n + '.svg'].forEach(function (f) { cands.push(commonsFile(f, 120)); });
  var cn = countryName(r.country), flags = { CH: 'Flag of Switzerland (Pantone).svg', UK: 'Flag of the United Kingdom.svg', NL: 'Flag of the Netherlands.svg', CZ: 'Flag of the Czech Republic.svg' };
  var regionArms = r.country === 'CH' ? ['Wappen ' + ({ ZH: 'Zürich matt', BE: 'Bern matt', LU: 'Luzern matt', UR: 'Uri matt', SZ: 'Schwyz matt', OW: 'Obwalden matt', NW: 'Nidwalden matt', GL: 'Glarus matt', ZG: 'Zug matt', FR: 'Freiburg matt', SO: 'Solothurn matt', BS: 'Basel-Stadt matt', BL: 'Basel-Land matt', SH: 'Schaffhausen matt', AR: 'Appenzell Ausserrhoden matt', AI: 'Appenzell Innerrhoden matt', SG: 'St. Gallen matt', GR: 'Graubünden matt', AG: 'Aargau matt', TG: 'Thurgau matt', TI: 'Tessin matt', VD: 'Waadt matt', VS: 'Wallis matt', NE: 'Neuenburg matt', GE: 'Genf matt', JU: 'Jura matt' }[r.canton] || r.cantonName) + '.svg'] : [];
  function chain(list, alt, title) {
    if (!list.length || !extOn()) return;
    var img = new Image(), i = 0; img.alt = alt; img.title = title; img.referrerPolicy = 'no-referrer'; img.loading = 'lazy';
    img.style.display = 'none';
    img.onload = function () { img.style.display = ''; };
    img.onerror = function () { i++; if (i < list.length) img.src = list[i]; else img.remove(); };
    img.src = list[0]; box.appendChild(img);
  }
  chain(cands, 'Coat of arms of ' + r.name, r.name);
  if (regionArms.length) chain(regionArms.map(function (f) { return commonsFile(f, 120); }), 'Coat of arms of ' + r.cantonName, r.cantonName);
  chain([commonsFile(flags[r.country] || ('Flag of ' + cn + '.svg'), 120)], 'Flag of ' + cn, cn);
}
function contact(r, e) {
  var el = $('[data-contact]'); if (!el) return;
  var web = claim(e, 'P856'), mail = claim(e, 'P968'), tel = claim(e, 'P1329'), ig = claim(e, 'P2003'), addr = claim(e, 'P6375'), coord = claim(e, 'P625');
  var lat = coord ? coord.latitude : r.lat, lon = coord ? coord.longitude : r.lon;
  var bits = [];
  if (web) bits.push('<a href="' + esc(web) + '" target="_blank" rel="noopener">' + ICON.ext + 'Official website</a>');
  if (mail) bits.push('<a href="' + esc(/^mailto:/.test(mail) ? mail : 'mailto:' + mail) + '">✉️ ' + esc(String(mail).replace(/^mailto:/, '')) + '</a>');
  if (tel) bits.push('<a href="tel:' + esc(String(tel).replace(/[^+\d]/g, '')) + '">📞 ' + esc(tel) + '</a>');
  if (ig) bits.push('<a href="https://www.instagram.com/' + esc(ig) + '/" target="_blank" rel="noopener">📷 Instagram</a>');
  if (addr && addr.text) bits.push('<span>📍 ' + esc(addr.text) + '</span>');
  if (fin(lat)) bits.push('<a href="https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=13/' + lat + '/' + lon + '" target="_blank" rel="noopener">' + ICON.map + 'Open public map</a>');
  if (e && e.qid) bits.push('<a class="small" href="https://www.wikidata.org/wiki/' + e.qid + '" target="_blank" rel="noopener">Wikidata ' + e.qid + '</a>');
  el.innerHTML = '<section class="sec contact"><h3>Local authority contact</h3><p class="sub">Public directory data from Wikidata. Verify before you rely on it.</p><div class="pills">' + bits.map(function (b) { return '<span class="chip">' + b + '</span>'; }).join('') + '</div></section>';
}
function sights(r) {
  if (!fin(r.lat)) return;
  var q = '[out:json][timeout:12];(node(around:6000,' + r.lat + ',' + r.lon + ')["tourism"~"museum|attraction|viewpoint|gallery"];node(around:6000,' + r.lat + ',' + r.lon + ')["historic"];way(around:6000,' + r.lat + ',' + r.lon + ')["tourism"~"museum|attraction|viewpoint|gallery"];);out center tags 14;';
  liveFetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(function (res) { if (!res.ok) throw 0; return res.json(); }).then(function (j) {
    if (S.selected !== r.id) return;
    var seen = {}, items = [];
    (j.elements || []).forEach(function (e) { var n = e.tags && e.tags.name; if (!n || seen[n] || items.length >= 5) return; seen[n] = 1; items.push({ n: n, t: e.tags.tourism || e.tags.historic || 'place' }); });
    var el = $('[data-sights]');
    if (el && items.length) el.innerHTML = '<p class="small" style="margin-top:8px"><b>Nearby sights (OpenStreetMap):</b> ' + items.map(function (i) { return esc(i.n) + ' <span class="muted">(' + esc(i.t.replace(/_/g, ' ')) + ')</span>'; }).join(', ') + '</p>';
  }).catch(function () {});
}

/* ---------- booklet ---------- */
function openBooklet() {
  var r = selected(); if (!r) return;
  var x = placeX(r), p = profileDef(S.profile), ranked = RES && RES.byId[r.id];
  var hero = $('[data-hero] img'), heroSrc = hero && hero.naturalWidth >= 600 && /^https:/.test(hero.src) && !/flag|coat|wappen|\.svg/i.test(hero.src) ? hero.src : '';
  var pc = $('[data-hero] svg'), heroSvg = !heroSrc && pc ? pc.outerHTML : '';
  var cats = weightedCats(x, false, 8), frk = RES ? RES.factorRanks : {}, cr = RES ? RES.categoryRanks : {};
  var facs = ENGINE.allFactors.map(function (f) { return { f: f, v: ENGINE.factorValue(r, f) }; }).filter(function (o) { return fin(o.v); }).sort(function (a, b) { return b.v - a.v; }).slice(0, 10);
  var fr = r.factorRaw || {}, g = r.geo || {};
  var maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(r.name + ', ' + countryName(r.country));
  var osm = fin(r.lat) ? 'https://www.openstreetmap.org/?mlat=' + r.lat + '&mlon=' + r.lon + '#map=12/' + r.lat + '/' + r.lon : '';
  var e = function (s) { return esc(s); };
  var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + e(r.name) + ' booklet, Nestlyzer</title><style>@page{size:A4;margin:16mm}body{font-family:"Public Sans",Arial,sans-serif;color:#132238;margin:0}h1{font-size:30px;margin:6px 0 2px}h2{font-size:17px;margin:22px 0 8px;border-bottom:2px solid #0B2E5C;padding-bottom:4px}p,td,li{font-size:12px;line-height:1.5}.muted{color:#5b6778}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.m{border:1px solid #dce1da;border-radius:8px;padding:8px}.m b{display:block;font-size:20px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e3e7e1;padding:5px 4px;text-align:left;font-size:12px}img.hero{width:100%;height:220px;object-fit:cover;border-radius:10px;margin:10px 0}header{display:flex;justify-content:space-between;align-items:center}header img{height:42px}.foot{margin-top:24px;font-size:10px;color:#5b6778}@media screen{body{max-width:820px;margin:24px auto;padding:0 16px}}</style></head><body>' +
    '<header><img src="' + assetURL('/assets/icon-192.png') + '" alt="Nestlyzer" width="40" height="40"><span class="muted">' + new Date().toISOString().slice(0, 10) + '</span></header>' +
    '<h1>' + e(r.name) + '</h1><div class="muted">' + e(localAreaOf(r)) + ', ' + e(countryName(r.country)) + ', ' + fmtInt(r.popNow) + ' residents</div>' +
    (heroSrc ? '<img class="hero" src="' + e(heroSrc) + '" alt="">' : heroSvg ? '<div class="hero" style="height:200px;overflow:hidden;border-radius:12px;background:#0b2e5c">' + heroSvg.replace('<svg', '<svg style="width:100%;height:100%"') + '</div>' : '') +
    '<h2>Decision snapshot</h2><div class="grid"><div class="m">Profile<b style="font-size:13px">' + e(p.name) + '</b></div><div class="m">Score<b>' + fmt(x.overall) + '</b></div><div class="m">Rank<b>' + (ranked ? '#' + ranked.rank + ' / ' + fmtInt(RES.scored.length) : 'not ranked') + '</b></div><div class="m">Confidence<b>' + fmt(r.sourceConfidence) + '%</b></div><div class="m">Coverage<b>' + (fin(x.coverage) ? x.coverage + '%' : '–') + '</b></div></div>' +
    '<p>' + e(cardCopy(x)) + '</p><p class="muted">Scope: ' + e(scopeName()) + '. ' + e(p.intro || p.desc) + '</p>' +
    '<h2>Getting around</h2><table>' + [['Hub airport', g.hubAirport ? g.hubAirport + ', ' + fmt(fr.geo_hub_airport_km) + ' km' : ''], ['City of 100,000+', fin(fr.geo_major_city_km) ? (fr.geo_major_city_km === 0 ? 'this is one' : fmt(fr.geo_major_city_km) + ' km') : ''], ['Residents within 30 km', fin(fr.geo_catchment_30km) ? fmtInt(fr.geo_catchment_30km) : ''], ['Sea coast', fin(fr.geo_coast_km) ? fmt(fr.geo_coast_km) + ' km' : '']].filter(function (a) { return a[1]; }).map(function (a) { return '<tr><td>' + e(a[0]) + '</td><td>' + e(a[1]) + '</td></tr>'; }).join('') + '</table>' +
    '<h2>Contact and map</h2><p><a href="' + maps + '">Google Maps</a>' + (osm ? ' · <a href="' + osm + '">OpenStreetMap</a>' : '') + '</p>' + ($('[data-contact] .pills') ? '<p>' + $$('[data-contact] .pills a').map(function (a) { return '<a href="' + e(a.href) + '">' + e(a.textContent.trim()) + '</a>'; }).concat($$('[data-contact] .pills span > span').map(function (sp) { return e(sp.textContent.trim()); })).join(' · ') + '</p>' : '') +
    '<h2>Municipality and regional context</h2>' + storyParagraphs(r).map(function (t) { return '<p>' + e(t) + '</p>'; }).join('') + regionParagraphs(r).map(function (t) { return '<p class="muted">' + e(t) + '</p>'; }).join('') +
    '<h2>Category sub-ranks</h2><table><tr><th>Category</th><th>Score</th><th>Rank</th></tr>' + cats.map(function (c) { return '<tr><td>' + e(catLabel(c[0])) + '</td><td>' + fmt(c[1]) + '</td><td>' + (cr[c[0]] && cr[c[0]][r.id] ? '#' + cr[c[0]][r.id] : '–') + '</td></tr>'; }).join('') + '</table>' +
    '<h2>Factor sub-ranks</h2><table><tr><th>Factor</th><th>Score</th><th>Rank</th><th>Raw</th></tr>' + facs.map(function (o) { var raw = fr[o.f.id]; return '<tr><td>' + e(o.f.name) + '</td><td>' + fmt(o.v) + '</td><td>' + (frk[o.f.id] && frk[o.f.id][r.id] ? '#' + frk[o.f.id][r.id] : '–') + '</td><td>' + (fin(raw) ? (Math.abs(raw) >= 1000 || /residents|people/.test(o.f.unit || '') ? fmtInt(raw) : fmt(raw, Math.abs(raw) < 100 ? 1 : 0)) + ' ' + e(o.f.unit || '') : '') + '</td></tr>'; }).join('') + '</table>' +
    '<h2>Use this booklet for</h2><ul><li>Shortlisting and site visits: check noise, slope, school route, train frequency and shops on the ground.</li><li>Conversations with the municipality, schools, landlords or an adviser.</li><li>Comparing against the close comparables listed in the app.</li></ul>' +
    '<p class="foot">This booklet is a decision-support export, not legal, tax, investment, immigration, medical, real-estate or financial advice. Public data can be incomplete or outdated. Photos, coats of arms, contact links and public text do not affect scores. Publisher: Torsten Sauter, Alte Landstrasse 77, 8706 Meilen, Switzerland, torsten.sauter@icloud.com. Generated by nestlyzer.com.</p>' +
    '<script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script></body></html>';
  var url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  var w = window.open(url, '_blank');
  if (!w) { var a = document.createElement('a'); a.href = url; a.download = slug(r.name) + '-nestlyzer-booklet.html'; document.body.appendChild(a); a.click(); a.remove(); toast('Booklet downloaded', 'Your browser blocked the new tab, so the booklet was saved as a file. Open it and print to PDF.'); }
}
