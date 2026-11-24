/* r19: the place portrait, rewritten to read like a person who studied the figures, not like a template.
   Four to five short paragraphs (roughly 900 to 1,700 characters) in a varied order: size and where it stands in its
   country, the ground it sits on and the water around it, its neighbours and distances, how its population moved, and
   who it suits. Every sentence comes from a figure on the page or a comparison computed from the same national data
   (share of places that are smaller, denser, higher). Climate glosses restate the Köppen class definitions, nothing more.
   No claim about services, prices, travel times, migration or weather that the inputs do not hold. */
const h = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
const pick = (seed, slot, arr) => arr[h(seed + '|' + slot) % arr.length];
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => (v[k] == null ? '' : String(v[k])));
const n0 = (x) => Math.round(x).toLocaleString('en-US');
const n1 = (x) => (Math.round(x * 10) / 10).toLocaleString('en-US');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fin = (x) => typeof x === 'number' && Number.isFinite(x);
const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const sea = (v) => String(v.sea || 'sea').replace(/^The /, '');

/* Köppen-Geiger classes: what the class means by definition (thresholds of the classification), not a forecast */
const KG = {
  Cfb: ['oceanic', 'no dry season, a warmest month below 22 °C and a coldest month above freezing on average'],
  Cfa: ['humid subtropical', 'no dry season, hot summers (warmest month above 22 °C) and a coldest month above freezing on average'],
  Cfc: ['subpolar oceanic', 'cool summers with fewer than four months above 10 °C and a coldest month around freezing'],
  Csa: ['Mediterranean with hot summers', 'dry summers, a warmest month above 22 °C and most rain in the cool season'],
  Csb: ['Mediterranean with warm summers', 'dry summers that stay below 22 °C on average and most rain in the cool season'],
  Dfa: ['continental with hot summers', 'a coldest month below freezing and a warmest month above 22 °C, with no dry season'],
  Dfb: ['continental with warm summers', 'a coldest month below freezing and summers that average under 22 °C'],
  Dfc: ['subarctic', 'long, cold winters and only one to three months averaging above 10 °C'],
  Dsb: ['continental with dry, warm summers', 'cold winters and a dry summer season'],
  BSk: ['cold semi-arid', 'little rain and a mean annual temperature below 18 °C'],
  BSh: ['hot semi-arid', 'little rain and a mean annual temperature above 18 °C'],
  BWh: ['hot desert', 'very little rain and high average temperatures'],
  BWk: ['cold desert', 'very little rain and a mean annual temperature below 18 °C'],
  ET: ['alpine tundra', 'no month averaging above 10 °C'],
};

