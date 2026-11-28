/* r21b: Nestlyzer atlas renderer, a strategy-game map of real data. One renderer for a country atlas and the world map.
   Painted hexagon terrain with relief, coastal waters, region (or country) borders and names, city banners, lenses,
   drag/scroll/pinch zoom with a minimap, a region panel, a tooltip and, in a country, three daily games. Far-away parts
   (Alaska, Hawaii, overseas islands) sit in fixed boxes below the main land. No network requests: the data is in the page. */
(function () {
  var el = document.getElementById('at-data'), cv = document.getElementById('at-canvas'); if (!el || !cv) return;
  var D = JSON.parse(el.textContent), WORLD = D.mode === 'world', ctx = cv.getContext('2d'), tip = document.getElementById('at-tip'), leg = document.getElementById('at-legend');
  var mini = document.getElementById('at-mini'), mctx = mini && mini.getContext('2d'), panel = document.getElementById('at-region'), home = document.getElementById('at-home');
  var S3 = Math.sqrt(3), T = D.tiles, N = T.length, CI = {}, NI = D.ni || 17, GI = NI + 1, RI = NI + 2; D.cats.forEach(function (k, i) { CI[k] = 8 + i; });
  var TCOL = ['#E2CF95', '#93C066', '#4E8C52', '#A7A86B', '#8F8B84', '#EEF1F4', '#D8B46A', '#C8B474', '#2E7B47', '#4B7861', '#B7C3BE', '#6BA7C8'];
  var TNAME = ['Coast', 'Grassland', 'Forest', 'Hills', 'Mountains', 'High peaks', 'Desert', 'Steppe', 'Jungle', 'Taiga', 'Tundra', 'Lakeland'];
  var RAMP = ['#2b3a67', '#2f5f8a', '#2f8a8f', '#4bb08a', '#9fcf6e', '#f2d65c', '#f6a53b'], DIV = ['#b2443a', '#e08a5b', '#f3d9a4', '#cfe3b0', '#69ad6c', '#2f7d4a'];
  var layer = 'terrain', reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, start = null, hover = -1, sel = -1;
  var X = T.map(function (t) { return S3 * (t[0] + t[1] / 2); }), Y = T.map(function (t) { return 1.5 * t[1]; }), G = T.map(function (t) { return t[GI] || 0; }), RG = T.map(function (t) { return t[RI] == null ? -1 : t[RI]; });
  var KEY = {}; T.forEach(function (t, i) { KEY[t[0] + ',' + t[1]] = i; });
  var DIRS = [[1, 0, 0, 1], [1, -1, 1, 2], [0, -1, 2, 3], [-1, 0, 3, 4], [-1, 1, 4, 5], [0, 1, 5, 0]];
  function hash(i) { var h = (T[i][0] * 73856093) ^ (T[i][1] * 19349663); return ((h >>> 0) % 1000) / 1000; }
  var WATER = [], seen = {}; T.forEach(function (t, i) { if (G[i]) return; for (var dq = -2; dq <= 2; dq++) for (var dr = Math.max(-2, -dq - 2); dr <= Math.min(2, -dq + 2); dr++) { var k = (t[0] + dq) + ',' + (t[1] + dr); if (KEY[k] == null && !seen[k]) { seen[k] = 1; WATER.push([S3 * (t[0] + dq + (t[1] + dr) / 2), 1.5 * (t[1] + dr), Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr))]); } } });
  // gaps inside the land (no place in that hexagon) are drawn as unsettled land, not as water: three or more land neighbours
  var FILL = []; WATER = WATER.filter(function (w) { if (w[2] !== 1) return true; var q = Math.round((w[0] / S3) - (w[1] / 1.5) / 2), r = Math.round(w[1] / 1.5), cnt = {}, n = 0; DIRS.forEach(function (d) { var j = KEY[(q + d[0]) + ',' + (r + d[1])]; if (j != null && !G[j]) { n++; cnt[T[j][4]] = (cnt[T[j][4]] || 0) + 1; } }); if (n >= 3) { FILL.push([w[0], w[1], +Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0]]); return false; } return true; });
  function cityPlane(c) { var q = (S3 / 3 * c[1] - c[2] / 3) / D.s, r = (2 / 3 * c[2]) / D.s; return [S3 * (q + r / 2), 1.5 * r]; }
  var CP = D.cities.map(function (c) { var p = cityPlane(c), b = 0, bd = Infinity; for (var i = 0; i < N; i++) { var d = (X[i] - p[0]) * (X[i] - p[0]) + (Y[i] - p[1]) * (Y[i] - p[1]); if (d < bd) { bd = d; b = i; } } return [p[0], p[1], G[b], b]; });
  var groups = {}; G.forEach(function (g, i) { var o = groups[g] || (groups[g] = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }); o.x0 = Math.min(o.x0, X[i] - 1.5); o.x1 = Math.max(o.x1, X[i] + 1.5); o.y0 = Math.min(o.y0, Y[i] - 1.5); o.y1 = Math.max(o.y1, Y[i] + 1.5); });
  if (WORLD && N > 50) { var xs = X.slice().sort(function (a, b) { return a - b; }), ys = Y.slice().sort(function (a, b) { return a - b; }), q = function (a, f) { return a[Math.floor((a.length - 1) * f)]; }; groups[0] = { x0: q(xs, .003) - 2, x1: q(xs, .997) + 2, y0: q(ys, .003) - 2, y1: q(ys, .997) + 2 }; }   // the world view frames where the places are, not every far island
  var insets = Object.keys(groups).map(Number).filter(function (g) { return g > 0; }).sort();
  var REG = (D.regions || []).map(function (n) { return { name: n, n: 0, pop: 0, x: 0, y: 0, k: 0, cs: {} }; });
  T.forEach(function (t, i) { var R = REG[RG[i]]; if (!R) return; R.n += t[3]; R.pop += t[2]; D.cats.forEach(function (c) { var v = t[CI[c]]; if (v >= 0) { var o = R.cs[c] || (R.cs[c] = [0, 0]); o[0] += v * t[2]; o[1] += t[2]; } }); if (G[i]) return; R.x += X[i]; R.y += Y[i]; R.k++; });
  REG.forEach(function (R) { if (R.k) { R.x /= R.k; R.y /= R.k; } });
  var W, H, dpr, FR = [], cam = { z: 1, x: 0, y: 0 }, SX = new Float32Array(N), SY = new Float32Array(N), SR = new Float32Array(N), MAIN;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.parentNode.clientWidth;
    var m = groups[0], aspect = (m.y1 - m.y0) / (m.x1 - m.x0), strip = insets.length ? Math.round(Math.max(90, Math.min(150, W * 0.14))) : 0;
    H = W < 700 ? Math.round(Math.max(340, Math.min(W * aspect + strip + 20, window.innerHeight * 0.75))) : Math.round(Math.max(480, Math.min(window.innerHeight * 0.8, 920))); var hm = H - strip; MAIN = [0, 0, W, hm];
    var place = function (g, rx, ry, rw, rh) { var o = groups[g], k = Math.min(rw / (o.x1 - o.x0), rh / (o.y1 - o.y0), g ? groups[0].k * 1.4 : Infinity); o.k = k; o.ox = rx + (rw - (o.x1 - o.x0) * k) / 2; o.oy = ry + (rh - (o.y1 - o.y0) * k) / 2; };
    place(0, 10, 10, W - 20, hm - 20);
    var bw = insets.length ? (W - 16) / insets.length : 0; FR = [];
    insets.forEach(function (g, j) { var bx = 8 + j * bw + 6, by = hm + 4, w = bw - 12, h = strip - 12; place(g, bx + 8, by + 8, w - 16, h - 16); FR.push([bx, by, w, h]); });
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (mini) { mini.width = 170 * dpr; mini.height = 110 * dpr; }
  }
  // plane -> screen; the camera moves only the main land, insets stay in their boxes
  function sx(g, x) { var o = groups[g], b = o.ox + (x - o.x0) * o.k; return g ? b : (b - W / 2) * cam.z + W / 2 + cam.x; }
  function sy(g, y) { var o = groups[g], b = o.oy + (o.y1 - y) * o.k; return g ? b : (b - MAIN[3] / 2) * cam.z + MAIN[3] / 2 + cam.y; }
  function sk(g) { return groups[g].k * (g ? 1 : cam.z); }
  function project() { for (var i = 0; i < N; i++) { SX[i] = sx(G[i], X[i]); SY[i] = sy(G[i], Y[i]); SR[i] = sk(G[i]) * 0.99; } }
  function unproject(px, py) { var o = groups[0], bx = (px - cam.x - W / 2) / cam.z + W / 2, by = (py - cam.y - MAIN[3] / 2) / cam.z + MAIN[3] / 2; return [(bx - o.ox) / o.k + o.x0, o.y1 - (by - o.oy) / o.k]; }
  function hexPath(c, cx, cy, rad) { c.beginPath(); for (var i = 0; i < 6; i++) { var a = Math.PI / 180 * (60 * i - 30); c.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a)); } c.closePath(); }
  function vtx(cx, cy, rad, i) { var a = Math.PI / 180 * (60 * i - 30); return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; }
  function mix(a, b, t) { var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); var r = (A >> 16) + ((B >> 16) - (A >> 16)) * t, g = ((A >> 8) & 255) + (((B >> 8) & 255) - ((A >> 8) & 255)) * t, bl = (A & 255) + ((B & 255) - (A & 255)) * t; return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (bl | 0) + ')'; }
  function shade(hex, f) { var A = parseInt(hex.slice(1), 16), r = Math.min(255, (A >> 16) * f), g = Math.min(255, ((A >> 8) & 255) * f), b = Math.min(255, (A & 255) * f); return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; }
  function ramp(c, v) { v = Math.max(0, Math.min(1, v)); var f = v * (c.length - 1), i = Math.min(c.length - 2, Math.floor(f)); return mix(c[i], c[i + 1], f - i); }
  var densLog = T.map(function (t) { return t[6] > 0 ? Math.log10(t[6]) : null; }).filter(function (v) { return v != null; }).sort(function (a, b) { return a - b; });
  var dLo = densLog[Math.floor(densLog.length * 0.03)] || 0, dHi = densLog[Math.floor(densLog.length * 0.97)] || 3;
  var NAT = {}; (D.nat || []).forEach(function (n) { var vs = (D.info || []).map(function (i) { return i && i.v[n[0]]; }).filter(function (v) { return v != null; }).sort(function (a, b) { return a - b; }); NAT[n[0]] = { lo: vs[0], hi: vs[vs.length - 1], rev: n[3] }; });
  function val(t, i) {
    if (layer === 'people') return t[6] > 0 ? (Math.log10(t[6]) - dLo) / (dHi - dLo || 1) : null;
    if (layer === 'growth') return t[7] == null ? null : (Math.max(-10, Math.min(10, t[7])) + 10) / 20;
    if (NAT[layer]) { var inf = D.info[RG[i]], v = inf && inf.v[layer], o = NAT[layer]; if (v == null) return null; var f = (v - o.lo) / ((o.hi - o.lo) || 1); return o.rev ? 1 - f : f; }
    var ci = CI[layer]; return ci && t[ci] >= 0 ? t[ci] / 100 : null;
  }
  function colour(i) { var t = T[i]; if (layer === 'terrain') return shade(TCOL[t[4]], 0.92 + hash(i) * 0.16); var v = val(t, i); if (v == null) return 'rgba(160,172,184,.35)'; return layer === 'growth' ? ramp(DIV, v) : ramp(RAMP, v); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function visible(i) { return SX[i] > -SR[i] * 2 && SX[i] < W + SR[i] * 2 && SY[i] > -SR[i] * 2 && SY[i] < H + SR[i] * 2 && (G[i] || SY[i] < MAIN[3] + SR[i]); }
  function draw(now) {
    var prog = 1; if (!reduce) { if (start == null) start = now; prog = Math.min(1, (now - start) / 1100); }
    ctx.clearRect(0, 0, W, H); project();
    var cx0 = W / 2, cy0 = MAIN[3] / 2, maxd = Math.hypot(W, H) / 2, i, k0 = sk(0);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, MAIN[3]); ctx.clip();
    for (i = 0; i < WATER.length; i++) { var w = WATER[i], x = sx(0, w[0]), y = sy(0, w[1]); if (x < -k0 * 2 || x > W + k0 * 2 || y < -k0 * 2 || y > MAIN[3] + k0 * 2) continue; if (Math.hypot(x - cx0, y - cy0) / maxd > prog * 1.15) continue; hexPath(ctx, x, y, k0 * 0.99); ctx.fillStyle = w[2] === 1 ? 'rgba(120,190,220,.30)' : 'rgba(90,160,200,.14)'; ctx.fill(); }
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, MAIN[3]); ctx.clip();
    for (i = 0; i < FILL.length; i++) { var f = FILL[i], fx = sx(0, f[0]), fy = sy(0, f[1]); if (fx < -k0 * 2 || fx > W + k0 * 2 || fy < -k0 * 2 || fy > MAIN[3] + k0 * 2) continue; if (Math.hypot(fx - cx0, fy - cy0) / maxd > prog * 1.15) continue; hexPath(ctx, fx, fy, k0 * 0.99); ctx.fillStyle = layer === 'terrain' ? shade(TCOL[f[2]], 0.78) : 'rgba(150,160,170,.28)'; ctx.fill(); }
    ctx.restore();
    FR.forEach(function (b) { rr(ctx, b[0], b[1], b[2], b[3], 12); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill(); ctx.strokeStyle = 'rgba(232,181,58,.45)'; ctx.lineWidth = 1; ctx.stroke(); });
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, MAIN[3]); FR.forEach(function (b) { ctx.rect(b[0], b[1], b[2], b[3]); }); ctx.clip();
    for (i = 0; i < N; i++) {
      if (!visible(i)) continue; var t = T[i], x2 = SX[i], y2 = SY[i], rad = SR[i], dd = Math.hypot(x2 - cx0, y2 - cy0) / maxd; if (dd > prog * 1.15) continue;
      var grow = reduce ? 1 : Math.min(1, Math.max(0, (prog * 1.15 - dd) * 6));
      hexPath(ctx, x2, y2, rad * (0.55 + 0.45 * grow)); ctx.fillStyle = colour(i); ctx.fill();
      if (rad > 5) { var gr = ctx.createLinearGradient(x2 - rad, y2 - rad, x2 + rad, y2 + rad); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.12)'); ctx.fillStyle = gr; ctx.fill(); }
      if (rad > 3.5) { ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 0.8; ctx.stroke(); }
      if (layer === 'terrain' && rad > 7 && grow === 1) glyph(t, i, x2, y2, rad);
    }
    if (prog >= 1) edges();
    if (hover >= 0 && visible(hover)) { hexPath(ctx, SX[hover], SY[hover], SR[hover]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.restore();
    if (prog >= 0.6) { bannerBoxes(); labels(); banners(Math.min(1, (prog - 0.6) / 0.4)); }
    if (prog >= 1 && GAME.marks) GAME.marks();
    drawMini();
    if (prog < 1) requestAnimationFrame(draw);
  }
  function redraw() { start = -1e9; draw(performance.now()); }
  // coast, region borders (dashed), the chosen region in gold
  function edges() {
    ctx.save(); ctx.lineCap = 'round';
    for (var i = 0; i < N; i++) {
      if (!visible(i) || SR[i] < 2.5) continue; var t = T[i];
      for (var d = 0; d < 6; d++) {
        var nb = KEY[(t[0] + DIRS[d][0]) + ',' + (t[1] + DIRS[d][1])], a = vtx(SX[i], SY[i], SR[i], DIRS[d][2]), b = vtx(SX[i], SY[i], SR[i], DIRS[d][3]), other = nb == null ? -2 : RG[nb];
        if (sel >= 0 && RG[i] === sel && other !== sel) { ctx.setLineDash([5, 4]); ctx.strokeStyle = '#f3cf68'; ctx.lineWidth = 3; }
        else if (nb == null) { ctx.setLineDash([]); ctx.strokeStyle = 'rgba(16,40,60,.55)'; ctx.lineWidth = 1.6; }
        else if (other !== RG[i] && nb > i) { ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,248,230,.6)'; ctx.lineWidth = 1.2; }
        else continue;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }
    ctx.restore();
  }
  var USED = [], BANN = [];
  function hit(b) { return USED.some(function (u) { return u[0] < b[0] + b[2] && b[0] < u[0] + u[2] && u[1] < b[1] + b[3] && b[1] < u[1] + u[3]; }); }
  function fmtPop(n) { return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n); }
  // banners claim their space first; names of regions (or countries) are then drawn only where they touch nothing
  function bannerBoxes() {
    BANN = []; USED = [[W - 58, 0, 58, 150]]; ctx.save(); ctx.font = 'small-caps 700 13px "Public Sans", system-ui, sans-serif';
    var n = WORLD ? D.cities.length : Math.min(D.cities.length, (D.shown || 18) + Math.max(0, Math.round((cam.z - 1) * 10)));
    for (var i = 0; i < n; i++) {
      var c = D.cities[i], g = CP[i][2], x = sx(g, CP[i][0]), y = sy(g, CP[i][1]); if (x < 0 || x > W || y < 26 || y > H || (!g && y > MAIN[3])) continue;
      var pill = fmtPop(c[3]), pw = ctx.measureText(pill).width + 12, w = pw + ctx.measureText(c[0]).width + 14, b = [Math.max(2, Math.min(W - w - 2, x - w / 2)), y - 26, w, 20];
      if (hit(b) || hit([x - 6, y - 6, 12, 12])) continue; USED.push(b, [x - 6, y - 6, 12, 12]); BANN.push([i, x, y, b, pw, pill]);
    }
    ctx.restore();
  }
  function labels() {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    REG.map(function (R, i) { return i; }).filter(function (i) { return REG[i].k > 2; }).sort(function (a, b) { return REG[b].k - REG[a].k; }).forEach(function (ri) {
      var R = REG[ri], x = sx(0, R.x), y = sy(0, R.y), fs = Math.max(10, Math.min(40, Math.sqrt(R.k) * sk(0) * 0.62)); if (fs < 10.5 || y < 0 || y > MAIN[3]) return;
      var txt = R.name.toUpperCase(); ctx.font = '700 ' + fs + 'px "Bricolage", "Public Sans", system-ui, sans-serif'; if ('letterSpacing' in ctx) ctx.letterSpacing = (fs * 0.28) + 'px';
      var w = ctx.measureText(txt).width, b = [x - w / 2, y - fs * 0.6, w, fs * 1.2]; if (b[0] < 0 || b[0] + w > W || hit(b)) return; USED.push(b);
      ctx.lineWidth = Math.max(2, fs * 0.12); ctx.strokeStyle = 'rgba(20,30,40,.35)'; ctx.strokeText(txt, x, y); ctx.fillStyle = 'rgba(255,246,222,' + (layer === 'terrain' ? 0.62 : 0.8) + ')'; ctx.fillText(txt, x, y);
    });
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; ctx.restore();
  }
  function banners(a) {
    ctx.save(); ctx.globalAlpha = a; ctx.font = 'small-caps 700 13px "Public Sans", system-ui, sans-serif'; ctx.textBaseline = 'middle';
    BANN.forEach(function (o) {
      var i = o[0], c = D.cities[i], x = o[1], y = o[2], b = o[3];
      ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, b[1] + b[3]); ctx.strokeStyle = 'rgba(232,181,58,.85)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, i === 0 ? 5 : 3.8, 0, 7); ctx.fillStyle = i === 0 ? '#E8B53A' : '#f5efe0'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#0c1c2c'; ctx.stroke();
      rr(ctx, b[0], b[1], b[2], b[3], 6); ctx.fillStyle = 'rgba(12,24,38,.93)'; ctx.fill(); ctx.strokeStyle = 'rgba(232,181,58,.75)'; ctx.stroke();
      rr(ctx, b[0] + 2, b[1] + 2, o[4] - 2, b[3] - 4, 4); ctx.fillStyle = WORLD ? '#3b7fb8' : '#3f8f4e'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(o[5], b[0] + 7, b[1] + 10); ctx.fillStyle = '#f4ead0'; ctx.fillText(c[0], b[0] + o[4] + 6, b[1] + 10);
    });
    ctx.restore();
  }
  function glyph(t, i, x, y, r) {
    var c = t[4], h0 = hash(i); ctx.save(); ctx.lineWidth = Math.max(1, r * .07); ctx.lineCap = 'round';
    function tree(px, py, s, col) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(px + s * .2, py + s * .55, s * .55, s * .22, 0, 0, 7); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(px, py - s); ctx.lineTo(px + s * .6, py + s * .45); ctx.lineTo(px - s * .6, py + s * .45); ctx.fill(); }
    function peak(px, py, s, col, snow) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(px - s, py + s * .6); ctx.lineTo(px, py - s); ctx.lineTo(px + s, py + s * .6); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(px, py - s); ctx.lineTo(px + s, py + s * .6); ctx.lineTo(px + s * .15, py + s * .6); ctx.fill(); if (snow) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(px, py - s); ctx.lineTo(px - s * .32, py - s * .45); ctx.lineTo(px + s * .3, py - s * .47); ctx.fill(); } }
    if (c === 4 || c === 5) { peak(x - r * .18, y + r * .05, r * .42, c === 5 ? '#aab4bd' : '#76726c', true); peak(x + r * .25, y + r * .18, r * .32, c === 5 ? '#c3ccd4' : '#8a857d', c === 5); }
    else if (c === 3) { ctx.fillStyle = '#8b9158'; [[-.25, .15, .28], [.2, .05, .32]].forEach(function (p) { ctx.beginPath(); ctx.arc(x + p[0] * r, y + p[1] * r + p[2] * r * .4, p[2] * r, Math.PI, 0); ctx.fill(); }); }
    else if (c === 2 || c === 8 || c === 9) { var col = c === 9 ? '#2b5341' : c === 8 ? '#1f6a3a' : '#2f6b3b'; [[-.32, .18], [0, -.12], [.3, .16], [-.05, .34], [.22, -.3]].slice(0, r > 14 ? 5 : 3).forEach(function (p) { tree(x + p[0] * r, y + p[1] * r, r * .2, col); }); }
    else if (c === 1) { if (t[6] > 300 && r > 10) { ctx.fillStyle = 'rgba(214,196,120,.55)'; ctx.fillRect(x - r * .4, y - r * .25, r * .35, r * .22); ctx.fillStyle = 'rgba(120,160,80,.55)'; ctx.fillRect(x + r * .02, y - r * .05, r * .35, r * .22); } else { ctx.strokeStyle = 'rgba(60,110,40,.55)'; [[-.25, .1], [.15, -.12], [.2, .25]].forEach(function (p) { var px = x + p[0] * r, py = y + p[1] * r; ctx.beginPath(); ctx.moveTo(px - r * .06, py); ctx.lineTo(px - r * .1, py - r * .14); ctx.moveTo(px, py); ctx.lineTo(px, py - r * .17); ctx.moveTo(px + r * .06, py); ctx.lineTo(px + r * .1, py - r * .14); ctx.stroke(); }); } }
    else if (c === 0) { ctx.strokeStyle = 'rgba(40,90,130,.5)'; ctx.beginPath(); ctx.moveTo(x - r * .4, y + r * .15); ctx.quadraticCurveTo(x - r * .2, y, x, y + r * .15); ctx.quadraticCurveTo(x + r * .2, y + r * .3, x + r * .4, y + r * .15); ctx.stroke(); }
    else if (c === 6 || c === 7) { ctx.strokeStyle = c === 6 ? 'rgba(150,110,50,.6)' : 'rgba(130,120,60,.5)'; ctx.beginPath(); ctx.arc(x - r * .1, y + r * .35, r * .35, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.beginPath(); ctx.arc(x + r * .25, y + r * .05, r * .25, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else if (c === 10) { ctx.fillStyle = 'rgba(255,255,255,.55)'; [[-.2, .1], [.2, -.1], [.05, .25]].forEach(function (p) { ctx.beginPath(); ctx.arc(x + p[0] * r, y + p[1] * r, r * .06, 0, 7); ctx.fill(); }); }
    else if (c === 11) { ctx.fillStyle = '#4f93bd'; ctx.beginPath(); ctx.ellipse(x, y + r * .05, r * .32, r * .18, 0, 0, 7); ctx.fill(); }
    if (r > 13 && t[2] > 40000) { var nB = Math.min(7, 2 + Math.round(Math.log10(t[2]) - 4) * 2); for (var k = 0; k < nB; k++) { var a = k * 2.4 + h0 * 6, d2 = r * (.12 + .05 * k), bx = x + Math.cos(a) * d2, by = y + Math.sin(a) * d2 * .7, bh = r * (.12 + .06 * ((k * 7 + Math.round(h0 * 10)) % 3)); ctx.fillStyle = '#d9d2c3'; ctx.fillRect(bx - r * .07, by - bh, r * .14, bh); ctx.fillStyle = '#b4573e'; ctx.fillRect(bx - r * .08, by - bh - r * .04, r * .16, r * .05); } }
    ctx.restore();
  }
  function drawMini() {
    if (!mctx || !mini.offsetParent) return; var w = 170, h = 110, o = groups[0], k = Math.min(w / (o.x1 - o.x0), h / (o.y1 - o.y0)), ox = (w - (o.x1 - o.x0) * k) / 2, oy = (h - (o.y1 - o.y0) * k) / 2;
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0); mctx.clearRect(0, 0, w, h);
    for (var i = 0; i < N; i++) { if (G[i]) continue; mctx.fillStyle = TCOL[T[i][4]]; mctx.fillRect(ox + (X[i] - o.x0) * k - k * .9, oy + (o.y1 - Y[i]) * k - k * .9, k * 1.8 + .5, k * 1.8 + .5); }
    var a = unproject(0, 0), b = unproject(W, MAIN[3]); mctx.strokeStyle = '#E8B53A'; mctx.lineWidth = 1.5; mctx.strokeRect(ox + (a[0] - o.x0) * k, oy + (o.y1 - a[1]) * k, (b[0] - a[0]) * k, (a[1] - b[1]) * k);
    mini._map = function (mx, my) { return [(mx - ox) / k + o.x0, o.y1 - (my - oy) / k]; };
  }
  function legend() {
    var L = D.layers.filter(function (l) { return l[0] === layer; })[0];
    if (layer === 'terrain') { var cnt = {}; T.forEach(function (t) { cnt[t[4]] = (cnt[t[4]] || 0) + 1; }); leg.innerHTML = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).map(function (c) { return '<span class="sw"><i style="background:' + TCOL[c] + ';box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)"></i>' + TNAME[c] + '</span>'; }).join(''); return; }
    var c = layer === 'growth' ? DIV : RAMP, lo, hi;
    if (layer === 'people') { lo = Math.round(Math.pow(10, dLo)) + ' per km²'; hi = Math.round(Math.pow(10, dHi)).toLocaleString('en-GB') + ' per km²'; }
    else if (layer === 'growth') { lo = '−10% or less'; hi = '+10% or more'; }
    else if (NAT[layer]) { var o = NAT[layer]; lo = (o.rev ? o.hi : o.lo).toLocaleString('en-GB', { maximumFractionDigits: 1 }); hi = (o.rev ? o.lo : o.hi).toLocaleString('en-GB', { maximumFractionDigits: 1 }); }
    else { lo = '0, weakest'; hi = '100, strongest'; }
    leg.innerHTML = '<b>' + L[1] + '</b><span>' + L[2] + '</span><span>' + lo + '</span><span class="ramp">' + c.map(function (x) { return '<i style="background:' + x + '"></i>'; }).join('') + '</span><span>' + hi + '</span><span class="sw"><i style="background:rgba(160,172,184,.5)"></i>no figure</span>';
  }
  function at(px, py) { var best = -1, bd = Infinity; for (var i = 0; i < N; i++) { if (!visible(i)) continue; var d = Math.hypot(SX[i] - px, SY[i] - py); if (d < bd) { bd = d; best = i; } } return best >= 0 && bd <= SR[best] * 1.05 ? best : -1; }
  function tipFor(i, px, py) {
    if (i < 0) { tip.hidden = true; return; }
    var t = T[i], L = D.layers.filter(function (l) { return l[0] === layer; })[0], v;
    if (layer === 'terrain') v = TNAME[t[4]] + (t[5] ? ', about ' + t[5].toLocaleString('en-GB') + ' m' : '');
    else if (layer === 'people') v = t[6] > 0 ? t[6].toLocaleString('en-GB') + ' residents per km²' : 'no area figure';
    else if (layer === 'growth') v = t[7] == null ? 'no figure' : (t[7] > 0 ? '+' : '') + t[7] + '% in about five years';
    else if (NAT[layer]) { var inf = D.info[RG[i]], x = inf && inf.v[layer]; v = L[1] + ': ' + (x == null ? 'no figure' : x.toLocaleString('en-GB', { maximumFractionDigits: 1 })); }
    else v = t[CI[layer]] >= 0 ? L[1] + ': ' + t[CI[layer]] + ' of 100' : L[1] + ': no figure';
    tip.textContent = ''; var b0 = document.createElement('b'); b0.textContent = t[NI] + (t[3] > 1 ? ' and ' + (t[3] - 1) + ' more' : ''); tip.appendChild(b0);
    var rn = REG[RG[i]]; tip.appendChild(document.createTextNode((rn ? rn.name + ' · ' : '') + t[2].toLocaleString('en-GB') + ' residents')); tip.appendChild(document.createElement('br')); tip.appendChild(document.createTextNode(v));
    tip.hidden = false; var x2 = px + 14; if (x2 + 260 > W) x2 = px - 270; tip.style.left = Math.max(4, x2) + 'px'; tip.style.top = Math.min(py + 14, H - 80) + 'px';
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var CAT = { family: 'Families', jobs: 'Jobs', affordability: 'Costs', safety: 'Safety', health: 'Health', environment: 'Nature', mobility: 'Getting around', tax: 'Taxes', governance: 'Town finances', lifestyle: 'Lifestyle' };
  function openRegion(ri) {
    if (!panel || ri < 0 || !REG[ri]) return; sel = ri; var R = REG[ri], h = '<button type="button" class="at-back" data-back>← ' + (WORLD ? 'World' : esc(D.name)) + '</button><p class="at-pk">' + (WORLD ? 'Country' : 'Region') + '</p><h2>' + esc(R.name) + '</h2>';
    h += '<p class="small">' + R.pop.toLocaleString('en-GB') + ' people in ' + R.n.toLocaleString('en-GB') + ' places</p>';
    if (WORLD) {
      var inf = D.info[ri]; h += '<h3>National figures</h3><div class="at-yg">' + (D.nat || []).map(function (n) { var x = inf && inf.v[n[0]]; return x == null ? '' : '<div><b>' + x.toLocaleString('en-GB', { maximumFractionDigits: 1 }) + '</b><span>' + esc(n[1]) + '</span></div>'; }).join('') + '</div>';
      if (inf) h += '<p><a href="' + inf.href + '">Open the atlas of ' + esc(R.name) + ' →</a></p>';
    } else {
      var rows = D.cats.filter(function (c) { return R.cs[c] && R.cs[c][1]; }).map(function (c) { var v = R.cs[c][0] / R.cs[c][1], rk = 1 + REG.filter(function (Q) { return Q.cs[c] && Q.cs[c][1] && Q.cs[c][0] / Q.cs[c][1] > v; }).length, tot = REG.filter(function (Q) { return Q.cs[c] && Q.cs[c][1]; }).length; return '<div><b>' + Math.round(v) + '</b><span>' + esc(CAT[c] || c) + '</span><small>#' + rk + ' of ' + tot + '</small></div>'; });
      h += '<h3>Yields · rank among regions</h3><div class="at-yg">' + rows.join('') + '</div>';
      var cs = D.cities.filter(function (c) { return c[c.length - 1] === ri; }).slice(0, 8);
      if (cs.length) h += '<h3>Biggest places</h3><ul class="at-rl">' + cs.map(function (c) { return '<li>' + (c[4] ? '<a href="' + c[4] + '">' + esc(c[0]) + '</a>' : '<span>' + esc(c[0]) + '</span>') + '<small>' + fmtPop(c[3]) + '</small></li>'; }).join('') + '</ul>';
      else { var tops = T.map(function (t, i) { return i; }).filter(function (i) { return RG[i] === ri; }).sort(function (a, b) { return T[b][2] - T[a][2]; }).slice(0, 6); h += '<h3>Biggest tiles</h3><ul class="at-rl">' + tops.map(function (i) { return '<li><span>' + esc(T[i][NI]) + '</span><small>' + fmtPop(T[i][2]) + ' in the tile</small></li>'; }).join('') + '</ul>'; }
      h += '<p class="small">Scores compare places within ' + esc(D.name) + ' (0 to 100); a region shows the average of its places, weighted by residents.</p>';
    }
    panel.innerHTML = h; panel.hidden = false; if (home) home.hidden = true; redraw();
  }
  function closeRegion() { sel = -1; if (panel) { panel.hidden = true; panel.innerHTML = ''; } if (home) home.hidden = false; redraw(); }
  if (panel) panel.addEventListener('click', function (e) { if (e.target.closest('[data-back]')) closeRegion(); });
  // camera: drag, wheel, pinch, buttons, keyboard
  var drag = null, moved = false, pts = {};
  function clamp() { if (cam.z <= 1) { cam.z = 1; cam.x = 0; cam.y = 0; return; } var mx = W * (cam.z - 1) / 2 + W * 0.25, my = MAIN[3] * (cam.z - 1) / 2 + MAIN[3] * 0.25; cam.x = Math.max(-mx, Math.min(mx, cam.x)); cam.y = Math.max(-my, Math.min(my, cam.y)); }
  function zoomAt(f, px, py) { var nz = Math.max(1, Math.min(14, cam.z * f)); f = nz / cam.z; cam.x = px - W / 2 - (px - W / 2 - cam.x) * f; cam.y = py - MAIN[3] / 2 - (py - MAIN[3] / 2 - cam.y) * f; cam.z = nz; clamp(); redraw(); }
  cv.addEventListener('pointerdown', function (e) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} pts[e.pointerId] = [e.offsetX, e.offsetY]; drag = [e.offsetX, e.offsetY, cam.x, cam.y]; moved = false; });
  cv.addEventListener('pointermove', function (e) {
    var ids = Object.keys(pts);
    if (pts[e.pointerId] && ids.length === 2) { var o = pts[ids[0]], p = pts[ids[1]], d0 = Math.hypot(o[0] - p[0], o[1] - p[1]); pts[e.pointerId] = [e.offsetX, e.offsetY]; o = pts[ids[0]]; p = pts[ids[1]]; var d1 = Math.hypot(o[0] - p[0], o[1] - p[1]); if (d0 > 0) zoomAt(d1 / d0, (o[0] + p[0]) / 2, (o[1] + p[1]) / 2); moved = true; return; }
    if (drag && pts[e.pointerId]) { var dx = e.offsetX - drag[0], dy = e.offsetY - drag[1]; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; if (moved && cam.z > 1) { cam.x = drag[2] + dx; cam.y = drag[3] + dy; clamp(); redraw(); } tip.hidden = true; return; }
    var i = at(e.offsetX, e.offsetY); if (i !== hover) { hover = i; redraw(); } tipFor(i, e.offsetX, e.offsetY);
  });
  cv.addEventListener('pointerup', function (e) { delete pts[e.pointerId]; if (!drag) return; var was = moved; drag = null; if (was) return; if (GAME.click) { GAME.click(e.offsetX, e.offsetY); return; } var i = at(e.offsetX, e.offsetY); tipFor(i, e.offsetX, e.offsetY); if (i >= 0) openRegion(RG[i]); });
  cv.addEventListener('pointercancel', function (e) { delete pts[e.pointerId]; drag = null; });
  cv.addEventListener('pointerleave', function () { if (!drag) { hover = -1; tip.hidden = true; redraw(); } });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.offsetX, e.offsetY); }, { passive: false });
  cv.addEventListener('keydown', function (e) { var s = 40; if (e.key === '+' || e.key === '=') zoomAt(1.25, W / 2, MAIN[3] / 2); else if (e.key === '-') zoomAt(0.8, W / 2, MAIN[3] / 2); else if (e.key === 'ArrowLeft') { cam.x += s; clamp(); redraw(); } else if (e.key === 'ArrowRight') { cam.x -= s; clamp(); redraw(); } else if (e.key === 'ArrowUp') { cam.y += s; clamp(); redraw(); } else if (e.key === 'ArrowDown') { cam.y -= s; clamp(); redraw(); } else if (e.key === 'Escape') closeRegion(); else return; e.preventDefault(); });
  document.querySelectorAll('[data-zoom]').forEach(function (b) { b.addEventListener('click', function () { var z = +b.dataset.zoom; if (!z) { cam = { z: 1, x: 0, y: 0 }; redraw(); } else zoomAt(z > 0 ? 1.4 : 1 / 1.4, W / 2, MAIN[3] / 2); }); });
  if (mini) mini.addEventListener('click', function (e) { if (!mini._map) return; var p = mini._map(e.offsetX, e.offsetY), o = groups[0], bx = o.ox + (p[0] - o.x0) * o.k, by = o.oy + (o.y1 - p[1]) * o.k; if (cam.z < 2) cam.z = 3; cam.x = -(bx - W / 2) * cam.z; cam.y = -(by - MAIN[3] / 2) * cam.z; clamp(); redraw(); });
  document.querySelectorAll('.at-l[data-layer]').forEach(function (b) { b.addEventListener('click', function () { layer = b.dataset.layer; document.querySelectorAll('.at-l[data-layer]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); legend(); redraw(); }); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); redraw(); }, 120); });

  /* daily games (country atlas only): seeded by date and country, the same for everyone; results stay on this device */
  var GAME = { marks: null, click: null }, box = document.getElementById('at-game'), today = new Date().toISOString().slice(0, 10);
  function rng(seed) { var h = 2166136261; for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); } return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e6) / 1e6; }; }
  function pick(R, a, n) { var c = a.slice(), o = []; while (c.length && o.length < n) o.push(c.splice(Math.floor(R() * c.length), 1)[0]); return o; }
  function save(k, v) { try { localStorage.setItem('nz:atlas:' + D.cc + ':' + k + ':' + today, JSON.stringify(v)); } catch (e) {} }
  function load(k) { try { return JSON.parse(localStorage.getItem('nz:atlas:' + D.cc + ':' + k + ':' + today)); } catch (e) { return null; } }
  function share(text) { var b = document.createElement('button'); b.type = 'button'; b.className = 'opt share'; b.textContent = 'Copy my result'; b.onclick = function () { try { navigator.clipboard.writeText(text + ' ' + location.href); b.textContent = 'Copied'; } catch (e) {} }; box.appendChild(b); }
  var pool = D.cities.filter(function (c) { return c[3] > 0; });
  function planeKm(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]) * D.s * 111.2; }
  function pin() {
    var R = rng('pin' + D.cc + today), idx = pick(R, pool.map(function (_, i) { return i; }).filter(function (i) { return CP[D.cities.indexOf(pool[i])][2] === 0; }), 5), k = 0, total = 0, done = load('pin');
    var span = Math.max(60, Math.hypot(groups[0].x1 - groups[0].x0, groups[0].y1 - groups[0].y0) * D.s * 111.2 / 3);
    if (done) { box.innerHTML = '<p>Today\'s Pinpoint is done: <span class="score">' + done.score + ' of 500</span>. New places tomorrow.</p>'; share('Pinpoint ' + D.name + ' ' + today + ': ' + done.score + '/500'); return; }
    var guess = null, ans = null;
    GAME.marks = function () { if (!ans) return; [[guess, '#f6a53b'], [ans, '#fff']].forEach(function (m) { if (!m[0]) return; var x = sx(0, m[0][0]), y = sy(0, m[0][1]); ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fillStyle = m[1]; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0c1c2c'; ctx.stroke(); }); if (guess) { ctx.beginPath(); ctx.moveTo(sx(0, guess[0]), sy(0, guess[1])); ctx.lineTo(sx(0, ans[0]), sy(0, ans[1])); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.setLineDash([]); } };
    function ask() { guess = null; ans = null; redraw(); box.innerHTML = '<p>Round ' + (k + 1) + ' of 5: tap the map where <b>' + esc(pool[idx[k]][0]) + '</b> lies.</p>';
      GAME.click = function (mx, my) { guess = unproject(mx, my); ans = cityPlane(pool[idx[k]]); var km = planeKm(guess, ans), p2 = Math.max(0, Math.round(100 * (1 - km / span))); total += p2; GAME.click = null; redraw();
        box.innerHTML = '<p><b>' + esc(pool[idx[k]][0]) + '</b>: you were ' + Math.round(km) + ' km away, <span class="score">' + p2 + ' points</span>.</p>'; var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = k < 4 ? 'Next place' : 'See my score';
        b.onclick = function () { k++; if (k < 5) ask(); else { save('pin', { score: total }); GAME.marks = null; redraw(); box.innerHTML = '<p>Pinpoint done: <span class="score">' + total + ' of 500</span>.</p>'; share('Pinpoint ' + D.name + ' ' + today + ': ' + total + '/500'); } }; box.appendChild(b); }; }
    ask();
  }
  function duel() {
    var R = rng('duel' + D.cc + today), done = load('duel');
    if (done) { box.innerHTML = '<p>Today\'s Higher or lower is done: <span class="score">' + done.score + ' of 7</span>. New pairs tomorrow.</p>'; share('Higher or lower ' + D.name + ' ' + today + ': ' + done.score + '/7'); return; }
    var rounds = []; for (var t = 0; t < 40 && rounds.length < 7; t++) { var gi = Math.floor(R() * D.gc.length), ab = pick(R, pool, 2); if (ab.length < 2) break; var va = ab[0][5 + gi], vb = ab[1][5 + gi]; if (va >= 0 && vb >= 0 && va !== vb) rounds.push([ab[0], ab[1], gi]); }
    var k = 0, sc = 0;
    function ask() { var r = rounds[k], g = D.gc[r[2]]; box.innerHTML = '<p>Round ' + (k + 1) + ' of ' + rounds.length + ': which scores higher for <b>' + (CAT[g] || g) + '</b>?</p><div class="opts"></div>'; var o = box.querySelector('.opts');
      [0, 1].forEach(function (j) { var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = r[j][0]; b.onclick = function () { var win = r[0][5 + r[2]] > r[1][5 + r[2]] ? 0 : 1; o.querySelectorAll('button').forEach(function (x, xi) { x.disabled = true; x.classList.add(xi === win ? 'ok' : 'no'); x.textContent = r[xi][0] + ': ' + r[xi][5 + r[2]]; }); if (j === win) sc++;
        var n = document.createElement('button'); n.type = 'button'; n.className = 'opt'; n.textContent = k < rounds.length - 1 ? 'Next pair' : 'See my score'; n.onclick = function () { k++; if (k < rounds.length) ask(); else { save('duel', { score: sc }); box.innerHTML = '<p>Higher or lower done: <span class="score">' + sc + ' of ' + rounds.length + '</span>. Scores compare each place with the other places of ' + esc(D.name) + '.</p>'; share('Higher or lower ' + D.name + ' ' + today + ': ' + sc + '/' + rounds.length); } }; box.appendChild(n); }; o.appendChild(b); }); }
    if (rounds.length) ask(); else box.innerHTML = '<p>Not enough scored places for this game here.</p>';
  }
  function lens() {
    var R = rng('lens' + D.cc + today), done = load('lens'), cand = D.layers.map(function (l) { return l[0]; }).filter(function (k) { return k !== 'terrain'; });
    if (done) { box.innerHTML = '<p>Today\'s Map detective is done: <span class="score">' + done.score + ' of 3</span>.</p>'; share('Map detective ' + D.name + ' ' + today + ': ' + done.score + '/3'); return; }
    var qs = pick(R, cand, 3), k = 0, sc = 0, keep = layer;
    function name(k2) { return D.layers.filter(function (l) { return l[0] === k2; })[0][1]; }
    function ask() { layer = qs[k]; legend(); var rp = leg.querySelector('.ramp'); leg.innerHTML = '<b>?</b><span>hidden measure: low</span>' + (rp ? rp.outerHTML : '') + '<span>high</span>'; redraw();
      var opts = [qs[k]].concat(pick(R, cand.filter(function (x) { return x !== qs[k]; }), 3)).sort(function () { return R() - 0.5; });
      box.innerHTML = '<p>Round ' + (k + 1) + ' of ' + qs.length + ': which measure colours the map now?</p><div class="opts"></div>'; var o = box.querySelector('.opts');
      opts.forEach(function (x) { var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = name(x); b.onclick = function () { o.querySelectorAll('button').forEach(function (y, yi) { y.disabled = true; if (opts[yi] === qs[k]) y.classList.add('ok'); else if (y === b) y.classList.add('no'); }); if (x === qs[k]) sc++; legend();
        var n = document.createElement('button'); n.type = 'button'; n.className = 'opt'; n.textContent = k < qs.length - 1 ? 'Next map' : 'See my score'; n.onclick = function () { k++; if (k < qs.length) ask(); else { save('lens', { score: sc }); layer = keep; legend(); redraw(); box.innerHTML = '<p>Map detective done: <span class="score">' + sc + ' of ' + qs.length + '</span>.</p>'; share('Map detective ' + D.name + ' ' + today + ': ' + sc + '/' + qs.length); } }; box.appendChild(n); }; o.appendChild(b); }); }
    ask();
  }
  if (box && !WORLD) document.querySelectorAll('[data-game]').forEach(function (b) { b.addEventListener('click', function () { document.querySelectorAll('[data-game]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); GAME.marks = null; GAME.click = null; redraw(); ({ pin: pin, duel: duel, lens: lens })[b.dataset.game](); }); });
  size(); legend(); requestAnimationFrame(draw);
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 20px "Bricolage"'), document.fonts.load('700 13px "Public Sans"')]).then(function () { redraw(); }, function () {});
})();
