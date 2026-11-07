/* Nestlyzer feedback layer (2.13.3): small motion that answers what you do, optional sounds, a gentle tap on phones.
   Loaded once the page is idle (own file, so the start page stays within its size budget). Nothing here touches data,
   scores or rankings. Respects "reduce motion"; sounds are off until switched on in the menu; vibration only where the
   browser supports it (Android) and can be switched off in the menu. */
(function () {
  if (window.NZFX) return; window.NZFX = 1;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var st = function (k, v) { try { if (v === undefined) return localStorage.getItem('nz:fx:' + k); localStorage.setItem('nz:fx:' + k, v); } catch (e) { return null; } };
  var soundOn = function () { return st('sound') === '1'; }, buzzOn = function () { return st('buzz') !== '0'; };
  var AC = null;
  function tone(f, d, type, vol, slide, delay) {
    if (!soundOn()) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
      var t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.03);
    } catch (e) { /* no audio: stay silent */ }
  }
  var SND = {
    pop: function () { tone(520, 0.1, 'sine', 0.06, 900); },
    tick: function () { tone(1500, 0.03, 'triangle', 0.022); },
    soft: function () { tone(360, 0.13, 'sine', 0.04, 240); },
    chime: function () { tone(660, 0.14, 'sine', 0.04); tone(990, 0.2, 'sine', 0.032, 0, 0.08); }
  };
  function buzz(p) { if (buzzOn() && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* unsupported */ } }
  function burst(el, color) {
    if (RM || !el || !el.isConnected) return;
    var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var i = 0; i < 10; i++) {
      var s = document.createElement('i'), a = i / 10 * Math.PI * 2 + Math.random() * 0.3, d = 20 + Math.random() * 16;
      s.className = 'fx-spark'; s.setAttribute('aria-hidden', 'true');
      s.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;--dx:' + (Math.cos(a) * d).toFixed(1) + 'px;--dy:' + (Math.sin(a) * d).toFixed(1) + 'px;background:' + color;
      document.body.appendChild(s); setTimeout(s.remove.bind(s), 700);
    }
  }
  function pulse(el) { if (RM || !el) return; el.classList.remove('fx-pulse'); void el.offsetWidth; el.classList.add('fx-pulse'); }
  // capture phase: runs before the app re-renders the button, so the state read here is the state before the click
  document.addEventListener('click', function (ev) {
    var t = ev.target, b; if (!t || !t.closest) return;
    if ((b = t.closest('[data-unsave]'))) { SND.soft(); buzz(8); return; }
    if ((b = t.closest('[data-save]'))) { if (b.getAttribute('aria-pressed') === 'true') { SND.soft(); buzz(8); } else { SND.pop(); buzz(14); burst(b, '#e5484d'); pulse(b); } return; }
    if ((b = t.closest('[data-cmp]'))) { SND.tick(); buzz(8); pulse(b); return; }
    if ((b = t.closest('[data-hide]'))) { SND.soft(); buzz(10); return; }
    if ((b = t.closest('[data-unhide],[data-unhideall]'))) { SND.tick(); buzz(6); return; }
    if ((b = t.closest('[data-start="go"]'))) { SND.chime(); buzz([10, 40, 12]); pulse(b); return; }
    if ((b = t.closest('.who [data-who], [data-hmode]'))) { SND.tick(); buzz(6); pulse(b); return; }
    if ((b = t.closest('[data-ptab], [role="tab"], .rank-tile, [data-lt]'))) { SND.tick(); buzz(5); return; }
    if ((b = t.closest('.fx-toggle'))) return;
  }, true);
  // menu switches: sounds (off by default) and vibration (phones that support it)
  function menu() {
    [].slice.call(document.querySelectorAll('.menu-panel')).forEach(function (p) {
      if (p.querySelector('.fx-toggle')) return;
      var mk = function (k, label, on) { var b = document.createElement('button'); b.type = 'button'; b.className = 'fx-toggle'; b.dataset.fx = k; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = label + (on ? ': on' : ': off'); return b; };
      p.appendChild(mk('sound', 'Sounds', soundOn()));
      if (navigator.vibrate) p.appendChild(mk('buzz', 'Vibration', buzzOn()));
    });
    // wide screens have no menu: a small speaker switch next to the header tools
    [].slice.call(document.querySelectorAll('.header-tools')).forEach(function (h) {
      if (h.querySelector('.fx-hdr')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn fx-toggle fx-hdr'; b.dataset.fx = 'sound';
      b.setAttribute('aria-pressed', soundOn() ? 'true' : 'false'); b.setAttribute('aria-label', 'Sounds'); b.title = 'Sounds on or off';
      b.innerHTML = SPK; h.insertBefore(b, h.firstChild);
    });
  }
  var SPK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="fx-w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/><path class="fx-x" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.fx-toggle'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    var k = b.dataset.fx, on = b.getAttribute('aria-pressed') !== 'true';
    st(k, on ? '1' : '0');
    [].slice.call(document.querySelectorAll('.fx-toggle[data-fx="' + k + '"]')).forEach(function (x) { x.setAttribute('aria-pressed', on ? 'true' : 'false'); if (!x.classList.contains('fx-hdr')) x.textContent = (k === 'sound' ? 'Sounds' : 'Vibration') + (on ? ': on' : ': off'); });
    if (on && k === 'sound') SND.chime(); if (on && k === 'buzz') buzz(20);
  }, true);
  menu();
  var css = document.createElement('style');
  css.textContent =
    '.fx-spark{position:fixed;z-index:9999;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;pointer-events:none;animation:fxSpark .65s cubic-bezier(.2,.7,.3,1) forwards}' +
    '@keyframes fxSpark{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}' +
    '.fx-pulse{animation:fxPulse .32s cubic-bezier(.3,1.6,.5,1)}@keyframes fxPulse{0%{transform:scale(1)}40%{transform:scale(1.14)}100%{transform:scale(1)}}' +
    '.medal.m1{animation:fxShine 2.8s ease-in-out .6s 1}@keyframes fxShine{0%,100%{filter:none}45%{filter:brightness(1.35) drop-shadow(0 0 4px #f5c542)}}' +
    '.rank-tile,.ins-band-links a,.tile{transition:transform .18s ease,box-shadow .18s ease}' +
    '@media (hover:hover){.rank-tile:hover,.ins-band-links a:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(11,46,92,.14)}}' +
    '.fit .fi.good b::before{content:"";display:inline-block;width:.9em;height:.9em;margin-right:5px;vertical-align:-.1em;background:var(--good);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M4 12.5l5 5L20 6.5%27 fill=%27none%27 stroke=%27black%27 stroke-width=%273%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M4 12.5l5 5L20 6.5%27 fill=%27none%27 stroke=%27black%27 stroke-width=%273%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E") center/contain no-repeat}' +
    '.fit .fi.bad b::before{content:"";display:inline-block;width:.9em;height:.9em;margin-right:5px;vertical-align:-.1em;background:var(--bad);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M12 5v9M12 18.5v.5%27 fill=%27none%27 stroke=%27black%27 stroke-width=%273%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M12 5v9M12 18.5v.5%27 fill=%27none%27 stroke=%27black%27 stroke-width=%273%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") center/contain no-repeat}' +
    '.fx-hdr{display:none!important}@media (min-width:861px){.fx-hdr{display:inline-grid!important}}.fx-hdr[aria-pressed="true"] .fx-x,.fx-hdr[aria-pressed="false"] .fx-w{display:none}' +
    '.menu-panel .fx-toggle{display:block;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--line);padding:9px 12px;font:inherit;color:inherit;cursor:pointer}.menu-panel .fx-toggle[aria-pressed="true"]{font-weight:650}' +
    '@media (prefers-reduced-motion:reduce){.fx-spark,.fx-pulse,.medal.m1{animation:none!important}.rank-tile,.ins-band-links a{transition:none}}';
  document.head.appendChild(css);
})();
