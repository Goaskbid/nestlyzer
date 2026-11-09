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
    if (photoUsable(c.image)) return c.image;
    return commonsImages(r, 1).then(function (a) { return a[0] || ''; });
  }).then(function (u) { IMGCACHE[r.id] = u; var keys = Object.keys(IMGCACHE); if (keys.length > 400) delete IMGCACHE[keys[0]]; store('img', IMGCACHE); return u; });
}
function commonsImages(r, limit) {
  var k = r.id + ':' + limit; if (CM[k]) return CM[k];
  var q = stripParen(r.name) + ' ' + localAreaOf(r) + ' ' + countryName(r.country);
  CM[k] = Promise.all([photoKit(), jget('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=' + encodeURIComponent(q) + '&gsrlimit=' + (limit + 6) + '&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=720&format=json&origin=*')]).then(function (aa) {
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
    if (w && c.extract) { var t = c.extract.split('. ').slice(0, 2).join('. '); w.innerHTML = '<p>' + esc(t) + (/\.$/.test(t) ? '' : '.') + '</p>' + (c.url ? '<a class="small" href="' + esc(c.url) + '" target="_blank" rel="noopener">Public article</a>' : '') + ' <span class="small muted">Text: Wikipedia, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>, first sentences.</span>'; }
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
var ARMS_ON = true;   // owner decision 7 Nov 2026: flags and coats of arms stay on (IP register item 2 records the SR 232.21 Art. 8 risk; set false to switch arms off)
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
    img.onload = function () { if (extOn()) img.style.display = ''; else img.remove(); };
    img.onerror = function () { if (!extOn()) { img.remove(); return; } i++; if (i < list.length) img.src = list[i]; else img.remove(); };
    img.src = list[0]; box.appendChild(img);
  }
  /* 2.13.3 IP audit: coats of arms are off. Swiss communal and cantonal arms may only be used by their public body (Federal
     Act on the Protection of the Swiss Coat of Arms, SR 232.21, Art. 8), German municipal arms are protected by state law,
     and Wikimedia files carry no per-image licence check here. Flags stay. Switch back only per verified file and licence. */
  if (!ARMS_ON) cands = [], regionArms = [];
  if (cands.length) chain(cands, 'Coat of arms of ' + r.name, r.name);
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
/* the printable booklet lives in the lazy module (src/more/booklet.js) to keep the start page small */
function openBooklet() { moreLoad().then(function (X) { X.openBooklet(); }); }
function printDoc(h, list, fname) { var w = window.open('', '_blank'), go = function (X) { X.printInto(w, typeof h === 'function' ? h(X) : h, list, fname); }; if (MOREX) go(MOREX); else moreLoad().then(go, function () { if (w && typeof h == 'string') { w.document.write(h); w.document.close(); } }); }
