/* Nestlyzer 2.14: comparison upgrade (owner audit A1). Mounts inside the native "Compare places" window:
   source-bound answers about the compared places, an explicit reference place, and a scatter linked to the table.
   Built with esbuild from the supplied utilities (vendor/11_utility.mjs, nz-final-20261106-v2, unchanged) into
   /assets/nzx.js, loaded on the first comparison. The native window passes an explicit host (factor definitions,
   ranked places, formatters) because the app's state lives inside its own closure. Nothing here changes a score;
   a failure leaves the native comparison as it is. */
import { answerShortlist, compareFacts, scatterRows, formatFact, safeURL, VERSION as UTIL_VERSION } from './vendor/11_utility.mjs';

const ff = (f) => (f && !f.unit ? formatFact({ ...f, unit: '' }) : formatFact(f)).trim();
const LV = { 0: 'this place', 3: 'district', 2: 'region', 1: 'large region', 9: 'country' };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CSS = `.cx{margin-top:18px;border-top:1px solid var(--line);padding-top:14px;display:grid;gap:12px}.cx h3{margin:0;font-size:var(--step-1)}
.cx-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.cx-ctl label{font-size:var(--step--1);color:var(--ink-2)}.cx select{font:inherit;padding:7px 9px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);max-width:100%;min-height:38px}
.cx-ref,.cx-q{display:flex;flex-wrap:wrap;gap:6px}.cx-ref button,.cx-q button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:7px 12px;font:inherit;font-size:var(--step--1);cursor:pointer;min-height:36px}.cx-ref button[aria-pressed="true"]{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.cx-ans{background:var(--surface-2);border-radius:var(--radius);padding:10px 12px;font-size:var(--step-0)}.cx-ans p{margin:0 0 6px}.cx-src{margin:6px 0 0;padding-left:18px;font-size:var(--step--1);color:var(--ink-2)}.cx-src a{word-break:break-word}
.cx-plot svg{width:100%;height:auto;display:block;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius)}.cx-dot{fill:var(--ink-3);opacity:.35}.cx-hit{fill:var(--sun,#f5c542);stroke:var(--ink);stroke-width:1.2;cursor:pointer}.cx-hit.ref{fill:#e5484d}.cx-lab{font-size:11px;fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:3px}.cx-ax{font-size:10px;fill:var(--ink-2)}
.cx-note{font-size:var(--step--1);color:var(--ink-2);margin:0}`;

// one fact per place and measure, with the basis the utilities need to refuse unfair comparisons
function factFor(h, r, f) {
  const v = r.factorRaw && r.factorRaw[f.id]; if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const bc = f.by_country && f.by_country[r.country], lv = (r.factorLevel && r.factorLevel[f.id]) || 0;
  // 2.15 (audit 2): no invented metadata. A missing source, period or unit stays missing and is shown as such.
  const srcURL = bc ? (bc.source_url || bc.url) : f.source_url, srcName = bc ? bc.source_name : f.source_name, per0 = bc ? (bc.period || f.source_period) : f.source_period;
  const period = per0 && !/var(y|ies)|unknown/i.test(String(per0)) ? String(per0) : null;
  return { value: v, unit: (bc && bc.unit) || f.unit || null, metric: f.id, definitionId: f.id, geographicSupport: LV[lv] || 'this place', statistic: 'value as published', scenario: 'as published',
    methodVersion: 'nestlyzer-' + h.version, source: safeURL(srcURL || ''), sourceName: srcName || 'source not recorded', period, status: /suppress|withdraw|held|censor/i.test(String((bc && bc.status) || f.status || '')) ? 'suppressed' : 'value', level: lv };
}
function scoreFact(h, x) {
  return Number.isFinite(x.overall) ? { value: Math.round(x.overall * 10) / 10, unit: 'points', metric: 'score', definitionId: 'score:' + h.profile, geographicSupport: 'this place', statistic: 'model score', scenario: 'within-country:' + ((x.r || x).country || 'unknown'),
    methodVersion: 'nestlyzer-' + h.version + '-' + h.method, source: safeURL(h.methodURL), sourceName: 'Nestlyzer model, ' + h.profileName, period: h.version, status: 'value', level: 0 } : null;
}
function rowsFor(h, list, measures) {
  return list.map((x) => { const r = x.r || x, facts = {}; for (const f of measures) { const ft = factFor(h, r, f); if (ft) facts[f.id] = ft; } const s = scoreFact(h, x); if (s) facts.score = s; return { id: r.id, name: r.name, country: r.country, facts }; });
}
function highest(rows, metric) {
  const base = rows.find((r) => r.facts[metric]); if (!base) return { text: 'No usable values for this measure.', claims: [], type: 'gap' };
  if (rows.some((r) => !compareFacts(r.facts[metric], base.facts[metric]).ok)) return { text: 'Read these values separately. Their definitions, levels, dates or sources do not support one numerical comparison.', claims: [], type: 'gap' };
  const max = Math.max(...rows.map((r) => r.facts[metric].value)), win = rows.filter((r) => r.facts[metric].value === max);
  return { text: `${win.map((r) => r.name).join(' and ')} ${win.length === 1 ? 'has' : 'have'} the highest value: ${ff(win[0].facts[metric])}. This compares this measure only, not overall fit.`, claims: rows.map((r) => ({ entity: r.id })), type: 'sourced' };
}

