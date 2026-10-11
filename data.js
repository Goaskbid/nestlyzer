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
  function hydrate(sh) {
    var C = {}; sh.cols.forEach(function (c, i) { C[c] = i; });
    var fsKeys = Object.keys(sh.fs || {}), frKeys = Object.keys(sh.fr || {});
    var fb = sh.rawFallback || {}, strs = sh.strs || [];
    var out = new Array(sh.rows.length);
    for (var i = 0; i < sh.rows.length; i++) {
      var row = sh.rows[i];
      var fs = {}, fr = {}, geoN = 0, k, v;
      for (var a = 0; a < fsKeys.length; a++) { k = fsKeys[a]; v = sh.fs[k][i]; if (v != null) { fs[k] = v; if (k.slice(0, 4) === 'geo_') geoN++; } }
      for (var b = 0; b < frKeys.length; b++) { k = frKeys[b]; v = sh.fr[k][i]; if (v != null) fr[k] = v; }
      var r = {
        id: sh.cc + ':' + row[C.oid], oid: row[C.oid], official_id: row[C.oid], country: sh.cc, countryName: sh.name,
        name: cleanName(row[C.name], sh.cc), officialName: row[C.name], latin: /[\u0370-\u03ff\u0400-\u04ff]/.test(row[C.name]) ? translit(cleanName(row[C.name], sh.cc)) : '', rc: row[C.rc], n3: row[C.n3] || '', n2: (row[C.n3] || '').slice(0, 4), n1: (row[C.n3] || '').slice(0, 3),
        population: row[C.pop], area_km2: row[C.area], density: row[C.dens], lat: row[C.lat], lon: row[C.lon],
        sourceConfidence: row[C.conf] == null ? 62 : row[C.conf], availableFactorCount: row[C.nf], dataReadiness: row[C.ready],
        locMethod: row[C.loc], gisco: row[C.gisco] || (sh.cc + '_' + row[C.oid]),
        region: strs[row[C.regionName]] || '', factorScores: fs, factorRaw: fr, geoFactorCount: geoN, superseded: !!(C.sup != null && row[C.sup])
      };
      for (k in fb) if (fs[k] != null && fr[k] == null) fr[k] = r[fb[k] === 'pop' ? 'population' : 'density'];
      var g = row[C.geoNames];
      if (g) r.geo = { hubAirport: strs[g[0]], airport: strs[g[1]], commuterAnchor: strs[g[2]], studentAnchor: strs[g[3]] };
      if (sh.cc === 'CH') { r.canton = row[C.rc]; r.cantonName = (sh.cantonName || {})[r.canton] || r.canton; r.region_code = r.canton; if (sh.trend) r.trend = sh.trend[i]; }
      else r.region_code = row[C.rc];
      var ap = r.trend && r.trend.annual_population, lastp = ap && ap[ap.length - 1];
      r.popNow = lastp ? lastp.population : r.population; r.popYear = lastp ? lastp.year : null;
      out[i] = r;
    }
    return out;
  }
  return { hydrate: hydrate, cleanName: cleanName, translit: translit };
});
