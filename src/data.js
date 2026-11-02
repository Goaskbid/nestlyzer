/* Shard decoding: turns a compact data/c/{CC}.json shard into record objects. Browser + Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NestData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var GR = { 'α': 'a', 'ά': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'έ': 'e', 'ζ': 'z', 'η': 'i', 'ή': 'i', 'θ': 'th', 'ι': 'i', 'ί': 'i', 'ϊ': 'i', 'ΐ': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'ό': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y', 'ύ': 'y', 'ϋ': 'y', 'ΰ': 'y', 'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o', 'ώ': 'o' };
  var CY = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'ѓ': 'gj', 'д': 'd', 'ђ': 'dj', 'е': 'e', 'ж': 'zh', 'з': 'z', 'ѕ': 'dz', 'и': 'i', 'й': 'y', 'ј': 'j', 'к': 'k', 'ќ': 'kj', 'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ћ': 'c', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'џ': 'dzh', 'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': 'y', 'ю': 'yu', 'я': 'ya' };
  for (var ck in CY) GR[ck] = CY[ck];
  function translit(s) { s = String(s || ''); if (!/[\u0370-\u03ff\u0400-\u04ff]/.test(s)) return s; var out = ''; var low = s.toLowerCase(); for (var i = 0; i < low.length; i++) { var c = low[i]; var t = GR[c]; if (t === undefined) t = c; if (i === 0 || /[\s\-(]/.test(low[i - 1])) t = t.charAt(0).toUpperCase() + t.slice(1); out += t; } return out; }
  var DE_SUFFIX = /,\s*(Stadt|M|St|Flecken|Marktflecken|Marktgemeinde|GKSt|Hansestadt|Kreisstadt|Ostseebad|Seebad|Ostseeheilbad|Kurort|Universitätsstadt|Hochschulstadt|Landeshauptstadt|Lutherstadt|Kirchspiel|Nationalparkgemeinde|Nationalparkstadt|[A-ZÄÖÜ][\wäöüß.-]*-?Stadt|[A-ZÄÖÜ][\wäöüß]*stadt)$/;
  // Greek communities are published in the genitive ("of Athens"); the big ones read better in the nominative
  var EL_NOM = { 'Αθηναίων': 'Αθήνα', 'Θεσσαλονίκης': 'Θεσσαλονίκη', 'Πατρέων': 'Πάτρα', 'Ηρακλείου': 'Ηράκλειο', 'Λαρισαίων': 'Λάρισα', 'Βόλου': 'Βόλος', 'Πειραιώς': 'Πειραιάς', 'Ιωαννιτών': 'Ιωάννινα', 'Χανίων': 'Χανιά', 'Ρόδου': 'Ρόδος', 'Καλαμάτας': 'Καλαμάτα', 'Κομοτηνής': 'Κομοτηνή', 'Σερρών': 'Σέρρες', 'Δράμας': 'Δράμα', 'Καβάλας': 'Καβάλα', 'Αλεξανδρουπόλεως': 'Αλεξανδρούπολη', 'Κατερίνης': 'Κατερίνη', 'Τρικκαίων': 'Τρίκαλα', 'Λαμιέων': 'Λαμία', 'Χαλκιδέων': 'Χαλκίδα', 'Αγρινίου': 'Αγρίνιο', 'Ξάνθης': 'Ξάνθη', 'Περιστερίου': 'Περιστέρι', 'Καλλιθέας': 'Καλλιθέα', 'Γλυφάδας': 'Γλυφάδα', 'Κερκυραίων': 'Κέρκυρα', 'Ρεθύμνης': 'Ρέθυμνο', 'Ναυπλιέων': 'Ναύπλιο', 'Κοζάνης': 'Κοζάνη', 'Βεροίας': 'Βέροια' };
  function cleanName(name, cc) {
    var n = String(name || '');
    if (cc === 'DE') { if (/,\s*(gemfr|gemeindefrei)/.test(n)) n = n.split(',')[0] + ' (unincorporated area)'; else n = n.replace(DE_SUFFIX, '').split(', ')[0]; }
    if (cc === 'EL') { n = n.replace(/^(Ψευδοδημοτική |Δημοτική |Τοπική )?Κοινότητα /, ''); if (EL_NOM[n]) n = EL_NOM[n]; }
    // some national lists are in capitals (Albania): DROPULL -> Dropull
    if (/^[A-ZÀ-ÞĀ-Ž\s\-'.]{4,}$/.test(n) && /[A-ZÀ-ÞĀ-Ž]{3}/.test(n)) n = n.toLowerCase().replace(/(^|[\s\-'(])([a-zà-þā-ž])/g, function (m, a, b) { return a + b.toUpperCase(); });
    return n;
  }
  var RG_ORDER = ['n3', 'n2', 'rc', 'n1', 'cc'], RG_LVL = { n3: 3, n2: 2, rc: 2, n1: 1, cc: 9 };
  function hydrate(sh) {
    var C = {}; sh.cols.forEach(function (c, i) { C[c] = i; });
    var fsKeys = Object.keys(sh.fs || {}), frKeys = Object.keys(sh.fr || {}), flKeys = Object.keys(sh.fl || {}), rgKeys = Object.keys(sh.rg || {});
    var fb = sh.rawFallback || {}, strs = sh.strs || [];
    var out = new Array(sh.rows.length);
    for (var i = 0; i < sh.rows.length; i++) {
      var row = sh.rows[i];
      var fs = {}, fr = {}, geoN = 0, k, v;
      for (var a = 0; a < fsKeys.length; a++) { k = fsKeys[a]; v = sh.fs[k][i]; if (v != null) { fs[k] = v; if (k.slice(0, 4) === 'geo_') geoN++; } }
      for (var b = 0; b < frKeys.length; b++) { k = frKeys[b]; v = sh.fr[k][i]; if (v != null) fr[k] = v; }
      var fl = null; for (var c2 = 0; c2 < flKeys.length; c2++) { k = flKeys[c2]; v = sh.fl[k][i]; if (typeof v === 'string') v = v === '0' ? null : +v; if (v != null) (fl = fl || {})[k] = v; }
      // regional figures (stored once per region): district (n3), region (n2 or the region code), large region (n1), country
      if (rgKeys.length) {
        var n3 = row[C.n3] || '', codes = { n3: n3, n2: n3.slice(0, 4), rc: row[C.rc], n1: n3.slice(0, 3), cc: sh.cc };
        for (var g2 = 0; g2 < rgKeys.length; g2++) {
          k = rgKeys[g2]; if (fr[k] != null) continue;
          var tb = sh.rg[k];
          for (var l2 = 0; l2 < RG_ORDER.length; l2++) {
            var t2 = tb[RG_ORDER[l2]], e = t2 && t2[codes[RG_ORDER[l2]]];
            if (e) { fr[k] = e[0]; if (e[1] != null) fs[k] = e[1]; (fl = fl || {})[k] = RG_LVL[RG_ORDER[l2]]; break; }
          }
        }
      }
      // area figures stored once per county (sh.cl, 2.11.1): the place takes its county's values, marked as a district figure
      if (sh.cl && sh.cly && sh.cly[i]) { var ca = sh.cl.areas[sh.cly[i]]; if (ca) for (var q = 0; q < sh.cl.ids.length; q++) if (ca[q]) { fr[sh.cl.ids[q]] = ca[q][0]; fs[sh.cl.ids[q]] = ca[q][1]; (fl = fl || {})[sh.cl.ids[q]] = 3; } }
      var r = {
        id: sh.cc + ':' + row[C.oid], oid: row[C.oid], official_id: row[C.oid], country: sh.cc, countryName: sh.name,
        name: cleanName(row[C.name], sh.cc), officialName: row[C.name], latin: /[\u0370-\u03ff\u0400-\u04ff]/.test(row[C.name]) ? translit(cleanName(row[C.name], sh.cc)) : '', rc: row[C.rc], n3: row[C.n3] || '', n2: (row[C.n3] || '').slice(0, 4), n1: (row[C.n3] || '').slice(0, 3),
        population: row[C.pop], area_km2: row[C.area], density: row[C.dens], lat: row[C.lat], lon: row[C.lon],
        sourceConfidence: row[C.conf] == null ? 62 : row[C.conf], availableFactorCount: row[C.nf], dataReadiness: row[C.ready],
        locMethod: row[C.loc], gisco: row[C.gisco] || (sh.cc + '_' + row[C.oid]),
        region: strs[row[C.regionName]] || '', factorScores: fs, factorRaw: fr, factorLevel: fl, geoFactorCount: geoN, superseded: !!(C.sup != null && row[C.sup])
      };
      for (k in fb) if (fs[k] != null && fr[k] == null) fr[k] = r[fb[k] === 'pop' ? 'population' : 'density'];
      var g = row[C.geoNames];
      if (g) r.geo = { hubAirport: strs[g[0]], airport: strs[g[1]], commuterAnchor: strs[g[2]], studentAnchor: strs[g[3]] };
      if (sh.cc === 'CH') { r.canton = row[C.rc]; r.cantonName = (sh.cantonName || {})[r.canton] || r.canton; r.region_code = r.canton; if (sh.trend) r.trend = sh.trend[i]; }
      else r.region_code = row[C.rc];
      var ap = r.trend && r.trend.annual_population, lastp = ap && ap[ap.length - 1];
      r.popNow = lastp ? lastp.population : r.population; r.popYear = lastp ? lastp.year : null;
      // 2.13.2: the Swiss core population now is the latest year of its own series (build/refresh_ch_population.py),
      // so the displayed and the scored population are the same observation; no display-only override any more
      out[i] = r;
    }
    return out;
  }
  return { hydrate: hydrate, cleanName: cleanName, translit: translit };
});
