/* The start page globe: a slowly turning Earth at night. Every ranked place is a point of light, coloured by how well
   it fits the household chosen on the start page; choosing another household crossfades the lights.
   Loaded as /assets/globe.js once the start page is idle. WebGL; the caller shows a still picture if this fails.
   window.NZGLOBE(o) with o = { wrap, canvas, v, prof, active(), fail(), ready(meta) } returns { set(k), wake() }. */
window.NZGLOBE = function (o) {
  var RAMP = ['#18324f', '#1b4565', '#1c5a78', '#1d6f86', '#21868f', '#2a9c96', '#3fb09a', '#5cc29c', '#82d19d', '#a9de9b', '#cde79a', '#ead98a', '#f7cf74', '#ffe3a3', '#fff4d6'];
  var wrap = o.wrap, cv = o.canvas, api = { set: function () {}, wake: function () {} };
  var opts = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' };
  var gl = cv.getContext('webgl2', opts), gl2 = !!gl;
  if (!gl) gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
  // 2.12.2: browsers without WebGL (GPU blocked, hardware acceleration off, software fallback removed in Chrome) get the
  // same globe drawn on a 2D canvas instead of the still picture
  if (!gl) return window.NZGLOBE2D ? window.NZGLOBE2D(o) : (o.fail(), api);
  var u32 = gl2 || !!gl.getExtension('OES_element_index_uint');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // rotation: three rows of the view matrix, applied to unit vectors precomputed once (no trigonometry per light)
  var VS_PTS = [
    'attribute vec3 aP; attribute float aPop; attribute float aA; attribute float aB; attribute float aH;',
    'uniform vec3 uRx, uRy, uRz; uniform float uMix, uK, uDpr, uReveal, uR; uniform vec2 uC, uRes; uniform vec3 uRamp[16];',
    'varying vec3 vCol; varying float vA; varying float vHalo;',
    'float alphaOf(float b) { return b < 0.5 ? 0.08 : 0.09 + 0.91 * pow(b / 15.0, 2.2); }',
    'void main() {',
    '  float z = dot(uRz, aP);',
    '  if (z < 0.0 || aH > uReveal) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }',
    '  vec2 p = uC + vec2(dot(uRx, aP), -dot(uRy, aP)) * uR;',
    '  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);',
    '  vec3 ca = aA < 0.5 ? vec3(0.13, 0.22, 0.31) : uRamp[int(aA)], cb = aB < 0.5 ? vec3(0.13, 0.22, 0.31) : uRamp[int(aB)];',
    '  vCol = mix(ca, cb, uMix);',
    '  float limb = smoothstep(0.0, 0.28, z);',
    '  vA = mix(alphaOf(aA), alphaOf(aB), uMix) * (0.35 + 0.65 * limb);',
    '  float top = mix(step(11.5, aA), step(11.5, aB), uMix);',
    '  float zc = aPop > 0.784 ? 2.0 : aPop > 0.627 ? 1.0 : 0.0;',
    '  float r = (0.62 + zc * 0.55 + top * 0.35) * uDpr * uK * (0.55 + 0.45 * limb);',
    '  vHalo = top * 0.3;',
    '  gl_PointSize = max(1.0, r * (top > 0.5 ? 6.0 : 3.6));',
    '}'].join('\n');
  var FS_PTS = [
    'precision mediump float; varying vec3 vCol; varying float vA; varying float vHalo;',
    'void main() {',
    '  vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d); if (r2 > 1.0) discard;',
    '  float core = 1.0 - smoothstep(0.1, 0.3, r2), halo = exp(-r2 * 7.0) * vHalo;',
    '  float a = vA * max(core, halo);',
    '  gl_FragColor = vec4(vCol * a, a);',
    '}'].join('\n');
  // coastlines, borders and the 15-degree grid, hidden on the far side
  var VS_LN = [
    'attribute vec3 aP; uniform vec3 uRx, uRy, uRz; uniform float uR; uniform vec2 uC, uRes; varying float vZ;',
    'void main() { vZ = dot(uRz, aP); vec2 p = uC + vec2(dot(uRx, aP), -dot(uRy, aP)) * uR;',
    '  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0); }'].join('\n');
  var FS_LN = 'precision mediump float; uniform vec4 uCol; varying float vZ; void main() { if (vZ < 0.0) discard; float a = uCol.a * (0.25 + 0.75 * smoothstep(0.0, 0.35, vZ)); gl_FragColor = vec4(uCol.rgb * a, a); }';
  // the sphere: a dark ocean lit towards the middle and a thin atmosphere at the rim (cheap: no trigonometry)
  var VS_DISC = 'attribute vec2 aQ; uniform vec2 uRes; varying vec2 vP; void main() { vP = aQ; gl_Position = vec4(aQ.x / uRes.x * 2.0 - 1.0, 1.0 - aQ.y / uRes.y * 2.0, 0.0, 1.0); }';
  var FS_DISC = [
    'precision mediump float; uniform vec2 uC; uniform float uR, uReveal; varying vec2 vP;',
    'void main() {',
    '  vec2 q = (vP - uC) / uR; float rr = dot(q, q);',
    '  if (rr > 1.0) { float d = sqrt(rr) - 1.0; float a = (exp(-d * uR / 10.0) * 0.5 + exp(-d * 9.0) * 0.12) * uReveal; gl_FragColor = vec4(vec3(0.22, 0.48, 0.86) * a, a); return; }',
    '  float z = sqrt(1.0 - rr);',
    '  vec3 col = mix(vec3(0.018, 0.045, 0.09), vec3(0.04, 0.095, 0.17), z) + vec3(0.2, 0.42, 0.8) * pow(1.0 - z, 3.0) * 0.7;',
    '  gl_FragColor = vec4(col * uReveal, uReveal);',
    '}'].join('\n');

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function prog(vs, fs) {
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), u = {}, i, a;
    for (i = 0; i < n; i++) { a = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[a] = gl.getUniformLocation(p, a); }
    n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (i = 0; i < n; i++) { a = gl.getActiveAttrib(p, i).name; u[a] = gl.getAttribLocation(p, a); }
    return { p: p, u: u };
  }
  var P, Q, L;
  try { P = prog(VS_PTS, FS_PTS); Q = prog(VS_DISC, FS_DISC); L = prog(VS_LN, FS_LN); } catch (e) { o.fail(); return api; }   // canvas is now WebGL-bound: still picture
  var ramp = new Float32Array(48);
  RAMP.forEach(function (h, i) { var n = parseInt(h.slice(1), 16); ramp.set([((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255], (i + 1) * 3); });

  var D = null, meta = null, bufs = {}, order = {}, bandCache = {}, cur = { a: 0, b: 0, mix: 1, t0: 0 };
  var W = 0, H = 0, dpr = 1, C = [0, 0], R = 1, K = 1, lon0 = 10 * Math.PI / 180, lat0 = 26 * Math.PI / 180;
  var running = false, raf = 0, last = 0, lastDraw = 0, seen = true, revealT0 = 0, reveal = 0, lost = false, LN = null;

  function bands(pi) {
    if (bandCache[pi]) return bandCache[pi];
    var n = D.n, nb = meta.bytes || 4, out = new Uint8Array(n), hist = new Float64Array(16), i, b;
    for (i = 0; i < n; i++) { var byte = D.sc[i * nb + (pi >> 1)]; out[i] = pi & 1 ? byte & 15 : byte >> 4; hist[out[i]]++; }
    // stretch the top: only each country's real best places glow brightly
    var cum = 0, lvl = new Uint8Array(16), valued = n - hist[0];
    for (b = 1; b < 16; b++) { cum += hist[b]; lvl[b] = Math.max(1, Math.min(15, Math.round(15 * Math.pow(cum / Math.max(1, valued), 7)))); }
    for (i = 0; i < n; i++) out[i] = lvl[out[i]];
    return (bandCache[pi] = out);
  }
  function orderFor(pi) {
    if (order[pi]) return order[pi];
    // lights come sorted by population, so a stable bucket pass by band gives band-then-size order in one sweep
    var n = D.n, bd = bands(pi), idx = new Uint32Array(n), start = new Uint32Array(17), i;
    for (i = 0; i < n; i++) start[bd[i] + 1]++;
    for (i = 1; i < 17; i++) start[i] += start[i - 1];
    for (i = 0; i < n; i++) idx[start[bd[i]]++] = i;
    return (order[pi] = idx);
  }
  function upload(name, data, target) { var b = bufs[name] || (bufs[name] = gl.createBuffer()); gl.bindBuffer(target || gl.ARRAY_BUFFER, b); gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); }
  function setTarget(pi, instant) {
    if (!D) return;
    upload('a', bands(instant ? pi : cur.b)); upload('b', bands(pi));
    if (u32) upload('i', orderFor(pi), gl.ELEMENT_ARRAY_BUFFER);
    cur.a = instant ? pi : cur.b; cur.b = pi; cur.mix = instant ? 1 : 0; cur.t0 = performance.now();
    kick();
  }
  function size() {
    var w = wrap.clientWidth, h = wrap.clientHeight; dpr = Math.min(1.25, window.devicePixelRatio || 1);
    if (!w || !h) return;
    W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var mobile = W < 900, r;
    if (mobile) { var vh = window.innerHeight || H; r = Math.min(W * 0.42, (vh * 0.19 + 30) * 0.62, 260); C = [W * 0.5, 58 + r * 0.95]; }
    // sized from the window, not the hero: the hero is taller in business mode and the earth must not grow (2.11.3)
    else { var vb = window.innerHeight || H; r = Math.min(vb * 0.58, W * 0.4); C = [W * 0.68, vb * 0.57]; }
    R = r; K = Math.max(mobile ? 0.7 : 0.5, Math.min(1, r / 560));
    gl.viewport(0, 0, cv.width, cv.height);
    var c = [C[0] * dpr, C[1] * dpr], m = R * dpr * 1.18;
    upload('q', new Float32Array([c[0] - m, c[1] - m, c[0] + m, c[1] - m, c[0] - m, c[1] + m, c[0] + m, c[1] + m]));
    kick();
  }
  // turn a little faster over the empty Pacific, so the lights are on screen most of the time
  function speed(l) { var d = ((l * 180 / Math.PI + 540) % 360) - 180, e = Math.abs(((d + 160 + 540) % 360) - 180); return (2 * Math.PI / 75) * (1 + 1.6 * Math.max(0, 1 - e / 55)); }
  function rows() {
    var cl = Math.cos(lon0), sl = Math.sin(lon0), cp = Math.cos(lat0), sp = Math.sin(lat0);
    return [[cl, 0, -sl], [-sp * sl, cp, -sp * cl], [cp * sl, sp, cp * cl]];
  }
  function common(pr, M, w, h, c, r) {
    gl.useProgram(pr.p);
    if (pr.u.uRx) { gl.uniform3fv(pr.u.uRx, M[0]); gl.uniform3fv(pr.u.uRy, M[1]); gl.uniform3fv(pr.u.uRz, M[2]); }
    gl.uniform2f(pr.u.uRes, w, h); gl.uniform2f(pr.u.uC, c[0], c[1]); gl.uniform1f(pr.u.uR, r);
  }
  function attr(loc, buf, n, type, norm) { gl.bindBuffer(gl.ARRAY_BUFFER, bufs[buf]); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, type, norm, 0, 0); }
  function draw() {
    if (lost || !D || !W) return;
    var w = cv.width, h = cv.height, c = [C[0] * dpr, C[1] * dpr], r = R * dpr, M = rows(), i;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    for (i = 0; i < 6; i++) gl.disableVertexAttribArray(i);
    // sphere
    common(Q, M, w, h, c, r); gl.uniform1f(Q.u.uReveal, Math.min(1, reveal * 2.5));
    attr(Q.u.aQ, 'q', 2, gl.FLOAT, false); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.disableVertexAttribArray(Q.u.aQ);
    // continents, borders, grid
    if (LN) {
      common(L, M, w, h, c, r); attr(L.u.aP, 'ln', 3, gl.FLOAT, false);
      var fade = Math.min(1, reveal * 2);
      gl.uniform4f(L.u.uCol, 0.42, 0.56, 0.74, 0.10 * fade); gl.drawArrays(gl.LINES, LN.grid[0], LN.grid[1]);
      gl.uniform4f(L.u.uCol, 0.50, 0.66, 0.86, 0.22 * fade); gl.drawArrays(gl.LINES, LN.border[0], LN.border[1]);
      gl.uniform4f(L.u.uCol, 0.56, 0.74, 0.96, 0.55 * fade); gl.drawArrays(gl.LINES, LN.coast[0], LN.coast[1]);
      gl.disableVertexAttribArray(L.u.aP);
    }
    // lights
    common(P, M, w, h, c, r);
    attr(P.u.aP, 'xyz', 3, gl.FLOAT, false); attr(P.u.aPop, 'pop', 1, gl.UNSIGNED_BYTE, true); attr(P.u.aH, 'h', 1, gl.UNSIGNED_BYTE, true);
    attr(P.u.aA, 'a', 1, gl.UNSIGNED_BYTE, false); attr(P.u.aB, 'b', 1, gl.UNSIGNED_BYTE, false);
    gl.uniform1f(P.u.uMix, cur.mix); gl.uniform1f(P.u.uK, K); gl.uniform1f(P.u.uDpr, dpr); gl.uniform1f(P.u.uReveal, reveal); gl.uniform3fv(P.u.uRamp, ramp);
    if (u32) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.i); gl.drawElements(gl.POINTS, D.n, gl.UNSIGNED_INT, 0); }
    else gl.drawArrays(gl.POINTS, 0, D.n);
    [P.u.aP, P.u.aPop, P.u.aH, P.u.aA, P.u.aB].forEach(function (a) { gl.disableVertexAttribArray(a); });
  }
  function frame(t) {
    raf = 0;
    if (!o.active() || !seen || document.hidden || lost) { running = false; return; }
    var dt = last ? Math.min(0.1, (t - last) / 1000) : 0; last = t;
    var still = reduce.matches, more = false;
    // the Earth turns eastwards, so the longitude facing us falls
    if (!still) { lon0 -= speed(lon0) * dt; lon0 = (lon0 + 4 * Math.PI) % (2 * Math.PI); more = true; }
    if (reveal < 1) { var k = still ? 1 : Math.min(1, (t - revealT0) / 1900); reveal = k >= 1 ? 1 : 1 - Math.pow(1 - k, 2); more = true; }
    if (cur.mix < 1) { cur.mix = still ? 1 : Math.min(1, (t - cur.t0) / 750); more = true; }
    // about 40 frames a second is smooth for a slow turn and spares phones and 120 Hz screens
    if (!more || t - lastDraw >= 24) { draw(); lastDraw = t; }
    if (more) raf = requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (raf) return; if (!o.active() || !seen || document.hidden || lost || !D) { draw(); return; } running = true; last = 0; raf = requestAnimationFrame(frame); }

  api.set = function (k) { if (!meta) { o.prof = k; return false; } var i = meta.profiles.indexOf(k); if (i < 0) return false; if (i !== cur.b) setTarget(i, reduce.matches); return true; };
  api.wake = function () { size(); kick(); };

  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; o.fail(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; if (seen) kick(); }).observe(wrap);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  var rt = 0; new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(size, 120); }).observe(wrap);

  fetch('/data/hero.json?v=' + o.v).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (m) {
    meta = m;
    return fetch('/data/hero.bin?v=' + o.v).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); });
  }).then(function (buf) {
    var dv = new DataView(buf), n = dv.getUint32(0, true), off = 4, nb = meta.bytes || 4;
    var lon = new Uint16Array(buf.slice(off, off + 2 * n)); off += 2 * n;
    var lat = new Uint16Array(buf.slice(off, off + 2 * n)); off += 2 * n;
    var xyz = new Float32Array(3 * n), hh = new Uint8Array(n), RAD = Math.PI / 180;
    for (var i = 0; i < n; i++) {
      var lo = (lon[i] / 65535 * 360 - 180) * RAD, la = (lat[i] / 65535 * 180 - 90) * RAD, cl = Math.cos(la);
      xyz[3 * i] = cl * Math.sin(lo); xyz[3 * i + 1] = Math.sin(la); xyz[3 * i + 2] = cl * Math.cos(lo);
      hh[i] = (Math.imul(i + 1, 2654435761) >>> 24);        // reveal order: a fixed scatter
    }
    D = { n: n, pop: new Uint8Array(buf, off, n), sc: new Uint8Array(buf, off + n, n * nb) };
    upload('xyz', xyz); upload('pop', D.pop); upload('h', hh);
    var pi = Math.max(0, meta.profiles.indexOf(o.prof));
    // start with Europe in view, or the Americas / East Asia for visitors whose clock says they are there
    var tz = 0; try { tz = -new Date().getTimezoneOffset() / 60; } catch (e) { tz = 0; }
    lon0 = (tz <= -3 ? -95 : tz >= 7 ? 135 : 12) * Math.PI / 180;
    size(); setTarget(pi, true); revealT0 = performance.now(); reveal = reduce.matches ? 1 : 0;
    o.ready(meta); kick();
    loadLines();
  }).catch(function () { o.fail(); });
  function unit(lo, la) { var RAD = Math.PI / 180, cl = Math.cos(la * RAD); return [cl * Math.sin(lo * RAD), Math.sin(la * RAD), cl * Math.cos(lo * RAD)]; }
  function loadLines() {
    fetch('/data/globe-lines.bin?v=' + o.v).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function (buf) {
      var dv = new DataView(buf), nc = dv.getUint32(0, true), nb = dv.getUint32(4, true), q = new Int16Array(buf, 8, (nc + nb) * 4), out = [], i, k;
      for (i = 0; i < (nc + nb) * 2; i++) Array.prototype.push.apply(out, unit(q[2 * i] / 180, q[2 * i + 1] / 180));
      var g0 = out.length / 3;
      for (k = -180; k < 180; k += 15) for (i = -80; i < 80; i += 4) { Array.prototype.push.apply(out, unit(k, i)); Array.prototype.push.apply(out, unit(k, i + 4)); }
      for (i = -75; i <= 75; i += 15) for (k = -180; k < 180; k += 4) { Array.prototype.push.apply(out, unit(k, i)); Array.prototype.push.apply(out, unit(k + 4, i)); }
      upload('ln', new Float32Array(out));
      LN = { coast: [0, nc * 2], border: [nc * 2, nb * 2], grid: [g0, out.length / 3 - g0] };
      kick();
    }).catch(function () { /* the lights alone still work */ });
  }
  return api;
};

