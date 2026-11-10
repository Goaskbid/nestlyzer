/* Map: MapLibre GL (self-hosted), OpenFreeMap basemap with offline-safe fallback */
var MAP = null, MAPREADY = null, MAPSTATE = { cc: null, featIdx: null, markers: [], popup: null, beforeId: undefined, nuts: null, chGeo: null, gisco: null, sel: null };
var GEO_CACHE = {};
function loadScript(src) { return (window.NZ_BLOB ? window.NZ_BLOB(src) : Promise.resolve(src)).then(function (u) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = u; s.async = true; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); }; document.head.appendChild(s); }); }); }
function loadCss(href) { if ($('link[data-href="' + href + '"]')) return; var l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.href = href; document.head.appendChild(l); (window.NZ_BLOB ? window.NZ_BLOB(href) : Promise.resolve(href)).then(function (u) { l.href = u; }); }
function cssVar(k) { return getComputedStyle(document.documentElement).getPropertyValue(k).trim(); }
function isDark() { return cssVar('color-scheme') === 'dark'; }
function timeoutFetch(url, ms) { return Promise.race([fetch(url).then(function (r) { if (!r.ok) throw 0; return r.json(); }), new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })]); }

function mapProgress(pct, text) {
  var el = $('#maploading');
  if (!el) return;
  if (pct >= 100) { el.hidden = true; return; }
  el.hidden = false; $('#maploading b').textContent = text || 'Loading map'; $('#maploading i').style.width = pct + '%';
}
function geo(url) { if (!GEO_CACHE[url]) GEO_CACHE[url] = getJSON(url); return GEO_CACHE[url]; }

