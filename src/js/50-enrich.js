/* Public enrichment (Wikidata, Wikipedia, Wikimedia Commons, OpenStreetMap Overpass).
   Runtime only, cached, never affects scores. Every call fails soft. */
var WD = {}, WP = {}, CM = {}, IMGCACHE = store('img') || {};
var WD_PROP = { CH: 'P771', DE: 'P439', FR: 'P374', IT: 'P635', ES: 'P772', AT: 'P964', NL: 'P382', BE: 'P1567' };
/* 2.15.30: Wikimedia and Eurostat can answer 429/5xx in busy moments; retry twice (0.9 s, 3.6 s) before giving up */
function jget(url, n) { n = n || 0; return liveFetch(url).then(function (r) { if (!r.ok) { var e = new Error(r.status); e.retry = r.status === 429 || r.status >= 500; throw e; } return r.json(); }).catch(function (e) {
  if (n < 2 && (!e || e.retry || e instanceof TypeError) && extOn()) return new Promise(function (ok) { setTimeout(ok, 900 * (n + 1) * (n + 1)); }).then(function () { return jget(url, n + 1); });
  throw e; }); }
var WD_FAIL = {};   // places whose Wikidata lookup failed (network, rate limit): such an empty answer is never cached
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
  }).catch(function () { WD_FAIL[r.id] = 1; delete WD[r.id]; return null; });
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
    var img = (s.originalimage && s.originalimage.source) || (s.thumbnail && s.thumbnail.source) || (claim(e, 'P18') ? commonsFile(claim(e, 'P18'), 1280) : '');
    return { extract: s.extract || '', url: s.content_urls && s.content_urls.desktop ? s.content_urls.desktop.page : '', image: img, title: s.title || '', entity: e };
  }).catch(function () { return { extract: '', url: '', image: '' }; });
  return WP[key];
}
function placeImage(r) {
  if (IMGCACHE[r.id] !== undefined) return Promise.resolve(IMGCACHE[r.id]);
  return placeContext(r).then(function (c) {
    if (photoUsable(c.image)) return c.image;
    return commonsImages(r, 1).then(function (a) { return a[0] || ''; });
  }).then(function (u) { IMGCACHE[r.id] = u; var keys = Object.keys(IMGCACHE); if (keys.length > 400) delete IMGCACHE[keys[0]]; store('img', IMGCACHE); return u; });
}
function commonsImages(r, limit) {
  var k = r.id + ':' + limit; if (CM[k]) return CM[k];
  var q = stripParen(r.name) + ' ' + localAreaOf(r) + ' ' + countryName(r.country);
  CM[k] = Promise.all([photoKit(), jget('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=' + encodeURIComponent(q) + '&gsrlimit=' + (limit + 6) + '&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=960&format=json&origin=*')]).then(function (aa) {
    var X = aa[0], j = aa[1];
    var c = Object.values((j.query || {}).pages || {}).sort(function (a, b) { return (a.index || 0) - (b.index || 0); }).filter(function (p) { var x = p.imageinfo && p.imageinfo[0]; return x && /^image\/(jpeg|png|webp)/.test(x.mime || '') && X.photoMetaOk(p.title, x.extmetadata); })
      .map(function (p) { var x = p.imageinfo[0]; return { src: x.thumburl || x.url, page: x.descriptionurl }; });
    return X.photoPixelFilter(c.slice(0, limit + 4), limit);
  }).catch(function () { return []; });
  return CM[k].then(function (a) { return a.map(function (x) { return limit === 1 ? x.src : x; }); });
}
/* a lead image from Wikipedia is used only when it is a photo (not a map, flag, coat of arms or drawing) */
function photoUsable(u) { if (!u) return false; var f = ''; try { f = decodeURIComponent(String(u).split('/').pop()); } catch (e) { f = String(u); } return !/\.svg(\.png)?$|\.gif$/i.test(f) && !PHOTO_SKIP.test(f); }
/* fill a picture slot: the lead image first, otherwise (or if it fails to load) a filtered photo from around the place;
   `pick` chooses which of the nearby photos, so the municipality and the region slot do not show the same one */
