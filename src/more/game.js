/* Higher or lower (part of the lazy module /assets/more.js since 2.7) */
var GAME = { streak: 0, best: store('gamebest') || 0, q: null };
var GAME_Q = [['pop', 'Which one has <b>more residents</b>?'], ['alt', 'Which one sits on <b>higher ground</b>?'], ['cap', 'Which one is <b>further from the capital</b>?'], ['pop10', 'Which one has <b>more people within 10 km</b>?'], ['coast', 'Which one is <b>closer to the sea</b>?', 'min'], ['g5', 'Which one <b>grew faster</b> in the last five years?'], ['area', 'Which one covers <b>more land</b>?'], ['rail', 'Which one is <b>further from a railway line</b>?'], ['dayw', 'Which one gets <b>more daylight</b> on the shortest day?'], ['setw', 'Where does the sun <b>set later</b> in December?']];
function gameRound() {
  var pool = SHARD ? SHARD.records.filter(function (r) { return r.popNow >= 2000 && r.x; }) : [];
  if (pool.length < 10) return toast('Not enough places', 'Pick a bigger country to play.');
  var q, a, b, va, vb, tries = 0;
  do { q = GAME_Q[Math.floor(Math.random() * GAME_Q.length)]; a = pool[Math.floor(Math.random() * pool.length)]; b = pool[Math.floor(Math.random() * pool.length)]; va = pval(a, q[0]); vb = pval(b, q[0]); tries++; } while ((a === b || va == null || vb == null || (q[0] === 'g5' && (Math.abs(va) > 40 || Math.abs(vb) > 40)) || Math.abs(va - vb) < (q[0] === 'setw' || q[0] === 'dayw' ? 0.15 : Math.max(Math.abs(va), Math.abs(vb)) * 0.08)) && tries < 60);
  GAME.q = { q: q, a: a, b: b, va: va, vb: vb };
  function card(r, side) { return '<button class="gcard" type="button" data-guess="' + side + '"><div class="cmp-ph" data-photo="' + esc(r.id) + '" data-postcard="' + esc(r.id) + '" data-w="300" data-h="170"></div><b>' + esc(r.name) + '</b><small>' + esc(localAreaOf(r)) + '</small><span class="gval" hidden></span></button>'; }
  openModal('Higher or lower', '<p class="gq">' + q[1] + '</p><div class="ggrid">' + card(a, 'a') + card(b, 'b') + '</div><p class="small muted gs">Streak: <b>' + GAME.streak + '</b> · best: <b>' + GAME.best + '</b> · all ' + esc(countryName(S.cc)) + ', real data</p>');
  hydratePostcards($('#modal')); hydratePhotos($('#modal'));
}
function gameGuess(side) {
  var g = GAME.q; if (!g || g.done) return; g.done = true;
  var aWins = g.q[2] === 'min' ? g.va < g.vb : g.va > g.vb, right = (side === 'a') === aWins;
  GAME.streak = right ? GAME.streak + 1 : 0; if (GAME.streak > GAME.best) { GAME.best = GAME.streak; store('gamebest', GAME.best); }
  $$('#modal .gcard').forEach(function (c) { var s = c.dataset.guess, v = s === 'a' ? g.va : g.vb, win = (s === 'a') === aWins; c.classList.add(win ? 'win' : 'lose'); var o = c.querySelector('.gval'); o.hidden = false; o.textContent = pfmt(g.q[0], v); });
  var gs = $('#modal .gs'); if (gs) gs.innerHTML = (right ? '✅ Right! ' : '❌ Not this time. ') + 'Streak: <b>' + GAME.streak + '</b> · best: <b>' + GAME.best + '</b> <button class="btn btn-sm btn-primary" type="button" data-game>Next pair</button>';
}


(function () { var st = document.createElement('style'); st.textContent = ".gcard{display:grid;gap:4px;text-align:left;border:2px solid var(--line);border-radius:16px;padding:8px;background:var(--surface);transition:transform .15s,border-color .15s}.gcard:hover{transform:translateY(-2px);border-color:var(--blue)}.gcard .cmp-ph{height:130px}.gcard small{color:var(--ink-3)}.gcard .gval{font:700 var(--step-2)/1.1 var(--font-display)}.gcard.win{border-color:var(--good);background:var(--good-bg)}.gcard.lose{opacity:.75}@media (max-width:900px){.gcard .cmp-ph{height:96px}}"; document.head.appendChild(st); })();