function sizePara(s, v) {
  const out = [], p = v.pop;
  if (fin(v.sizeRank) && v.sizeRank <= 3 && v.nC >= 20) {
    out.push(pick(s, 'sz1', [
      '{name} is the ' + (v.sizeRank === 1 ? 'largest' : v.sizeRank === 2 ? 'second-largest' : 'third-largest') + ' of the {nC} places Nestlyzer covers in {cname}, with {pop} residents.',
      'With {pop} residents, {name} ranks ' + ['', 'first', 'second', 'third'][v.sizeRank] + ' by size among the {nC} places in {cname}.',
    ]));
  } else if (fin(v.sizePct) && v.nC >= 20) {
    const big = v.sizePct >= 50;
    out.push(pick(s, 'sz', big ? [
      '{name} has {pop} residents, which makes it bigger than {sizePct}% of the {nC} places Nestlyzer covers in {cname}.',
      'Of the {nC} places in {cname} on Nestlyzer, {sizePct}% have fewer residents than {name}, which counts {pop}.',
      'With {pop} residents, {name} sits in the top {sizeTop}% of {cname} by headcount.',
      '{pop} people live in {name}. Line up all {nC} places in {cname} by size and it lands in {sizeOrd} place.',
    ] : [
      '{name} has {pop} residents, fewer than {sizeBig}% of the {nC} places Nestlyzer covers in {cname}.',
      'With {pop} residents, {name} is on the small side for {cname}: {sizeBig}% of its places are bigger.',
      '{pop} people live in {name}. In a country of {nC} places on our map, that is a smaller-than-usual headcount: only {sizePct}% are smaller.',
      'Count the residents and {name} comes to {pop}. That puts it in the smaller half of {cname}, behind {sizeBig}% of places.',
    ]));
  } else out.push(pick(s, 'sz0', ['{name} has {pop} residents.', '{pop} people live in {name}.', 'The headcount in {name} is {pop}.']));
  // a picture for the number, from the number alone
  out.push(pick(s, 'pic', p < 1200 ? ['Everyone would fit into one large concert hall.', ''] :
    p < 6000 ? ['Everyone would fit into a modest football ground, with room to spare.', 'That is roughly the crowd of a lower-league football match on a good day.', ''] :
    p < 20000 ? ['A big indoor arena, full to the last seat, holds about as many people.', ''] :
    p < 90000 ? ['That is roughly a big football stadium, filled once.', 'Put them in a stadium and you would need one of the large ones.', ''] :
    p < 1000000 ? ['That is the size of a real city, with everything city scale means for the map.', ''] :
    ['At this size, the place is less one neighbourhood than dozens of them sharing a name.', 'A headcount that runs into the millions; the averages here hide a lot of variety.']));
  if (v.region) out.push(pick(s, 'reg', ['It belongs to {region}.', 'On the map it falls within {region}.', '']));
  if (fin(v.density) && v.densityOk && v.density > 0) {
    if (fin(v.densPct)) out.push(pick(s, 'dn', [
      'About {dens} people share each square kilometre, denser than {densPct}% of places in {cname}.',
      'At {dens} residents per km², it is more crowded than {densPct}% of {cname}’s places and roomier than the rest.',
      'Density runs at {dens} per km². In {cname} terms that is the {densBand}.',
      'Spread over its area, that is {dens} people per km², which puts it in the {densBand} of the country.',
    ]));
    else out.push(pick(s, 'dn0', ['About {dens} people share each square kilometre.', 'Density: {dens} residents per km².']));
  }
  return out.filter(Boolean);
}

function groundPara(s, v) {
  const out = [];
  if (fin(v.alt)) {
    if (fin(v.altPct) && v.nC >= 20) out.push(pick(s, 'al', [
      'The land around it averages about {alt} m above sea level, higher than {altPct}% of places in {cname}.',
      'Average terrain height: about {alt} m. In {cname}, {altPct}% of places sit lower.',
      'It sits at roughly {alt} m on average, {altWord} for {cname}.',
    ]));
    else out.push(pick(s, 'al0', ['The land around it averages about {alt} m above sea level.', 'Average terrain height around it is about {alt} m.']));
  }
  if (fin(v.relief)) {
    if (v.relief > 700) out.push(pick(s, 'rl', ['Between its lowest and highest ground there are {relief} m, so very little of it is level.', 'The height range inside the area is {relief} m: valley floor and mountain side in one place.']));
    else if (v.relief > 250) out.push(pick(s, 'rl', ['The ground varies by {relief} m across the area, enough for real hills.', 'There are {relief} m between its lowest and highest points.', '']));
    else if (v.relief < 25 && fin(v.alt) && v.alt < 200) out.push(pick(s, 'rl', ['The whole area varies by less than {relief} m in height: flat country.', 'It is nearly level ground, with under {relief} m between the lowest and the highest point.']));
  }
  if (v.lake && fin(v.lakeKm) && v.lakeKm < 1) out.push(pick(s, 'lk', ['{lake} is right there, less than a kilometre from the centre.', 'The shore of {lake} is under a kilometre away.', 'It lies on {lake}.']));
  else if (v.lake && fin(v.lakeKm) && v.lakeKm < 10) out.push(pick(s, 'lk', ['{lake} is {lakeKm} km away in a straight line.', 'The nearest large lake, {lake}, is {lakeKm} km off as the crow flies.']));
  if (fin(v.seaKm) && v.seaKm < 2) out.push(pick(s, 'se', ['It is on the coast of the {sea}, under 2 km from the shore.', 'The {sea} begins less than 2 km from the centre.', 'This is a coastal place: the {sea} is under 2 km away.']));
  else if (fin(v.seaKm) && v.seaKm < 15) out.push(pick(s, 'se', ['The {sea} is {seaKm} km away in a straight line.', 'It is {seaKm} km to the {sea} as the crow flies.']));
  else if (fin(v.seaKmAny) && v.seaKmAny > 300) out.push(pick(s, 'se', ['The nearest sea coast is {seaKmAny} km away: deep inland.', 'It is about as far from the sea as places get here: {seaKmAny} km to the nearest coast.', '']));
  if (v.river && fin(v.riverKm) && v.riverKm < 1) out.push(pick(s, 'rv', ['The {river} runs through or right past it.', 'The {river} passes within a kilometre.', '']));
  if (v.kg && KG[v.kg]) out.push(pick(s, 'kg', [
    'Its climate is classed as {kgName} ({kg}), which by definition means {kgDef}.',
    'Climate scientists file it under {kg}, {kgName}: {kgDef}.',
    'On the Köppen map it is {kgName} ({kg}), defined by {kgDef}.',
  ]));
  if (fin(v.winterH)) {
    const short = v.winterH < 7, late = v.summerSet && /^2[2-3]:/.test(v.summerSet);
    if (short && late) out.push(pick(s, 'sn', ['In December the sun is up for only {winterLen} and sets at {winterSet}; in late June it stays until {summerSet}.', 'Daylight swings hard here: {winterLen} on the shortest day, sunset after {summerSet} in midsummer.']));
    else if (short) out.push(pick(s, 'sn', ['On the shortest day the sun manages {winterLen} and sets at {winterSet}.', 'December daylight lasts {winterLen}, with sunset at {winterSet}.']));
    else if (late) out.push(pick(s, 'sn', ['In late June the sun does not set until {summerSet}.', 'Midsummer evenings stay light until {summerSet}.']));
    else if (v.winterH > 10) out.push(pick(s, 'sn', ['Even on the shortest day the sun is up for {winterLen}.', 'The shortest day still brings {winterLen} of daylight.']));
    else out.push(pick(s, 'sn', ['On the shortest day the sun is up for {winterLen} and sets around {winterSet}; in midsummer it sets around {summerSet}.', '']));
  }
  return out.filter(Boolean);
}