function fillPhoto(el, r, first, pick, alt) {
  if (!el || el.querySelector('img') || !extOn()) return;
  var id = S.selected, tried = {};
  var fromPool = function () { photosFor(r).then(function (list) { if (!extOn() || S.selected !== id || el.querySelector('img') || !list || !list.length) return; var p = list[Math.min(pick, list.length - 1)]; if (p && !tried[p.src]) tryImg(p.src, fromPoolNext); }); };
  var fromPoolNext = function () { photosFor(r).then(function (list) { if (!extOn() || S.selected !== id || el.querySelector('img')) return; var p = (list || []).filter(function (x) { return !tried[x.src]; })[0]; if (p) tryImg(p.src, function () {}); }); };
  var tryImg = function (src, onfail) { if (!extOn() || S.selected !== id) return; tried[src] = 1; var img = new Image(); img.alt = alt; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.onload = function () { if (extOn() && !el.querySelector('img') && S.selected === id) el.insertBefore(img, el.firstChild); }; img.onerror = onfail; img.src = src; };
  if (first) tryImg(first, fromPool); else fromPool();
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
    var lead = photoUsable(c.image) ? c.image : '';
    fillPhoto($('#place [data-hero]'), r, lead, 0, r.name + ', public image');
    fillPhoto($('[data-story-photo]'), r, lead, 0, r.name);
    var w = $('[data-wiki]');
    if (w && c.extract) { var t = c.extract.split('. ').slice(0, 4).join('. '); w.innerHTML = '<p>' + esc(t) + (/\.$/.test(t) ? '' : '.') + '</p>' + '<p class="src">' + (c.url ? '<a class="small" href="' + esc(c.url) + '" target="_blank" rel="noopener">Public article</a>' : '') + ' <span class="small muted">Text: Wikipedia, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>, opening paragraph.</span></p>'; }
    identity(r, c.entity);
    contact(r, c.entity);
  });
  regionContext(r).then(function (c) {
    if (!still()) return;
    fillPhoto($('[data-region-photo]'), r, c && photoUsable(c.image) ? c.image : '', 1, localAreaOf(r));
    if (!c) return;
    var w = $('[data-wiki-region]');
    if (w && c.extract) { var t = c.extract.split('. ').slice(0, 2).join('. '); w.innerHTML = '<p>' + esc(t) + (/\.$/.test(t) ? '' : '.') + '</p>' + (c.url ? '<a class="small" href="' + esc(c.url) + '" target="_blank" rel="noopener">Regional article</a>' : '') + ' <span class="small muted">Text: Wikipedia, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>, first sentences.</span>'; }
  });
  sights(r);
  commonsImages(r, 6).then(function (imgs) {
    if (!still()) return; var el = $('[data-gallery]'); if (!el || !imgs.length) return;
    el.innerHTML = '<div class="gallery">' + imgs.map(function (x) { return '<a href="' + esc(x.page || x.src) + '" target="_blank" rel="noopener"><img src="' + esc(x.src) + '" alt="' + esc(r.name) + ' public image" loading="lazy" referrerpolicy="no-referrer"></a>'; }).join('') + '</div><p class="src">More photos found by name on Wikimedia Commons; open one for its author and licence.</p>';
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
/* Coats of arms never load automatically or through guessed filenames. */
function identity(r,e){var box=$('[data-ids]');if(!box||box.dataset.ids!==r.id)return; NZCardUI.hydrateEmblems(box);}
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
/* the printable booklet lives in the lazy module (src/more/booklet.js) to keep the start page small */
function openBooklet() { moreLoad().then(function (X) { X.openBooklet(); }); }
function printDoc(h, list, fname) { var w = window.open('', '_blank'), go = function (X) { X.printInto(w, typeof h === 'function' ? h(X) : h, list, fname); }; if (MOREX) go(MOREX); else moreLoad().then(go, function () { if (w && typeof h == 'string') { w.document.write(h); w.document.close(); } }); }

/* 2.15.25 coats of arms everywhere (cards, rows, panel): matched by the exact official municipality code on Wikidata,
   image from Wikimedia Commons only with an open licence (CC0, CC BY, CC BY-SA, public domain). Commons marks every coat
   of arms "insignia": copyright permission does not resolve every official-symbol restriction. Results are cached for 30 days; at most 4 lookups run at once and only for emblems on screen. */
var ARMS = {}, ARMQ = [], ARMN = 0;
function armsLic(lic, url) { return /^(CC0|CC[ -]BY(?:[ -]SA)?[ -][1-4]\.[05]\b.*|Public domain|PD\b.*)$/i.test(lic) && !/noncommercial|no ?derivatives|\bNC\b|\bND\b/i.test(lic + ' ' + url); }
/* 2.15.30 owner review: countries without an official municipal code on Wikidata (USA, Japan, Colombia and most of the world)
   still get their coat of arms, but never by name alone: the entity must carry the right country (P17), lie within 8 km of
   the place and be described as a town, city or municipality. No parent region is ever substituted. */
var NZ_CQ = {AE:'Q878',AL:'Q222',AR:'Q414',AU:'Q408',BG:'Q219',CA:'Q16',CN:'Q148',CO:'Q739',CY:'Q229',CZ:'Q213',DK:'Q35',EE:'Q191',EG:'Q79',EL:'Q41',FI:'Q33',HK:'Q8646',HR:'Q224',HU:'Q28',ID:'Q252',IE:'Q27',IL:'Q801',IN:'Q668',IS:'Q189',JP:'Q17',KR:'Q884',LI:'Q347',LT:'Q37',LU:'Q32',LV:'Q211',MA:'Q1028',MK:'Q221',MT:'Q233',MX:'Q96',MY:'Q833',NZ:'Q664',PH:'Q928',PT:'Q45',RO:'Q218',RS:'Q403',RU:'Q159',SA:'Q851',SG:'Q334',SI:'Q215',SK:'Q214',TH:'Q869',TR:'Q43',TW:'Q865',US:'Q30',VN:'Q881',ZA:'Q258'};
function wikidataPlaceFor(r) {
  var cq = NZ_CQ[r.country]; if (!cq || r.lat == null || !r.name) return Promise.resolve(null);
  return jget('https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&type=item&limit=6&format=json&origin=*&search=' + encodeURIComponent(r.name)).then(function (j) {
    var hits = (j.search || []).filter(function (h) { return /town|city|municipal|village|commune|county seat|borough|prefecture|district|ward|comune|municipio/i.test(h.description || ''); }).map(function (h) { return h.id; }).slice(0, 4);
    if (!hits.length) return null;
    return jget('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + hits.join('|') + '&props=claims|sitelinks&format=json&origin=*').then(function (j2) {
      var ok = hits.map(function (q) { return j2.entities && j2.entities[q]; }).filter(function (e) {
        if (!e || !NZEmblemIdentity.values(e, 'P17').some(function (v) { return v && v.id === cq; })) return false;
        var g = NZEmblemIdentity.values(e, 'P625')[0]; if (!g) return false;
        var dy = (g.latitude - r.lat) * 111, dx = (g.longitude - r.lon) * 111 * Math.cos(r.lat * Math.PI / 180); return Math.sqrt(dx * dx + dy * dy) < 8; });
      if (ok.length !== 1) return null;   // ambiguous or none: show nothing rather than a wrong emblem
      ok[0].nzExactIdentity = { qid: ok[0].id, property: 'P17+P625', code: 'within 8 km', country: r.country }; return ok[0];
    });
  });
}
function wikidataExactFor(r) {
 var request=NZEmblemIdentity.request(r);if(!extOn())return Promise.resolve(null);if(!request)return wikidataPlaceFor(r);
 return wdSearch('haswbstatement:'+request.property+'='+request.value).then(function(ids){
  if(ids.length!==1||!extOn())return null;
  return jget('https://www.wikidata.org/w/api.php?action=wbgetentities&ids='+ids[0]+'&props=claims|sitelinks&format=json&origin=*').then(function(j){
   var e=j.entities&&j.entities[ids[0]];if(!NZEmblemIdentity.verify(e,request))return null;e.nzExactIdentity={qid:ids[0],property:request.property,code:request.value,country:r.country};return e;
  });
 });
}
function armsFor(r) {
  if (ARMS[r.id] !== undefined) return Promise.resolve(ARMS[r.id]);
  // 2.15.28: key 'arms2' so empty results cached by the 8-country lookup before 2.15.28 are asked again
  // 2.15.30-r7: key 'arms5' and 120 px thumbnails: since Feb 2026 Wikimedia rate-limits thumbnail widths outside its standard steps
  // (20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840), so the old 96 px images failed; remembered 96 px links are dropped
  var key = 'arms5:' + r.id, c = store(key); if (c && c.t && Date.now() - c.t < 2592e6) return Promise.resolve(ARMS[r.id] = c.v);
  if (!extOn()) return Promise.resolve(null);
  var done = function (v) { if(!extOn())return null; if (!v && WD_FAIL[r.id]) { delete WD_FAIL[r.id]; return null; } ARMS[r.id] = v; try { store(key, { t: Date.now(), v: v }); } catch (e) {} return v; };
  var p94 = function (e) { var f = e && e.claims && ((e.claims.P94 || [])[0] || {}).mainsnak; return f && f.datavalue && f.datavalue.value; };
  var near = function (e) { var g = e && e.claims && ((e.claims.P625 || [])[0] || {}).mainsnak; g = g && g.datavalue && g.datavalue.value;   // a name match far away is another place
    if (!g || r.lat == null) return true; var dy = (g.latitude - r.lat) * 111, dx = (g.longitude - r.lon) * 111 * Math.cos(r.lat * Math.PI / 180); return Math.sqrt(dx * dx + dy * dy) < 30; };
  var commons = function (f, of) {
    return jget('https://commons.wikimedia.org/w/api.php?action=query&titles=' + encodeURIComponent('File:' + f) + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=120&format=json&origin=*').then(function (q) {
      var pg = q.query && q.query.pages, i = pg && Object.values(pg)[0] && Object.values(pg)[0].imageinfo && Object.values(pg)[0].imageinfo[0], m = (i && i.extmetadata) || {};
      var lic = (m.LicenseShortName || {}).value || '', url = (m.LicenseUrl || {}).value || '', img = i && (i.thumburl || i.url);
      if (!i || !armsLic(lic, url) || !/^https:\/\/upload\.wikimedia\.org\//.test(img || '')) return null;
      var art = new DOMParser().parseFromString((m.Artist || {}).value || 'Wikimedia Commons', 'text/html').body.textContent.trim().slice(0, 80);
      return { src: img, full: /^https:\/\/upload\.wikimedia\.org\//.test(i.url || '') ? i.url : '', lic: lic, by: art, of: of || '', page: i.descriptionurl || ('https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(f)) }; }); };
  // every country: the same exact-ID / LAU-code / name resolver the Story and facts use (shared cache, no extra lookup)
  return wikidataExactFor(r).then(function (e) {
    if (!e || !extOn()) return null;
    var own=p94(e);if(!own)return null;
    return commons(own,'').then(function(v){if(v)v.identity=e.nzExactIdentity;return v;}); })
    .then(done, function () { return null; });
}
function armsPump() {
 while(ARMN<4&&ARMQ.length){var job=ARMQ.shift();if(!extOn())continue;ARMN++;
  (function(r,slot,id){armsFor(r).then(function(v){
   if(!extOn()||!slot.isConnected||slot.dataset.placeEmblem!==id||!v||!v.identity)return;
   var im=new Image();im.alt='Coat of arms of '+(slot.dataset.emblemName||r.name);im.referrerPolicy='no-referrer';im.className='nz-arms-img';
   var link=document.createElement('a');link.href=v.page;link.target='_blank';link.rel='noopener noreferrer';link.title=v.by+'; '+v.lic+'; Wikimedia Commons. Official-symbol restrictions may apply.';link.addEventListener('click',function(e){e.stopPropagation();});link.appendChild(im);
   im.onload=function(){if(!extOn()||!slot.isConnected||slot.dataset.placeEmblem!==id)return;slot.replaceChildren(link);slot.dataset.emblemState='shown';slot.setAttribute('aria-label',im.alt);};
   // 2.15.30-r7: if Wikimedia refuses the 120 px thumbnail (busy or rate-limited), load the original file instead
   im.onerror=function(){if(v.full&&im.src!==v.full){im.src=v.full;return;}if(slot.isConnected&&slot.dataset.placeEmblem===id)slot.dataset.emblemState='load-error';};
   im.src=v.src;
  }).catch(function(){if(slot.isConnected)slot.dataset.emblemState='load-error';}).finally(function(){ARMN--;armsPump();});
  })(job[0],job[1],job[0].id);
 }
}
var ARMIO = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) return; ARMIO.unobserve(e.target); var t = e.target, r = BYID[t.dataset.placeEmblem]; if (r) { ARMQ.push([r, t]); armsPump(); } else if ((+t.dataset.armsTry || 0) < 8) { t.dataset.armsTry = (+t.dataset.armsTry || 0) + 1; setTimeout(function () { if (t.isConnected) ARMIO.observe(t); }, 1000); } }); }, { rootMargin: '200px' }) : null;   // the record may still be loading on first open
function armsNow(slot, n) { if(!extOn()||!slot.isConnected)return; var r = BYID[slot.dataset.placeEmblem]; if (r) { ARMQ.push([r, slot]); armsPump(); } else if (n < 8) setTimeout(function () { if (slot.isConnected) armsNow(slot, n + 1); }, 1000); }
window.NZ_ARMS = function (slot) { if (!extOn() || !slot || slot.dataset.armsQueued) return; slot.dataset.armsQueued = '1';
  // 2.15.28: a slot queued while the card was still sliding in could be missed; check again after 4 s and 10 s (cached, so no extra lookups)
  [4000, 10000].forEach(function (ms) { setTimeout(function () { if (slot.isConnected && slot.dataset.emblemState === 'unavailable' && !slot.querySelector('img')) armsNow(slot, 0); }, ms); });
  var b = slot.getBoundingClientRect(); if (b.width && b.bottom > -400 && b.top < innerHeight * 2 && b.left < innerWidth * 2) { armsNow(slot, 0); return; }   // on screen now: load directly
  if (ARMIO) ARMIO.observe(slot); else { var r = BYID[slot.dataset.placeEmblem]; if (r) { ARMQ.push([r, slot]); armsPump(); } } };