function ensureMap() {
  if (MAPREADY) return MAPREADY;
  mapProgress(10, 'Loading map engine');
  loadCss('/vendor/maplibre-gl.css?v=' + VERSION);
  MAPREADY = Promise.all([loadScript('/vendor/maplibre-gl.js?v=' + VERSION), loadScript('/vendor/topojson-client.min.js?v=' + VERSION)])
    .then(function () {
      mapProgress(35, 'Loading basemap');
      var dark = isDark();
      var urls = dark ? ['https://tiles.openfreemap.org/styles/dark', 'https://tiles.openfreemap.org/styles/positron'] : ['https://tiles.openfreemap.org/styles/positron'];
      function tryUrl(i) { if (i >= urls.length) return Promise.reject(new Error('no basemap')); return timeoutFetch(urls[i], 4500).catch(function () { return tryUrl(i + 1); }); }
      return tryUrl(0).then(function (style) { MAPSTATE.basemap = 'OpenFreeMap'; return style; }).catch(function () {
        MAPSTATE.basemap = 'offline';
        return { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': cssVar('--surface-2') } }] };
      });
    })
    .then(function (style) {
      return new Promise(function (resolve) {
        MAP = new maplibregl.Map({ container: 'map', style: style, center: [8.2, 46.8], zoom: 6.6, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, maxZoom: 15, minZoom: 2.5, cooperativeGestures: false });
        MAP.touchZoomRotate.disableRotation();
        MAP.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
        MAP.on('load', function () {
          MAP.resize();
          var layers = MAP.getStyle().layers || [];
          var firstSymbol = layers.find(function (l) { return l.type === 'symbol'; });
          MAPSTATE.beforeId = firstSymbol ? firstSymbol.id : undefined;
          // country and city names stay readable over the coloured data: every basemap label sits above the data layers
          // and gets a solid halo in the page colour, so dots and regions never cover a name at any zoom
          layers.forEach(function (l) {
            if (l.type !== 'symbol' || !(l.layout && l.layout['text-field'])) return;
            try { MAP.setPaintProperty(l.id, 'text-halo-color', cssVar('--surface')); MAP.setPaintProperty(l.id, 'text-halo-width', /country|place|city|town|capital/.test(l.id) ? 2 : 1.4); MAP.setPaintProperty(l.id, 'text-halo-blur', 0.4);
              if (/country|place|city|town|capital/.test(l.id)) MAP.setPaintProperty(l.id, 'text-color', cssVar('--ink')); } catch (e) {}
          });
          addBaseLayers().then(function () { mapProgress(100); resolve(MAP); });
        });
        MAP.on('error', function (e) { if (window.console) console.warn('map', e && e.error && e.error.message); });
      });
    });
  return MAPREADY;
}

function fillExpr() {
  return ['case', ['boolean', ['feature-state', 'out'], false], cssVar('--out'),
    ['<', ['coalesce', ['feature-state', 'v'], -1], 0], cssVar('--novalue'),
    ['step', ['feature-state', 'v'], cssVar('--r0'), 34, cssVar('--r1'), 48, cssVar('--r2'), 60, cssVar('--r3'), 72, cssVar('--r4'), 85, cssVar('--r5')]];
}
function addBaseLayers() {
  return geo('/data/geo/nuts3.topo.json?v=' + VERSION).then(function (topo) {
    var cnt = topojson.feature(topo, topo.objects.cntrg);
    var nuts = topojson.feature(topo, topo.objects.nutsrg);
    nuts.features.forEach(function (f, i) { f.id = i; f.properties.code = f.properties.id; });
    MAPSTATE.nuts = nuts;
    if (MAPSTATE.basemap === 'offline') {
      MAP.addSource('countries', { type: 'geojson', data: cnt });
      MAP.addLayer({ id: 'countries-fill', type: 'fill', source: 'countries', paint: { 'fill-color': cssVar('--surface'), 'fill-opacity': 1 } });
      MAP.addLayer({ id: 'countries-line', type: 'line', source: 'countries', paint: { 'line-color': cssVar('--line-2'), 'line-width': 0.8 } });
    }
    MAP.addSource('nuts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    MAP.addLayer({ id: 'nuts-fill', type: 'fill', source: 'nuts', paint: { 'fill-color': fillExpr(), 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.88, 7, 0.7, 9, 0.3, 11, 0.1] } }, MAPSTATE.beforeId);
    MAP.addLayer({ id: 'nuts-line', type: 'line', source: 'nuts', paint: { 'line-color': cssVar('--line-2'), 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.4, 9, 1.2] } }, MAPSTATE.beforeId);
    MAP.addSource('ch', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    MAP.addLayer({ id: 'ch-fill', type: 'fill', source: 'ch', paint: { 'fill-color': fillExpr(), 'fill-opacity': ['case', ['boolean', ['feature-state', 'out'], false], 0.45, 0.88] } }, MAPSTATE.beforeId);
    MAP.addLayer({ id: 'ch-line', type: 'line', source: 'ch', paint: { 'line-color': cssVar('--surface'), 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.2, 10, 0.9], 'line-opacity': 0.8 } }, MAPSTATE.beforeId);
    MAP.addSource('chlakes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    MAP.addLayer({ id: 'chlakes', type: 'fill', source: 'chlakes', paint: { 'fill-color': isDark() ? '#1d3b57' : '#b9d8ee' } }, MAPSTATE.beforeId);
    MAP.addSource('chcantons', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    MAP.addLayer({ id: 'chcantons', type: 'line', source: 'chcantons', paint: { 'line-color': cssVar('--ink-2'), 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.7, 10, 1.6], 'line-opacity': 0.55 } }, MAPSTATE.beforeId);
    MAP.addSource('gisco', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    MAP.addLayer({ id: 'gisco-fill', type: 'fill', source: 'gisco', paint: { 'fill-color': fillExpr(), 'fill-opacity': 0.85 } }, MAPSTATE.beforeId);
    MAP.addLayer({ id: 'gisco-line', type: 'line', source: 'gisco', paint: { 'line-color': cssVar('--surface'), 'line-width': 0.5 } }, MAPSTATE.beforeId);
    MAP.addSource('pts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    MAP.addLayer({ id: 'pts', type: 'circle', source: 'pts', paint: {
      'circle-color': fillExpr(),
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, ['interpolate', ['linear'], ['get', 'p'], 0, 1.3, 20000, 2.4, 500000, 5], 8, ['interpolate', ['linear'], ['get', 'p'], 0, 2.6, 20000, 5, 500000, 11], 12, ['interpolate', ['linear'], ['get', 'p'], 0, 6, 20000, 10, 500000, 18]],
      'circle-opacity': ['case', ['boolean', ['feature-state', 'out'], false], 0.35, 0.92],
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 5, ['case', ['boolean', ['feature-state', 'sel'], false], 3, 0], 9, ['case', ['boolean', ['feature-state', 'sel'], false], 3.5, 0.6]],
      'circle-stroke-color': ['case', ['boolean', ['feature-state', 'sel'], false], cssVar('--sun'), cssVar('--surface')] } }, MAPSTATE.beforeId);
    MAP.addLayer({ id: 'sel-line', type: 'line', source: 'ch', filter: ['==', ['id'], -1], paint: { 'line-color': cssVar('--sun'), 'line-width': 3.5 } }, MAPSTATE.beforeId);
    MAP.addLayer({ id: 'gisco-sel', type: 'line', source: 'gisco', filter: ['==', ['id'], -1], paint: { 'line-color': cssVar('--sun'), 'line-width': 3 } }, MAPSTATE.beforeId);
    // numbered pins are page elements above the map: zoomed out they shrink and let names show through
    var far = function () { var el = MAP.getContainer(); if (el) el.classList.toggle('map-far', MAP.getZoom() < 6.2); };
    MAP.on('zoom', far); far();
    bindMapEvents();
  });
}
function recolorTheme() {
  if (!MAP || !MAP.isStyleLoaded()) return;
  ['nuts-fill', 'ch-fill', 'gisco-fill'].forEach(function (l) { if (MAP.getLayer(l)) MAP.setPaintProperty(l, 'fill-color', fillExpr()); });
  if (MAP.getLayer('pts')) MAP.setPaintProperty('pts', 'circle-color', fillExpr());
}

