/* Compare side by side (part of the lazy module /assets/more.js since 2.7) */
var NZ_COMPARE_REQUEST = 0, NZ_UPGRADE = null;
function loadUpgrade() {
  if (window.NZUpgrade) return Promise.resolve();
  return NZ_UPGRADE = NZ_UPGRADE || (window.NZ_BLOB ? window.NZ_BLOB('/assets/nzx.js') : Promise.resolve('/assets/nzx.js?v=__VERSION__')).then(function (u) { return new Promise(function (ok, bad) { var sc = document.createElement('script'); sc.src = u; sc.async = true; sc.onload = ok; sc.onerror = bad; document.head.appendChild(sc); }); }).catch(function (e) { NZ_UPGRADE = null; throw e; });
}
function openCompare(ids) {
  var nzRequest = ++NZ_COMPARE_REQUEST;
  var nzSnapshot = JSON.stringify([S.profile, S.cc, S.method, window.NZ && window.NZ.version, window.NZ_DATA_VERSION || null]);
  var nzProfile = S.profile;
  var nzCurrent = function () { return nzRequest === NZ_COMPARE_REQUEST && nzSnapshot === JSON.stringify([S.profile, S.cc, S.method, window.NZ && window.NZ.version, window.NZ_DATA_VERSION || null]); };
  ids = (ids || S.compare).slice(0, 3);
  Promise.all(ids.map(function (id) { return loadCountry(id.split(':')[0]).catch(function () { return null; }); })).then(function () {
    if (!nzCurrent()) return;
    var list = ids.map(function (id) { return BYID[id]; }).filter(Boolean);
    if (list.length < 2) { toast('Tick at least two places', 'Tick Compare on two or three places, on the place itself or in your shortlist.', { label: 'Open shortlist', attr: 'data-lt="saved"' }); return; }
    var xs = list.map(function (r) { var x = RES && RES.byId[r.id]; return x || { r: r, id: r.id, catScores: ENGINE.categoriesFor(r, nzProfile), overall: (ENGINE.scoreRaw(r, nzProfile, 0, r.country) || {}).score }; });
    var wins = xs.map(function () { return []; }), ties = xs.map(function () { return []; });
    var mixed = xs.some(function (x) { return x.r.country !== xs[0].r.country; });
    function row(label, vals, show, better, key, relative) {
      var shown = vals; if (relative) vals = vals.map(function (v) { return fin(v) ? Math.round(v) : v; });
      var nums = vals.filter(fin), best = null;
      if (relative && mixed) better = null;
      if (better && nums.length > 1 && Math.max.apply(null, nums) !== Math.min.apply(null, nums)) best = better === 'max' ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
      var nb = best == null ? 0 : vals.filter(function (v) { return v === best; }).length;
      if (best != null && key) vals.forEach(function (v, i) { if (v === best) (nb > 1 ? ties : wins)[i].push(key); });
      return '<tr><th scope="row">' + esc(label) + '</th>' + vals.map(function (v, i) { return '<td class="' + (best != null && v === best ? 'best' : '') + '">' + (show ? show(shown[i], i) : fin(shown[i]) ? fmt(shown[i]) : '–') + '</td>'; }).join('') + '</tr>';
    }
    function prow(k, label, better, key) { return row(label, xs.map(function (x) { return pval(x.r, k); }), function (v) { return esc(pfmt(k, v)); }, better, key); }
    var allFar = function (k, lim) { return xs.every(function (x) { var v = pval(x.r, k); return v == null || v > lim; }); };
    var w = ENGINE.weightsFor(xs[0].r, nzProfile);
    var ck = Object.keys(w).filter(function (k) { return xs.some(function (x) { return fin(x.catScores[k]); }); }).sort(function (a, b) { return w[b] - w[a]; });
    var head = '<thead><tr><th></th>' + xs.map(function (x) {
      return '<th><div class="cmp-ph" data-photo="' + esc(x.id) + '" data-postcard="' + esc(x.id) + '" data-w="260" data-h="140"></div>' + flagImg(x.r.country) + ' <b>' + esc(x.r.name) + '</b><div class="small muted">' + esc(localAreaOf(x.r)) + ', ' + esc(countryName(x.r.country)) + '</div><div class="cmp-acts"><button class="btn btn-sm" type="button" data-goto="' + esc(x.id) + '">Open</button><button class="icon-btn sm" type="button" data-cmpdrop="' + esc(x.id) + '" aria-label="Remove ' + esc(x.r.name) + ' from compare">' + ICON.close + '</button></div></th>';
    }).join('') + '</tr></thead>';
    var body = '<tbody>' +
      '<tr class="grp"><th colspan="' + (xs.length + 1) + '">Fit for ' + esc(profileName(nzProfile)) + '</th></tr>' +
      row('Score', xs.map(function (x) { return x.overall; }), function (v) { return fin(v) ? scoreBadge(v) : '–'; }, 'max', 'overall fit', true) +
      row('Rank', xs.map(function (x) { return x.rank ? '#' + x.rank : 'not ranked here'; }), function (v) { return esc(v); }) +
      row('Data depth', xs.map(function (x) { return depthKind(x.r.country)[1]; }), function (v) { return esc(v); }) +
      ck.map(function (k) { return row(shortCat(k) + ' (weight ' + w[k] + ')', xs.map(function (x) { return x.catScores[k]; }), function (v) { return fin(v) ? fmt(v) : '–'; }, 'max', shortCat(k).toLowerCase(), true); }).join('') +
      '<tr class="grp"><th colspan="' + (xs.length + 1) + '">People</th></tr>' +
      prow('pop', 'Residents') + prow('dens', 'Residents per km²') + prow('g5', 'Change in 5 years', 'max', 'growth') + prow('pop10', 'Residents within 10 km') +
      '<tr class="grp"><th colspan="' + (xs.length + 1) + '">Getting around</th></tr>' +
      prow('city', 'City of 100,000+', 'min', 'city access') + prow('air', 'Hub airport', 'min', 'flights') + prow('rail', 'Main railway line', 'min', 'rail') + prow('mway', 'Motorway', 'min') + prow('cap', 'Capital', 'min') +
      '<tr class="grp"><th colspan="' + (xs.length + 1) + '">Land and water</th></tr>' +
      row('Terrain', xs.map(function (x) { var t = terrainOf(x.r); return t ? t.name : '–'; }), function (v) { return esc(v); }) +
      prow('alt', 'Surrounding terrain height') +
      row('Climate', xs.map(function (x) { var c = climateOf(x.r); return c ? c.name : '–'; }), function (v) { return esc(v); }) +
      (allFar('coast', 150) && allFar('lake', 40) ? '' : row('Water (sea or large lake)', xs.map(function (x) { var a = pval(x.r, 'coast'), b = pval(x.r, 'lake'), v = [a, b].filter(fin); return v.length ? Math.min.apply(null, v) : null; }), function (v) { return esc(pfmt('coast', v)); }, 'min', 'water')) +   // 2.15: water shown once
      '</tbody>';
    var verdict = (mixed ? '<p class="small cmp-note">These places are in different countries. Scores and category values are measured against each place\'s own country, so they are not compared here; distances, sizes and the setting are.</p>' : '') + '<div class="verdicts">' + xs.map(function (x, i) { var wl = wins[i].filter(function (v, j, a) { return a.indexOf(v) === j; }), tl = ties[i].filter(function (v, j, a) { return a.indexOf(v) === j && wl.indexOf(v) < 0; }); return '<div class="verdict"><b>' + esc(x.r.name) + '</b> ' + (wl.length ? 'wins on ' + esc(wl.slice(0, 5).join(', ')) + (tl.length ? '; ties on ' + esc(tl.slice(0, 3).join(', ')) : '') + '.' : tl.length ? 'ties on ' + esc(tl.slice(0, 3).join(', ')) + '.' : 'wins no single row, but check the details.') + '</div>'; }).join('') + '</div>';
    var nzNotice = '<p class="nz-note" role="note"><b>General location information, no individual advice.</b> Fixed standard profiles; not tax, legal, financial, investment or immigration advice. <a href="/legal/#disclaimer">Limits</a></p>';
    openModal('Compare places', nzNotice + verdict + '<div class="tablewrap"><table class="cmp">' + head + body + '</table></div>' + I.cmpAllHTML(list) + '<div class="actions" style="margin-top:12px"><button class="btn btn-sm" type="button" data-savecmp="' + esc(ids.join(',')) + '">♡ Save these places</button><button class="btn btn-sm" type="button" data-share-cmp="' + esc(ids.join(',')) + '">' + ICON.share + 'Share this comparison</button><button class="btn btn-sm" type="button" data-cmppdf="' + esc(ids.join(',')) + '">' + ICON.doc + 'PDF</button><button class="btn btn-sm" type="button" data-cmp2nd>' + ICON.doc + 'Second-opinion file</button></div><section class="cmp-seas" id="cmp-seas"></section><p class="small muted" style="margin-top:12px">Green marks the best value in a row when the places differ. Scores use the ' + esc(profileName(nzProfile)) + ' profile; places in other countries are scored with their own country\'s data depth.</p>');
    hydratePostcards($('#modal')); hydratePhotos($('#modal'));
    // 2.15.1: seasons side by side (NASA POWER climatology, loaded only with external content on)
    var seas = $('#cmp-seas');
    if (seas && extOn()) { seas.innerHTML = '<h3 style="margin:16px 0 6px">Through the year</h3><div class="skeleton"><i></i></div>';
      Promise.all(xs.map(function (x) { return climateFor(x.r); })).then(function (cs) {
        if (!cs.some(Boolean)) { seas.innerHTML = ''; return; }
        var SE = [['Winter', [11, 0, 1]], ['Spring', [2, 3, 4]], ['Summer', [5, 6, 7]], ['Autumn', [8, 9, 10]]];
        var avg = function (a, ms) { return ms.reduce(function (t, m) { return t + a[m]; }, 0) / ms.length; };
        var cell = function (c, x, k) { if (!c) return '–'; var ms = k[1].map(function (m) { return x.r.lat < 0 ? (m + 6) % 12 : m; }); return Math.round(avg(c.hi, ms)) + '° / ' + Math.round(avg(c.lo, ms)) + '°'; };
        seas.innerHTML = '<h3 style="margin:16px 0 6px">Through the year</h3><div class="tablewrap"><table class="cmp-yr" style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Average day high / night low</th>' + xs.map(function (x) { return '<th>' + esc(x.r.name) + '</th>'; }).join('') + '</tr></thead><tbody>' + SE.map(function (k) { return '<tr><th scope="row">' + k[0] + '</th>' + xs.map(function (x, i) { return '<td>' + cell(cs[i], x, k) + '</td>'; }).join('') + '</tr>'; }).join('') + '<tr><th scope="row">Rain per year</th>' + xs.map(function (x, i) { return '<td>' + (cs[i] ? fmt(cs[i].year) + ' mm' : '–') + '</td>'; }).join('') + '</tr></tbody></table></div><p class="small muted">Winter means December to February in the north and June to August in the south. NASA POWER long-term climatology for the surrounding area.</p>';
      }); }
    // 2.15.1: second-opinion file. Everything behind this comparison in one file to send to an adviser or a friend
    var b2 = $('#modal [data-cmp2nd]'); if (b2) b2.addEventListener('click', function () {
      var F = {}; (META.factors || []).forEach(function (f) { F[f.id] = f; });
      var doc = { what: 'Nestlyzer second-opinion file: the scores and every measured value behind this comparison, with sources, so someone else can check them.', created: new Date().toISOString(), release: '__VERSION__', method: S.method, profile: profileName(nzProfile), check: 'Compare data files against https://nestlyzer.com/data/fingerprints.json (SHA-256).', disclaimer: 'General location information, not tax, legal, financial or immigration advice.',
        places: xs.map(function (x) { var r = x.r, v = r.factorRaw || {}; return { id: r.id, name: r.name, country: countryName(r.country), area: localAreaOf(r), score: fin(x.overall) ? Math.round(x.overall * 10) / 10 : null, rank: x.rank || null, categories: x.catScores, measures: Object.keys(v).filter(function (k) { return fin(v[k]); }).map(function (k) { var f = F[k] || {}, bc = (f.by_country || {})[r.country] || {}; return { measure: f.name || k, value: v[k], unit: f.unit || null, level: ['place', 'large region', 'region', 'district'][(r.factorLevel || {})[k] || 0] || 'place', period: bc.period || f.source_period || null, source: bc.source_name || f.source_name || null, url: bc.source_url || f.source_url || null }; }) }; }) };
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 1)], { type: 'application/json' })); a.download = 'nestlyzer-second-opinion-' + xs.map(function (x) { return x.r.name; }).join('-').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '.json'; document.body.appendChild(a); a.click(); a.remove();
    });
    // The native modal is reused by other tools. Do not mount into a different or closed modal.
    var nzModalRoot = $('#modal'), nzCompareTable = nzModalRoot.querySelector('table.cmp');
    var nzMountCurrent = function () { return nzCurrent() && nzModalRoot.classList.contains('open') && nzModalRoot.querySelector('table.cmp') === nzCompareTable; };
    // 2.14 (owner audit A1): the comparison upgrade (/assets/nzx.js) mounts here through an explicit host, because the
    // app's state lives inside its closure. A missing or failing upgrade leaves the native comparison as it is.
    var nzHost = { version: '__VERSION__', method: S.method, profile: nzProfile, profileName: profileName(nzProfile), methodURL: 'https://nestlyzer.com/method/',
      factors: ENGINE.factorById, weight: function (c) { return w[c] || 0; },
      overallOf: function (r) { var x = RES && RES.byId[r.id]; return x ? x.overall : (ENGINE.scoreRaw(r, nzProfile, 0, r.country) || {}).score; },
      ranked: function (n) { return ((RES && RES.scored) || []).slice(0, n).map(function (x) { return { r: x.r, overall: x.overall }; }); } };
    loadUpgrade().then(function () {
      if (!nzMountCurrent() || !window.NZUpgrade || typeof window.NZUpgrade.mountCompare !== 'function') return;
      try { window.NZUpgrade.mountCompare({ root: nzModalRoot, host: nzHost, ids: ids.slice(), profile: nzProfile, country: S.cc, modelVersion: S.method, releaseVersion: (window.NZ && window.NZ.version) || '__VERSION__', dataVersion: window.NZ_DATA_VERSION || null, nativeRows: list.slice(), isCurrent: nzMountCurrent }); }
      catch (e) { if (window.console) console.warn('Nestlyzer comparison upgrade unavailable.', e); }
    }, function () { /* offline or blocked: the native comparison stays complete */ });
  });
}

