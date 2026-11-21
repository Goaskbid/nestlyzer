/* Exact-code municipal emblem discovery; no name or parent-region fallback.
   Per-file Commons attribution and copyright licence are required; official-symbol restrictions remain applicable.
   External-content consent is rechecked before requests and before image insertion. */
(function () {
  var slot = document.querySelector('[data-sarms]'); if (!slot || !window.fetch) return;
  try { if (JSON.parse(localStorage.getItem('nz:ext')) === false) return; } catch (e) {}
  var d = slot.dataset, KEY = 'nz:arms6:' + d.id;
  var PROP = { CH: 'P771', DE: 'P439', FR: 'P374', IT: 'P635', ES: 'P772', AT: 'P964', NL: 'P382', BE: 'P1567' };
  var FAIL = {};
  function allowed(){try{return JSON.parse(localStorage.getItem('nz:ext'))!==false;}catch(e){return false;}}
  function get(u, n) {
    if(!allowed())return Promise.reject(FAIL);
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
    return get('https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=120&format=json&origin=*&titles=' + encodeURIComponent('File:' + f)).then(function (q) {
      var p = q.query && q.query.pages, i = p && Object.values(p)[0] && Object.values(p)[0].imageinfo && Object.values(p)[0].imageinfo[0], m = (i && i.extmetadata) || {};
      var l = (m.LicenseShortName || {}).value || '', u = (m.LicenseUrl || {}).value || '', img = i && (i.thumburl || i.url);
      if (!i || !lic(l, u) || !/^https:\/\/upload\.wikimedia\.org\//.test(img || '')) return null;
      var by = new DOMParser().parseFromString((m.Artist || {}).value || 'Wikimedia Commons', 'text/html').body.textContent.trim().slice(0, 80);
      return { src: img, full: /^https:\/\/upload\.wikimedia\.org\//.test(i.url || '') ? i.url : '', lic: l, by: by, of: of || '', page: i.descriptionurl || '' };
    });
  }
  function resolve() {
    // 2.15.30-r13: the collected file first (exact official code, no Wikidata request), live exact-code lookup otherwise
    return NZEmblemIdentity.collectedFile(d.cc,d.oid).then(function(f){
      if(f&&allowed())return commons(f,'').then(function(v){if(v)v.identity={property:'P94',code:String(d.oid),country:d.cc,source:'collected'};return v;});
      return live();
    },live);
  }
  function live() {
    var r={country:d.cc,oid:d.oid,id:d.id},request=NZEmblemIdentity.request(r);
    if(!request||!allowed())return Promise.resolve(null);
    return search('haswbstatement:'+request.property+'='+request.value).then(function(ids){return ids.length===1&&allowed()?entity(ids[0]):null;}).then(function(e){
      if(!allowed()||!NZEmblemIdentity.verify(e,request))return null;
      var own=val(e,'P94');if(!own)return null;
      return commons(own,'').then(function(v){if(v)v.identity={property:request.property,code:request.value,country:d.cc};return v;});
    });
  }
  function show(v) {
    if (!v || !v.identity || !allowed() || !slot.isConnected) return;
    var a = document.createElement('a'); a.href = v.page || '#'; a.target = '_blank'; a.rel = 'noopener';
    a.title='Coat of arms. '+v.by+', '+v.lic+', Wikimedia Commons. Official-symbol restrictions may apply.';
    var im = new Image(); im.alt = 'Coat of arms of ' + (v.of || d.name); im.width = 40; im.height = 48; im.decoding = 'async'; im.referrerPolicy = 'no-referrer';
    im.onload = function () { if(!allowed()||!slot.isConnected)return;slot.hidden=false;slot.replaceChildren(a); }; a.appendChild(im);
    im.onerror = function () { if (v.full && im.src !== v.full) im.src = v.full; };   // 2.15.30-r7: thumbnail refused, load the original file
    im.src = v.src;
  }
  var c; try { c = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (c && c.t && Date.now() - c.t < 2592e6) return show(c.v);
  resolve().then(function (v) { try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {} show(v); }, function () { /* not cached: try again next visit */ });
})();