function bindMapEvents() {
  var hoverable = ['ch-fill', 'pts', 'gisco-fill'];
  MAPSTATE.popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, maxWidth: '260px' });
  hoverable.forEach(function (layer) {
    MAP.on('mousemove', layer, function (e) {
      var f = e.features && e.features[0]; if (!f) return;
      var r = recordForFeature(layer, f); if (!r) return;
      MAP.getCanvas().style.cursor = 'pointer';
      var v = surfaceValue(r);
      MAPSTATE.popup.setLngLat(e.lngLat).setHTML('<b>' + esc(r.name) + '</b><br>' + esc(areaOf(r)) + '<br>' + (fin(v) ? layerLabel() + ': <b>' + Math.round(v) + '</b>' : 'No value for ' + layerLabel().toLowerCase()) + (RES && RES.byId[r.id] ? ' · rank #' + RES.byId[r.id].rank : '')).addTo(MAP);
    });
    MAP.on('mouseleave', layer, function () { MAP.getCanvas().style.cursor = ''; MAPSTATE.popup.remove(); });
    MAP.on('click', layer, function (e) {
      if(window.NZ_DRAW_ACTIVE)return;
      var f = e.features && e.features[0]; if (!f) return;
      var r = recordForFeature(layer, f); if (r) selectPlace(r.id, { from: 'map' });
    });
  });
  MAP.on('click', 'nuts-fill', function (e) {
    if(window.NZ_DRAW_ACTIVE)return;
    if (S.cc === 'CH') return;
    var hit = MAP.queryRenderedFeatures(e.point, { layers: ['pts', 'gisco-fill'] });
    if (hit.length) return;
    var f = e.features && e.features[0]; if (!f) return;
    var code = f.properties.code;
    if (code && code.slice(0, 2) === (S.cc === 'EL' ? 'EL' : S.cc) && code.length === 5) {
      var lvl = regionLevel(S.cc), reg = lvl === 'n1' ? code.slice(0, 3) : code.slice(0, 4);
      S.region = lvl === 'none' ? 'ALL' : reg; S.area = code; update({ fit: true });
    }
  });
}
function recordForFeature(layer, f) {
  if (layer === 'ch-fill') return BYID['CH:' + f.id];
  if (layer === 'pts') return SHARD && SHARD.records[f.id];
  if (layer === 'gisco-fill') return SHARD && SHARD.records[f.id];
  return null;
}
var LAYERS = [['score', 'Profile score'], ['commuter_access', 'Commute access'], ['student_access', 'Campus access'], ['tax', 'Taxes'], ['safety', 'Safety'], ['family', 'Family'], ['health', 'Health'], ['jobs', 'Jobs'], ['lifestyle', 'Lifestyle'], ['environment', 'Green space'], ['affordability', 'Costs'], ['mobility', 'Mobility'], ['coast', 'Coast'], ['foundation', 'Foundation'], ['demographics', 'Demographics']];
function layerLabel() { var l = LAYERS.concat(PLAYERS).find(function (x) { return x[0] === S.layer; }); return l ? l[1] : 'Score'; }
var LAYER_HAS = {};
function layerHasData(key) {
  if (!SHARD || key === 'score') return true;
  var k = S.cc + '|' + S.profile + '|' + key; if (k in LAYER_HAS) return LAYER_HAS[k];
  var old = S.layer, rs = SHARD.records, step = Math.max(1, Math.floor(rs.length / 400)), ok = false;
  S.layer = key; try { for (var i = 0; i < rs.length && !ok; i += step) if (fin(surfaceValue(rs[i]))) ok = true; } catch (e) { ok = true; } S.layer = old;
  return (LAYER_HAS[k] = ok);
}
function surfaceValue(r) { var pk = playerKey(S.layer); if (pk) return paramSurface(r, pk); return ENGINE.surface(r, S.profile, S.layer, S.cc); }