/* The same globe on a 2D canvas (2.12.2), for browsers without WebGL. Lights are written straight into a pixel buffer
   (additive), the brightest drawn as small discs; coastlines, borders and the grid as paths. About 25 frames a second. */
window.NZGLOBE2D = function (o) {
  var RAMP = ['#18324f', '#1b4565', '#1c5a78', '#1d6f86', '#21868f', '#2a9c96', '#3fb09a', '#5cc29c', '#82d19d', '#a9de9b', '#cde79a', '#ead98a', '#f7cf74', '#ffe3a3', '#fff4d6'];
  var wrap = o.wrap, cv = o.canvas, api = { set: function () {}, wake: function () {} }, ctx = cv.getContext('2d');
  if (!ctx) { o.fail(); return api; }
  var rgb = [[33, 56, 79]].concat(RAMP.map(function (h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }));
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var D = null, meta = null, bandCache = {}, band = null, W = 0, H = 0, dpr = 1, C = [0, 0], R = 1, lon0 = 0, lat0 = 26 * Math.PI / 180;
  var raf = 0, last = 0, lastDraw = 0, seen = true, LN = null, buf = null, off = null, offc = null, fade = 0;
  function alphaOf(b) { return b < 1 ? 0.08 : 0.09 + 0.91 * Math.pow(b / 15, 2.2); }
  function bands(pi) {
    if (bandCache[pi]) return bandCache[pi];
    var n = D.n, nb = meta.bytes || 4, out = new Uint8Array(n), hist = new Float64Array(16), i, b;
    for (i = 0; i < n; i++) { var byte = D.sc[i * nb + (pi >> 1)]; out[i] = pi & 1 ? byte & 15 : byte >> 4; hist[out[i]]++; }
    var cum = 0, lvl = new Uint8Array(16), valued = n - hist[0];
    for (b = 1; b < 16; b++) { cum += hist[b]; lvl[b] = Math.max(1, Math.min(15, Math.round(15 * Math.pow(cum / Math.max(1, valued), 7)))); }
    for (i = 0; i < n; i++) out[i] = lvl[out[i]];
    return (bandCache[pi] = out);
  }
  function size() {
    var w = wrap.clientWidth, h = wrap.clientHeight; dpr = Math.min(1, window.devicePixelRatio || 1);
    if (!w || !h) return;
    W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var mobile = W < 900, r;
    if (mobile) { var vh = window.innerHeight || H; r = Math.min(W * 0.42, (vh * 0.19 + 30) * 0.62, 260); C = [W * 0.5, 58 + r * 0.95]; }
    else { var vb = window.innerHeight || H; r = Math.min(vb * 0.58, W * 0.4); C = [W * 0.68, vb * 0.57]; }
    R = r; off = null; kick();
  }
  function speed(l) { var d = ((l * 180 / Math.PI + 540) % 360) - 180, e = Math.abs(((d + 160 + 540) % 360) - 180); return (2 * Math.PI / 75) * (1 + 1.6 * Math.max(0, 1 - e / 55)); }
  function rows() { var cl = Math.cos(lon0), sl = Math.sin(lon0), cp = Math.cos(lat0), sp = Math.sin(lat0); return [[cl, 0, -sl], [-sp * sl, cp, -sp * cl], [cp * sl, sp, cp * cl]]; }
  function draw() {
    if (!D || !W) return;
    var w = cv.width, h = cv.height, c = [C[0] * dpr, C[1] * dpr], r = R * dpr, M = rows(), X = M[0], Y = M[1], Z = M[2], i, x, y, z, p;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.clearRect(0, 0, w, h);
    // the Earth: a dark disc with a soft blue rim
    var g = ctx.createRadialGradient(c[0] - r * 0.3, c[1] - r * 0.35, r * 0.1, c[0], c[1], r * 1.08);
    g.addColorStop(0, '#12305a'); g.addColorStop(0.75, '#0a1d3a'); g.addColorStop(0.93, '#0b2a52'); g.addColorStop(1, 'rgba(40,110,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], r * 1.08, 0, 2 * Math.PI); ctx.fill();
    if (LN) {
      var seg = function (a, b, col) {
        ctx.strokeStyle = col; ctx.beginPath();
        for (var k = a; k < a + b; k += 2) {
          var j = 3 * k, z0 = Z[0] * LN.p[j] + Z[1] * LN.p[j + 1] + Z[2] * LN.p[j + 2], z1 = Z[0] * LN.p[j + 3] + Z[1] * LN.p[j + 4] + Z[2] * LN.p[j + 5];
          if (z0 < 0 || z1 < 0) continue;
          ctx.moveTo(c[0] + (X[0] * LN.p[j] + X[1] * LN.p[j + 1] + X[2] * LN.p[j + 2]) * r, c[1] - (Y[0] * LN.p[j] + Y[1] * LN.p[j + 1] + Y[2] * LN.p[j + 2]) * r);
          ctx.lineTo(c[0] + (X[0] * LN.p[j + 3] + X[1] * LN.p[j + 4] + X[2] * LN.p[j + 5]) * r, c[1] - (Y[0] * LN.p[j + 3] + Y[1] * LN.p[j + 4] + Y[2] * LN.p[j + 5]) * r);
        }
        ctx.stroke();
      };
      ctx.lineWidth = 1;
      seg(LN.grid[0], LN.grid[1], 'rgba(107,143,189,0.10)'); seg(LN.border[0], LN.border[1], 'rgba(128,168,219,0.22)'); seg(LN.coast[0], LN.coast[1], 'rgba(143,189,245,0.5)');
    }
    // lights: additive into a pixel buffer, then the brightest as discs
    if (!off || off.width !== w || off.height !== h) { off = document.createElement('canvas'); off.width = w; off.height = h; offc = off.getContext('2d'); buf = offc.createImageData(w, h); }
    var px = buf.data; px.fill(0);
    var xyz = D.xyz, n = D.n, top = [];
    for (i = 0; i < n; i++) {
      p = 3 * i; z = Z[0] * xyz[p] + Z[1] * xyz[p + 1] + Z[2] * xyz[p + 2];
      if (z < 0) continue;
      x = (c[0] + (X[0] * xyz[p] + X[1] * xyz[p + 1] + X[2] * xyz[p + 2]) * r) | 0; y = (c[1] - (Y[0] * xyz[p] + Y[1] * xyz[p + 1] + Y[2] * xyz[p + 2]) * r) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      var b = band[i], a = alphaOf(b) * (0.35 + 0.65 * Math.min(1, z / 0.28)) * fade, col = rgb[b], q = 4 * (y * w + x);
      px[q] += col[0] * a; px[q + 1] += col[1] * a; px[q + 2] += col[2] * a; px[q + 3] += 255 * a;
      if (b >= 12) top.push(x, y, b, a);
    }
    offc.putImageData(buf, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(off, 0, 0);
    for (i = 0; i < top.length; i += 4) { var cc = rgb[top[i + 2]]; ctx.fillStyle = 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',' + (top[i + 3] * 0.55).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(top[i], top[i + 1], top[i + 2] >= 14 ? 2.2 : 1.6, 0, 6.2832); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  }
  function frame(t) {
    raf = 0;
    if (!o.active() || !seen || document.hidden) return;
    var dt = last ? Math.min(0.1, (t - last) / 1000) : 0; last = t;
    var still = reduce.matches;
    if (!still) { lon0 -= speed(lon0) * dt; lon0 = (lon0 + 4 * Math.PI) % (2 * Math.PI); }
    fade = still ? 1 : Math.min(1, fade + dt / 1.5);
    if (t - lastDraw >= 40) { draw(); lastDraw = t; }
    if (!still || fade < 1) raf = requestAnimationFrame(frame);
  }
  function kick() { if (raf) return; if (!o.active() || !seen || document.hidden || !D) { draw(); return; } last = 0; raf = requestAnimationFrame(frame); }
  api.set = function (k) { if (!meta) { o.prof = k; return false; } var i = meta.profiles.indexOf(k); if (i < 0) return false; band = bands(i); draw(); kick(); return true; };
  api.wake = function () { size(); kick(); };
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; if (seen) kick(); }).observe(wrap);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  var rt = 0; new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(size, 120); }).observe(wrap);
  function unit(lo, la) { var RAD = Math.PI / 180, cl = Math.cos(la * RAD); return [cl * Math.sin(lo * RAD), Math.sin(la * RAD), cl * Math.cos(lo * RAD)]; }
  fetch('/data/hero.json?v=' + o.v).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (m) {
    meta = m; return fetch('/data/hero.bin?v=' + o.v).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); });
  }).then(function (bf) {
    var dv = new DataView(bf), n = dv.getUint32(0, true), of = 4, nb = meta.bytes || 4;
    var lon = new Uint16Array(bf.slice(of, of + 2 * n)); of += 2 * n;
    var lat = new Uint16Array(bf.slice(of, of + 2 * n)); of += 2 * n;
    var xyz = new Float32Array(3 * n), RAD = Math.PI / 180;
    for (var i = 0; i < n; i++) { var lo = (lon[i] / 65535 * 360 - 180) * RAD, la = (lat[i] / 65535 * 180 - 90) * RAD, cl = Math.cos(la); xyz[3 * i] = cl * Math.sin(lo); xyz[3 * i + 1] = Math.sin(la); xyz[3 * i + 2] = cl * Math.cos(lo); }
    D = { n: n, xyz: xyz, sc: new Uint8Array(bf, of + n, n * nb) };
    band = bands(Math.max(0, meta.profiles.indexOf(o.prof)));
    var tz = 0; try { tz = -new Date().getTimezoneOffset() / 60; } catch (e) { tz = 0; }
    lon0 = (tz <= -3 ? -95 : tz >= 7 ? 135 : 12) * Math.PI / 180; fade = reduce.matches ? 1 : 0;
    size(); o.ready(meta); kick();
    return fetch('/data/globe-lines.bin?v=' + o.v).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function (lb) {
      var dv2 = new DataView(lb), nc = dv2.getUint32(0, true), nbd = dv2.getUint32(4, true), q = new Int16Array(lb, 8, (nc + nbd) * 4), out = [], j, k;
      for (j = 0; j < (nc + nbd) * 2; j++) Array.prototype.push.apply(out, unit(q[2 * j] / 180, q[2 * j + 1] / 180));
      var g0 = out.length / 3;
      for (k = -180; k < 180; k += 15) for (j = -80; j < 80; j += 4) { Array.prototype.push.apply(out, unit(k, j)); Array.prototype.push.apply(out, unit(k, j + 4)); }
      for (j = -75; j <= 75; j += 15) for (k = -180; k < 180; k += 4) { Array.prototype.push.apply(out, unit(k, j)); Array.prototype.push.apply(out, unit(k + 4, j)); }
      LN = { p: new Float32Array(out), coast: [0, nc * 2], border: [nc * 2, nbd * 2], grid: [g0, out.length / 3 - g0] }; kick();
    }).catch(function () {});
  }).catch(function () { o.fail(); });
  return api;
};