function neighbourPara(s, v) {
  const out = [];
  const nb = (v.near || []).filter((o) => o && o.name && fin(o.km)).slice(0, 3);
  if (nb.length >= 2) out.push(pick(s, 'nb', [
    'Its nearest neighbours on Nestlyzer are {nb1} ({nb1km} km) and {nb2} ({nb2km} km).',
    'Closest on the map: {nb1}, {nb1km} km away, then {nb2} at {nb2km} km.',
    'Look around and the next places are {nb1} at {nb1km} km and {nb2} at {nb2km} km, in a straight line.',
  ]));
  if (fin(v.pop10) && v.pop10 > 0 && v.pop > 0) {
    const r = v.pop10 / v.pop;
    if (r >= 3) out.push(pick(s, 'p10', ['About {pop10} people live within 10 km, {p10x} times its own population.', 'Draw a 10 km circle around it and you take in some {pop10} people, {p10x} times its own headcount.']));
    else if (r >= 1.2) out.push(pick(s, 'p10', ['Within 10 km live about {pop10} people.', 'Some {pop10} people live within a 10 km radius.']));
    else out.push(pick(s, 'p10', ['Within 10 km there are barely more people than in {name} itself: about {pop10}.', 'It is the main concentration of people in its 10 km circle ({pop10} in total).']));
  }
  if (v.metro && fin(v.metroKm)) {
    if (v.metroKm <= 3) out.push(pick(s, 'mt', ['It is the core of Greater {metro}.', 'This is the centre of Greater {metro}, the point the distances are measured from.']));
    else out.push(pick(s, 'mt', ['The centre of Greater {metro} is {metroKm} km away in a straight line.', 'It counts as part of Greater {metro}, {metroKm} km out from the centre.', 'Greater {metro} has its centre {metroKm} km away; travel time depends on the route, which we do not estimate.']));
  }
  if (v.cap && fin(v.capKm) && v.capKm > 3) out.push(pick(s, 'cp', ['{cap}, the capital, is {capKm} km away.', 'It is {capKm} km to {cap} as the crow flies.', '']));
  if (v.border && fin(v.borderKm) && v.borderKm < 40) out.push(pick(s, 'bd', ['The border with {border} is only {borderKm} km away.', '{border} begins {borderKm} km from here.', 'It lies {borderKm} km from the border with {border}.']));
  const bits = [];
  if (fin(v.mwayKm) && v.mwayKm < 60) bits.push(v.mwayKm < 1 ? 'a motorway passes within 1 km' : 'the nearest motorway is ' + n1(v.mwayKm) + ' km away');
  if (fin(v.railKm) && v.railKm < 60) bits.push(v.railKm < 1 ? 'a main railway line passes within 1 km' : 'the nearest main railway line is ' + n1(v.railKm) + ' km away');
  if (bits.length) { const t = bits.join(' and ') + '.'; out.push(pick(s, 'tr', [t.charAt(0).toUpperCase() + t.slice(1), 'In a straight line, ' + t, 'On the transport map, ' + t])); }
  return out.filter(Boolean);
}