function setSource(id, data) { var s = MAP.getSource(id); if (s) s.setData(data); }
function loadCountryGeometry(cc) {
  // only build layers from the shard that belongs to this country (a route change can arrive before the shard)
  if (!SHARD || SHARD !== SHARDS[cc]) return Promise.resolve();
  if (MAPSTATE.cc === cc) return Promise.resolve();
  MAPSTATE.cc = cc; MAPSTATE.gisco = null;
  setSource('gisco', { type: 'FeatureCollection', features: [] });
  if (cc === 'CH') {
    mapProgress(60, 'Loading Swiss municipality boundaries');
    return geo('/data/geo/ch.topo.json?v=' + VERSION).then(function (t) {
      var m = topojson.feature(t, t.objects.municipalities);
      m.features = m.features.filter(function (f) { return BYID['CH:' + f.id]; });
      MAPSTATE.chGeo = m;
      setSource('ch', m);
      setSource('chlakes', topojson.feature(t, t.objects.lakes));
      setSource('chcantons', topojson.mesh(t, t.objects.cantons, function (a, b) { return a !== b; }));
      setSource('pts', { type: 'FeatureCollection', features: [] });
      setSource('nuts', { type: 'FeatureCollection', features: [] });
      mapProgress(100);
    });
  }
  setSource('ch', { type: 'FeatureCollection', features: [] }); setSource('chlakes', { type: 'FeatureCollection', features: [] }); setSource('chcantons', { type: 'FeatureCollection', features: [] });
  var feats = [];
  SHARD.records.forEach(function (r, i) { if (fin(r.lat) && fin(r.lon)) feats.push({ type: 'Feature', id: i, properties: { p: r.population }, geometry: { type: 'Point', coordinates: [r.lon, r.lat] } }); });
  feats.sort(function (a, b) { return a.properties.p - b.properties.p; });
  setSource('pts', { type: 'FeatureCollection', features: feats });
  if (isWorld(cc)) {  // outside Europe: state, province or prefecture outlines, one small file per country
    MAPSTATE.nutsCountry = []; setSource('nuts', { type: 'FeatureCollection', features: [] });
    return geo('/data/geo/w/' + cc + '.json?v=' + VERSION).then(function (fc) {
      if (MAPSTATE.cc !== cc) return;
      fc.features.forEach(function (f, i) { f.id = 100000 + i; f.properties.code = f.properties.id; });
      MAPSTATE.nutsCountry = fc.features;
      setSource('nuts', { type: 'FeatureCollection', features: fc.features });
    }).catch(function () {});
  }
  var pre = cc === 'EL' ? 'EL' : cc;
  var nf = MAPSTATE.nuts.features.filter(function (f) { return String(f.properties.code).slice(0, 2) === pre; });
  MAPSTATE.nutsCountry = nf;
  setSource('nuts', { type: 'FeatureCollection', features: nf });
  return Promise.resolve();
}

