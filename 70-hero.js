/* Landing hero: every municipality as a point of light, coloured by fit for the chosen household. */
var HERO = { data: null, prof: 0, canvases: null, front: 0, revealed: false, sprites: null, order: {}, frame: null };
var HERO_RAMP = ['#18324f', '#1b4565', '#1c5a78', '#1d6f86', '#21868f', '#2a9c96', '#3fb09a', '#5cc29c', '#82d19d', '#a9de9b', '#cde79a', '#ead98a', '#f7cf74', '#ffe3a3', '#fff4d6'];
function heroInit() {
  var wrap = $('#cine'); if (!wrap || HERO.canvases) return;
  HERO.canvases = [$('#cine-a'), $('#cine-b')];
  var conn = navigator.connection || {};
  if (conn.saveData) { wrap.classList.add('static'); return; }
  var go = function () {
    fetch('/data/hero.json?v=' + VERSION).then(function (r) { return r.json(); }).then(function (meta) {
      HERO.meta = meta;
      return fetch('/data/hero.bin?v=' + VERSION).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); });
    }).then(function (buf) {
      var dv = new DataView(buf), n = dv.getUint32(0, true), o = 4;
      HERO.data = { n: n, lon: new Uint16Array(buf.slice(o, o + 2 * n)), lat: null, pop: null, sc: null };
      o += 2 * n; HERO.data.lat = new Uint16Array(buf.slice(o, o + 2 * n)); o += 2 * n;
      HERO.data.pop = new Uint8Array(buf, o, n); o += n; HERO.data.sc = new Uint8Array(buf, o, n * 4);
      HERO.prof = Math.max(0, HERO.meta.profiles.indexOf(($('.who [aria-pressed="true"]') || {}).dataset ? $('.who [aria-pressed="true"]').dataset.who : 'young_family'));
      heroResize(); heroDraw(true);
      new ResizeObserver(debounce(function () { heroResize(); heroDraw(false); }, 150)).observe(wrap);
    }).catch(function () { wrap.classList.add('static'); });
  };
  if (S.view === 'explore') { HERO.canvases = null; return; }
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 900 }); else setTimeout(go, 200);
}
function heroResize() {
  var wrap = $('#cine'), dpr = Math.min(2, window.devicePixelRatio || 1), W = wrap.clientWidth, H = wrap.clientHeight;
  HERO.canvases.forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = W + 'px'; c.style.height = H + 'px'; });
  HERO.dpr = dpr; HERO.W = W; HERO.H = H;
  // frame: mainland Europe fitted into the right-hand stage (desktop) or the top half (mobile)
  var mobile = W < 900, lon0 = -11, lon1 = 33, lat0 = 35.2, lat1 = 70.5;
  var k = Math.cos(52 * Math.PI / 180);
  var stageW = mobile ? W * 1.0 : W * 0.66, stageH = mobile ? H * 0.23 : H * 0.98;
  var s = Math.min(stageW / ((lon1 - lon0) * k), stageH / (lat1 - lat0)) * (mobile ? 1.0 : 1.06);
  var cx = (lon0 + lon1) / 2, cy = (lat0 + lat1) / 2;
  HERO.frame = { k: k, s: s * dpr, cx: cx, cy: cy, ox: (mobile ? 0.5 : 0.655) * W * dpr, oy: (mobile ? 0.135 : 0.5) * H * dpr };
  HERO.sprites = null;
}
function heroSprites() {
  if (HERO.sprites) return HERO.sprites;
  var dpr = HERO.dpr, out = [];
  for (var b = 0; b < 16; b++) {
    out[b] = [];
    for (var z = 0; z < 3; z++) {
      var r = (0.62 + z * 0.55 + (b > 11 ? 0.35 : 0)) * dpr * (HERO.W < 900 ? 0.85 : 1), R = Math.ceil(r * 3.4), c = document.createElement('canvas');
      c.width = c.height = R * 2; var g = c.getContext('2d'), col = b ? HERO_RAMP[b - 1] : '#22374f';
      var a = b ? 0.22 + 0.78 * Math.pow(b / 15, 1.6) : 0.18;
      var grd = g.createRadialGradient(R, R, 0, R, R, R);
      grd.addColorStop(0, hexA(col, a)); grd.addColorStop(r / R, hexA(col, a * 0.9)); grd.addColorStop(Math.min(1, r * 1.8 / R), hexA(col, a * (b > 11 ? 0.35 : 0.12))); grd.addColorStop(1, hexA(col, 0));
      g.fillStyle = grd; g.fillRect(0, 0, R * 2, R * 2);
      out[b][z] = c;
    }
  }
  HERO.sprites = out; return out;
}
function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
function heroBand(i) { var byte = HERO.data.sc[i * 4 + (HERO.prof >> 1)]; return HERO.prof & 1 ? byte & 15 : byte >> 4; }
function heroDraw(reveal) {
  if (!HERO.data) return;
  if (S.view === 'explore' || !$('#cine').offsetParent) { HERO.dirty = true; return; }
  HERO.dirty = false;
  var D = HERO.data, F = HERO.frame, next = 1 - HERO.front, cv = HERO.canvases[next], g = cv.getContext('2d'), sp = heroSprites();
  var order = HERO.order[HERO.prof];
  if (!order) {
    order = new Uint32Array(D.n); for (var i = 0; i < D.n; i++) order[i] = i;
    var bands = new Uint8Array(D.n); for (i = 0; i < D.n; i++) bands[i] = heroBand(i);
    order.sort(function (a, b) { return bands[a] - bands[b] || D.pop[a] - D.pop[b]; });
    HERO.order[HERO.prof] = order;
  }
  var hist = new Float64Array(16); for (i = 0; i < D.n; i++) hist[heroBand(i)]++;
  var cum = 0, lvl = new Uint8Array(16), valued = D.n - hist[0];
  for (var bb = 1; bb < 16; bb++) { cum += hist[bb]; lvl[bb] = Math.max(1, Math.min(15, Math.round(15 * Math.pow(cum / Math.max(1, valued), 4.5)))); }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var xs = new Float32Array(D.n), ys = new Float32Array(D.n);
  for (i = 0; i < D.n; i++) { var lon = D.lon[i] / 65535 * 70 - 25, lat = D.lat[i] / 65535 * 45 + 27; xs[i] = F.ox + (lon - F.cx) * F.k * F.s; ys[i] = F.oy - (lat - F.cy) * F.s; }
  function paint(limit) {
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, cv.width, cv.height);
    for (var j = 0; j < D.n; j++) {
      var idx = order[j]; if (limit < 1 && ((idx * 2654435761) >>> 0) / 4294967296 > limit) continue;
      var x = xs[idx], y = ys[idx]; if (x < -8 || y < -8 || x > cv.width + 8 || y > cv.height + 8) continue;
      var b = lvl[heroBand(idx)], pc = D.pop[idx], z = pc > 200 ? 2 : pc > 160 ? 1 : 0, s = sp[b][z];
      g.drawImage(s, x - s.width / 2, y - s.height / 2);
    }
  }
  var other = HERO.canvases[HERO.front];
  if (reveal && !HERO.revealed && !reduce) {
    HERO.revealed = true; var t0 = performance.now();
    cv.style.opacity = 1;
    (function step(t) { if (S.view === 'explore') { paint(1); return; } var k = Math.min(1, (t - t0) / 1700); paint(1 - Math.pow(1 - k, 2)); if (k < 1) requestAnimationFrame(step); })(t0);
  } else { paint(1); cv.style.opacity = 1; }
  other.style.opacity = 0;
  HERO.front = next;
}
function heroSetProfile(k) {
  if (!HERO.meta) return;
  var i = HERO.meta.profiles.indexOf(k); if (i < 0 || i === HERO.prof) return;
  HERO.prof = i; heroDraw(false);
  var cap = $('#cine-prof'); if (cap) cap.textContent = (ENGINE && ENGINE.profiles[k] ? ENGINE.profiles[k].name : k).toLowerCase();
}
