/* 2.15.30 Politics tab. Never scored. Static part (data/politics.json): state structure, memberships, trade blocs and
   agreements, each with what it means for residents and for businesses. Live part (Wikidata, CC0, in the visitor's
   browser): who governs the country, the region and the municipality, their parties and where those parties stand,
   the seats in the national parliament and the record of past heads of government. */
var POL = null, POLW = {};
function polData() { return POL || (POL = getJSON('/data/politics.json?v=__VERSION__').catch(function (e) { POL = null; throw e; })); }
var POL_SPEC = [  // left-right position from a party's political alignment (P1387) or ideology (P1142) labels on Wikidata
  [/far[- ]left|radical left/i, -3], [/centre[- ]left|center[- ]left/i, -1], [/centre[- ]right|center[- ]right/i, 1], [/far[- ]right|radical right/i, 3],
  [/left[- ]wing|^left$|communis|socialis(?!.*democra)|democratic socialism|eco-?socialism/i, -2], [/right[- ]wing|^right$|national conservat|right-wing populis|nationalis/i, 2],
  [/social democra|green politics|progressiv/i, -1], [/christian democra|conservatis|liberal conservat/i, 1], [/^centre$|^center$|centris|big tent|social liberal|liberalism|radical centre/i, 0]];
var POL_NAME = { '-3': 'Far left', '-2': 'Left', '-1': 'Centre-left', '0': 'Centre', '1': 'Centre-right', '2': 'Right', '3': 'Far right' };
var POL_COL = { '-3': '#9b1c1c', '-2': '#d1352b', '-1': '#e8756a', '0': '#a58bc9', '1': '#6f9bd6', '2': '#2f62b3', '3': '#173a7a', x: '#9aa4b1' };
function polPos(labels) { for (var i = 0; i < POL_SPEC.length; i++) for (var j = 0; j < labels.length; j++) if (POL_SPEC[i][0].test(labels[j])) return POL_SPEC[i][1]; return null; }
function polClaims(e, p) { return ((e && e.claims && e.claims[p]) || []).filter(function (c) { return c.mainsnak && c.mainsnak.datavalue && c.rank !== 'deprecated'; }); }
function polQ(c, p) { var q = c.qualifiers && c.qualifiers[p] && c.qualifiers[p][0]; return q && q.datavalue && q.datavalue.value; }
function polTime(v) { return v && v.time ? v.time.slice(1, 11) : ''; }
var POL_KEEP = ['P102', 'P1142', 'P131', 'P1387', 'P1410', 'P194', 'P297', 'P6', 'P31'], POL_TTL = 30 * 864e5;
function polStorePut(q, e) { try { var c = {}; POL_KEEP.forEach(function (p) { if (e.claims && e.claims[p]) c[p] = e.claims[p]; }); localStorage.setItem('nzpol:' + q, JSON.stringify({ t: Date.now(), e: { id: q, labels: e.labels && e.labels.en ? { en: e.labels.en } : {}, claims: c } })); } catch (x) { try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf('nzpol:') === 0) localStorage.removeItem(k); } } catch (y) {} } }
function polStoreGet(q) { try { var v = JSON.parse(localStorage.getItem('nzpol:' + q) || 'null'); return v && Date.now() - v.t < POL_TTL ? v.e : null; } catch (x) { return null; } }
function polEnts(ids) {   // batches of 50, cached; claims and English labels only
  /* r10: the Politics tab keeps what it last read. Entities that loaded once are stored in the browser (trimmed to the
     claims the tab uses, 30 days) and reused when Wikidata is slow or down, so a failed refresh never blanks the tab. */
  ids.forEach(function (q) { if (q && !POLW[q]) { var c = polStoreGet(q); if (c) POLW[q] = c; } });
  ids = ids.filter(function (q, i, a) { return q && !POLW[q] && a.indexOf(q) === i; });
  var b = []; for (var i = 0; i < ids.length; i += 50) b.push(ids.slice(i, i + 50));
  return Promise.all(b.map(function (g) { return jget('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + g.join('|') + '&props=claims|labels&languages=en&format=json&origin=*').then(function (j) { for (var k in j.entities || {}) { POLW[k] = j.entities[k]; polStorePut(k, j.entities[k]); } }).catch(function () { return null; }); })).then(function () { return POLW; });
}
function polLabel(q) { var e = POLW[q]; return e && e.labels && e.labels.en ? e.labels.en.value : ''; }
function polPartyOf(person, at) {   // the party the person belonged to at a date (or now)
  var cs = polClaims(POLW[person], 'P102'); if (!cs.length) return null;
  var ok = cs.filter(function (c) { var s = polTime(polQ(c, 'P580')), e = polTime(polQ(c, 'P582')); return (!s || !at || s <= at) && (!e || !at || e >= at); });
  return ((ok.length ? ok : cs)[(ok.length ? ok : cs).length - 1].mainsnak.datavalue.value || {}).id;
}
function polPartyIds(person) { return polClaims(POLW[person], 'P102').map(function (c) { return c.mainsnak.datavalue.value.id; }); }
function polAlignIds(party) { return polClaims(POLW[party], 'P1387').concat(polClaims(POLW[party], 'P1142')).map(function (c) { return c.mainsnak.datavalue.value.id; }); }
function polPartyPos(party) {
  if (!party) return null;
  var al = polClaims(POLW[party], 'P1387').map(function (c) { return polLabel(c.mainsnak.datavalue.value.id); });
  var p = polPos(al); if (p != null) return p;
  return polPos(polClaims(POLW[party], 'P1142').map(function (c) { return polLabel(c.mainsnak.datavalue.value.id); }));
}
function polHeads(e) {   // heads of government (P6) with start and end, newest first
  return polClaims(e, 'P6').map(function (c) { return { q: c.mainsnak.datavalue.value.id, s: polTime(polQ(c, 'P580')), e: polTime(polQ(c, 'P582')) }; })
    .sort(function (a, b) { return (b.s || '0') < (a.s || '0') ? -1 : 1; });
}
function polCurrent(hs) { var now = hs.filter(function (h) { return !h.e; }); return now[0] || null; }
/* live: country, region and municipality governments, parliament seats and the record */
function polLive(r, P) {
  var cq = P.qid;
  return polEnts([cq]).then(function () {
    var ce = POLW[cq], iso = polClaims(ce, 'P297')[0];
    if (!ce || (iso && iso.mainsnak.datavalue.value !== P.iso2 && P.iso2 !== 'HK' && P.iso2 !== 'TW')) return null;   // safety: the right country
    var heads = polHeads(ce).slice(0, 9), houses = polClaims(ce, 'P194').map(function (c) { return c.mainsnak.datavalue.value.id; });
    var local = (typeof wikidataFor === 'function' ? wikidataFor(r) : Promise.resolve(null)).catch(function () { return null; });
    return Promise.all([local, polEnts(heads.map(function (h) { return h.q; }).concat(houses))]).then(function (a) {
      var me = a[0], up = me && polClaims(me, 'P131')[0]; up = up && up.mainsnak.datavalue.value.id;
      var mh = me ? polCurrent(polHeads(me)) : null;
      return polEnts([up, mh && mh.q]).then(function () {
        var rh = up ? polCurrent(polHeads(POLW[up])) : null;
        return polEnts([rh && rh.q]).then(function () {
          // parliament: the chamber whose seat statements name the most parties
          var best = null;
          houses.forEach(function (h) { var seats = polClaims(POLW[h], 'P1410').filter(function (c) { return polQ(c, 'P1268'); }); if (seats.length > ((best && best.seats.length) || 0)) best = { q: h, seats: seats }; });
          var people = heads.map(function (h) { return h.q; }).concat([mh && mh.q, rh && rh.q]);
          var parties = [];
          people.forEach(function (q) { if (q) parties = parties.concat(polPartyIds(q)); });
          var seatP = [];
          if (best) { var latest = ''; best.seats.forEach(function (c) { var t = polTime(polQ(c, 'P585')); if (t > latest) latest = t; });
            best.seats = best.seats.filter(function (c) { return !latest || polTime(polQ(c, 'P585')) === latest || !polQ(c, 'P585'); }); best.at = latest;
            seatP = best.seats.map(function (c) { return polQ(c, 'P1268').id; }); }
          return polEnts(parties.concat(seatP)).then(function () {
            var al = []; parties.concat(seatP).forEach(function (p) { al = al.concat(polAlignIds(p)); });
            return polEnts(al.slice(0, 200)).then(function () {
              var gov = function (h, at) { if (!h) return null; var party = polPartyOf(h.q, at || h.s); return { name: polLabel(h.q), q: h.q, since: h.s, until: h.e, party: party, partyName: polLabel(party), pos: polPartyPos(party) }; };
              return {
                national: gov(polCurrent(heads)), region: rh ? Object.assign(gov(rh), { of: polLabel(up) }) : null, local: mh ? gov(mh) : null,
                record: heads.map(function (h) { return gov(h); }),
                house: best ? { name: polLabel(best.q), at: best.at, seats: best.seats.map(function (c) { var p = polQ(c, 'P1268').id; return { party: p, name: polLabel(p), n: +(c.mainsnak.datavalue.value.amount || 0), pos: polPartyPos(p) }; }).filter(function (s) { return s.n > 0; }).sort(function (a, b) { return ((a.pos == null ? 9 : a.pos) - (b.pos == null ? 9 : b.pos)) || b.n - a.n; }) } : null
              };
            });
          });
        });
      });
    });
  });
}
/* visuals */
function polCol(p) { return POL_COL[p == null ? 'x' : String(p)]; }
function polSpectrum(marks) {   // horizontal left-right scale with a marker per level of government
  var W = 420, x = function (p) { return 30 + (p + 3) / 6 * (W - 60); };
  var g = '<svg class="pol-spec" viewBox="0 0 ' + W + ' 92" role="img" aria-label="Where the governing parties stand, left to right"><defs><linearGradient id="polg" x1="0" x2="1"><stop offset="0" stop-color="#9b1c1c"/><stop offset=".33" stop-color="#e8756a"/><stop offset=".5" stop-color="#a58bc9"/><stop offset=".67" stop-color="#6f9bd6"/><stop offset="1" stop-color="#173a7a"/></linearGradient></defs>' +
    '<rect x="30" y="40" width="' + (W - 60) + '" height="10" rx="5" fill="url(#polg)"/>' +
    ['Left', 'Centre', 'Right'].map(function (t, i) { return '<text x="' + x(-3 + i * 3) + '" y="72" text-anchor="' + ['start', 'middle', 'end'][i] + '" class="pol-ax">' + t + '</text>'; }).join('');
  var placed = [];
  marks.forEach(function (m) { if (m.pos == null) return; var cx = x(m.pos), row = placed.filter(function (q) { return Math.abs(q - cx) < 70; }).length; placed.push(cx);
    g += '<g><line x1="' + cx + '" x2="' + cx + '" y1="' + (30 - row * 14) + '" y2="54" stroke="currentColor" stroke-width="1.5"/><circle cx="' + cx + '" cy="45" r="8" fill="' + polCol(m.pos) + '" stroke="var(--surface,#fff)" stroke-width="2.5"/><text x="' + cx + '" y="' + (24 - row * 14) + '" text-anchor="middle" class="pol-mk">' + esc(m.label) + '</text></g>'; });
  return g + '</svg>';
}
function polHemicycle(h) {   // seats as dots in rows of a half circle, left to right by party position
  var total = h.seats.reduce(function (s, x) { return s + x.n; }, 0); if (!total) return '';
  var rows = Math.max(3, Math.min(12, Math.round(Math.sqrt(total / 4)))), R = 150, r0 = 60, pts = [];
  var radii = []; for (var i = 0; i < rows; i++) radii.push(r0 + (R - r0) * i / (rows - 1));
  var sum = radii.reduce(function (a, b) { return a + b; }, 0), left = total;
  radii.forEach(function (rr, i) { var n = i === rows - 1 ? left : Math.round(total * rr / sum); left -= n; for (var k = 0; k < n; k++) { var a = Math.PI - (n === 1 ? Math.PI / 2 : Math.PI * k / (n - 1)); pts.push([a, 170 + rr * Math.cos(a), 165 - rr * Math.sin(a)]); } });
  pts.sort(function (a, b) { return b[0] - a[0]; });
  var dot = Math.max(1.6, Math.min(7, 330 / Math.sqrt(total) / 3.2)), out = '', idx = 0, maj = Math.floor(total / 2) + 1;
  h.seats.forEach(function (s) { for (var k = 0; k < s.n && idx < pts.length; k++, idx++) out += '<circle cx="' + pts[idx][1].toFixed(1) + '" cy="' + pts[idx][2].toFixed(1) + '" r="' + dot.toFixed(1) + '" fill="' + polCol(s.pos) + '"><title>' + esc(s.name) + ': ' + s.n + ' seats</title></circle>'; });
  return '<svg class="pol-hemi" viewBox="0 0 340 178" role="img" aria-label="Seats in ' + esc(h.name) + '">' + out + '<text x="170" y="150" text-anchor="middle" class="pol-tot">' + fmt(total) + '</text><text x="170" y="166" text-anchor="middle" class="pol-ax">seats · majority ' + fmt(maj) + '</text></svg>' +
    '<div class="pol-legend">' + h.seats.map(function (s) { return '<span><i style="background:' + polCol(s.pos) + '"></i>' + esc(s.name) + ' <b>' + s.n + '</b> <small>' + fmt(s.n / total * 100, 1) + '%</small></span>'; }).join('') + '</div>';
}
function polRecord(rec) {   // timeline of heads of government, coloured by party position
  rec = rec.filter(function (x) { return x && x.since; }).slice(0, 8).reverse(); if (rec.length < 2) return '';
  var y0 = +rec[0].since.slice(0, 4), y1 = new Date().getFullYear() + 1, W = 400, sx = function (d) { var y = +d.slice(0, 4) + ((+d.slice(5, 7) || 1) - 1) / 12; return 10 + (y - y0) / (y1 - y0) * (W - 20); };
  var now = new Date().toISOString().slice(0, 10);
  return '<svg class="pol-rec" viewBox="0 0 ' + W + ' ' + (rec.length * 26 + 22) + '" role="img" aria-label="Heads of government since ' + y0 + '">' + rec.map(function (x, i) {
    var a = sx(x.since), b = sx(x.until || now), y = i * 26 + 4;
    return '<rect x="' + a.toFixed(1) + '" y="' + y + '" width="' + Math.max(3, b - a).toFixed(1) + '" height="18" rx="4" fill="' + polCol(x.pos) + '"/><text x="' + (b + 6 > W - 130 ? a - 6 : b + 6).toFixed(1) + '" y="' + (y + 13) + '" text-anchor="' + (b + 6 > W - 130 ? 'end' : 'start') + '" class="pol-rl">' + esc(x.name) + (x.partyName ? ' (' + esc(x.partyName) + ')' : '') + '</text>';
  }).join('') + '<text x="10" y="' + (rec.length * 26 + 18) + '" class="pol-ax">' + y0 + '</text><text x="' + (W - 10) + '" y="' + (rec.length * 26 + 18) + '" text-anchor="end" class="pol-ax">today</text></svg>';
}
function polGauge(lvl, L) {
  return '<div class="pol-gauge" role="img" aria-label="State structure: ' + esc(L[lvl]) + '">' + [1, 2, 3, 4].map(function (k) { return '<span class="' + (k === lvl ? 'on' : k < lvl ? 'fill' : '') + '"><i></i>' + esc(L[k]) + '</span>'; }).join('') + '</div>';
}
function polOrgs(P, D) {
  var G = [['market', 'Single markets and unions'], ['trade', 'Trade blocs'], ['money', 'Currency'], ['mobility', 'Borders'], ['security', 'Security'], ['standards', 'Standards'], ['forum', 'Forums']];
  var rows = G.map(function (g) {
    var os = P.orgs.filter(function (o) { return D.orgs[o].group === g[0]; }); if (!os.length) return '';
    return os.map(function (o) { var O = D.orgs[o]; return '<div class="pol-org pol-' + g[0] + '"><div class="pol-badge">' + esc(o === 'EUCU' ? 'EU CU' : o === 'EUC' ? 'EU' : o === 'AFCFTA' ? 'AfCFTA' : o === 'CW' ? 'CW' : o) + '</div><div><b>' + esc(O.name) + '</b><small>' + esc(g[1]) + '</small>' + (O.res ? '<p><span class="pol-who">Living here</span>' + esc(O.res) + '</p>' : '') + (O.biz ? '<p><span class="pol-who">Business</span>' + esc(O.biz) + '</p>' : '') + '</div></div>'; }).join('');
  }).join('');
  return rows ? '<div class="pol-orgs">' + rows + '</div>' : '<p class="muted">No membership of the blocs listed here.</p>';
}

/* 2.15.30 owner review: who decides what, layer by layer (EU, ECB, nation, region, municipality), and the money side:
   currency and its regime, live exchange rates against the dollar, euro and yuan (ECB reference rates via Frankfurter),
   the 10-year government bond yield (Eurostat, EU members) and inflation and lending rates (World Bank). */
var POL_FXOK = 'AUD BGN BRL CAD CHF CNY CZK DKK EUR GBP HKD HUF IDR ILS INR ISK JPY KRW MXN MYR NOK NZD PHP PLN RON SEK SGD THB TRY USD ZAR'.split(' ');
function polLayers(P, D) {
  var L = D.layers, o = P.orgs, rows = [];
  if (o.indexOf('EU') >= 0) rows.push(['European Union', L.eu, '#1f4e9e']);
  else if (P.iso2 === 'NO' || P.iso2 === 'IS' || P.iso2 === 'LI') rows.push(['EU single market (EEA)', L.eea, '#1f4e9e']);
  if (o.indexOf('EZ') >= 0) rows.push(['European Central Bank', L.ecb, '#b8860b']);
  rows.push(['National government', L.national[P.structure], '#0f7b6c']);
  if (P.structure >= 3) rows.push([P.structure === 4 ? 'States, cantons or Länder' : 'Regions', L.regional[P.structure], '#5a4fcf']);
  rows.push(['Municipality', L.local[P.structure], '#e8756a']);
  return '<div class="pol-layers">' + rows.map(function (x, i) { return '<div class="pol-layer" style="--lc:' + x[2] + ';--li:' + i + '"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>' +
    (o.indexOf('EU') >= 0 ? '<p class="small">In the EU, national, regional and local governments mostly apply rules made in Brussels; for a business, permits and inspections are local, but the rule book is European.</p>' : '');
}
function polSpark(pts, col) {
  pts = (pts || []).filter(function (p) { return p && fin(p[1]); }); if (pts.length < 2) return '';
  var ys = pts.map(function (p) { return p[1]; }), mn = Math.min.apply(null, ys.concat([0])), mx = Math.max.apply(null, ys), W = 120, H = 32;
  return '<svg class="pol-sp" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><polyline fill="none" stroke="' + col + '" stroke-width="2" vector-effect="non-scaling-stroke" points="' + pts.map(function (p, i) { return (2 + i * (W - 4) / (pts.length - 1)).toFixed(1) + ',' + (H - 3 - (p[1] - mn) / ((mx - mn) || 1) * (H - 6)).toFixed(1); }).join(' ') + '"/></svg>';
}
function polMoney(r, P, box) {
  var cur = P.cur || [], code = cur[0];
  var tile = function (k, v, sub, sp) { return '<div class="pol-tile"><small>' + esc(k) + '</small><b>' + v + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + (sp || '') + '</div>'; };
  box.innerHTML = '<div class="pol-cur"><div class="pol-badge pol-money">' + esc(code || '?') + '</div><div><b>' + esc(cur[1] || '') + '</b><em>' + esc(cur[2] || '') + '</em></div></div><div class="pol-tiles" data-poltiles><p class="muted small">Loading rates…</p></div>' +
    '<p class="small">High inflation and interest rates raise the cost of capital for buying a home or financing a business; a pegged or managed currency moves less day to day but can adjust suddenly.</p>';
  var out = box.querySelector('[data-poltiles]'), jobs = [], live = typeof extOn !== 'function' || extOn();
  if (code) {
    var to = ['USD', 'EUR', 'CNY'].filter(function (c) { return c !== code; });
    if (POL_FXOK.indexOf(code) >= 0 && live) {
      var d1 = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10), U = ['https://api.frankfurter.dev/v1/', 'https://api.frankfurter.app/'];
      /* r15: the rate service moved to frankfurter.dev; the old address is the fallback */
      var fx = function (q) { return jget(U[0] + q).catch(function () { return jget(U[1] + q); }); };
      jobs.push(Promise.all([fx('latest?from=' + code + '&to=' + to.join(',')), fx(d1 + '?from=' + code + '&to=' + to.join(',')).catch(function () { return null; })]).then(function (a) {
        if (!a[0] || !a[0].rates) throw new Error('no rates');
        var now = (a[0] && a[0].rates) || {}, then = (a[1] && a[1].rates) || {};
        return to.map(function (c) { var v = now[c], o = then[c], ch = fin(v) && fin(o) ? (v / o - 1) * 100 : null;
          return tile('1 ' + code + ' in ' + c, fin(v) ? fmt(v, v < 0.1 ? 4 : v < 10 ? 3 : 2) : '–', (ch == null ? '' : (ch >= 0 ? '+' : '') + fmt(ch, 1) + '% in a year, ') + 'ECB rate ' + esc((a[0] && a[0].date) || '')); }).join('');
      }).catch(function () { return code === 'EUR' ? tile('Exchange-rate risk', 'None in the euro area', 'shared currency with the other euro countries; against the dollar or yuan it floats') : tile('Exchange rates', esc(code), 'floating against the dollar and euro; today\u2019s rate could not be loaded'); }));
    } else jobs.push(Promise.resolve(tile('Exchange rates', '–', live ? 'no ECB reference rate for ' + esc(code) : 'live content is off')));
  }
  if (P.orgs.indexOf('EU') >= 0 && live && typeof esGet === 'function') jobs.push(Promise.all([esGet('irt_lt_mcby_m', r.country, ''), r.country === 'DE' ? null : esGet('irt_lt_mcby_m', 'DE', '').catch(function () { return null; }), esGet('irt_lt_mcby_m', 'EA', '').catch(function () { return null; })]).then(function (a) {
    var pk = jsPick(a[0], {}); if (!pk || !fin(pk.v)) return '';
    var de = a[1] ? jsPick(a[1], {}) : null, sp = de && fin(de.v) ? Math.round((pk.v - de.v) * 100) : null;
    // the gap to German Bunds: what investors charge this state on top of the euro area's benchmark borrower
    return tile('10-year government bond yield', fmt(pk.v, 2) + '%', esc(String(pk.year || '')) + ', Eurostat', polSpark((pk.s || []).slice(-36), '#1f4e9e')) +
      (function () { // 2.15.30: a second yardstick that does not lean on one country: the gap to the euro-area average, and the 12-month move
        var ea = a[2] ? jsPick(a[2], {}) : null, g = ea && fin(ea.v) ? Math.round((pk.v - ea.v) * 100) : null, ser = pk.s || [], yr = ser.length > 12 ? ser[ser.length - 13] : null, mv = yr && fin(yr[1]) ? Math.round((pk.v - yr[1]) * 100) : null;
        return (g != null ? tile('Gap to the euro-area average', (g > 0 ? '+' : '') + g + ' bp', g > 50 ? 'pays more than the average euro-area state' : g < -50 ? 'borrows more cheaply than the average' : 'about the euro-area average') : '') +
          (mv != null ? tile('Change in 12 months', (mv > 0 ? '+' : '') + mv + ' bp', mv > 50 ? 'borrowing has become clearly dearer' : mv < -50 ? 'borrowing has become clearly cheaper' : 'little changed') : ''); })() +
      (sp != null ? tile('Spread to Germany (10 years)', (sp > 0 ? '+' : '') + sp + ' bp', sp > 150 ? 'wide: investors see more risk; borrowing and investing cost more' : sp > 60 ? 'moderate risk premium' : 'close to the euro-area benchmark') : '');
  }).catch(function () { return ''; }));
  jobs.push(getJSON('/data/h/' + r.country + '.json?v=__VERSION__').then(function (h) {
    var S2 = {}, res = ''; ((h && h.series) || []).forEach(function (x) { S2[x.id] = x; });
    [['inflation', 'Inflation', '#c2410c'], ['lending_rate', 'Bank lending rate', '#0f7b6c'], ['real_interest', 'Real interest rate', '#5a4fcf']].forEach(function (k) {
      var x = S2[k[0]]; if (!x || !x.y || !x.y.length) return; var last = x.y[x.y.length - 1];
      res += tile(k[1], fmt(last[1], 1) + '%', esc(String(last[0])) + ', World Bank', polSpark(x.y.slice(-12), k[2])); });
    return res;
  }).catch(function () { return ''; }));
  Promise.all(jobs).then(function (a) { if (out.isConnected) out.innerHTML = a.join('') || '<p class="muted small">No rates available.</p>'; });
}
function politicsFill(r, el) {
  if (!document.getElementById('pol-css')) { var st = document.createElement('style'); st.id = 'pol-css'; st.textContent =
    '.pol h4{margin:20px 0 8px;font-size:16px}.pol .sub{margin-top:-4px}.pol svg{width:100%;height:auto;display:block;color:var(--ink-2,#556)}' +
    '.pol-ax{font-size:11px;fill:var(--muted,#667)}.pol-mk{font-size:11.5px;font-weight:650;fill:var(--ink,#123)}.pol-tot{font-size:22px;font-weight:750;fill:var(--ink,#123)}.pol-rl{font-size:12px;font-weight:600;fill:var(--ink,#123)}' +
    '.pol-govs{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.pol-gov{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--surface-2,var(--surface));position:relative;overflow:hidden}' +
    '.pol-gov::before{content:"";position:absolute;inset:0 auto 0 0;width:5px;background:var(--pc)}.pol-gov small{display:block;color:var(--muted);font-size:12px}.pol-gov b{display:block;font-size:15.5px;margin:2px 0}.pol-gov em{font-style:normal;font-size:12.5px;padding:1px 8px;border-radius:999px;background:color-mix(in srgb,var(--pc) 18%,transparent);color:var(--ink)}' +
    '.pol-legend{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12.5px;margin-top:6px}.pol-legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px}.pol-legend small{color:var(--muted)}' +
    '.pol-gauge{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:6px 0}.pol-gauge span{font-size:12px;text-align:center;color:var(--muted)}.pol-gauge i{display:block;height:12px;border-radius:6px;background:var(--line);margin-bottom:5px}.pol-gauge .fill i{background:color-mix(in srgb,var(--accent,#2f62b3) 45%,var(--line))}.pol-gauge .on i{background:var(--accent,#2f62b3);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#2f62b3) 25%,transparent)}.pol-gauge .on{color:var(--ink);font-weight:700}' +
    '.pol-orgs{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}.pol-org{display:flex;gap:12px;border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--surface-2,var(--surface))}.pol-org p{margin:6px 0 0;font-size:13px;line-height:1.45}.pol-org small{display:block;color:var(--muted);font-size:11.5px}' +
    '.pol-badge{flex:0 0 52px;height:52px;border-radius:14px;display:grid;place-items:center;font-weight:800;font-size:12px;color:#fff;background:#2f62b3;letter-spacing:.02em}.pol-market .pol-badge{background:#1f4e9e}.pol-trade .pol-badge{background:#0f7b6c}.pol-money .pol-badge{background:#b8860b}.pol-mobility .pol-badge{background:#5a4fcf}.pol-security .pol-badge{background:#374151}.pol-standards .pol-badge{background:#0e7490}.pol-forum .pol-badge{background:#7c3aed}' +
'.pol-layers{display:grid;gap:6px}.pol-layer{display:grid;grid-template-columns:minmax(120px,170px) 1fr;gap:12px;align-items:start;padding:10px 12px;border-radius:12px;background:var(--surface-2,var(--surface));border:1px solid var(--line);border-left:5px solid var(--lc);margin-left:calc(var(--li) * 10px)}.pol-layer b{font-size:13.5px}.pol-layer span{font-size:13px;line-height:1.45}@media (max-width:600px){.pol-layer{grid-template-columns:1fr;gap:3px;margin-left:calc(var(--li) * 5px)}}' +
    '.pol-cur{display:flex;gap:12px;align-items:center;margin:4px 0 10px}.pol-cur em{display:block;font-style:normal;font-size:13px;color:var(--ink-2)}.pol-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}.pol-tile{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface-2,var(--surface));display:grid;gap:2px}.pol-tile small{font-size:12px;color:var(--ink-3)}.pol-tile b{font:700 20px/1.15 var(--font-display)}.pol-tile span{font-size:12px;color:var(--ink-2)}.pol-sp{width:100%;height:32px;margin-top:4px}' +
    '.pol-mandate{display:flex;gap:12px;align-items:center;margin:12px 0 0;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface-2,var(--surface))}.pol-mandate b{font:750 24px/1 var(--font-display);color:var(--navy)}.pol-mandate span{font-size:13px;line-height:1.45}' +
    '.pol-who{display:inline-block;font-size:11px;font-weight:700;margin-right:6px;color:var(--muted)}.pol-fta{display:flex;flex-wrap:wrap;gap:6px}.pol-fta span{font-size:12.5px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:var(--surface-2,var(--surface))}';
    document.head.appendChild(st); }
  el.innerHTML = '<p class="muted">Loading politics…</p>';
  polData().then(function (D) {
    var P = D.countries[r.country]; if (!P) { el.innerHTML = '<p class="muted">No political data for this country yet.</p>'; return; }
    var cn = countryName(r.country), L = D.structure_levels;
    var html = '<div class="pol"><h4>Who governs</h4><div data-polgov><p class="muted">Looking up the current governments on Wikidata…</p></div>' +
      (typeof crossQuickWinsHTML === 'function' ? crossQuickWinsHTML(r, 'politics') : '') + '<h4>How power is shared</h4><p class="sub small muted">' + esc(cn) + ' is ' + esc(L[P.structure].toLowerCase()) + ': ' + esc(['', 'most decisions are taken nationally', 'national law with strong local government', 'regions with their own parliaments and powers', 'states or cantons with their own constitutions and taxes'][P.structure]) + '.</p>' + polGauge(P.structure, L) + (P.note ? '<p class="small">' + esc(P.note) + '</p>' : '') + '<h4>Who decides what</h4>' + polLayers(P, D) +
      '<h4>Money and the cost of capital</h4><div data-polmoney></div>' +
      '<h4>Memberships</h4>' + polOrgs(P, D) +
      (P.fta && P.fta.length ? '<h4>Trade agreements in force</h4><div class="pol-fta">' + P.fta.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>' : '') +
      '<p class="small muted" style="margin-top:16px">Nothing here changes a score. Memberships, agreements and state structure: official member and treaty lists, as of ' + esc(D.as_of) + '. Governments, parties, seats and the record: Wikidata (CC0), live; left-right positions follow each party\'s political alignment or ideology as recorded there.</p></div>';
    el.innerHTML = html;
    try { polMoney(r, P, el.querySelector('[data-polmoney]')); } catch (e) {}
    var box = el.querySelector('[data-polgov]');
    if (typeof extOn === 'function' && !extOn()) { box.innerHTML = EXT_OFF_HTML; return; }
    var late = new Promise(function (_, no) { setTimeout(function () { no(new Error('timeout')); }, 20000); });
    Promise.race([polLive(r, P), late]).then(function (g) {
      if (!box.isConnected) return;
      if (!g || !g.national) { box.innerHTML = '<p class="muted">The current government of ' + esc(cn) + ' is not on record on Wikidata.</p>'; return; }
      var card = function (lvl, x, extra) { if (!x) return ''; return '<div class="pol-gov" style="--pc:' + polCol(x.pos) + '"><small>' + esc(lvl) + '</small><b>' + esc(x.name) + '</b>' + (x.partyName ? '<div class="small">' + esc(x.partyName) + '</div>' : '') + '<em>' + esc(x.pos == null ? 'position not recorded' : POL_NAME[x.pos]) + '</em>' + (x.since ? '<small>since ' + esc(x.since.slice(0, 4)) + (extra || '') + '</small>' : '') + '</div>'; };
      var marks = [];
      if (g.national && g.national.pos != null) marks.push({ pos: g.national.pos, label: cn });
      if (g.region && g.region.pos != null) marks.push({ pos: g.region.pos, label: g.region.of || 'Region' });
      if (g.local && g.local.pos != null) marks.push({ pos: g.local.pos, label: r.name });
      box.innerHTML = '<div class="pol-govs">' + card('Head of government, ' + cn, g.national) + card('Head of ' + (g.region && g.region.of ? g.region.of : 'the region'), g.region) + card('Mayor or head of ' + r.name, g.local) + '</div>' +
        (g.local ? '' : '<p class="small muted">The head of ' + esc(r.name) + ' is not on record on Wikidata.</p>') +
        (marks.length ? polSpectrum(marks) : '') +
        (function () { if (!g.house || !g.national || !g.national.party) return ''; var tot = g.house.seats.reduce(function (t, x) { return t + x.n; }, 0), own = g.house.seats.filter(function (x) { return x.party === g.national.party; })[0];
          if (!tot || !own) return ''; var sh = own.n / tot * 100;
          return '<div class="pol-mandate"><b>' + fmt(sh, 1) + '%</b><span>of seats held by the head of government\'s party (' + esc(own.name) + '). ' + (sh > 50 ? 'A majority on its own: decisions are easier to pass.' : sh > 35 ? 'Governs with partners: policy depends on the coalition.' : 'A small base: coalitions and votes are harder to hold.') + ' A mandate measure from the last election, not an opinion poll.</span></div>'; })() +
        (g.house && g.house.seats.length > 1 ? '<h4>' + esc(g.house.name) + '</h4><p class="sub small muted">Seats by party' + (g.house.at ? ', ' + esc(g.house.at.slice(0, 4)) : '') + ', ordered left to right.</p>' + polHemicycle(g.house) : '') +
        (polRecord(g.record) ? '<h4>Track record</h4><p class="sub small muted">Heads of government of ' + esc(cn) + ', coloured by where their party stands.</p>' + polRecord(g.record) : '');
    }, function () { if (box.isConnected) box.innerHTML = '<p class="muted">Wikidata did not answer in time. Open the tab again to retry.</p>'; });
  }, function () { el.innerHTML = '<p class="muted">Political data could not be loaded. Open the tab again to retry.</p>'; });
}