function paintMap() {
  if (!MAP || !SHARD) return;
  var cc = S.cc, inS = {};
  SCOPE.forEach(function (r) { inS[r.id] = 1; });
  var vals = {};
  if (cc === 'CH') {
    (MAPSTATE.chGeo ? MAPSTATE.chGeo.features : []).forEach(function (f) {
      var r = BYID['CH:' + f.id]; if (!r) return;
      var out = !inScope(r);
      var v = out ? null : surfaceValue(r);
      MAP.setFeatureState({ source: 'ch', id: f.id }, { out: out, v: fin(v) ? v : -1 });
    });
  } else {
    var agg = {};
    SHARD.records.forEach(function (r, i) {
      if (!fin(r.lat)) return;
      var out = !inScope(r);
      var v = out ? null : surfaceValue(r);
      MAP.setFeatureState({ source: 'pts', id: i }, { out: out, v: fin(v) ? v : -1 });
      if (MAPSTATE.gisco) MAP.setFeatureState({ source: 'gisco', id: i }, { out: out, v: fin(v) ? v : -1 });
      if (!out && fin(v) && r.n3) { var a = agg[r.n3] || (agg[r.n3] = [0, 0]); var w = Math.sqrt(Math.max(r.population, 1)); a[0] += v * w; a[1] += w; }
    });
    (MAPSTATE.nutsCountry || []).forEach(function (f) {
      var a = agg[f.properties.code];
      var inside = SCOPE.some ? null : null;
      MAP.setFeatureState({ source: 'nuts', id: f.id }, { out: !a, v: a ? a[0] / a[1] : -1 });
    });
  }
  paintSelection();
  paintMarkers();
  renderLegend();
}
function paintSelection() {
  if (!MAP) return;
  var sel = S.selected ? BYID[S.selected] : null;
  if (MAPSTATE.sel != null && MAPSTATE.selSrc) { try { MAP.setFeatureState({ source: MAPSTATE.selSrc, id: MAPSTATE.sel }, { sel: false }); } catch (e) {} }
  MAPSTATE.sel = null;
  MAP.setFilter('sel-line', ['==', ['id'], sel && sel.country === 'CH' ? Number(sel.oid) : -1]);
  if (sel && sel.country !== 'CH' && SHARD && sel.country === S.cc) {
    var i = SHARD.records.indexOf(sel);
    MAP.setFeatureState({ source: 'pts', id: i }, { sel: true }); MAPSTATE.sel = i; MAPSTATE.selSrc = 'pts';
    MAP.setFilter('gisco-sel', ['==', ['id'], MAPSTATE.gisco ? i : -1]);
  }
}
function clearMarkers() { MAPSTATE.markers.forEach(function (m) { m.remove(); }); MAPSTATE.markers = []; }
function addMarker(lngLat, cls, text, title, onClick) {
  var el = document.createElement('button');
  el.className = 'pin ' + cls; el.type = 'button'; el.textContent = text; el.title = title; el.setAttribute('aria-label', title);
  el.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
  var m = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(MAP);
  var prio = /\bsel\b/.test(cls) ? 0 : cls === 'anc' ? 1 : cls === 'hub' ? 500 : cls === 'xb' ? 900 : (+String(text).replace(/^[A-Z]{2} /, '') + (/\blang\b/.test(cls) ? 10 : 0) || 400);
  m._prio = prio; m._ll = lngLat;
  MAPSTATE.markers.push(m);
}
function declutterMarkers() {
  if (!MAP || !MAPSTATE.markers.length) return;
  var kept = [], list = MAPSTATE.markers.slice().sort(function (a, b) { return a._prio - b._prio; });
  list.forEach(function (m) {
    var el = m.getElement(), p = MAP.project(m._ll);
    if (!m._m) { m._w = el.offsetWidth || 28; m._h = el.offsetHeight || 26; m._m = el.offsetWidth > 0; }
    p.w = m._w; p.h = m._h;
    // pins around the open place (airport, port, campus, city) always show; numbered pins give way to them
    var clash = !el.classList.contains('anc') && kept.some(function (q) { return Math.abs(q.x - p.x) < (q.w + p.w) / 2 + 3 && Math.abs(q.y - p.y) < (q.h + p.h) / 2 + 3; });
    el.classList.toggle('hidden', clash);
    if (!clash) kept.push(p);
  });
}
function coordOf(r) {
  if (fin(r.lat) && fin(r.lon)) return [r.lon, r.lat];
  return null;
}
function paintMarkers() {
  clearMarkers();
  if (!MAP || !RES) return;
  var leaders = leaderSet();
  leaders.forEach(function (x) {
    var c = coordOf(x.r); if (!c) return;
    // a language-area leader carries its rank inside that language area and says so; the overall rank is in the tooltip (NZ-GLOBAL-004)
    var lab = x._lrank ? x._lcode + ' ' + x._lrank : String(x.rank);
    var tip = x._low ? '#' + x.rank + ' of ' + RES.scored.length + ' in ' + scopeName() + ' (among the lowest fits for this profile): ' + x.r.name : x._lrank ? '#' + x._lrank + ' among ' + x._lname + ' places, #' + x.rank + ' of ' + RES.scored.length + ' in ' + scopeName() + ': ' + x.r.name : '#' + x.rank + ' of ' + RES.scored.length + ' in ' + scopeName() + ': ' + x.r.name;
    if (S.layer && S.layer !== 'score') { var ly = (LAYERS.find(function (l) { return l[0] === S.layer; }) || [0, S.layer])[1]; tip = 'Profile fit rank, not ' + ly + ' (the colours show ' + ly + '). ' + tip; }
    addMarker(c, (x.id === S.selected ? 'sel' : '') + (x._lrank ? ' lang' : ''), lab, tip, function () { selectPlace(x.id, { from: 'map' }); });
  });
  if (S.profile === 'student' && S.cc === 'CH') {
    META.config.studentHubsCH.forEach(function (n) {
      var r = SHARD.records.find(function (x) { return x.name === n || stripParen(x.name) === n; });
      var c = r && coordOf(r); if (!c) return;
      addMarker(c, 'hub', '🎓', 'University hub: ' + r.name, function () { selectPlace(r.id, { from: 'map' }); });
    });
  }
  if (S.selected && BYID[S.selected]) { var ar = BYID[S.selected], tok = MAPSTATE.ancTok = (MAPSTATE.ancTok || 0) + 1; moreLoad().then(function (X) { if (tok === MAPSTATE.ancTok) X.anchorPins(ar, tok); }, function () {}); }
  crossBorderForScope().forEach(function (x) {
    addMarker([x.lon, x.lat], 'xb', '⇄', x.label + ': ' + x.note + ' (about ' + Math.round(x.distance) + ' km)', function () { openCrossBorder(x); });
  });
  declutterMarkers();
  requestAnimationFrame(declutterMarkers);
  if (!MAPSTATE.declutterBound) { MAPSTATE.declutterBound = true; MAP.on('moveend', declutterMarkers); MAP.on('zoom', declutterMarkers); MAP.on('idle', declutterMarkers); MAP.on('moveend', zoneHook); }
  zoneHook();
}
/* 2.15.11: districts of dominant cities on the map (/assets/more.js zonesMap) */
function zoneHook() { if (MAP && MAP.getZoom && (MAP.getZoom() >= 8 || MAP._nzZones)) moreLoad().then(function (X) { if (X.zonesMap) X.zonesMap(MAP, S.profile); }, function () {}); }
function leaderSet() {
  if (!RES || !RES.scored.length) return [];
  // lowest fit: only places that are scored and eligible; unscored or excluded places never count as the worst (NZ-GLOBAL-006)
  if (S.pinMode === 'low') return RES.scored.slice(-10).reverse().map(function (x) { return Object.assign({}, x, { _low: 1 }); });
  var keys = activeLanguageKeys();
  if (keys.length > 1) {
    var out = [];
    keys.forEach(function (k) {
      var a = META.config.languageAreas[k], nm = a ? a.name.replace(' options', '').replace('-speaking', '') : k;
      RES.scored.filter(function (x) { return languageArea(x.r) === k; }).slice(0, 5).forEach(function (x, i) {
        out.push(x.rank <= 10 ? x : Object.assign({}, x, { _lrank: i + 1, _lcode: nm.slice(0, 2).toUpperCase(), _lname: nm }));
      });
    });
    return out;
  }
  return RES.scored.slice(0, 10);
}
function scopeBounds() {
  var xs = [], ys = [];
  var pts = SCOPE.filter(function (r) { return fin(r.lat); });
  if (pts.length > 20) { // leave out islands far from the main cluster (Azores, Madeira, Canaries, overseas France) when they are a small minority
    var mx = pts.map(function (r) { return r.lon; }).sort(function (a, b) { return a - b; })[pts.length >> 1], my = pts.map(function (r) { return r.lat; }).sort(function (a, b) { return a - b; })[pts.length >> 1];
    var near = pts.filter(function (r) { return km([mx, my], [r.lon, r.lat]) < 900; });
    if (near.length >= pts.length * 0.9) pts = near;
  }
  pts.forEach(function (r) { xs.push(r.lon); ys.push(r.lat); });
  if (!xs.length) { var cm = countryMeta(S.cc); return cm.bbox; }
  xs.sort(function (a, b) { return a - b; }); ys.sort(function (a, b) { return a - b; });
  // robust extent: ignore far-flung outliers such as overseas departments
  var q = xs.length > 60 ? 0.01 : 0, lo = Math.floor(q * (xs.length - 1)), hi = Math.ceil((1 - q) * (xs.length - 1));
  var b = [xs[lo], ys[lo], xs[hi], ys[hi]];
  if (b[2] - b[0] < 0.02) { b[0] -= 0.05; b[2] += 0.05; } if (b[3] - b[1] < 0.02) { b[1] -= 0.05; b[3] += 0.05; }
  return b;
}
function fitScope(animate) {
  if (!MAP) return;
  MAP.resize();
  var b = scopeBounds(); if (!b) return;
  var pad = window.innerWidth < 900 ? 24 : 48;
  var right = $('#place') && $('#place').classList.contains('open') && window.innerWidth >= 900 ? 480 : 0;
  var phone = window.innerWidth < 900;
  MAP.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: { top: phone ? 100 : pad + 40, bottom: phone ? 96 : pad + 40, left: pad, right: pad + right }, maxZoom: 11, duration: animate === false ? 0 : 700 });
}
function flyToRecord(r) {
  if (!MAP || !r) return;
  var c = coordOf(r); if (!c) return;
  var z = Math.max(MAP.getZoom(), r.country === 'CH' ? 9.5 : 9);
  var right = window.innerWidth >= 900 ? 480 : 0;
  MAP.easeTo({ center: c, zoom: z, padding: { right: right, left: 0, top: 0, bottom: 0 }, duration: 650 });
}