function changePara(s, v) {
  const g = v.growth; if (!fin(g)) return [];
  const G = { g: (g > 0 ? '+' : '') + n1(g), a: n1(Math.abs(g)) };
  const out = [];
  if (g > 25 || g < -25) out.push('The headcount changed by {g}% in five years. A jump that large often reflects a boundary change rather than people arriving or leaving; the figure alone cannot tell which.');
  else if (g > 8) out.push(pick(s, 'gr', ['The population grew {a}% in five years, quick by any measure.', 'Five years added {a}% to the headcount.', '{a}% more residents than five years earlier: this place is growing fast.']));
  else if (g > 2) out.push(pick(s, 'gr', ['The population is up {a}% in five years: steady growth.', 'Over five years the headcount rose by {a}%.', 'It added {a}% to its population in five years, the slow, unspectacular kind of growth.']));
  else if (g > -1) out.push(pick(s, 'gr', ['Five years on, the headcount has barely moved ({g}%).', 'The population held its ground over five years: {g}%.', 'Stable is the word: {g}% in five years.']));
  else if (g > -5) out.push(pick(s, 'gr', ['The population slipped {a}% in five years.', 'It has {a}% fewer residents than five years earlier.', 'A gentle decline: {a}% down in five years.']));
  else out.push(pick(s, 'gr', ['It lost {a}% of its residents in five years. The figure alone does not say why: fewer births, more deaths, people leaving or a boundary change.', 'Five years took {a}% off the headcount, a clear decline.']));
  if (fin(v.growPct) && Math.abs(g) <= 25) out.push(pick(s, 'gp', g >= 0 ? ['That is faster than {growPct}% of places in {cname} with comparable figures.', 'Only {growTop}% of comparable places in {cname} grew faster.'] : ['{growBelow}% of comparable places in {cname} did better.', 'Among comparable places in {cname}, that is in the weaker {growBottom}%.']));
  return out.map((t) => t.replace(/\{(g|a)\}/g, (m, k) => G[k]));
}

function fitPara(s, v) {
  const b = v.best || [], w = v.worst || [];
  if (!b.length) return [pick(s, 'rk0', ['It does not yet pass the minimums of any household profile in {cname}, usually because of its size or missing local data. A ranking that is honest about gaps beats one that guesses.', 'No household profile ranks it yet in {cname}: the data or the size does not reach our minimums, and we would rather say so than guess.'])];
  const strong = b.map((x) => x.aud + ' (top ' + x.pct + '%)');
  const sList = strong.length > 1 ? strong.slice(0, -1).join(', ') + ' and ' + strong[strong.length - 1] : strong[0];
  const out = [fill(pick(s, 'rk1', ['Where it shines: {list}.', 'On the numbers it suits {list} best.', 'Its best results go to {list}.', 'The rankings like it most for {list}.', 'If you are among {list}, this is a place to look at closely.']), { list: sList })];
  const W = w.find((x) => x.pct >= 70 && !b.some((y) => y.aud === x.aud));
  if (W) out.push(fill(pick(s, 'rk2', ['It struggles for {aud}, landing in the bottom {bot}%.', 'For {aud} it is a harder sell: bottom {bot}% in {cname}.', 'Less so for {aud}, where it sits in the bottom {bot}%.']), { aud: W.aud, bot: Math.max(1, 100 - W.pct + 1), cname: v.cname }));
  out.push(pick(s, 'rk3', ['No place wins everything; this one picks its battles.', 'Every place is a trade-off. The table below shows exactly which one.', 'The full table below has the rest, profile by profile.', 'Which of these matters to you is the whole question.', 'The scores weigh what each kind of household needs; open the table to see the parts.']));
  return out;
}

