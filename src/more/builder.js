/* Guided profile builder (part of the lazy module /assets/more.js; the app keeps small stubs in src/js/60-builder.js) (restored legacy questions + target countries, plus v2 extras and weight fine-tuning) */
var BSTATE = null, BWEIGHTS = null;
var BNOTE = '';
function openBuilder() {
  if (isBizKey(S.profile)) return openBusinessPriority();
  var B = META.config.builder;
  BSTATE = S.builder ? JSON.parse(JSON.stringify(S.builder)) : JSON.parse(JSON.stringify(B.defaults));
  BSTATE.targets = [S.cc].concat((BSTATE.targets || []).filter(function (c) { return c !== S.cc; }));
  // manual fine-tuning is kept separately from the answers and restored when the builder reopens (NZ-GLOBAL-043)
  BWEIGHTS = BSTATE.manual ? Object.assign({}, BSTATE.manual) : null; BNOTE = '';
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
  if (BSTATE.coast) bits.push('near the sea or a large lake');
  g.desc = 'Custom profile: ' + bits.join(', ') + '. Targets: ' + BSTATE.targets.map(countryName).join(', ') + '.';
  g.intro = g.desc;
  return g;
}
function renderBuilder() {
  var B = META.config.builder, G = B.groups;
  var qs = Object.keys(G).map(function (k) {
    return '<div class="q"><h3>' + esc(G[k].label) + '</h3><div class="seg" role="group" aria-label="' + esc(G[k].label) + '">' + G[k].choices.map(function (c) { return '<button type="button" data-bq="' + k + '" data-v="' + c[0] + '" aria-pressed="' + (BSTATE[k] === c[0]) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div></div>';
  }).join('');
  qs += '<div class="q"><h3>Also important</h3><div class="seg"><button type="button" data-bx="mobilityPlus" aria-pressed="' + !!BSTATE.mobilityPlus + '">Airport and big-city access</button><button type="button" data-bx="coast" aria-pressed="' + !!BSTATE.coast + '">Near the sea or a large lake</button></div></div>';
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
    (BNOTE ? '<p class="small" role="status" style="margin-top:10px;color:var(--amber,#b45309)">' + esc(BNOTE) + '</p>' : '') +
    '<details style="margin-top:12px"' + (BWEIGHTS ? ' open' : '') + '><summary class="small" style="cursor:pointer;font-weight:650">Fine-tune weights' + (BWEIGHTS ? ' (fine-tuned)' : '') + '</summary>' +
    allCats.map(function (k) { return '<div class="wsl"><label for="w-' + k + '">' + esc(shortCat(k)) + '</label><input id="w-' + k + '" type="range" min="0" max="50" value="' + (w[k] || 0) + '" data-w="' + k + '"><output>' + (w[k] || 0) + '</output></div>'; }).join('') + (BWEIGHTS ? '<button class="linkbtn small" type="button" data-bwreset>Use the weights from my answers again</button>' : '') + '</details>' +
    '<div class="pills" style="margin-top:10px">' + keys.slice(0, 6).map(function (k) { return '<span class="chip">' + esc(shortCat(k)) + ' <b>' + w[k] + '</b></span>'; }).join('') + '</div>' +
    '<div class="actions" style="margin-top:14px"><button class="btn btn-primary" type="button" data-bapply>Use this profile</button><button class="btn" type="button" data-breset>Reset</button></div>';
}
function answersChanged() {
  // a new answer recomputes the weights; if they had been fine-tuned, say so instead of dropping the edits silently
  if (BWEIGHTS) { BNOTE = 'Your answers changed, so the weights were recomputed and your fine-tuning was replaced.'; BWEIGHTS = null; delete BSTATE.manual; }
}
function builderClick(t) {
  if (quickClick(t)) return true;
  if (businessPriorityClick(t)) return true;
  var b;
  if ((b = t.closest('[data-bq]'))) { BSTATE[b.dataset.bq] = b.dataset.v; answersChanged(); renderBuilder(); return true; }
  if ((b = t.closest('[data-bx]'))) { BSTATE[b.dataset.bx] = !BSTATE[b.dataset.bx]; answersChanged(); renderBuilder(); return true; }
  if (t.closest('[data-bwreset]')) { BWEIGHTS = null; delete BSTATE.manual; BNOTE = 'Fine-tuned weights cleared; the weights follow your answers again.'; renderBuilderSide(); return true; }
  if ((b = t.closest('[data-bt]'))) { var cc = b.dataset.bt, i = BSTATE.targets.indexOf(cc); if (i >= 0) { if (BSTATE.targets.length > 1) BSTATE.targets.splice(i, 1); } else BSTATE.targets.unshift(cc); renderBuilder(); return true; }
  if ((b = t.closest('[data-usestd]'))) { closeModal(); setProfile(b.dataset.usestd); return true; }
  if (t.closest('[data-breset]')) { BSTATE = JSON.parse(JSON.stringify(META.config.builder.defaults)); BSTATE.targets = [S.cc]; BWEIGHTS = null; BNOTE = 'Answers and weights reset to the defaults.'; renderBuilder(); return true; }
  if (t.closest('[data-bapply]')) {
    var g = builderProfile();
    S.custom = { name: 'My guided fit', desc: g.desc, intro: g.desc, weights: g.weights, strict: {}, minPop: g.minPop };
    if (BWEIGHTS) BSTATE.manual = Object.assign({}, BWEIGHTS); else delete BSTATE.manual;
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
  if (businessPriorityInput(t)) return true;
  if (t.matches('[data-w]')) {
    var g = builderProfile(); BWEIGHTS = Object.assign({}, g.weights); BWEIGHTS[t.dataset.w] = +t.value; if (!+t.value) delete BWEIGHTS[t.dataset.w];
    t.nextElementSibling.textContent = t.value;
    clearTimeout(builderInput._t); builderInput._t = setTimeout(function () { var open = true; renderBuilderSide(); var d = $('#bside details'); if (d) d.open = open; var el = $('#w-' + t.dataset.w); if (el) el.focus(); }, 250);
    return true;
  }
  return false;
}

/* Business editor. No household questionnaire and no mutation of standard weights. */
var BUSINESS_DRAFT = null;
function openBusinessPriority() {
  var existing = S.profile === 'biz_custom_fit' ? S.businessScenario : null;
  var baseId = existing ? existing.baseProfile : S.profile;
  BUSINESS_DRAFT = window.NZBusinessPriority.create(ENGINE.profiles, baseId,
    existing ? existing.weights : ENGINE.profiles[baseId].weights);
  openModal('Business priorities', '<div id="nz-business-editor"></div>');
  renderBusinessPriority();
}
function renderBusinessPriority() {
  var host = $('#nz-business-editor'); if (!host || !BUSINESS_DRAFT) return;
  var d = BUSINESS_DRAFT, base = ENGINE.profiles[d.baseProfile], total = Object.values(d.weights).reduce(function(a,b){return a+b;},0);
  // 2.15.27: a clear, visual editor. Each priority shows its share of the whole as a percentage and a coloured segment
  // in one bar on top, so the effect of a slider is visible at once.
  var keys = Object.keys(base.weights), COL = ['#0f766e', '#d97706', '#2563eb', '#7c3aed', '#be123c', '#4d7c0f', '#0369a1', '#a16207', '#475569', '#c026d3'];
  host.innerHTML = '<p class="bpi">Based on <b>' + esc(base.name) + '</b>. Move a slider to say how much a need matters to you; the bar shows how your search is now split. Site requirements (permits, utilities) still apply.</p>' +
    '<div class="bpbar" aria-hidden="true">' + keys.map(function (k, i) { return '<i data-bpseg="' + esc(k) + '" style="background:' + COL[i % COL.length] + ';flex-grow:' + d.weights[k] + '"></i>'; }).join('') + '</div>' +
    keys.map(function (k, i) { var pc = total ? Math.round(d.weights[k] / total * 100) : 0; return '<div class="wsl" style="--c:' + COL[i % COL.length] + '"><label for="bp-' + esc(k) + '"><span class="dot"></span>' + esc(shortCat(k)) + '<small>' + esc(catLabel(k).replace(/^[^(]*\(?/, '').replace(/\)$/, '')) + '</small></label><input id="bp-' + esc(k) + '" type="range" min="0" max="100" step="1" data-bizweight="' + esc(k) + '" value="' + d.weights[k] + '" style="--p:' + d.weights[k] + '%"><output aria-label="Share of the search">' + pc + '%</output></div>'; }).join('') +
    '<p id="nz-biz-status" role="status" class="small muted">Your priorities are kept on this device, so they are here when you come back. Missing data stays missing; a higher priority adds no data.</p>' +
    '<div class="actions"><button type="button" class="btn btn-sun" data-bizapply>Use these priorities</button><button type="button" class="btn" data-bizreset>Reset to standard</button><button type="button" class="btn" data-bizshare>Copy scenario link</button></div>';
  if (!document.getElementById('bp-css')) { var st = document.createElement('style'); st.id = 'bp-css'; st.textContent =
    '#nz-business-editor .bpi{margin:0 0 12px;color:var(--ink-2)}#nz-business-editor .bpbar{display:flex;height:14px;border-radius:999px;overflow:hidden;margin:0 0 14px;background:var(--line)}#nz-business-editor .bpbar i{display:block;min-width:0;transition:flex-grow .2s ease}' +
    '#nz-business-editor .wsl{display:grid;grid-template-columns:minmax(0,1fr) minmax(110px,1.2fr) 3.2rem;align-items:center;gap:6px 12px;padding:8px 0;border-bottom:1px solid var(--line)}#nz-business-editor .wsl label{font-weight:650;line-height:1.25}#nz-business-editor .wsl label small{display:block;font-weight:400;color:var(--ink-3);font-size:12px;margin-top:1px}#nz-business-editor .dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--c);margin-right:7px;vertical-align:1px}' +
    '#nz-business-editor output{font:700 15px/1 var(--font-display);text-align:right;color:var(--c)}' +
    '#nz-business-editor input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:28px;background:transparent;cursor:pointer}#nz-business-editor input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:999px;background:linear-gradient(90deg,var(--c) var(--p),var(--line) var(--p))}#nz-business-editor input[type=range]::-moz-range-track{height:6px;border-radius:999px;background:linear-gradient(90deg,var(--c) var(--p),var(--line) var(--p))}' +
    '#nz-business-editor input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-8px;border-radius:50%;background:#fff;border:3px solid var(--c);box-shadow:0 1px 4px rgba(0,0,0,.25)}#nz-business-editor input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid var(--c)}#nz-business-editor input[type=range]:focus-visible{outline:2px solid var(--c);outline-offset:2px;border-radius:6px}' +
    '@media(max-width:600px){#nz-business-editor .wsl{grid-template-columns:1fr 3rem}#nz-business-editor .wsl input{grid-column:1/-1;grid-row:2}}';
    document.head.appendChild(st); }
}
function businessPriorityInput(t) {
  if (!t.matches('[data-bizweight]')) return false;
  if (!BUSINESS_DRAFT) return true;
  var k=t.dataset.bizweight,v=Number(t.value);
  if(!Object.prototype.hasOwnProperty.call(BUSINESS_DRAFT.weights,k)||!Number.isFinite(v)||v<0||v>100)return true;
  BUSINESS_DRAFT.weights[k]=v;t.style.setProperty('--p',v+'%');
  var sum=Object.values(BUSINESS_DRAFT.weights).reduce(function(a,b){return a+b;},0);
  $$('#nz-business-editor [data-bizweight]').forEach(function(x){var w=BUSINESS_DRAFT.weights[x.dataset.bizweight];x.nextElementSibling.textContent=(sum?Math.round(w/sum*100):0)+'%';var g=$('#nz-business-editor [data-bpseg="'+x.dataset.bizweight+'"]');if(g)g.style.flexGrow=w;});
  $('#nz-biz-status').textContent=sum>0?'Your priorities are kept on this device, so they are here when you come back.':'Choose at least one positive priority.';
  $('#nz-business-editor [data-bizapply]').disabled=sum<=0;
  $('#nz-business-editor [data-bizshare]').disabled=sum<=0;
  return true;
}
function businessPriorityClick(t) {
  var b=t.closest('[data-bizapply],[data-bizreset],[data-bizshare]');if(!b)return false;
  if(!BUSINESS_DRAFT)return true;
  if(b.hasAttribute('data-bizreset')){BUSINESS_DRAFT=window.NZBusinessPriority.create(ENGINE.profiles,BUSINESS_DRAFT.baseProfile,ENGINE.profiles[BUSINESS_DRAFT.baseProfile].weights);renderBusinessPriority();return true;}
  var clean;
  try{clean=window.NZBusinessPriority.create(ENGINE.profiles,BUSINESS_DRAFT.baseProfile,BUSINESS_DRAFT.weights);}catch(e){$('#nz-biz-status').textContent=e.message;return true;}
  if(b.hasAttribute('data-bizshare')){
    var params=new URLSearchParams({cc:S.cc,p:'biz_custom_fit',bp:window.NZBusinessPriority.encode(clean)});
    var url=location.origin+location.pathname+'#/explore?'+params.toString();
    var done=function(){$('#nz-biz-status').textContent='Scenario link copied. Standard profiles are unchanged.';};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done,function(){window.prompt('Copy scenario link',url);});else window.prompt('Copy scenario link',url);
    return true;
  }
  S.businessScenario=clean;ENGINE.profiles.biz_custom_fit=clean.profile;
  store('business-priority',window.NZBusinessPriority.encode(clean));
  S.profile='biz_custom_fit';S.gscope='';S.selected=null;S.listTab='ranking';
  if(window.innerWidth<900)S.tab='list';
  closeModal();update({push:true});return true;
}

/* r20: the five-question start. One question per screen (who, budget, daily anchor, getting around, setting), with a
   progress line and a back button; the answers fill the same guided profile as the full builder, which stays one tap away. */
var QSTEP = 0, QORDER = ['household', 'budget', 'anchor', 'mobility', 'climate'];
var QHELP = { household: 'Who is moving?', budget: 'How tight is the budget?', anchor: 'What should be close in daily life?', mobility: 'How do you get around?', climate: 'What kind of setting do you want?' };
function openQuickStart() {
  var B = META.config.builder;
  BSTATE = S.builder ? JSON.parse(JSON.stringify(S.builder)) : JSON.parse(JSON.stringify(B.defaults));
  BSTATE.targets = [S.cc].concat((BSTATE.targets || []).filter(function (c) { return c !== S.cc; }));
  BWEIGHTS = null; QSTEP = 0;
  openModal('Five questions to your places', '<div class="qs" id="qs"></div>');
  renderQuick();
}
function renderQuick() {
  var G = META.config.builder.groups, k = QORDER[QSTEP], box = $('#qs'); if (!box) return;
  if (QSTEP >= QORDER.length) {
    var g = builderProfile();
    box.innerHTML = '<p class="qs-step">Done</p><h3 class="qs-q">Your priorities</h3><p>' + esc(g.desc.replace(/^Custom profile: /, '').replace(/\. Targets:.*$/, '.')) + '</p><p class="small muted">These answers set your own profile. You can change any answer or fine-tune the weights later in the full builder.</p><div class="qs-nav"><button type="button" class="btn" data-qs-back>Back</button><button type="button" class="btn btn-primary" data-bapply>Show my places in ' + esc(countryName(BSTATE.targets[0] || S.cc)) + '</button></div>';
    return;
  }
  box.innerHTML = '<p class="qs-step">Question ' + (QSTEP + 1) + ' of ' + QORDER.length + '</p><div class="qs-bar" aria-hidden="true"><i style="width:' + Math.round(100 * QSTEP / QORDER.length) + '%"></i></div><h3 class="qs-q">' + esc(QHELP[k] || G[k].label) + '</h3><div class="qs-opts" role="group" aria-label="' + esc(G[k].label) + '">' + G[k].choices.map(function (c) { return '<button type="button" class="qs-opt" data-qs="' + k + '" data-v="' + c[0] + '" aria-pressed="' + (BSTATE[k] === c[0]) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div><div class="qs-nav">' + (QSTEP ? '<button type="button" class="btn" data-qs-back>Back</button>' : '<span></span>') + '<button type="button" class="btn" data-qs-skip>Keep "' + esc((G[k].choices.find(function (c) { return c[0] === BSTATE[k]; }) || [0, ''])[1]) + '" and continue</button></div>';
  var f = box.querySelector('[aria-pressed="true"]') || box.querySelector('.qs-opt'); if (f) f.focus();
}
function quickClick(t) {
  var b;
  if ((b = t.closest('[data-qs]'))) { BSTATE[b.dataset.qs] = b.dataset.v; QSTEP++; renderQuick(); return true; }
  if (t.closest('[data-qs-skip]')) { QSTEP++; renderQuick(); return true; }
  if (t.closest('[data-qs-back]')) { QSTEP = Math.max(0, QSTEP - 1); renderQuick(); return true; }
  return false;
}