function renderLegend() {
  var el = $('#legend'); if (!el) return;
  var cols = ['--r0', '--r1', '--r2', '--r3', '--r4', '--r5'].map(cssVar);
  var pk = playerKey(S.layer), ticks = ['low', '34', '48', '60', '72', '85+'];
  if (pk) {
    var P = PARAM[pk];
    var short = function (v) { if (P.unit === 'km') return v < 1 ? '<1' : fmt(v, v < 10 ? 1 : 0); if (P.unit === 'm') return fmt(Math.round(v / 10) * 10); if (P.unit === 'h') { var mm = Math.round(v * 60); return Math.floor(mm / 60) + ':' + ('0' + mm % 60).slice(-2); } if (P.unit === 'clock') return clock(v); if (P.unit === '%') return signed(v, 0) + '%'; return v >= 10000 ? fmt(v / 1000, 0) + 'k' : fmtInt(v); };
    var last = null;
    ticks = [0, 34, 48, 60, 72, 85].map(function (t, i) { var v = valueAtPct(S.cc, pk, P.dir < 0 ? 100 - t : t); if (v == null) return ''; var s = short(v); if (s === last) return ''; last = s; return (i === 0 ? '' : (P.dir < 0 ? '≤' : '≥')) + s; });
    ticks[0] = P.dir < 0 ? 'far' : 'low';
  }
  el.innerHTML = '<div><b>' + (S.layer === 'score' ? 'Fit for ' + esc(profileName(S.profile).toLowerCase()) : esc(layerLabel())) + '</b>' + (S.layer === 'score' ? '' : pk ? ' <span class="muted">(' + esc(PARAM[pk].unit || 'count') + ', within ' + esc(countryName(S.cc)) + ')</span>' : '') + '</div>' +
    '<div class="bar">' + cols.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</div>' +
    '<div class="ticks">' + ticks.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' +
    '<div class="keys"><span style="--k:' + cssVar('--out') + '">outside scope</span><span style="--k:' + cssVar('--novalue') + '">not coloured</span><span style="--k:#fff;border:1px dashed">⇄ cross-border</span><span style="--k:' + cssVar('--navy') + '">numbered pin: profile rank</span></div>' +
    (RES && RES.scored.length > 20 ? '<div class="pinmode" role="group" aria-label="Which places get a pin"><button type="button" data-pinmode="top" aria-pressed="' + (S.pinMode !== 'low') + '">Best 10</button><button type="button" data-pinmode="low" aria-pressed="' + (S.pinMode === 'low') + '">Lowest 10</button></div>' : '');
  var note = $('#mapnote');
  if (note) {
    var n = SCOPE.length, colored = SCOPE.filter(function (r) { return fin(surfaceValue(r)); }).length;
    if (!colored && n) { var w = document.createElement('div'); w.className = 'small'; w.style.marginTop = '4px'; w.innerHTML = 'Pick another layer to colour the map for ' + esc(countryName(S.cc)) + '.'; el.appendChild(w); }
    note.textContent = scopeName() + ': ' + fmtInt(n) + ' ' + unitWord(S.cc, n) + ' in scope, ' + fmtInt(colored) + ' coloured. ' + (S.cc === 'CH' ? 'Boundaries: swisstopo via swiss-maps 2021.' : isWorld(S.cc) ? 'Dots sit at the place centres from GeoNames; shaded areas are ' + (LOCAL_KIND[S.cc] || 'region').toLowerCase().replace(/^[a-z]{2} /, '') + ' outlines (Natural Earth).' : (MAPSTATE.gisco ? 'Boundaries: Eurostat GISCO LAU 2024.' : 'Dots sit at population-weighted centres (EDJNet / GISCO); shaded areas are NUTS 3 regions.')) + (MAPSTATE.basemap === 'offline' ? ' Basemap unavailable, data layers still shown.' : '');
  }
}