export function placeStoryRich(v) {
  const s = String(v.id || v.name);
  const band = (p) => p >= 90 ? 'densest tenth' : p >= 70 ? 'busier third' : p >= 40 ? 'middle range' : p >= 15 ? 'roomier half' : 'emptiest sixth';
  const V = { ...v, pop: n0(v.pop), sea: sea(v),
    dens: fin(v.density) ? n0(v.density) : '', alt: fin(v.alt) ? n0(Math.round(v.alt / 10) * 10) : '', relief: fin(v.relief) ? n0(Math.max(10, Math.round(v.relief / 10) * 10)) : '',
    lakeKm: fin(v.lakeKm) ? n1(v.lakeKm) : '', seaKm: fin(v.seaKm) ? n0(v.seaKm) : '', seaKmAny: fin(v.seaKmAny) ? n0(v.seaKmAny) : '', metroKm: fin(v.metroKm) ? n0(v.metroKm) : '', capKm: fin(v.capKm) ? n0(v.capKm) : '', borderKm: fin(v.borderKm) ? n0(v.borderKm) : '',
    nC: fin(v.nC) ? n0(v.nC) : '', sizePct: fin(v.sizePct) ? Math.round(v.sizePct) : '', sizeTop: fin(v.sizePct) ? Math.max(1, 100 - Math.round(v.sizePct)) : '', sizeBig: fin(v.sizePct) ? Math.max(1, 100 - Math.round(v.sizePct)) : '',
    sizeOrd: fin(v.sizeRank) ? ord(v.sizeRank) : '', densPct: fin(v.densPct) ? Math.round(v.densPct) : '', densBand: fin(v.densPct) ? band(v.densPct) : '',
    altPct: fin(v.altPct) ? Math.round(v.altPct) : '', altWord: fin(v.altPct) ? (v.altPct >= 90 ? 'among the highest tenth' : v.altPct >= 60 ? 'on the high side' : v.altPct >= 30 ? 'about average' : 'on the low side') : '',
    kgName: v.kg && KG[v.kg] ? KG[v.kg][0] : '', kgDef: v.kg && KG[v.kg] ? KG[v.kg][1] : '',
    pop10: fin(v.pop10) ? n0(Math.round(v.pop10 / 100) * 100) : '', p10x: fin(v.pop10) && v.pop > 0 ? n1(v.pop10 / v.pop) : '',
    growPct: fin(v.growPct) ? Math.round(v.growPct) : '', growTop: fin(v.growPct) ? Math.max(1, 100 - Math.round(v.growPct)) : '', growBelow: fin(v.growPct) ? Math.max(1, 100 - Math.round(v.growPct)) : '', growBottom: fin(v.growPct) ? Math.max(1, Math.round(v.growPct)) : '',
    nb1: (v.near || [])[0] ? v.near[0].name : '', nb1km: (v.near || [])[0] ? n1(v.near[0].km) : '', nb2: (v.near || [])[1] ? v.near[1].name : '', nb2km: (v.near || [])[1] ? n1(v.near[1].km) : '' };
  const paras = [sizePara(s, v), groundPara(s, v), neighbourPara(s, v), changePara(s, v)].map((a) => a.map((t) => fill(t, V)).join(' ')).filter((t) => t.trim());
  // vary the order: some portraits open with the setting or the neighbours instead of the headcount
  const o = h(s + '|order') % 4; if (paras.length >= 3 && o === 1) paras.splice(0, 2, paras[1], paras[0]); else if (paras.length >= 3 && o === 2) paras.splice(0, 3, paras[2], paras[0], paras[1]);
  paras.push(fitPara(s, v).map((t) => fill(t, V)).join(' '));
  const title = pick(s, 'h', ['The short version', 'What the numbers say', 'First impressions, by the numbers', 'The quick read', 'A portrait in figures', 'What you should know first', 'In numbers, not adjectives', 'The place at a glance']);
  return '<section class="card nz-story"><h2>' + esc(title) + '</h2>' + paras.filter((t) => t && t.trim()).map((t) => '<p>' + esc(t) + '</p>').join('') + '</section>';
}