export function mountCompare(ctx) {
  const root = ctx.root, h = ctx.host; if (!root || !h) return;
  const box = root.querySelector('.modal-b') || root.querySelector('.modal-body') || root; if (box.querySelector('.cx')) return;
  if (!document.getElementById('cx-css')) { const st = document.createElement('style'); st.id = 'cx-css'; st.textContent = CSS; document.head.appendChild(st); }
  const native = ctx.nativeRows.map((r) => ({ r, overall: h.overallOf(r) }));
  // measures at least two compared places have, grouped by category, most weighted first
  const cnt = {}; native.forEach((x) => { for (const k in (x.r.factorRaw || {})) if (Number.isFinite(x.r.factorRaw[k])) cnt[k] = (cnt[k] || 0) + 1; });
  const measures = Object.keys(cnt).filter((k) => cnt[k] >= 2 && h.factors[k]).map((k) => h.factors[k]).sort((a, b) => (h.weight(b.category) - h.weight(a.category)) || a.name.localeCompare(b.name));
  if (!measures.length) return;
  const rows = rowsFor(h, native, measures);
  // start on a measure every compared place has for the place itself (not a regional or national value)
  const ok = (ft) => ft && ft.level === 0 && ft.period && ft.source && ft.unit;
  const local = measures.find((f) => rows.every((r) => ok(r.facts[f.id]))) || measures.find((f) => rows.every((r) => r.facts[f.id] && r.facts[f.id].level === 0)) || measures[0];
  let ref = rows[0].id, metric = local.id, axisX = local.id, axisY = 'score';
  const opt = (sel) => measures.map((f) => `<option value="${esc(f.id)}"${f.id === sel ? ' selected' : ''}>${esc(f.name)}${f.unit ? ' (' + esc(f.unit) + ')' : ''}</option>`).join('');
  const sec = document.createElement('section'); sec.className = 'cx'; sec.setAttribute('aria-label', 'Ask about these places');
  sec.innerHTML = `<h3>Ask about these places</h3>
<div class="cx-ctl"><label for="cx-m">Measure</label><select id="cx-m">${opt(metric)}</select></div>
<div class="cx-ctl"><span class="cx-note">Reference place</span><div class="cx-ref" role="group" aria-label="Reference place">${rows.map((r) => `<button type="button" data-cxref="${esc(r.id)}" aria-pressed="${r.id === ref}">${esc(r.name)}</button>`).join('')}</div></div>
<div class="cx-q" role="group" aria-label="Questions"><button type="button" data-cxq="lowest">Which is lowest?</button><button type="button" data-cxq="highest">Which is highest?</button><button type="button" data-cxq="difference">Difference to the reference</button></div>
<div class="cx-ans" aria-live="polite" id="cx-ans"><p class="cx-note">Pick a measure and a question. Answers use the stored values with their source, level and year, and refuse to compare values measured differently.</p></div>
<h3>Where they sit among all ranked places</h3>
<div class="cx-ctl"><label for="cx-x">Across</label><select id="cx-x">${opt(axisX)}</select><label for="cx-y">Up</label><select id="cx-y"><option value="score" selected>Score for ${esc(h.profileName)}</option>${opt('')}</select></div>
<div class="cx-plot" id="cx-plot"></div><p class="cx-note" id="cx-pnote"></p>`;
  box.appendChild(sec);
  const $ = (s) => sec.querySelector(s);
  const stale = () => { if (ctx.isCurrent && !ctx.isCurrent()) { $('#cx-ans').innerHTML = '<p>The profile or country changed. Close and reopen the comparison to ask again.</p>'; sec.querySelectorAll('button,select').forEach((b) => { b.disabled = true; }); return true; } return false; };
  const sources = (ids) => '<ol class="cx-src">' + rows.filter((r) => !ids || ids.includes(r.id)).map((r) => { const f = r.facts[metric]; return `<li>${esc(r.name)}: ${f ? esc(ff(f)) + ', ' + (f.level ? esc(f.geographicSupport) + ' value' : 'value for the place itself') + ', ' + (f.period ? esc(f.period) : 'period not recorded') + ', ' + (f.source ? '<a href="' + esc(f.source) + '" target="_blank" rel="noopener">' + esc(f.sourceName) + '</a>' : esc(f.sourceName)) : 'no value'}</li>`; }).join('') + '</ol>';
  const ask = (q) => {
    if (stale()) return;
    const a = q === 'highest' ? highest(rows, metric) : answerShortlist(q, rows, metric, { baselineId: ref });
    $('#cx-ans').innerHTML = `<p>${esc(a.text)}</p>${a.type === 'gap' || a.type === 'action' ? '' : ''}${sources()}`;
  };
  const plot = () => {
    if (stale()) return;
    const pool = h.ranked(1500).filter((x) => !rows.some((r) => r.id === x.r.id));
    const all = rowsFor(h, pool, measures.filter((f) => f.id === axisX || f.id === axisY)).concat(rows);
    const s = scatterRows(all, axisX, axisY);
    const pn = $('#cx-pnote'), el = $('#cx-plot');
    if (!s.points.length) { el.innerHTML = ''; pn.textContent = s.needsChoice ? 'These places use different sources, levels or years for one of the two measures, so no common chart is drawn. Pick other measures.' : 'Not enough comparable values for this pair of measures.'; return; }
    const W = 640, H = 300, P = 34, xs = s.points.map((p) => p.x), ys = s.points.map((p) => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sx = (v) => P + (x1 > x0 ? (v - x0) / (x1 - x0) : 0.5) * (W - 2 * P), sy = (v) => H - P + 0 - (y1 > y0 ? (v - y0) / (y1 - y0) : 0.5) * (H - 2 * P);
    const mine = new Set(rows.map((r) => r.id));
    const bg = s.points.filter((p) => !mine.has(p.id)).map((p) => `<circle class="cx-dot" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="2.2"><title>${esc(p.label)}</title></circle>`).join('');
    const fg = s.points.filter((p) => mine.has(p.id)).map((p) => `<g><circle class="cx-hit${p.id === ref ? ' ref' : ''}" data-cxref="${esc(p.id)}" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="7" tabindex="0" role="button" aria-label="${esc(p.label)}: make it the reference"><title>${esc(p.label)}</title></circle><text class="cx-lab" x="${(sx(p.x) + 10).toFixed(1)}" y="${(sy(p.y) + 4).toFixed(1)}">${esc(p.label)}</text></g>`).join('');
    const nx = (h.factors[axisX] || {}).name || axisX, ny = axisY === 'score' ? 'Score' : (h.factors[axisY] || {}).name || axisY;
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(nx)} across, ${esc(ny)} up; the compared places are highlighted">${bg}${fg}<text class="cx-ax" x="${P}" y="${H - 8}">${esc(nx)} →</text><text class="cx-ax" x="6" y="14">↑ ${esc(ny)}</text></svg>`;
    const out = s.excluded.length; pn.textContent = `${s.points.length} places drawn${out ? `; ${out} left out because a value is missing or measured on a different basis` : ''}. Click a highlighted place to make it the reference.`;
  };
  sec.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-cxref],[data-cxq]'); if (!t) return;
    if (t.dataset.cxref) { ref = t.dataset.cxref; sec.querySelectorAll('.cx-ref button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cxref === ref))); plot(); ask('difference'); }
    else ask(t.dataset.cxq);
  });
  sec.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('circle[data-cxref]')) { ev.preventDefault(); ev.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  sec.addEventListener('change', (ev) => {
    if (ev.target.id === 'cx-m') { metric = ev.target.value; ask('lowest'); }
    if (ev.target.id === 'cx-x') { axisX = ev.target.value; plot(); }
    if (ev.target.id === 'cx-y') { axisY = ev.target.value; plot(); }
  });
  plot();
}

window.NZUpgrade = { version: '2.14-' + UTIL_VERSION, mountCompare };
