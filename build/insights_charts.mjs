/* Nestlyzer Insights charts (2.13.1). Mobile first: every chart that needs a canvas is drawn twice, a wide version
   for screens over 640 px and a tall, narrow one for phones, so labels stay readable and nothing is cut off. Bars,
   rankings, arrows and small multiples are plain HTML that reflows on any screen. All drawn at build time: readable by
   search engines, no script needed, sharp in print. */

export function charts({ esc, fmt }) {
  const fin = Number.isFinite;
  const median = (a) => { const s = a.filter(fin).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
  const quant = (a, q) => { const s = a.filter(fin).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))] : null; };
  const ticks = (a, b, n) => { const st = (b - a) / n || 1, mag = 10 ** Math.floor(Math.log10(st)), s = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= st); const out = []; for (let v = Math.ceil(a / s) * s; v <= b + 1e-9; v += s) out.push(+v.toFixed(6)); return out; };
  const medal = (i) => i >= 0 && i <= 2 ? `<span class="medal m${i + 1}" title="${['First', 'Second', 'Third'][i]}">${i === 0 ? '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M3 18h18l-1.6-10-4.9 4L12 5l-2.5 7-4.9-4z"/></svg>' : i + 1}</span>` : '';
  /* r16: every bar, arrow and small chart carries a tooltip with what the eye cannot read off (rank, distance to the
     middle, the year-by-year values); the shared script below shows it on hover, tap or keyboard focus */
  const plain = (h) => String(h).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  const tipA = (t) => ` data-tip="${esc(t)}" tabindex="0"`;
  const nf = (v) => Math.abs(v) >= 100 ? fmt(v, 0) : fmt(v, 1);
  const DIM = { d: { W: 760, H: 470, L: 62, R: 22, T: 34, B: 50 }, m: { W: 380, H: 430, L: 44, R: 12, T: 34, B: 46 } };
  const SEQ = ['#e6eff5', '#c9dde9', '#a5c7dc', '#7eaecd', '#5793bb', '#3b78a5', '#285e8a', '#1b4565'];

  function frame(o, mode, x0, x1, y0, y1) {
    const nx = mode === 'm' ? 4 : 6, ny = 5;
    /* r16 chart audit: the left margin grows with the longest y tick label (150,000 was cut off on phones) */
    const yl = Math.max(...ticks(y0, y1, ny).map((t) => String(o.yfmt(t)).length));
    const D = Object.assign({}, DIM[mode], { L: Math.max(DIM[mode].L, Math.ceil(yl * 6.4 + 12)) }), sx = (v) => D.L + (v - x0) / (x1 - x0) * (D.W - D.L - D.R), sy = (v) => D.H - D.B - (v - y0) / (y1 - y0) * (D.H - D.T - D.B);
    const g = ticks(x0, x1, nx).map((t) => `<line x1="${sx(t).toFixed(1)}" x2="${sx(t).toFixed(1)}" y1="${D.T}" y2="${D.H - D.B}" class="g"/><text x="${sx(t).toFixed(1)}" y="${D.H - D.B + 16}" class="tk" text-anchor="middle">${esc(o.xfmt(t))}</text>`).join('') +
      ticks(y0, y1, ny).map((t) => `<line x1="${D.L}" x2="${D.W - D.R}" y1="${sy(t).toFixed(1)}" y2="${sy(t).toFixed(1)}" class="g"/><text x="${D.L - 6}" y="${(sy(t) + 4).toFixed(1)}" class="tk" text-anchor="end">${esc(o.yfmt(t))}</text>`).join('');
    const ax = `<text x="${D.W - D.R}" y="${D.H - 8}" class="ax" text-anchor="end">${esc(mode === 'm' && o.xlS ? o.xlS : o.xl)} →</text><text x="4" y="16" class="ax">↑ ${esc(mode === 'm' && o.ylS ? o.ylS : o.yl)}</text>`;
    return { D, sx, sy, g, ax };
  }
  function range(v, padFrac, lo, hi) { let a = lo != null ? lo : Math.min(...v), b = hi != null ? hi : Math.max(...v); const p = (b - a) * padFrac || 1; return [lo != null ? a : a - p, hi != null ? b : b + p]; }
  function trendPath(pts, sx, sy, bins) {
    const xs = pts.map((p) => p.x).sort((a, b) => a - b), out = [];
    for (let i = 0; i < bins; i++) {
      const a = xs[Math.floor(i / bins * (xs.length - 1))], b = xs[Math.floor((i + 1) / bins * (xs.length - 1))];
      const inb = pts.filter((p) => p.x >= a && (i === bins - 1 ? p.x <= b : p.x < b));
      if (inb.length >= 5) out.push([median(inb.map((p) => p.x)), median(inb.map((p) => p.y))]);
    }
    return out.length > 1 ? `<polyline points="${out.map(([x, y]) => sx(x).toFixed(1) + ',' + sy(y).toFixed(1)).join(' ')}" class="tr"/>` : '';
  }
  /* r16 chart audit: a label is placed right of its dot, else left, above or below, and only where it overlaps no other
     label, no other dot and stays inside the plot; a label that fits nowhere is left out (its dot stays highlighted) */
  function labelText(p, sx, sy, D, big, pos) {
    const x = sx(p.x), y = sy(p.y), q = pos || { side: x > D.W - (big ? 160 : 110) ? 'l' : 'r' };
    const at = q.side === 'r' ? [x + 9, y + 4, ''] : q.side === 'l' ? [x - 9, y + 4, ' text-anchor="end"'] : q.side === 'u' ? [x, y - 10, ' text-anchor="middle"'] : [x, y + 17, ' text-anchor="middle"'];
    const t = `<text x="${at[0].toFixed(1)}" y="${at[1].toFixed(1)}"${at[2]} class="lb">${esc(p.name)}</text>`;
    return p.href ? `<a href="${p.href}">${t}</a>` : t;
  }
  function placeLabels(cands, sx, sy, D, big, dots, rad, reserved) {
    const boxes = (reserved || []).slice(), keep = new Map(), R = (rad || 4.6) + 1.5, P = (dots || []).map((d) => [sx(d.x), sy(d.y), d]);
    const hitsDot = (b, self) => P.some(([cx, cy, d]) => d !== self && cx > b[0] - R && cx < b[2] + R && cy > b[1] - R && cy < b[3] + R);
    for (const p of cands) {
      const x = sx(p.x), y = sy(p.y), w = String(p.name).length * 6.9 + 4;
      const opts = (x > D.W - (big ? 160 : 110) ? ['l', 'r', 'u', 'd'] : ['r', 'l', 'u', 'd']).map((side) => [side,
        side === 'r' ? [x + 8, y - 10, x + 9 + w, y + 5] : side === 'l' ? [x - 9 - w, y - 10, x - 8, y + 5] : side === 'u' ? [x - w / 2, y - 23, x + w / 2, y - 7] : [x - w / 2, y + 5, x + w / 2, y + 21]]);
      for (const [side, b] of opts) {
        if (b[0] < D.L - 2 || b[2] > D.W - D.R + 2 || b[1] < D.T - 14 || b[3] > D.H - D.B + 2) continue;
        if (boxes.some((q) => !(b[2] < q[0] || b[0] > q[2] || b[3] < q[1] || b[1] > q[3]))) continue;
        if (hitsDot(b, p)) continue;
        boxes.push(b); keep.set(p, { side }); break;
      }
    }
    return keep;
  }
  function scatterSVG(pts, o, mode) {
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const [x0, x1] = range(xs, 0.05, o.xmin, o.xmax), [y0, y1] = range(ys, 0.07, o.ymin, o.ymax);
    const { D, sx, sy, g, ax } = frame(o, mode, x0, x1, y0, y1), mx = median(xs), my = median(ys);
    /* r16: the good corner is shaded green and the opposite corner red, each with a short name; on then-against-now charts
       the side of the diagonal that means improvement is green and the other red */
    const q = o.good, opp = q ? (q.includes('top') ? 'bottom' : 'top') + '-' + (q.includes('right') ? 'left' : 'right') : null;
    const quad = (k, cls) => `<rect x="${(k.includes('right') ? sx(mx) : D.L).toFixed(1)}" y="${(k.includes('top') ? D.T : sy(my)).toFixed(1)}" width="${(k.includes('right') ? D.W - D.R - sx(mx) : sx(mx) - D.L).toFixed(1)}" height="${(k.includes('top') ? sy(my) - D.T : D.H - D.B - sy(my)).toFixed(1)}" class="${cls}"/>`;
    const qlab = (k, t, cls) => { const right = k.includes('right'), top = k.includes('top'); return `<text x="${(right ? D.W - D.R - 6 : D.L + 6).toFixed(1)}" y="${(top ? D.T + 14 : D.H - D.B - 7).toFixed(1)}"${right ? ' text-anchor="end"' : ''} class="ql ${cls}">${esc(t)}</text>`; };
    let shade = q ? quad(q, 'gd') + quad(opp, 'bd') : '', qtext = q ? qlab(q, o.goodLabel || 'Better on both', 'qg') + qlab(opp, o.badLabel || 'Worse on both', 'qb') : '';
    if (o.diag && o.better) {
      const L0 = D.L, R0 = D.W - D.R, T0 = D.T, B0 = D.H - D.B;
      const above = `${L0},${sy(x0).toFixed(1)} ${R0},${sy(x1).toFixed(1)} ${R0},${T0} ${L0},${T0}`, below = `${L0},${sy(x0).toFixed(1)} ${R0},${sy(x1).toFixed(1)} ${R0},${B0} ${L0},${B0}`;
      shade = `<clipPath id="cp${mode}${o.cpid || ''}"><rect x="${L0}" y="${T0}" width="${R0 - L0}" height="${B0 - T0}"/></clipPath><g clip-path="url(#cp${mode}${o.cpid || ''})"><polygon points="${o.better > 0 ? above : below}" class="gd"/><polygon points="${o.better > 0 ? below : above}" class="bd"/></g>`;
      qtext = `<text x="${(L0 + 6).toFixed(1)}" y="${(T0 + 14).toFixed(1)}" class="ql ${o.better > 0 ? 'qg' : 'qb'}">${o.better > 0 ? 'Improved' : 'Got worse'}</text><text x="${(R0 - 6).toFixed(1)}" y="${(B0 - 7).toFixed(1)}" text-anchor="end" class="ql ${o.better > 0 ? 'qb' : 'qg'}">${o.better > 0 ? 'Got worse' : 'Improved'}</text>`;
    }
    const qbox = []; { const ks = o.diag && o.better ? [['top-left', o.better > 0 ? 'Improved' : 'Got worse'], ['bottom-right', o.better > 0 ? 'Got worse' : 'Improved']] : q ? [[q, o.goodLabel || 'Better on both'], [opp, o.badLabel || 'Worse on both']] : [];
      for (const [k, t] of ks) { const w = t.length * 7 + 6, right = k.includes('right'), top = k.includes('top'), x = right ? D.W - D.R - 6 - w : D.L + 4, y = top ? D.T + 2 : D.H - D.B - 20; qbox.push([x, y, x + w, y + 16]); } }
    const want = (o.labels || []).slice(0, mode === 'm' ? (o.mLabels || 6) : 99), byKey = new Map(pts.map((p) => [p.key, p]));
    const many = pts.length > 400, r = many ? (mode === 'm' ? 1.6 : 2) : (mode === 'm' ? 4 : 4.6);
    const placed = placeLabels(want.map((k) => byKey.get(k)).filter(Boolean), sx, sy, D, mode === 'd', many ? pts.filter((p) => want.includes(p.key)) : pts, r + 1.6, qbox), lab = new Map([...placed].map(([p, v]) => [p.key, v])), mark = new Set(want);
    const dots = pts.map((p) => { const on = mark.has(p.key); if (many && !on) return `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="${r}" class="p s"/>`; return ''; }).join('') +
      pts.map((p) => { const on = mark.has(p.key); if (many && !on) return ''; const tag = p.href ? 'a' : 'g'; return `<${tag}${p.href ? ` href="${esc(p.href)}"` : ''} class="pt${on ? ' on' : ''}${p.cls ? ' ' + p.cls : ''}"><circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="${on ? r + 1.6 : r}"><title>${esc(p.name)}: ${esc(o.xlS || o.xl)} ${esc(o.xfmt(p.x))}; ${esc(o.ylS || o.yl)} ${esc(o.yfmt(p.y))}</title></circle>${lab.has(p.key) ? labelText(Object.assign({}, p, { href: null }), sx, sy, D, mode === 'd', lab.get(p.key)) : ''}</${tag}>`; }).join('');
    return `<svg viewBox="0 0 ${D.W} ${D.H}" role="img" aria-label="${esc(o.title)}">${shade}${g}${qtext}<line x1="${sx(mx).toFixed(1)}" x2="${sx(mx).toFixed(1)}" y1="${D.T}" y2="${D.H - D.B}" class="md"/><line x1="${D.L}" x2="${D.W - D.R}" y1="${sy(my).toFixed(1)}" y2="${sy(my).toFixed(1)}" class="md"/>${o.trend ? trendPath(pts, sx, sy, 12) : ''}${o.diag ? (() => { const a0 = Math.max(x0, y0), a1 = Math.min(x1, y1); return a1 > a0 ? `<line x1="${sx(a0).toFixed(1)}" y1="${sy(a0).toFixed(1)}" x2="${sx(a1).toFixed(1)}" y2="${sy(a1).toFixed(1)}" class="md" style="stroke-dasharray:2 4;stroke-width:1.6"/>` : ''; })() : ''}${dots}${ax}</svg>`;
  }
  function densitySVG(pts, o, mode) {
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const hx = (o.highlights || []).map((p) => p.x), hy = (o.highlights || []).map((p) => p.y);
    let x0 = o.xmin != null ? o.xmin : Math.min(quant(xs, 0.005), ...hx), x1 = o.xmax != null ? o.xmax : Math.max(quant(xs, 0.995), ...hx), y0 = o.ymin != null ? o.ymin : Math.min(quant(ys, 0.005), ...hy), y1 = o.ymax != null ? o.ymax : Math.max(quant(ys, 0.995), ...hy);
    const px = (x1 - x0) * 0.03, py = (y1 - y0) * 0.04; x0 -= px; x1 += px; y0 -= py; y1 += py;
    const { D, sx, sy, g, ax } = frame(o, mode, x0, x1, y0, y1);
    const nx = mode === 'm' ? 30 : 64, ny = mode === 'm' ? 30 : 38, cnt = new Map();
    for (const p of pts) { if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue; const i = Math.min(nx - 1, Math.floor((p.x - x0) / (x1 - x0) * nx)), j = Math.min(ny - 1, Math.floor((p.y - y0) / (y1 - y0) * ny)); cnt.set(i + ',' + j, (cnt.get(i + ',' + j) || 0) + 1); }
    const mxc = Math.max(1, ...cnt.values()), cw = (D.W - D.L - D.R) / nx, ch = (D.H - D.T - D.B) / ny;
    const cells = [...cnt].map(([k, c]) => { const [i, j] = k.split(',').map(Number), lvl = Math.min(SEQ.length - 1, Math.floor(Math.log(c) / Math.log(mxc + 1) * SEQ.length)); return `<rect x="${(D.L + i * cw).toFixed(1)}" y="${(D.H - D.B - (j + 1) * ch).toFixed(1)}" width="${(cw + 0.3).toFixed(1)}" height="${(ch + 0.3).toFixed(1)}" fill="${SEQ[lvl]}"/>`; }).join('');
    const inside = pts.filter((p) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1);
    const all = (o.highlights || []).filter((p) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1), lab = placeLabels(all.slice(0, mode === 'm' ? (o.mLabels || 6) : 12), sx, sy, D, mode === 'd', all, mode === 'm' ? 3.4 : 4.2);
    const hl = all.map((p) => `<g class="pt on"><circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="${mode === 'm' ? 3.4 : 4.2}"><title>${esc(p.name)}: ${esc(o.xfmt(p.x))}, ${esc(o.yfmt(p.y))}</title></circle>${lab.has(p) ? labelText(p, sx, sy, D, mode === 'd', lab.get(p)) : ''}</g>`).join('');
    return `<svg viewBox="0 0 ${D.W} ${D.H}" role="img" aria-label="${esc(o.title)}">${g}${cells}${trendPath(inside, sx, sy, 16)}${hl}${ax}</svg>`;
  }
  /* r16: one sentence on what stands out, computed from the same points (corner counts, the clearest cases) */
  function scatterTake(pts, o) {
    const P = pts.filter((p) => fin(p.x) && fin(p.y)); if (P.length < 8) return '';
    const unit = o.many || P.length > 120 ? 'places' : 'countries', nm = (p) => esc(p.name);
    if (o.diag && o.better) {
      const up = P.filter((p) => (p.y - p.x) * o.better > 0), dn = P.filter((p) => (p.y - p.x) * o.better < 0);
      const best = up.slice().sort((a, b) => Math.abs(b.y - b.x) / (Math.abs(b.x) || 1) - Math.abs(a.y - a.x) / (Math.abs(a.x) || 1))[0], worst = dn.slice().sort((a, b) => Math.abs(b.y - b.x) / (Math.abs(b.x) || 1) - Math.abs(a.y - a.x) / (Math.abs(a.x) || 1))[0];
      return `${up.length} of ${P.length} ${unit} improved and ${dn.length} got worse.` + (best ? ` Biggest step forward: ${nm(best)}.` : '') + (worst ? ` Biggest step back: ${nm(worst)}.` : '');
    }
    if (o.good) {
      const mx = median(P.map((p) => p.x)), my = median(P.map((p) => p.y)), R = o.good.includes('right'), T = o.good.includes('top');
      const inG = (p) => (R ? p.x > mx : p.x < mx) && (T ? p.y > my : p.y < my), inB = (p) => (R ? p.x < mx : p.x > mx) && (T ? p.y < my : p.y > my);
      const sdx = Math.max(1e-9, quant(P.map((p) => p.x), 0.9) - quant(P.map((p) => p.x), 0.1)), sdy = Math.max(1e-9, quant(P.map((p) => p.y), 0.9) - quant(P.map((p) => p.y), 0.1));
      const sc = (p) => (R ? 1 : -1) * (p.x - mx) / sdx + (T ? 1 : -1) * (p.y - my) / sdy;
      const g = P.filter(inG).sort((a, b) => sc(b) - sc(a)), b = P.filter(inB).sort((a, b2) => sc(a) - sc(b2));
      return `${g.length} of ${P.length} ${unit} sit in the green corner, better than the middle on both counts` + (g[0] ? `, led by ${nm(g[0])}${g[1] ? ' and ' + nm(g[1]) : ''}` : '') + `; ${b.length} sit in the red corner` + (b[0] ? `, ${nm(b[0])} furthest out` : '') + '.';
    }
    return '';
  }
  function fig(title, d, m, caption, extra) {
    return `<figure class="ins-fig"><figcaption class="ins-ft">${esc(title)}</figcaption><div class="v-d">${d}</div><div class="v-m">${m}</div>${extra || ''}${caption ? `<p class="ins-cap">${caption}</p>` : ''}</figure>`;
  }
  const legendDensity = (n) => `<div class="ins-leg"><span>fewer places</span>${SEQ.map((c) => `<i style="background:${c}"></i>`).join('')}<span>more</span><span class="ins-leg-tr">— typical value along the axis</span><span>${n.toLocaleString('en-GB')} places</span></div>`;

  return {
    median, quant, medal, fin,
    scatter(pts, o) { o = Object.assign({ cpid: [...String(o.title)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7).toString(36) }, o); const take = scatterTake(pts, o); return fig(o.title, scatterSVG(pts, o, 'd'), scatterSVG(pts, o, 'm'), (take ? '<b class="ins-take">' + take + '</b> ' : '') + (o.caption || ''), o.trend ? '<div class="ins-leg"><span class="ins-leg-tr">— typical value along the axis</span></div>' : ''); },
    density(pts, o) { return fig(o.title, densitySVG(pts, o, 'd'), densitySVG(pts, o, 'm'), o.caption, legendDensity(pts.length)); },
    /* ranked bars as HTML: rows [{label (html), v, note?}] in display order */
    bars(rows, o) {
      const vals = rows.map((r) => r.v), lo = Math.min(0, ...vals), hi = Math.max(0, ...vals), span = hi - lo || 1, z = (0 - lo) / span * 100;
      const li = rows.map((r, i) => {
        const a = Math.min(r.v, 0), b = Math.max(r.v, 0), left = (a - lo) / span * 100, w = Math.max(0.6, (b - a) / span * 100), tone = o.tone ? o.tone(r.v, r) : '';
        const md = median(vals), rel = md ? (r.v - md) / Math.abs(md) * 100 : null, tip = `${plain(r.label)}: ${plain(o.fmt(r.v, r))}, number ${i + 1} of ${rows.length}` + (fin(rel) && Math.abs(rel) >= 1 && Math.abs(rel) < 1000 ? `, ${fmt(Math.abs(rel), 0)}% ${rel > 0 ? 'above' : 'below'} the middle value` : '') + (r.note ? ` (${plain(r.note)})` : '');
        return `<li${r.hl ? ' class="hl"' : ''}${tipA(tip)}>${o.noMedal ? '' : `<span class="hb-r">${medal(i) || `<small>${i + 1}</small>`}</span>`}<span class="hb-l">${r.label}</span><span class="hb-t">${lo < 0 ? `<b class="z" style="left:${z.toFixed(1)}%"></b>` : ''}<i class="${tone}" style="left:${left.toFixed(1)}%;width:${w.toFixed(1)}%"></i></span><span class="hb-v">${esc(o.fmt(r.v, r))}${r.note ? `<small>${esc(r.note)}</small>` : ''}</span></li>`;
      }).join('');
      return `<figure class="ins-fig">${o.title ? `<figcaption class="ins-ft">${esc(o.title)}</figcaption>` : ''}<ol class="hb${o.noMedal ? ' nm' : ''}">${li}</ol>${o.caption ? `<p class="ins-cap">${o.caption}</p>` : ''}</figure>`;
    },
    /* before -> after rows: [{label, a, b}] */
    arrows(rows, o) {
      const all = rows.flatMap((r) => [r.a, r.b]), lo = Math.min(...all, o.zero ? 0 : Infinity), hi = Math.max(...all), span = hi - lo || 1, P = (v) => ((v - lo) / span * 96 + 2).toFixed(1);
      const li = rows.map((r) => { const up = (r.b > r.a) === (o.better >= 0), l = Math.min(r.a, r.b), w = Math.abs(r.b - r.a); return `<li${tipA(`${plain(r.label)}: from ${plain(o.fmt(r.a))} to ${plain(o.fmt(r.b))}` + (r.note ? `, ${plain(r.note)}` : '') + (o.better ? (up ? ', the right direction' : ', the wrong direction') : ''))}><span class="hb-l">${r.label}</span><span class="ar-t">${o.zero && lo < 0 ? `<b class="z" style="left:${P(0)}%"></b>` : ''}<i class="ln ${up ? 'g' : 'b'}" style="left:${P(l)}%;width:${(w / span * 96).toFixed(1)}%"></i><i class="a" style="left:${P(r.a)}%"></i><i class="h ${up ? 'g' : 'b'}" style="left:${P(r.b)}%"></i></span><span class="hb-v">${esc(o.fmt(r.a))} → <b>${esc(o.fmt(r.b))}</b></span></li>`; }).join('');
      return `<figure class="ins-fig"><figcaption class="ins-ft">${esc(o.title)}</figcaption><ol class="ar">${li}</ol><div class="ins-leg"><span><i class="a"></i> ${esc(o.aLabel)}</span>${o.neutral ? `<span><i class="h g"></i> ${esc(o.bLabel)}: rose</span><span><i class="h b"></i> fell</span>` : `<span><i class="h g"></i> ${esc(o.bLabel)}: better</span><span><i class="h b"></i> worse</span>`}</div>${o.caption ? `<p class="ins-cap">${o.caption}</p>` : ''}</figure>`;
    },
    /* small multiples: items [{label (html), y: [[year, v]], note}] with a shared or own scale */
    multiples(items, o) {
      const all = items.flatMap((it) => it.y.map((p) => p[1])), gy0 = Math.min(...all), gy1 = Math.max(...all), yrs = items.flatMap((it) => it.y.map((p) => p[0])), gx0 = Math.min(...yrs), gx1 = Math.max(...yrs);
      const cards = items.map((it) => {
        const y0 = o.shared ? gy0 : Math.min(...it.y.map((p) => p[1])), y1 = o.shared ? gy1 : Math.max(...it.y.map((p) => p[1])), W = 160, H = 54;
        const X = (x) => ((x - gx0) / (gx1 - gx0 || 1) * (W - 4) + 2).toFixed(1), Y = (v) => (H - 3 - (v - y0) / (y1 - y0 || 1) * (H - 6)).toFixed(1);
        const zero = o.zeroLine && y0 < 0 && y1 > 0 ? `<line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" class="zl"/>` : '';
        const last = it.y[it.y.length - 1];
        const step = Math.max(1, Math.ceil(it.y.length / 8)), pick = it.y.filter((p, k) => k % step === 0 || k === it.y.length - 1);
        return `<div class="sm${it.hl ? ' hl' : ''}"${tipA(plain(it.label) + ': ' + pick.map((p) => p[0] + ' ' + plain(o.fmt ? o.fmt(p[1]) : nf(p[1]))).join(', '))}><div class="sm-h">${it.label}</div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${zero}<polyline points="${it.y.map((p) => X(p[0]) + ',' + Y(p[1])).join(' ')}" class="sl ${it.tone || ''}" vector-effect="non-scaling-stroke"/></svg><div class="sm-v"><b>${esc(o.fmt(last[1]))}</b> <span>${last[0]}</span>${it.note ? ` <em class="${it.tone || ''}">${esc(it.note)}</em>` : ''}</div></div>`;
      }).join('');
      return `<figure class="ins-fig"><figcaption class="ins-ft">${esc(o.title)}</figcaption><div class="sms">${cards}</div>${o.caption ? `<p class="ins-cap">${o.caption}</p>` : ''}</figure>`;
    },
    /* league table that turns into cards on phones (page() labels every cell) */
    league(head, rows) { const lab = head.map((h) => String(h).replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')); return `<div class="ins-tw"><table class="ins-league"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td data-l="${lab[i]}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; },
    CSS: `<style>
.ins-fig{max-width:1000px;margin:18px 0 10px;background:var(--surface,#fff);border:1px solid var(--line,#dde3e8);border-radius:16px;padding:14px 14px 8px;max-width:100%;overflow:hidden}
.ins-ft{font-weight:700;font-size:16px;line-height:1.35;margin:0 0 8px}.ins-cap{font-size:14px;color:var(--ink-2,#46505c);line-height:1.55;margin:8px 2px 4px}
.ins-fig svg{width:100%;height:auto;display:block;font-family:inherit;overflow:visible}.v-m{display:none}.v-d svg{max-width:860px;margin:0 auto}
@media (max-width:640px){.v-d{display:none}.v-m{display:block}.ins-fig{padding:10px 8px 6px;border-radius:12px;margin-left:-4px;margin-right:-4px}}
.ins-fig .g{stroke:var(--line,#dde3e8);stroke-width:1}.ins-fig .md{stroke:#8a97a6;stroke-dasharray:4 4;stroke-width:1}.ins-fig .tk{font-size:11px;fill:var(--ink-3,#6b7785)}.ins-fig .ax{font-size:12.5px;font-weight:650;fill:var(--ink,#132238)}
.ins-fig .gd{fill:#2a9c96;opacity:.10}.ins-fig .bd{fill:#c0504d;opacity:.07}.ins-fig .ql{font-size:12px;font-weight:700;paint-order:stroke;stroke:var(--surface,#fff);stroke-width:3px;stroke-linejoin:round}.ins-fig .ql.qg{fill:#1e7f5c}.ins-fig .ql.qb{fill:#b23b3b}.ins-take{display:block;font-weight:650;color:var(--ink,#132238);margin-bottom:4px}.ins-fig .pt circle{cursor:pointer;transition:r .12s}.ins-fig .pt.hov circle{stroke:var(--ink,#132238);stroke-width:2}.ins-fig [data-tip]{cursor:default}.ins-fig li[data-tip]:hover,.ins-fig li.hov,.ins-fig .sm.hov{background:color-mix(in srgb,#5f8fc2 9%,transparent)}.ins-fig .sm.hov{border-color:#5f8fc2}.ins-fig [data-tip]:focus-visible{outline:2px solid #5f8fc2;outline-offset:2px}.ins-tip{position:absolute;z-index:30;pointer-events:none;max-width:260px;padding:6px 9px;border-radius:8px;background:var(--ink,#132238);color:#fff;font-size:13px;line-height:1.35;box-shadow:0 4px 14px rgba(0,0,0,.18)}.ins-fig .tr{fill:none;stroke:#d9822b;stroke-width:2.6;stroke-linejoin:round;stroke-linecap:round;opacity:.95}
.ins-fig .p.s{fill:#3b78a5;opacity:.32}.ins-fig .pt circle{fill:#5f8fc2;opacity:.8}.ins-fig .pt.on circle{fill:#d9822b;opacity:1;stroke:#fff;stroke-width:1.2}.ins-fig .lb{font-size:12px;font-weight:650;fill:var(--ink,#132238);paint-order:stroke;stroke:var(--surface,#fff);stroke-width:3px;stroke-linejoin:round}
.ins-fig a .lb{text-decoration:underline;text-decoration-thickness:1px}
.ins-leg{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;font-size:12.5px;color:var(--ink-3,#6b7785);margin:8px 2px 0}.ins-leg i{display:inline-block;width:16px;height:10px}.ins-leg-tr{color:#b8661a;font-weight:650}
.hb,.ar{list-style:none;margin:0;padding:0}.hb li,.ar li{display:grid;grid-template-columns:2em minmax(8em,30%) 1fr minmax(5.5em,auto);gap:4px 10px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line,#eef1f4)}
.ar li,.hb.nm li{grid-template-columns:minmax(8em,30%) 1fr minmax(7em,auto)}.hb li:last-child,.ar li:last-child{border-bottom:0}.hb li.hl .hb-l{font-weight:700}
.hb-r{text-align:center;color:var(--ink-3)}.hb-r small{font-size:12px}.hb-l{font-size:14.5px;line-height:1.3;min-width:0;overflow-wrap:anywhere}.hb-l img{vertical-align:-1px;margin-right:4px}
.hb-t,.ar-t{position:relative;height:14px;background:var(--surface-2,#f1f4f6);border-radius:7px}.hb-t i{position:absolute;top:0;bottom:0;border-radius:7px;background:#5f8fc2}.hb-t i.g{background:#2a9c96}.hb-t i.b{background:#c0504d}.hb-t i.n{background:#8a97a6}
.hb-t .z,.ar-t .z{position:absolute;top:-3px;bottom:-3px;width:1.5px;background:#6b7785}.hb-v{font-size:14px;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}.hb-v small{display:block;font-size:11.5px;color:var(--ink-3)}
.ar-t i{position:absolute}.ar-t .ln{top:6px;height:3px;border-radius:2px}.ar-t .a,.ins-leg .a{top:3px;width:9px;height:9px;border-radius:50%;background:#8a97a6;margin-left:-4px}.ar-t .h,.ins-leg .h{top:1px;width:13px;height:13px;border-radius:50%;margin-left:-6px;box-shadow:0 0 0 2px var(--surface,#fff)}
.ins-leg .a,.ins-leg .h{position:static;display:inline-block;margin:0 2px 0 0;vertical-align:-1px}.g{--c:#2a9c96}.ar-t .g,.ins-leg .h.g{background:#2a9c96}.ar-t .b,.ins-leg .h.b{background:#c0504d}
@media (max-width:640px){.hb li{grid-template-columns:1.7em 1fr auto;gap:2px 8px}.hb.nm li{grid-template-columns:1fr auto}.hb-t{grid-column:2/-1;grid-row:2;height:10px}.hb.nm .hb-t{grid-column:1/-1}.ar li{grid-template-columns:1fr auto}.ar-t{grid-column:1/-1;grid-row:2}.hb-l{font-size:14px}}
.sms{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.sm{border:1px solid var(--line,#e3e8ec);border-radius:12px;padding:8px 10px;min-width:0}.sm.hl{border-color:#d9822b;box-shadow:0 0 0 1px #d9822b}
.sm-h{font-size:13.5px;font-weight:650;line-height:1.3;min-height:2.6em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.sm svg{width:100%;height:46px;display:block;margin:4px 0}.sm .sl{fill:none;stroke:#3b78a5;stroke-width:1.8}.sm .sl.g{stroke:#2a9c96}.sm .sl.b{stroke:#c0504d}.sm .zl{stroke:#aab4bf;stroke-dasharray:3 3}
.sm-v{font-size:12.5px;color:var(--ink-3)}.sm-v b{color:var(--ink);font-size:14px}.sm-v em{font-style:normal;font-weight:650}.sm-v em.g{color:#1e7f5c}.sm-v em.b{color:#b23b3b}
@media (max-width:640px){.sms{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}}
.ins-tw{overflow-x:auto;margin:14px 0}.ins-league{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}.ins-league th,.ins-league td{padding:7px 8px;border-bottom:1px solid var(--line,#e3e8ec);text-align:right;white-space:nowrap}.ins-league th{font-size:12.5px;color:var(--ink-3);font-weight:650}.ins-league th:first-child,.ins-league td:first-child{text-align:left}.ins-league .gd{color:#1e7f5c;font-weight:650}.ins-league .bd{color:#b23b3b}.ins-league td:first-child img{margin:0 4px 0 2px;vertical-align:-1px}
@media (max-width:700px){.ins-league thead{display:none}.ins-league,.ins-league tbody{display:block}.ins-league tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 10px;padding:9px 10px;margin:0 0 8px;border:1px solid var(--line,#e3e8ec);border-radius:12px;background:var(--surface,#fff)}.ins-league td{border:0;padding:0;text-align:left;white-space:normal;min-width:0}.ins-league td:first-child{grid-column:1/-1;font-size:15.5px;font-weight:700}.ins-league td:not(:first-child)::before{content:attr(data-l);display:block;font-size:11px;font-weight:500;color:var(--ink-3)}}
.medal{display:inline-grid;place-items:center;width:1.3em;height:1.3em;border-radius:50%;font-size:.78em;font-weight:800;color:#fff;margin-right:4px;vertical-align:.08em;line-height:1}.medal.m1{background:#d4a017}.medal.m2{background:#8f99a3}.medal.m3{background:#b87333}.medal svg{width:.9em;height:.9em}
</style><script>/* r16: hover or tap a dot to read its values */(function(){if(window.__nzTip)return;window.__nzTip=1;var tip=null,cur=null;function hide(){if(tip)tip.style.display='none';if(cur){cur.classList.remove('hov');cur=null;}}function show(e){var c=e.target.closest&&e.target.closest('.ins-fig svg .pt,.ins-fig [data-tip]');if(!c){hide();return;}var t=c.getAttribute('data-tip')?{textContent:c.getAttribute('data-tip')}:c.querySelector('title');if(!t)return;if(!tip){tip=document.createElement('div');tip.className='ins-tip';tip.setAttribute('role','status');document.body.appendChild(tip);}if(cur&&cur!==c)cur.classList.remove('hov');cur=c;c.classList.add('hov');tip.textContent=t.textContent;tip.style.display='block';var r=c.getBoundingClientRect(),w=tip.offsetWidth,x=Math.min(Math.max(8,r.left+r.width/2-w/2+scrollX),scrollX+document.documentElement.clientWidth-w-8),y=r.top+scrollY-tip.offsetHeight-10;if(y<scrollY+4)y=r.bottom+scrollY+10;tip.style.left=x+'px';tip.style.top=y+'px';}document.addEventListener('pointerover',show);document.addEventListener('pointerdown',show);document.addEventListener('focusin',show);document.addEventListener('focusout',hide);document.addEventListener('scroll',hide,{passive:true});})();</script>`,
  };
}