/* 2.15.30-r7 owner request: coats of arms of the region too (Bundesland, canton, département, provincia, county, US state).
   Same discipline as the municipal arms: the region entity is found only by its exact official code on Wikidata (NUTS code
   P605 in Europe, ISO 3166-2 code P300 for US states), must carry the right country (P17), and the image must be openly
   licensed on Wikimedia Commons (standard 120 px thumbnail, original file if the thumbnail is refused). Nothing by name. */
var RARMS_LEVEL = { DE: 1, AT: 2, BE: 2, NL: 2, IT: 2, ES: 2, FR: 1, PL: 2, PT: 2, EL: 2, DK: 2, IE: 2, UK: 1 };   // the "state" level above NUTS 3
var RARMS_CQ = { CH: 'Q39', DE: 'Q183', FR: 'Q142', IT: 'Q38', ES: 'Q29', AT: 'Q40', NL: 'Q55', BE: 'Q31', UK: 'Q145', SE: 'Q34', NO: 'Q20', PL: 'Q36', US: 'Q30' };
var US_FIPS = { '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY' };
function regionArmsTargets(r) {
  var out = [], cq = RARMS_CQ[r.country] || (typeof NZ_CQ === 'object' && NZ_CQ[r.country]); if (!cq) return out;
  if (r.country === 'US') { var m = /^US(\d{2})$/.exec(String(r.rc || '')), st = m && US_FIPS[m[1]]; if (st) out.push({ p: 'P300', v: 'US-' + st, cq: cq, kind: 'state' }); return out; }
  var n3 = String(r.n3 || ''); if (!/^[A-Z]{2}[A-Z0-9]{3}$/.test(n3) || n3.slice(0, 2) !== (r.country === 'EL' ? 'EL' : r.country === 'UK' ? 'UK' : r.country)) return out;
  var lv = RARMS_LEVEL[r.country]; if (lv) out.push({ p: 'P605', v: n3.slice(0, 2 + lv), cq: cq, kind: 'state' });
  out.push({ p: 'P605', v: n3, cq: cq, kind: 'region' });
  return out;
}
var RARMS = {};
function regionArmsFor(t) {
  var key = 'rarms1:' + t.p + ':' + t.v; if (RARMS[key]) return RARMS[key];
  var c = store(key); if (c && c.t && Date.now() - c.t < 2592e6) return (RARMS[key] = Promise.resolve(c.v));
  if (!extOn()) return Promise.resolve(null);
  var failed = false;
  return (RARMS[key] = wdSearch('haswbstatement:' + t.p + '=' + t.v).then(function (ids) {
    if (ids.length !== 1) return null;
    return jget('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + ids[0] + '&props=claims|labels&languages=en&format=json&origin=*').then(function (j) {
      var e = j.entities && j.entities[ids[0]]; if (!e) return null;
      if (!NZEmblemIdentity.values(e, t.p).some(function (v) { return String(v) === t.v; })) return null;
      if (!NZEmblemIdentity.values(e, 'P17').some(function (v) { return v && v.id === t.cq; })) return null;
      var f = NZEmblemIdentity.values(e, 'P94')[0]; if (!f) return null;
      return rarmsCommons(f, ((e.labels || {}).en || {}).value || t.v);
    });
  }).catch(function () { failed = true; return null; }).then(function (v) {
    if (!failed && extOn()) { try { store(key, { t: Date.now(), v: v }); } catch (e) {} } else delete RARMS[key];   // a failed lookup is never remembered
    return v;
  }));
}
function rarmsCommons(f, label) {
  return jget('https://commons.wikimedia.org/w/api.php?action=query&titles=' + encodeURIComponent('File:' + f) + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=120&format=json&origin=*').then(function (q) {
    var pg = q.query && q.query.pages, i = pg && Object.values(pg)[0] && Object.values(pg)[0].imageinfo && Object.values(pg)[0].imageinfo[0], m = (i && i.extmetadata) || {};
    var lic = (m.LicenseShortName || {}).value || '', url = (m.LicenseUrl || {}).value || '', img = i && (i.thumburl || i.url);
    if (!i || !armsLic(lic, url) || !/^https:\/\/upload\.wikimedia\.org\//.test(img || '')) return null;
    var art = new DOMParser().parseFromString((m.Artist || {}).value || 'Wikimedia Commons', 'text/html').body.textContent.trim().slice(0, 80);
    return { src: img, full: /^https:\/\/upload\.wikimedia\.org\//.test(i.url || '') ? i.url : '', lic: lic, by: art, of: label, page: i.descriptionurl || '' };
  });
}
/* Every other country (Japan, Brazil, India, Canada, Australia, Mexico, Türkiye ...): start from the place's own Wikidata
   entity (found by its exact official ID, or by country + position within 8 km) and follow Wikidata's own "located in the
   administrative territorial entity" (P131) chain upwards, up to 4 steps, staying inside the same country (P17). The first
   parent with a coat of arms is the region; the first one with an ISO 3166-2 code (P300) is the state or province. */
var RCHAIN = {};
function regionChainFor(r) {
  if (RCHAIN[r.id]) return RCHAIN[r.id];
  var key = 'rchain1:' + r.id, c = store(key); if (c && c.t && Date.now() - c.t < 2592e6) return (RCHAIN[r.id] = Promise.resolve(c.v));
  if (!extOn()) return Promise.resolve([]);
  var cq = RARMS_CQ[r.country] || (typeof NZ_CQ === 'object' && NZ_CQ[r.country]), failed = false;
  var p131 = function (e) { return NZEmblemIdentity.values(e, 'P131').map(function (v) { return v && v.id; }).filter(Boolean); };
  var walk = function (ids, hop, found, seen) {
    ids = ids.filter(function (q) { return !seen[q]; }); if (!ids.length || hop >= 4) return Promise.resolve(found);
    var q = ids[0]; seen[q] = 1;
    return jget('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + q + '&props=claims|labels&languages=en&format=json&origin=*').then(function (j) {
      var e = j.entities && j.entities[q]; if (!e || !NZEmblemIdentity.values(e, 'P17').some(function (v) { return v && v.id === cq; })) return found;
      var f = NZEmblemIdentity.values(e, 'P94')[0], iso = NZEmblemIdentity.values(e, 'P300')[0], label = ((e.labels || {}).en || {}).value || q;
      if (f && (iso || !found.some(function (x) { return x.kind === 'region'; }))) found.push({ file: f, label: label, kind: iso ? 'state' : 'region' });
      if (iso) return found;   // the first-level division is the top: stop
      return walk(p131(e), hop + 1, found, seen);
    });
  };
  return (RCHAIN[r.id] = wikidataExactFor(r).then(function (e) {
    if (!e || !cq) return [];
    return walk(p131(e), 0, [], {}).then(function (found) {
      found = found.filter(function (x) { return x.kind === 'state'; }).concat(found.filter(function (x) { return x.kind === 'region'; })).slice(0, 2);
      return Promise.all(found.map(function (x) { return rarmsCommons(x.file, x.label).then(function (v) { if (v) v.kind = x.kind; return v; }); }));
    });
  }).then(function (vs) { return (vs || []).filter(Boolean); }).catch(function () { failed = true; return []; }).then(function (v) {
    if (!failed && extOn()) { try { store(key, { t: Date.now(), v: v }); } catch (e) {} } else delete RCHAIN[r.id];
    return v;
  }));
}
function rarmsImg(s, v, kind) {
  var a = document.createElement('a'); a.href = v.page || '#'; a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.title = 'Coat of arms of ' + v.of + ' (' + (kind === 'state' ? 'state or province' : 'region') + '). ' + v.by + '; ' + v.lic + '; Wikimedia Commons. Official-symbol restrictions may apply.';
  a.addEventListener('click', function (e) { e.stopPropagation(); });
  var im = new Image(); im.alt = 'Coat of arms of ' + v.of; im.referrerPolicy = 'no-referrer'; im.className = 'nz-rarms-img'; im.decoding = 'async';
  im.onload = function () { if (s.isConnected) { s.appendChild(a); s.hidden = false; } };
  im.onerror = function () { if (v.full && im.src !== v.full) im.src = v.full; };
  a.appendChild(im); im.src = v.src;
}
function regionArmsHTML(r) {
  var ts = regionArmsTargets(r); if (!ts.length) return (RARMS_CQ[r.country] || (typeof NZ_CQ === 'object' && NZ_CQ[r.country])) ? '<span class="nz-rarms" data-rarms="' + esc(r.id) + '"><span class="nz-rarm" data-rchain="' + esc(r.id) + '" hidden></span></span>' : '';
  return '<span class="nz-rarms" data-rarms="' + esc(r.id) + '">' + ts.map(function (t) { return '<span class="nz-rarm" data-rp="' + t.p + '" data-rv="' + esc(t.v) + '" data-rcq="' + t.cq + '" data-rkind="' + t.kind + '" hidden></span>'; }).join('') + '</span>';
}
function hydrateRegionArms(root) {
  if (!extOn()) return;
  (root || document).querySelectorAll('.nz-rarm:not([data-rstarted])').forEach(function (s) {
    s.dataset.rstarted = '1';
    if (s.dataset.rchain) { var rr = BYID[s.dataset.rchain]; if (rr) regionChainFor(rr).then(function (vs) { if (s.isConnected) vs.forEach(function (v) { rarmsImg(s, v, v.kind); }); }); return; }
    regionArmsFor({ p: s.dataset.rp, v: s.dataset.rv, cq: s.dataset.rcq }).then(function (v) {
      if (!v || !s.isConnected) return;
      rarmsImg(s, v, s.dataset.rkind);
    });
  });
}
if (typeof MutationObserver === 'function' && typeof document !== 'undefined') {
  var RARMS_Q = false;
  new MutationObserver(function () { if (RARMS_Q) return; RARMS_Q = true; setTimeout(function () { RARMS_Q = false; hydrateRegionArms(document); }, 50); })
    .observe(document.documentElement, { childList: true, subtree: true });
}
