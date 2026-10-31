/* Nestlyzer Business globe: land as hexagon cells, a radar sweep, and the two compared economies lit up.
   Plain 2D canvas, about 2,600 visible cells per frame drawn in four batched paths. Pauses off screen and in hidden
   tabs; stands still for visitors who turn motion off. Data: window.NZB_HEX (Natural Earth 1:110m, see build). */
(function () {
  var CFG = window.NZB_CFG || {}, ISO = { EL: 'GR', UK: 'GB' };
  var cv = document.getElementById(CFG.canvas || 'nzb-globe'); if (!cv || !window.NZB_HEX) return;
  var g = cv.getContext('2d'), HEX = window.NZB_HEX, cells = HEX.cells, STEP = HEX.step, RAD = Math.PI / 180;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var N = cells.length, X = new Float32Array(N), Y = new Float32Array(N), Z = new Float32Array(N), CC = new Array(N), cent = {};
  for (var i = 0; i < N; i++) {
    var lo = cells[i][0] * RAD, la = cells[i][1] * RAD, cl = Math.cos(la);
    X[i] = cl * Math.sin(lo); Y[i] = Math.sin(la); Z[i] = cl * Math.cos(lo); CC[i] = cells[i][2];
    var c = cent[CC[i]] || (cent[CC[i]] = [0, 0, 0, 0]); c[0] += X[i]; c[1] += Y[i]; c[2] += Z[i]; c[3]++;
  }
  var has = {}; if (CFG.has) CFG.has.forEach(function (c) { has[ISO[c] || c] = 1; }); else try { (window.NestlyzerBusiness.data.coverage || []).forEach(function (c) { has[c.country_code] = 1; }); } catch (e) {}   // the 45 countries Nestlyzer ranks places in
  var lon0 = 10 * RAD, lat0 = 22 * RAD, target = null, sweep = 0, W = 0, dpr = 1, raf = 0, last = 0, seen = true;
  function sel(id) { if (id === 'country-b' && CFG.single) return ''; var s = document.getElementById(id === 'country-a' ? CFG.selA || id : id === 'country-b' ? CFG.selB || id : id); var v = s ? s.value : ''; return ISO[v] || v; }
  function focus(cc) {
    cc = ISO[cc] || cc; var c = cent[cc]; if (!c) return;
    var x = c[0] / c[3], y = c[1] / c[3], z = c[2] / c[3];
    target = [Math.atan2(x, z), Math.max(-50 * RAD, Math.min(55 * RAD, Math.atan2(y, Math.sqrt(x * x + z * z))))];
    kick();
  }
  function size() {
    if (CFG.fit) { var f = CFG.fit(); if (f && f.r > 0) { var fw = Math.round(f.r / 0.44); cv.style.width = cv.style.height = fw + 'px'; cv.style.left = Math.round(f.cx - fw / 2) + 'px'; cv.style.top = Math.round(f.cy - fw / 2) + 'px'; cv.style.right = 'auto'; cv.style.transform = 'none'; } }
    var w = cv.clientWidth; if (!w) return;
    dpr = Math.min(2, window.devicePixelRatio || 1); W = w; cv.width = cv.height = Math.round(w * dpr); draw();
  }
  function draw() {
    if (!W) return;
    var s = W * dpr, R = s * 0.44, cx = s / 2, cy = s / 2, a = sel('country-a'), b = sel('country-b');
    var cl = Math.cos(lon0), sl = Math.sin(lon0), cp = Math.cos(lat0), sp = Math.sin(lat0);
    g.clearRect(0, 0, s, s);
    // disc, rings and crosshair
    var bg = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    bg.addColorStop(0, '#11405a'); bg.addColorStop(1, '#071a2b');
    g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.fill();
    g.strokeStyle = 'rgba(120,210,200,.16)'; g.lineWidth = dpr;
    for (var k = 1; k <= 3; k++) { g.beginPath(); g.arc(cx, cy, R * k / 3, 0, 2 * Math.PI); g.stroke(); }
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    // hexagon cells in four batches
    var hr = R * STEP * RAD * 0.52, paths = { land: new Path2D(), data: new Path2D(), a: new Path2D(), b: new Path2D() }, pa = [];
    for (var i = 0; i < N; i++) {
      var x = X[i] * cl - Z[i] * sl, c2 = Z[i] * cl + X[i] * sl, y = cp * Y[i] - sp * c2, z = sp * Y[i] + cp * c2;
      if (z <= 0.02) continue;
      var px = cx + x * R, py = cy - y * R, r = hr * (0.45 + 0.55 * z), key = a && CC[i] === a ? 'a' : b && CC[i] === b ? 'b' : has[CC[i]] ? 'data' : 'land', p = paths[key];
      p.moveTo(px + r, py);
      for (var j = 1; j < 6; j++) p.lineTo(px + r * Math.cos(j * Math.PI / 3), py + r * Math.sin(j * Math.PI / 3));
      p.closePath();
      if (key === 'a' || key === 'b') pa.push([px, py, key]);
    }
    g.fillStyle = 'rgba(70,150,160,.24)'; g.fill(paths.land);
    g.fillStyle = 'rgba(95,208,196,.62)'; g.fill(paths.data);
    g.fillStyle = '#5fd0c4'; g.fill(paths.b);
    g.fillStyle = '#e08b3c'; g.fill(paths.a);
    // radar sweep
    if (g.createConicGradient) {
      var cg = g.createConicGradient(sweep, cx, cy);
      cg.addColorStop(0, 'rgba(95,208,196,.38)'); cg.addColorStop(0.08, 'rgba(95,208,196,.06)'); cg.addColorStop(0.2, 'rgba(95,208,196,0)'); cg.addColorStop(1, 'rgba(95,208,196,0)');
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.fill(); g.restore();
    }
    // pings on the compared economies
    var t = (performance.now() % 2000) / 2000;
    [['a', '#e08b3c'], ['b', '#5fd0c4']].forEach(function (q) {
      var ps = pa.filter(function (p) { return p[2] === q[0]; }); if (!ps.length) return;
      var mx = 0, my = 0; ps.forEach(function (p) { mx += p[0]; my += p[1]; }); mx /= ps.length; my /= ps.length;
      g.strokeStyle = q[1]; g.globalAlpha = reduce.matches ? 0.8 : 1 - t; g.lineWidth = 1.5 * dpr;
      g.beginPath(); g.arc(mx, my, (reduce.matches ? 0.5 : t) * R * 0.18 + 3 * dpr, 0, 2 * Math.PI); g.stroke(); g.globalAlpha = 1;
    });
    g.strokeStyle = 'rgba(95,208,196,.55)'; g.lineWidth = 1.2 * dpr; g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.stroke();
  }
  function frame(tm) {
    raf = 0; if (!seen || document.hidden) return;
    var dt = last ? Math.min(0.1, (tm - last) / 1000) : 0; last = tm;
    if (!reduce.matches) {
      if (target) {
        var d = ((target[0] - lon0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
        lon0 += d * Math.min(1, dt * 3); lat0 += (target[1] - lat0) * Math.min(1, dt * 3);
        if (Math.abs(d) < 0.002 && Math.abs(target[1] - lat0) < 0.002) target = null;
      } else lon0 += dt * 2 * Math.PI / 90;
      lon0 = ((lon0 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      sweep = (sweep + dt * 1.6) % (2 * Math.PI);
    } else if (target) { lon0 = target[0]; lat0 = target[1]; target = null; }
    draw();
    if (!reduce.matches) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  [CFG.selA || 'country-a', CFG.selB || 'country-b'].forEach(function (id) { var s = document.getElementById(id); if (s) s.addEventListener('change', function () { focus(s.value); }); });
  window.NZB_FOCUS = function (cc) { size(); focus(cc); kick(); };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-country]')) setTimeout(function () { focus(sel('country-a')); }, 0); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; if (seen) kick(); }).observe(cv);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  new ResizeObserver(size).observe(CFG.fit && cv.parentNode ? cv.parentNode : cv);
  size(); focus(sel('country-a')); kick();
})();
