/* Records (part of the lazy module /assets/more.js since 2.7) */
var RECORDS_DEF = [
  ['alt', 'max', 'Highest terrain', '🏔️'], ['relief', 'max', 'Most dramatic landscape', '⛰️'], ['alt', 'min', 'Lowest-lying', '🌾'],
  ['g5', 'max', 'Fastest growing', '📈'], ['g5', 'min', 'Shrinking fastest', '📉'], ['dens', 'max', 'Most crowded', '🏙️'], ['dens', 'min', 'Most room to breathe', '🌲'],
  ['area', 'max', 'Largest territory', '🗺️'], ['area', 'min', 'Smallest territory', '📍'], ['pop10', 'max', 'Most people within 10 km', '👥'], ['nbp', 'min', 'Fewest neighbours within 10 km', '🏝️'],
  ['rail', 'max', 'Furthest from a railway', '🚫'], ['city', 'max', 'Furthest from a big city', '🧭'], ['coast', 'max', 'Furthest from the sea', '🏜️'], ['lake', 'min', 'Closest to a large lake', '💧'],
  ['border', 'min', 'Right on the border', '🛂'], ['cap', 'max', 'Furthest from the capital', '🛤️'], ['pop', 'min', 'Smallest population', '🐑'],
  ['dayw', 'min', 'Shortest winter days', '🌑'], ['setw', 'max', 'Latest winter sunset', '🌇'], ['sets', 'max', 'Latest summer sunset', '🌅']
];
var REC_UNIT = { dens: [' resident per km²', ' residents per km²'], pop: [' resident', ' residents'], pop10: [' person', ' people'], nbp: [' person outside the place itself', ' people outside the place itself'] };
/* records only make sense in mainland Europe and for plausible values: no overseas territories, no zero areas, no "nearest lake 600 km away" */
var REC_OK = { area: function (v) { return v > 0.05; }, dens: function (v) { return v > 0; }, lake: function (v, d) { return d[1] === 'max' || v <= 30; }, border: function (v) { return v <= 60; }, rail: function (v) { return v < 400; }, coast: function (v) { return v < 1500; }, cap: function (v) { return v < 2500; } };
function recVal(r, k) { if (k === 'nbp') { var x = r.x || {}; return fin(x.pop10) ? Math.max(0, x.pop10 - (r.popNow || 0)) : null; } return pval(r, k); }
function recUnit(k, v) { var u = REC_UNIT[k]; return u ? u[Math.round(v) === 1 ? 0 : 1] : ''; }
function recordsHTML() {
  var pool = SCOPE.filter(function (r) { return r.popNow > 0 && (isWorld(r.country) || inEurope(r)); });
  if (!pool.length) return '<div class="empty"><h3>No places in scope</h3></div>';
  var cards = RECORDS_DEF.map(function (d) {
    var best = null, bv = null;
    pool.forEach(function (r) { var v = recVal(r, d[0]); if (v == null) return; if (d[0] === 'g5' && Math.abs(v) > 40) return; if (bv == null || (d[1] === 'max' ? v > bv : v < bv)) { bv = v; best = r; } });
    if (!best || (REC_OK[d[0]] && !REC_OK[d[0]](bv, d))) return '';
    return '<article class="rec" data-nz-card="record" tabindex="0" role="button" data-id="' + esc(best.id) + '"><span class="ri" aria-hidden="true">' + d[3] + '</span><span class="rt">' + esc(d[2]) + '</span><b class="nz-place-name">' + placeEmblemHTML(best) + esc(best.name) + '</b><small>' + esc((d[0] === 'nbp' ? fmtInt(bv) : pfmt(d[0], bv)) + recUnit(d[0], bv)) + (PARAM[d[0]] && PARAM[d[0]].name && PARAM[d[0]].name(best) ? ' · ' + esc(PARAM[d[0]].name(best)) : '') + '</small>' + cardMetaHTML(best, RES && RES.byId[best.id] || {}, {reason:'Not in the active profile ranking. This card describes a single-factor extreme.'}) + '</article>';
  }).join('');
  return '<div class="records"><p class="small muted">The extremes of ' + esc(scopeName()) + ' (' + fmtInt(pool.length) + ' places with data' + (pool.length < SCOPE.length ? '; overseas territories and places without residents are left out' : '') + '). Change the region or filters and the records change with them. Growth records leave out jumps of more than 40%, which usually come from mergers.</p><div class="recgrid">' + cards + '</div></div>';
}


(function () { var st = document.createElement('style'); st.textContent = ".rec{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto auto;column-gap:10px;text-align:left;border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:10px 12px;transition:transform .15s,box-shadow .15s}.rec:hover{transform:translateY(-1px);box-shadow:var(--shadow)}.rec .ri{grid-row:1/4;font-size:1.5rem;align-self:center}.rec .rt{font-size:11.5px;color:var(--ink-3);font-weight:600}.rec b{font-family:var(--font-display);font-size:var(--step-0);line-height:1.2}.rec small{font-size:12px;color:var(--ink-2)}"; document.head.appendChild(st); })();
