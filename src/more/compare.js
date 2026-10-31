/* Compare side by side (part of the lazy module /assets/more.js since 2.7) */
function openCompare(ids) {
  ids = (ids || S.compare).slice(0, 3);
  Promise.all(ids.map(function (id) { return loadCountry(id.split(':')[0]).catch(function () { return null; }); })).then(function () {
    var list = ids.map(function (id) { return BYID[id]; }).filter(Boolean);
    if (list.length < 2) { toast('Tick at least two places', 'Tick Compare on two or three places, on the place itself or in your shortlist.', { label: 'Open shortlist', attr: 'data-lt="saved"' }); return; }
    var xs = list.map(function (r) { var x = RES && RES.byId[r.id]; return x || { r: r, id: r.id, catScores: ENGINE.categoriesFor(r, S.profile), overall: (ENGINE.scoreRaw(r, S.profile, 0, r.country) || {}).score }; });
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
    var w = ENGINE.weightsFor(xs[0].r, S.profile);
    var ck = Object.keys(w).filter(function (k) { return xs.some(function (x) { return fin(x.catScores[k]); }); }).sort(function (a, b) { return w[b] - w[a]; });
    var head = '<thead><tr><th></th>' + xs.map(function (x) {
      return '<th><div class="cmp-ph" data-photo="' + esc(x.id) + '" data-postcard="' + esc(x.id) + '" data-w="260" data-h="140"></div>' + flagImg(x.r.country) + ' <b>' + esc(x.r.name) + '</b><div class="small muted">' + esc(localAreaOf(x.r)) + ', ' + esc(countryName(x.r.country)) + '</div><div class="cmp-acts"><button class="btn btn-sm" type="button" data-goto="' + esc(x.id) + '">Open</button><button class="icon-btn sm" type="button" data-cmpdrop="' + esc(x.id) + '" aria-label="Remove ' + esc(x.r.name) + ' from compare">' + ICON.close + '</button></div></th>';
    }).join('') + '</tr></thead>';
    var body = '<tbody>' +
      '<tr class="grp"><th colspan="' + (xs.length + 1) + '">Fit for ' + esc(profileName(S.profile)) + '</th></tr>' +
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
      (allFar('coast', 150) ? '' : prow('coast', 'Sea', 'min', 'the sea')) + (allFar('lake', 40) ? '' : prow('lake', 'Large lake', 'min', 'lakes')) +
      '</tbody>';
    var verdict = (mixed ? '<p class="small cmp-note">These places are in different countries. Scores and category values are measured against each place\'s own country, so they are not compared here; distances, sizes and the setting are.</p>' : '') + '<div class="verdicts">' + xs.map(function (x, i) { var wl = wins[i].filter(function (v, j, a) { return a.indexOf(v) === j; }), tl = ties[i].filter(function (v, j, a) { return a.indexOf(v) === j && wl.indexOf(v) < 0; }); return '<div class="verdict"><b>' + esc(x.r.name) + '</b> ' + (wl.length ? 'wins on ' + esc(wl.slice(0, 5).join(', ')) + (tl.length ? '; ties on ' + esc(tl.slice(0, 3).join(', ')) : '') + '.' : tl.length ? 'ties on ' + esc(tl.slice(0, 3).join(', ')) + '.' : 'wins no single row, but check the details.') + '</div>'; }).join('') + '</div>';
    openModal('Compare places', verdict + '<div class="tablewrap"><table class="cmp">' + head + body + '</table></div>' + I.cmpAllHTML(list) + '<div class="actions" style="margin-top:12px"><button class="btn btn-sm" type="button" data-savecmp="' + esc(ids.join(',')) + '">♡ Save these places</button><button class="btn btn-sm" type="button" data-share-cmp="' + esc(ids.join(',')) + '">' + ICON.share + 'Share this comparison</button><button class="btn btn-sm" type="button" data-cmppdf="' + esc(ids.join(',')) + '">' + ICON.doc + 'PDF</button></div><p class="small muted" style="margin-top:12px">Green marks the best value in a row when the places differ. Scores use the ' + esc(profileName(S.profile)) + ' profile; places in other countries are scored with their own country\'s data depth.</p>');
    hydratePostcards($('#modal')); hydratePhotos($('#modal'));
  });
}