/* Optional: official GISCO LAU polygons for the current European scope (large download, off the main thread) */
var GISCO_URL = 'https://gisco-services.ec.europa.eu/distribution/v2/lau/topojson/LAU_RG_01M_2024_4326.json';
function loadGiscoBoundaries() {
  if (S.cc === 'CH' || !SHARD) return;
  var ids = {}; SHARD.records.forEach(function (r, i) { if (inScope(r)) ids[r.gisco] = i; });
  var n = Object.keys(ids).length;
  if (n > 6000) { toast('Pick a smaller region first', 'Detailed boundaries load for up to 6,000 municipalities at a time. This scope has ' + fmtInt(n) + '.'); return; }
  mapProgress(5, 'Downloading official GISCO boundaries (large file, about a minute)');
  var src = "self.onmessage=async function(e){try{var r=await fetch(e.data.url);if(!r.ok)throw new Error('HTTP '+r.status);var t=await r.json();postMessage({p:70});var ids=e.data.ids,obj=t.objects[Object.keys(t.objects)[0]],tr=t.transform,arcs=t.arcs.map(function(a){var x=0,y=0;return a.map(function(p){x+=p[0];y+=p[1];return tr?[Math.round((x*tr.scale[0]+tr.translate[0])*1e5)/1e5,Math.round((y*tr.scale[1]+tr.translate[1])*1e5)/1e5]:p})});function ring(ix){var out=[];ix.forEach(function(i){var a=i>=0?arcs[i]:arcs[~i].slice().reverse();out=out.concat(out.length?a.slice(1):a)});return out}var feats=[];(obj.geometries||[]).forEach(function(g){var p=g.properties||{};var id=ids[p.GISCO_ID];if(id==null)return;var geom=null;if(g.type==='Polygon')geom={type:'Polygon',coordinates:g.arcs.map(ring)};else if(g.type==='MultiPolygon')geom={type:'MultiPolygon',coordinates:g.arcs.map(function(pl){return pl.map(ring)})};if(geom)feats.push({type:'Feature',id:id,properties:{},geometry:geom})});postMessage({done:feats})}catch(err){postMessage({error:String(err&&err.message||err)})}}";
  var w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  w.onmessage = function (e) {
    if (e.data.p) mapProgress(e.data.p, 'Matching boundaries to municipalities');
    if (e.data.error) { mapProgress(100); toast('Boundaries unavailable', 'The GISCO service did not respond (' + e.data.error + '). The dot map keeps working.'); w.terminate(); }
    if (e.data.done) { MAPSTATE.gisco = true; var gb = $('[data-gisco]'); if (gb) { gb.setAttribute('aria-pressed', 'true'); gb.classList.add('on'); gb.textContent = 'Boundaries on'; } setSource('gisco', { type: 'FeatureCollection', features: e.data.done }); mapProgress(100); paintMap(); toast('Official boundaries loaded', fmtInt(e.data.done.length) + ' municipal polygons from Eurostat GISCO LAU 2024.'); w.terminate(); }
  };
  w.postMessage({ url: GISCO_URL, ids: ids });
}
