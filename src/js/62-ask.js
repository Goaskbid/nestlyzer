/* r20: Ask in plain words. "quiet lake town for retirees in Switzerland under 10,000" becomes a profile, a country and the
   app's existing filters (size, lake, sea, mountains, railway, motorway, airport, border, climate), shown as one suggestion
   at the top of the search list. Runs in the browser on fixed rules: nothing is sent anywhere, no guessing beyond the
   words typed, and every part of the reading is shown before it is applied. */
var ASK_PROFILES = [
  [/\bsingle (mum|mom|dad|parent|mother|father)s?\b|\bsingle[- ]parent|\blone parent/, 'single_parent'], [/\b(famil(y|ies)|kids?|children|child|toddlers?|baby)\b/, 'young_family'],
  [/\b(retire(e|es|d|ment)?|pension(er|ers)?|seniors?|old age)\b/, 'pensioner'], [/\bstudents?|stud(y|ying)|universit(y|ies)\b/, 'student'],
  [/\b(remote|home ?office|work from home|wfh|digital nomad)\b/, 'remote'], [/\bcommut(e|er|ing)\b/, 'commuter'],
  [/\b(expats?|international)\b/, 'expat_professional'], [/\b(cheap|budget|afford(able)?|low cost)\b/, 'budget'],
  [/\b(nature|hiking|outdoors?|forest)\b/, 'nature'], [/\b(car[- ]?free|without (a )?car|no car)\b/, 'car_free'],
  [/\b(young professionals?|career|first job)\b/, 'young_professional'], [/\b(health|doctors?|hospitals?|medical)\b/, 'healthcare_first']
];
function askNum(s) { var m = /(\d[\d,.' ]*)\s*(k|000)?/.exec(s); if (!m) return 0; var n = parseFloat(m[1].replace(/[,.' ](?=\d{3}\b)/g, '').replace(',', '.')); if (m[2] === 'k') n *= 1000; return Math.round(n); }
/* r21 (NZ11-09): a clause is applied only when it is unambiguous. Negated wishes ("away from an airport", "no hot
   summers") and numbers that are money or age ("rent under 2000 CHF", "under 65") are shown as not applied, never
   turned into the opposite filter or into a town size */
