/* Guided profile builder (restored legacy questions + target countries, plus v2 extras and weight fine-tuning) */
var BSTATE = null, BWEIGHTS = null;
function openBuilder() {
  var B = META.config.builder;
  BSTATE = S.builder ? JSON.parse(JSON.stringify(S.builder)) : JSON.parse(JSON.stringify(B.defaults));
  BSTATE.targets = [S.cc].concat((BSTATE.targets || []).filter(function (c) { return c !== S.cc; }));
  BWEIGHTS = null;
  openModal('Build your own profile', '<div class="builder"><div class="qgrid" id="bq"></div><aside id="bside"></aside></div><div class="bstick"><span id="bstick-t" class="small"></span><button class="btn btn-primary" type="button" data-bapply>Use this profile</button></div>');
  renderBuilder();
}
function builderProfile() {
  var g = ENGINE.buildGuided(BSTATE);
  if (BWEIGHTS) g.weights = Object.assign({}, BWEIGHTS);
  var lang = BSTATE.language && BSTATE.language !== 'flexible' ? META.config.builder.groups.language.choices.find(function (c) { return c[0] === BSTATE.language; })[1] : '';
  var house = META.config.builder.groups.household.choices.find(function (c) { return c[0] === BSTATE.household; });
  var G = META.config.builder.groups, lab = function (k) { var c = G[k].choices.find(function (c) { return c[0] === BSTATE[k]; }); return c ? c[1].toLowerCase() : BSTATE[k]; };
  var bits = [lab('household'), lab('budget') + ' budget', lab('anchor') + ' as the daily anchor', lab('mobility') + ' mobility'];
  if (BSTATE.tax !== 'normal') bits.push(lab('tax') + ' tax focus');
  if (BSTATE.climate !== 'normal') bits.push(lab('climate') + ' setting');
  if (lang) bits.push(lang + ' language');
  if (BSTATE.mobilityPlus) bits.push('airport and big-city access');
  if (BSTATE.coast) bits.push('near the sea');
  g.desc = 'Custom profile: ' + bits.join(', ') + '. Targets: ' + BSTATE.targets.map(countryName).join(', ') + '.';
  g.intro = g.desc;
  return g;
}
function renderBuilder() {
  var B = META.config.builder, G = B.groups;
  var qs = Object.keys(G).map(function (k) {
    return '<div class="q"><h3>' + esc(G[k].label) + '</h3><div class="seg" role="group" aria-label="' + esc(G[k].label) + '">' + G[k].choices.map(function (c) { return '<button type="button" data-bq="' + k + '" data-v="' + c[0] + '" aria-pressed="' + (BSTATE[k] === c[0]) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div></div>';
  }).join('');
  qs += '<div class="q"><h3>Also important</h3><div class="seg"><button type="button" data-bx="mobilityPlus" aria-pressed="' + !!BSTATE.mobilityPlus + '">Airport and big-city access</button><button type="button" data-bx="coast" aria-pressed="' + !!BSTATE.coast + '">Near the sea</button></div></div>';
  qs += '<div class="q"><h3>Target countries</h3><div class="seg">' + META.countries.slice().sort(function (a, b) { return (b.cc === BSTATE.targets[0]) - (a.cc === BSTATE.targets[0]) || (B.countries.indexOf(a.cc) < 0 ? 99 : B.countries.indexOf(a.cc)) - (B.countries.indexOf(b.cc) < 0 ? 99 : B.countries.indexOf(b.cc)) || a.name.localeCompare(b.name); }).map(function (c) { return c.cc; }).map(function (cc) { return '<button type="button" data-bt="' + cc + '" aria-pressed="' + (BSTATE.targets.indexOf(cc) >= 0) + '">' + flagImg(cc) + ' ' + esc(countryName(cc)) + (cc === BSTATE.targets[0] ? ' <small class="opens">opens first</small>' : '') + '</button>'; }).join('') + '</div><p class="small muted" style="margin-top:6px">The country you picked last opens first (marked). ' + TAP + ' a selected country again to remove it.</p></div>';
  $('#bq').innerHTML = qs;
  var st = $('#bstick-t'); if (st) st.textContent = 'Opens in ' + countryName(BSTATE.targets[0] || S.cc) + (BSTATE.language && BSTATE.language !== 'flexible' ? ', ' + G.language.choices.find(function (c) { return c[0] === BSTATE.language; })[1] + '-speaking places only' : '');
  renderBuilderSide();
}
function renderBuilderSide() {
  var g = builderProfile(), w = g.weights;
  var matches = ENGINE.cosineMatches(w, BSTATE.targets[0] || S.cc, 3);
  var best = matches[0] ? ENGINE.weightsFor({ country: BSTATE.targets[0] || S.cc }, matches[0][0]) : {};
  var axes = [['affordability', 'Costs'], ['tax', 'Tax'], ['safety', 'Safety'], ['family', 'Family'], ['health', 'Health'], ['jobs', 'Jobs'], ['commuter_access', 'Access'], ['lifestyle', 'Lifestyle'], ['environment', 'Green space']];
  var mx = Math.max.apply(null, axes.map(function (a) { return w[a[0]] || 0; }).concat([1])), mb = Math.max.apply(null, axes.map(function (a) { return best[a[0]] || 0; }).concat([1]));
  var cx = 150, cy = 130, R = 95, n = axes.length;
  function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; }
  var svg = '<svg class="radar" viewBox="0 0 300 265" role="img" aria-label="Your weights compared with the closest standard profile">' + [0.33, 0.66, 1].map(function (v) { return '<polygon points="' + axes.map(function (_, i) { return pt(i, v).join(','); }).join(' ') + '" fill="none" stroke="var(--line)"/>'; }).join('') +
    axes.map(function (a, i) { var l = pt(i, 1.17); return '<text x="' + l[0] + '" y="' + l[1] + '" text-anchor="middle" dominant-baseline="middle">' + a[1] + '</text>'; }).join('') +
    '<polygon points="' + axes.map(function (a, i) { return pt(i, (best[a[0]] || 0) / mb).join(','); }).join(' ') + '" fill="none" stroke="var(--amber)" stroke-dasharray="5 5" stroke-width="2"/>' +
    '<polygon points="' + axes.map(function (a, i) { return pt(i, (w[a[0]] || 0) / mx).join(','); }).join(' ') + '" fill="color-mix(in srgb,var(--blue) 18%,transparent)" stroke="var(--blue)" stroke-width="2.4"/></svg>';
  var keys = Object.keys(w).filter(function (k, i, a) { return a.indexOf(k) === i && w[k] > 0; }).sort(function (a, b) { return w[b] - w[a]; });
  var allCats = ['affordability', 'tax', 'safety', 'family', 'health', 'jobs', 'mobility', 'commuter_access', 'student_access', 'lifestyle', 'environment', 'foundation', 'demographics', 'coast'];
  $('#bside').innerHTML = '<h3 style="font-size:var(--step-1)">My guided fit</h3><p class="small muted">' + esc(g.desc) + '</p>' + svg +
    '<div class="radar-legend"><span><i style="background:var(--blue)"></i>You</span>' + (matches[0] ? '<span><i style="background:var(--amber)"></i>' + esc(ENGINE.profiles[matches[0][0]].name) + '</span>' : '') + '</div>' +
    '<h3 style="font-size:var(--step-0);margin-top:12px">Closest standard profiles</h3><div class="pills">' + matches.map(function (m) { return '<button class="chip" type="button" data-usestd="' + m[0] + '">' + profileIcon(m[0]) + ' ' + esc(ENGINE.profiles[m[0]].name) + ' <b>' + Math.round(m[1] * 100) + '%</b></button>'; }).join('') + '</div>' +
    '<details style="margin-top:12px"' + (BWEIGHTS ? ' open' : '') + '><summary class="small" style="cursor:pointer;font-weight:650">Fine-tune weights</summary>' +
    allCats.map(function (k) { return '<div class="wsl"><label for="w-' + k + '">' + esc(shortCat(k)) + '</label><input id="w-' + k + '" type="range" min="0" max="50" value="' + (w[k] || 0) + '" data-w="' + k + '"><output>' + (w[k] || 0) + '</output></div>'; }).join('') + '</details>' +
    '<div class="pills" style="margin-top:10px">' + keys.slice(0, 6).map(function (k) { return '<span class="chip">' + esc(shortCat(k)) + ' <b>' + w[k] + '</b></span>'; }).join('') + '</div>' +
    '<div class="actions" style="margin-top:14px"><button class="btn btn-primary" type="button" data-bapply>Use this profile</button><button class="btn" type="button" data-breset>Reset</button></div>';
}
function builderClick(t) {
  var b;
  if ((b = t.closest('[data-bq]'))) { BSTATE[b.dataset.bq] = b.dataset.v; BWEIGHTS = null; renderBuilder(); return true; }
  if ((b = t.closest('[data-bx]'))) { BSTATE[b.dataset.bx] = !BSTATE[b.dataset.bx]; BWEIGHTS = null; renderBuilder(); return true; }
  if ((b = t.closest('[data-bt]'))) { var cc = b.dataset.bt, i = BSTATE.targets.indexOf(cc); if (i >= 0) { if (BSTATE.targets.length > 1) BSTATE.targets.splice(i, 1); } else BSTATE.targets.unshift(cc); renderBuilder(); return true; }
  if ((b = t.closest('[data-usestd]'))) { closeModal(); setProfile(b.dataset.usestd); return true; }
  if (t.closest('[data-breset]')) { BSTATE = JSON.parse(JSON.stringify(META.config.builder.defaults)); BSTATE.targets = [S.cc]; BWEIGHTS = null; renderBuilder(); return true; }
  if (t.closest('[data-bapply]')) {
    var g = builderProfile();
    S.custom = { name: 'My guided fit', desc: g.desc, intro: g.desc, weights: g.weights, strict: {}, minPop: g.minPop };
    S.builder = JSON.parse(JSON.stringify(BSTATE)); store('builder', S.builder); store('custom', S.custom);
    closeModal();
    var target = BSTATE.targets[0];
    S.profile = 'self_fit'; S.selected = null;
    S.lang = BSTATE.language && BSTATE.language !== 'flexible' ? BSTATE.language : '';
    if (target && target !== S.cc) { S.region = 'ALL'; S.area = 'ALL'; switchCountry(target); } else update({});
    return true;
  }
  return false;
}
function builderInput(t) {
  if (t.matches('[data-w]')) {
    var g = builderProfile(); BWEIGHTS = Object.assign({}, g.weights); BWEIGHTS[t.dataset.w] = +t.value; if (!+t.value) delete BWEIGHTS[t.dataset.w];
    t.nextElementSibling.textContent = t.value;
    clearTimeout(builderInput._t); builderInput._t = setTimeout(function () { var open = true; renderBuilderSide(); var d = $('#bside details'); if (d) d.open = open; var el = $('#w-' + t.dataset.w); if (el) el.focus(); }, 250);
    return true;
  }
  return false;
}
