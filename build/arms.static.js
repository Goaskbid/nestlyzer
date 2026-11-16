/* Nestlyzer 2.15.30: coat of arms on static place pages. Same rules as the app (src/js/50-enrich.js): the exact official
   municipality code on Wikidata, else the LAU code, else a name search checked by distance; image only from Wikimedia
   Commons and only under an open licence (CC0, CC BY, CC BY-SA, public domain); credited with author and licence.
   No cookies are sent, "Live content off" in the privacy settings is respected, answers are cached for 30 days and a
   failed lookup is never cached, so a busy moment at Wikimedia does not hide a coat of arms for a month. */
(function () {
  var slot = document.querySelector('[data-sarms]'); if (!slot || !window.fetch) return;
  try { if (JSON.parse(localStorage.getItem('nz:ext')) === false) return; } catch (e) {}
  var d = slot.dataset, KEY = 'nz:arms3:' + d.id;
  var PROP = { CH: 'P771', DE: 'P439', FR: 'P374', IT: 'P635', ES: 'P772', AT: 'P964', NL: 'P382', BE: 'P1567' };
  var FAIL = {};
  function get(u, n) {
    n = n || 0;
    return fetch(u, { credentials: 'omit', referrerPolicy: 'no-referrer' }).then(function (r) {
      if (r.status === 429 || r.status >= 500) throw { retry: 1 };
      if (!r.ok) throw { hard: 1 }; return r.json();
    }).catch(function (e) {
      if (n < 2 && !(e && e.hard)) return new Promise(function (ok) { setTimeout(ok, 900 * (n + 1) * (n + 1)); }).then(function () { return get(u, n + 1); });
      throw FAIL;
    });
  }
  var WD = 'https://www.wikidata.org/w/api.php?format=json&origin=*&';
  function search(q) { return get(WD + 'action=query&list=search&srlimit=3&srsearch=' + encodeURIComponent(q)).then(function (j) { return ((j.query || {}).search || []).map(function (s) { return s.title; }); }); }
  function entity(id) { return get(WD + 'action=wbgetentities&props=claims|labels&languages=en&ids=' + id).then(function (j) { return j.entities && j.entities[id]; }); }
  function val(e, p) { var c = e && e.claims && e.claims[p]; c = c && c[0] && c[0].mainsnak; return c && c.datavalue && c.datavalue.value; }
  function near(e) { var g = val(e, 'P625'); if (!g || !d.lat) return true; var dy = (g.latitude - d.lat) * 111, dx = (g.longitude - d.lon) * 111 * Math.cos(d.lat * Math.PI / 180); return Math.sqrt(dx * dx + dy * dy) < 30; }
  function lic(l, u) { return /^(CC0|CC[ -]BY(?:[ -]SA)?[ -][1-4]\.[05]\b.*|Public domain|PD\b.*)$/i.test(l) && !/noncommercial|no ?derivatives|\bNC\b|\bND\b/i.test(l + ' ' + u); }
  function commons(f, of) {
    return get('https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=96&format=json&origin=*&titles=' + encodeURIComponent('File:' + f)).then(function (q) {
      var p = q.query && q.query.pages, i = p && Object.values(p)[0] && Object.values(p)[0].imageinfo && Object.values(p)[0].imageinfo[0], m = (i && i.extmetadata) || {};
      var l = (m.LicenseShortName || {}).value || '', u = (m.LicenseUrl || {}).value || '', img = i && (i.thumburl || i.url);
      if (!i || !lic(l, u) || !/^https:\/\/upload\.wikimedia\.org\//.test(img || '')) return null;
      var by = new DOMParser().parseFromString((m.Artist || {}).value || 'Wikimedia Commons', 'text/html').body.textContent.trim().slice(0, 80);
      return { src: img, lic: l, by: by, of: of || '', page: i.descriptionurl || '' };
    });
  }
  function resolve() {
    var tries = [];
    if (PROP[d.cc]) tries.push('haswbstatement:' + PROP[d.cc] + '=' + d.oid);
    if (d.gisco) tries.push('haswbstatement:P782=' + d.gisco.replace(/^[A-Z]{2}_/, ''));
    return (function next(i) {
      if (i >= tries.length) return get(WD + 'action=wbsearchentities&language=en&limit=7&search=' + encodeURIComponent(d.name)).then(function (j) {
        var h = (j.search || []).find(function (x) { return /municip|commune|comune|gemeinde|city|town|village|municipio|gmina|obec/i.test(x.description || '') && (x.description || '').toLowerCase().indexOf((d.cname || '').toLowerCase()) >= 0; });
        return h ? h.id : null; });
      return search(tries[i]).then(function (ids) { return ids.length === 1 ? ids[0] : next(i + 1); });
    })(0).then(function (q) { return q ? entity(q) : null; }).then(function (e) {
      if (!e || !near(e)) return null;
      var own = val(e, 'P94'); if (own) return commons(own, '');
      var up = val(e, 'P131'); up = up && up.id; if (!up) return null;
      return entity(up).then(function (pe) { var f = val(pe, 'P94'); return f ? commons(f, ((pe.labels || {}).en || {}).value || 'the region') : null; });
    });
  }
  function show(v) {
    if (!v) return;
    var a = document.createElement('a'); a.href = v.page || '#'; a.target = '_blank'; a.rel = 'noopener';
    a.title = (v.of ? 'Coat of arms of ' + v.of + ' (no own arms on record). ' : 'Coat of arms. ') + v.by + ', ' + v.lic + ', Wikimedia Commons';
    var im = new Image(); im.src = v.src; im.alt = 'Coat of arms of ' + (v.of || d.name); im.width = 40; im.height = 48; im.decoding = 'async'; im.referrerPolicy = 'no-referrer';
    im.onload = function () { slot.hidden = false; }; a.appendChild(im); slot.appendChild(a);
  }
  var c; try { c = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (c && c.t && Date.now() - c.t < 2592e6) return show(c.v);
  resolve().then(function (v) { try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {} show(v); }, function () { /* not cached: try again next visit */ });
})();