var ASK_NEG = /\b(no|not|without|away from|far from|avoid(ing)?|never|free of|nowhere near|no nearby)\s+(?:\w+\s+){0,3}$/;
function askNeg(q, re) { var m = re.exec(q); if (!m) return 0; return ASK_NEG.test(q.slice(Math.max(0, m.index - 40), m.index)) ? -1 : 1; }
var ASK_MONEY = /\b(chf|eur|euros?|usd|gbp|francs?|dollars?|pounds?|rent|price|prices|cost|costs|budget|salary|income|per month|a month|monthly)\b|[€$£]/;
var ASK_AGE = /\b(age|aged|years?|yrs|old|retiree|retirees|pensioners?|seniors?|kids?|children)\b/;
var ASK_POPW = /\b(residents|people|inhabitants|population|pop|souls)\b/;
function askPop(q, re) {
  var m = re.exec(q); if (!m) return null;
  var near = q.slice(Math.max(0, m.index - 24), m.index + m[0].length + 24), num = askNum(m[3]);
  if (ASK_POPW.test(near)) return { n: num };
  if (ASK_MONEY.test(near)) return { skip: m[0].trim() + ' (money is not a filter here)' };
  if (num < 300 && (num <= 120 || ASK_AGE.test(near))) return { skip: m[0].trim() + ' (read as an age, not a town size)' };
  return { n: num };
}
function parseAsk(q0) {
  var q = ' ' + fold(q0).replace(/[–—]/g, ' ') + ' ', out = { f: {}, parts: [] }, n = 0;
  if (q.trim().split(/\s+/).length < 3) return null;
  for (var i = 0; i < ASK_PROFILES.length; i++) if (ASK_PROFILES[i][0].test(q)) { out.profile = ASK_PROFILES[i][1]; out.parts.push(profileName(out.profile)); n++; break; }
  META.countries.forEach(function (c) { if (!out.cc && new RegExp('\\b' + fold(c.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(q)) out.cc = c.cc; });
  if (out.cc) { out.parts.push('in ' + countryName(out.cc)); n++; }
  var m;
  var skip = [], pm;
  if ((pm = askPop(q, /\b(under|below|less than|fewer than|max(imum)?|up to)\s+([\d][\d,.' ]*k?)/))) { if (pm.skip) skip.push(pm.skip); else out.f.popMax = pm.n; }
  if ((pm = askPop(q, /\b(over|above|more than|at least|min(imum)?)\s+([\d][\d,.' ]*k?)/))) { if (pm.skip) skip.push(pm.skip); else out.f.popMin = pm.n; }
  if (!out.f.popMax && /\b(village|tiny|very small|hamlet)\b/.test(q)) out.f.popMax = 3000;
  else if (!out.f.popMax && /\b(small town|quiet|small)\b/.test(q)) out.f.popMax = 15000;
  if (!out.f.popMin && /\b(big city|large city|metropolis|cities|city)\b/.test(q) && !/\bnear (a )?(big )?city\b/.test(q)) out.f.popMin = 50000;
  else if (!out.f.popMin && /\btowns?\b/.test(q) && !out.f.popMax) { out.f.popMin = 5000; out.f.popMax = 60000; }
  if (out.f.popMax && out.f.popMin) { out.parts.push(fmtInt(out.f.popMin) + ' to ' + fmtInt(out.f.popMax) + ' residents'); n++; }
  else if (out.f.popMax) { out.parts.push('under ' + fmtInt(out.f.popMax) + ' residents'); n++; }
  else if (out.f.popMin) { out.parts.push('at least ' + fmtInt(out.f.popMin) + ' residents'); n++; }
  if (askNeg(q, /\b(lake|lakeside|lakefront|on the lake)\b/) < 0) skip.push('away from lakes (distance limits work only as a maximum)');
  else if (/\b(lake|lakeside|lakefront|on the lake)\b/.test(q)) { out.f.lakeKm = /\b(near|close to)\b/.test(q) ? 10 : 3; out.parts.push('large lake within ' + out.f.lakeKm + ' km'); n++; }
  if (askNeg(q, /\b(sea|coast(al)?|beach|seaside|ocean)\b/) < 0) skip.push('away from the sea (distance limits work only as a maximum)');
  else if (/\b(sea|coast(al)?|beach|seaside|ocean)\b/.test(q)) { out.f.coastKm = 10; out.parts.push('sea within 10 km'); n++; }
  if (askNeg(q, /\b(train|trains|railway|rail)\b/) < 0) skip.push('away from railways (distance limits work only as a maximum)');
  else if (/\b(train|trains|railway|rail)\b/.test(q)) { out.f.railKm = 3; out.parts.push('railway line within 3 km'); n++; }
  if (askNeg(q, /\b(motorway|highway|autobahn|freeway)s?\b/) < 0) skip.push('away from motorways (distance limits work only as a maximum)');
  else if (/\b(motorway|highway|autobahn|freeway)s?\b/.test(q)) { out.f.mwayKm = 10; out.parts.push('motorway within 10 km'); n++; }
  if (askNeg(q, /\b(airport|airports|flights?|fly)\b/) < 0) skip.push('away from airports (distance limits work only as a maximum)');
  else if (/\b(airport|airports|flights?|fly)\b/.test(q)) { out.f.airportKm = 40; out.parts.push('airport within 40 km'); n++; }
  if (askNeg(q, /\b(border|cross[- ]border|frontier)\b/) < 0) skip.push('away from borders (distance limits work only as a maximum)');
  else if (/\b(border|cross[- ]border|frontier)\b/.test(q)) { out.f.borderKm = 20; out.parts.push('border within 20 km'); n++; }
  if (/\bnear (a )?(big |major )?city\b|\bclose to (a )?(big )?city\b|\bsuburb/.test(q)) { out.f.cityKm = 30; out.parts.push('big city within 30 km'); n++; }
  if (/\b(alps|alpine|high mountains?)\b/.test(q)) { out.terrain = 'alpine'; out.parts.push('high mountains'); n++; }
  else if (/\b(mountains?|mountainous)\b/.test(q)) { out.terrain = 'mountains'; out.parts.push('mountainous'); n++; }
  else if (/\b(hills?|hilly)\b/.test(q)) { out.terrain = 'hills'; out.parts.push('hilly'); n++; }
  else if (/\bflat\b/.test(q)) { out.terrain = 'flat'; out.parts.push('flat'); n++; }
  if (askNeg(q, /\b(warm|sunny|mediterranean|hot summers?|heat)\b/) < 0) skip.push('no hot summers (choose a climate type under Filters)');
  else if (/\b(warm|sunny|mediterranean|hot summers?)\b/.test(q)) { out.climate = 'med'; out.parts.push('Mediterranean climate'); n++; }
  else if (/\b(mild)\b/.test(q)) { out.climate = 'mild'; out.parts.push('mild, oceanic climate'); n++; }
  else if (/\b(snow|cold winters?|winter sports?|skiing)\b/.test(q)) { out.climate = 'cold'; out.parts.push('cold-winter climate'); n++; }
  if (skip.length) out.skipped = skip;
  return n >= 2 ? out : null;
}
function askItemHTML(a) {
  return '<li class="ask"><button type="button" class="askbtn" data-ask=\'' + esc(JSON.stringify(a)).replace(/'/g, '&#39;') + '\' aria-selected="true"><span><b>Show places:</b> ' + esc(a.parts.join(' · ')) + '</span>' + (a.skipped ? '<span class="small askskip">Not applied: ' + esc(a.skipped.join('; ')) + '</span>' : '') + '<span class="muted small askhint">Read from your words. Enter shows them; every filter can be changed afterwards.</span></button></li>';
}
function applyAsk(raw) {
  var a; try { a = JSON.parse(raw); } catch (e) { return; }
  closePalette(); enterExplore();
  var go = function () {
    FKEYS.forEach(function (k) { S.f[k] = 0; }); Object.keys(a.f || {}).forEach(function (k) { if (k in S.f) S.f[k] = a.f[k]; });
    S.terrain = a.terrain || ''; S.climate = a.climate || ''; if (a.profile) S.profile = a.profile;
    S.region = 'ALL'; S.area = 'ALL'; S.selected = null; S.tab = 'map';
    update({ push: true }); if (typeof updateFilterCount === 'function') updateFilterCount();
    toast('Your search, as read', a.parts.join(' · ') + '.' + (a.skipped ? ' Not applied: ' + a.skipped.join('; ') + '.' : '') + ' Change any of it under Filters.');
  };
  if (a.cc && a.cc !== S.cc) { S.cc = a.cc; switchCountry(a.cc).then(go); } else go();
}
