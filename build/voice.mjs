/* r15: Nestlyzer's house voice. Short, varied, human paragraphs built only from the figures on the page.
   Each place picks its phrasings by a stable hash of its id, so neighbouring pages do not read alike and a page
   does not change wording between builds unless its numbers change. No claim goes beyond the data shown:
   jokes are about the numbers, never about the people. Banned: the usual machine words (nestled, vibrant,
   boasts, hidden gem, tapestry, bustling, whether you are, in conclusion). */
const h = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
const pick = (seed, slot, arr) => arr[h(seed + '|' + slot) % arr.length];
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => (v[k] == null ? '' : String(v[k])));
const n0 = (x) => Math.round(x).toLocaleString('en-US');
const n1 = (x) => (Math.round(x * 10) / 10).toLocaleString('en-US');
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const BANNED = /\b(nestled|vibrant|boasts?|hidden gem|tapestry|bustling|whether you'?re|in conclusion|delve|testament to|a must-see)\b/i;

function sizeLine(s, v) {
  const p = v.pop;
  if (p < 1500) return pick(s, 'size', [
    'With {pop} residents, {name} is the kind of place where a new face gets a second look.',
    '{name} counts {pop} residents. That is fewer than a mid-sized concert, and the pace of life tends to follow.',
    'Only {pop} people live in {name}, so anonymity is not really on the menu.',
    '{pop} residents. {name} is small enough that news still travels by word of mouth faster than by any newsletter.']);
  if (p < 10000) return pick(s, 'size', [
    '{name} has {pop} residents: past village size, still well short of a town that loses track of its people.',
    'At {pop} people, {name} sits in the comfortable middle: not a village any more, not quite a town that forgets your name.',
    '{pop} people call {name} home, about the crowd at a full provincial football ground.',
    '{name} is home to {pop} people, the size at which faces start to repeat at the weekend.']);
  if (p < 100000) return pick(s, 'size', [
    '{name} is a proper town of {pop}, with the choice that brings and the traffic that comes with it.',
    'With {pop} residents, {name} has outgrown small-town scale without reaching city size.',
    '{pop} people live in {name}: a town by any measure, still short of a city.',
    '{name} counts {pop} residents, in the band between market town and regional city.']);
  if (p < 1000000) return pick(s, 'size', [
    '{name} is a city of {pop}. The question here is less whether there is something to do and more which neighbourhood you can live with.',
    'With {pop} people, {name} plays in the city league; how that feels depends a lot on the district.',
    '{pop} residents make {name} a real city by any count.']);
  return pick(s, 'size', [
    '{name} is a giant: {pop} people. Rankings here say more about the average than about any one district, so read them that way.',
    'At {pop} residents, {name} is a country-sized city. Somewhere in it is exactly what you want; the trick is finding which part.',
    '{pop} people. {name} is less a place than a collection of places sharing a name.']);
}

function densityLine(s, v) {
  const d = v.density; if (!(d >= 0)) return '';
  if (d > 5000) return pick(s, 'dens', ['Space is the scarce thing: about {dens} people share each square kilometre.', 'At {dens} people per square kilometre, a balcony counts as a garden.']);
  if (d > 1500) return pick(s, 'dens', ['It is built up, about {dens} people per square kilometre, so the neighbours are close.', 'Density runs at {dens} per square kilometre: urban, but not stacked.']);
  if (d < 30) return pick(s, 'dens', ['Neighbours are spread thin, about {dens} people per square kilometre; the nearest one may be a cow.', 'With {dens} people per square kilometre, there is more landscape than streetscape.', 'At {dens} per square kilometre, a traffic jam means two tractors.']);
  if (d < 120) return pick(s, 'dens', ['Room to breathe: about {dens} people per square kilometre.', 'It is roomy, around {dens} people per square kilometre: more ground than buildings.']);
  return '';
}

function settingLine(s, v) {
  const out = [];
  if (v.lake && v.lakeKm != null && v.lakeKm < 1) out.push(pick(s, 'lake', ['It sits right on {lake}, less than a kilometre from the centre.', '{lake} is on the doorstep, under a kilometre away.', 'The town reaches the shore of {lake}.']));
  else if (v.lake && v.lakeKm != null && v.lakeKm < 8) out.push(pick(s, 'lake', ['{lake} is {lakeKm} km away in a straight line.', 'The shore of {lake} is {lakeKm} km off as the crow flies.']));
  if (v.seaKm != null && v.seaKm < 2) out.push(pick(s, 'sea', ['It is on the coast{seaOf}: the view comes included, the wind is not optional.', 'The sea{seaOf} starts where the town stops.', 'Salt air is part of the address here{seaOfComma}.']));
  else if (v.seaKm != null && v.seaKm < 15) out.push(pick(s, 'sea', ['The {sea} is {seaKm} km away in a straight line: near enough to shape the weather, far enough not to shape the town.', 'It is {seaKm} km to the {sea} as the crow flies.']));
  if (v.alt != null && v.alt > 1200) out.push(pick(s, 'alt', ['The land around it averages about {alt} m, so winter here is not a rumour.', 'The surrounding terrain averages roughly {alt} m. Snow tyres are not a lifestyle choice.']));
  else if (v.relief != null && v.relief > 700) out.push(pick(s, 'rel', ['The ground rises {relief} m within the area, so bring calves, not a cargo bike.', 'With {relief} m between the lowest and highest ground, every errand comes with a view and a climb.']));
  else if (v.relief != null && v.relief < 25 && v.alt != null && v.alt < 200) out.push(pick(s, 'flat', ['The land is flat as a ruler, which cyclists love and skiers forgive nobody for.', 'Flat country: the horizon is a long way off and the bike does most of the work.']));
  if (v.river && v.riverKm != null && v.riverKm < 1 && out.length < 2) out.push(pick(s, 'riv', ['The {river} runs through or right past it.', 'The {river} goes past, as rivers do, and the town has arranged itself around it.']));
  return out.slice(0, 2).join(' ');
}

function growthLine(s, v) {
  const g = v.growth; if (g == null || !isFinite(g)) return '';
  const G = { g: (g > 0 ? '+' : '') + n1(g), a: n1(Math.abs(g)) };
  if (g > 10) return fill(pick(s, 'gr', ['It is growing fast, {g}% in five years. That usually means cranes, new classrooms and a lively debate about parking.', 'The headcount is up {a}% in five years, a pace few places keep up.', '{a}% more residents in five years. Births, arrivals or new boundaries; the figure alone does not say which.']), G);
  if (g > 3) return fill(pick(s, 'gr', ['Growth is steady, {g}% over five years: the slow, unspectacular kind.', 'The population is up {a}% in five years, the healthy kind of growth that rarely makes the news.']), G);
  if (g > -1) return fill(pick(s, 'gr', ['The headcount has barely moved in five years ({g}%). Some call that stagnation; others call it stability.', 'Five years, {g}%: a population holding its ground.']), G);
  if (g > -5) return fill(pick(s, 'gr', ['It is shrinking slowly, down {a}% in five years. Gentle, but worth noticing.', 'A slight decline, {a}% fewer residents over five years: more room, fewer neighbours.']), G);
  return fill(pick(s, 'gr', ['It has lost {a}% of its residents in five years. Fewer people means less competition for housing; whether the shops and schools hold on is the question to ask.', 'Five years, {g}%. The decline is real, and so is the room it leaves.']), G);
}

function metroLine(s, v) {
  if (!v.metro || v.metroKm == null) return '';
  if (v.metroKm <= 3) return pick(s, 'met', ['It is the heart of Greater {metro}, not a suburb of it.', 'This is the core of Greater {metro}; everything else is measured from here.']);
  if (v.metroKm < 25) return pick(s, 'met', ['Greater {metro} starts to matter here: its centre is {metroKm} km away in a straight line.', 'It is {metroKm} km, straight line, from the centre of Greater {metro}; travel time depends on the route, which we do not estimate.', 'Part of Greater {metro}, {metroKm} km out from its centre.']);
  return pick(s, 'met', ['Greater {metro} is {metroKm} km away: near enough to matter, far enough that this is its own place.', 'The pull of Greater {metro} is felt here, {metroKm} km out, but only just.']);
}

function lightLine(s, v) {
  if (v.winterH == null) return '';
  const short = v.winterH < 7, late = v.summerSet && /^2[2-3]:/.test(v.summerSet);
  if (short && late) return pick(s, 'sun', ['In December the sun works {winterLen} and clocks off at {winterSet}; in June it hangs around until {summerSet}. The year is a deal, paid in advance.', 'Winter days run {winterLen}, summer evenings stay light until {summerSet}. You pay in December and collect in June.']);
  if (short) return pick(s, 'sun', ['On the shortest day the sun manages {winterLen} and leaves at {winterSet}. Plan the lamps accordingly.', 'December light: {winterLen}, sunset {winterSet}. Hobbies that work indoors are an asset.']);
  if (late) return pick(s, 'sun', ['In late June the sun does not set until {summerSet}.', 'Summer evenings stay bright until {summerSet}.']);
  if (v.winterH > 10) return pick(s, 'sun', ['Even on the shortest day the sun is up for {winterLen}, so winter is mostly a matter of opinion.', 'Winter daylight still runs {winterLen}; the dark season barely shows up.']);
  return '';
}

function rankLine(s, v) {
  const b = v.best || [], w = v.worst || [];
  if (!b.length) return pick(s, 'rk0', ['It does not yet pass the minimums of any household profile in {cname}, usually because of its size or missing local data. A ranking that is honest about gaps beats one that guesses.', 'No household profile ranks it yet in {cname}: the data or the size does not reach our minimums, and we would rather say so than guess.']);
  const strong = b.map((x) => x.aud + ' (top ' + x.pct + '%)');
  const sList = strong.length > 1 ? strong.slice(0, -1).join(', ') + ' and ' + strong[strong.length - 1] : strong[0];
  let out = fill(pick(s, 'rk1', ['Where it shines: {list}.', 'On the numbers it suits {list} best.', 'Its best results go to {list}.', 'The rankings like it most for {list}.']), { list: sList });
  const W = w.find((x) => x.pct >= 70 && !b.some((y) => y.aud === x.aud));
  if (W) out += ' ' + fill(pick(s, 'rk2', ['It struggles for {aud}, landing in the bottom {bot}%.', 'For {aud} it is a harder sell: bottom {bot}% in {cname}.', 'Less so for {aud}, where it sits in the bottom {bot}%.']), { aud: W.aud, bot: Math.max(1, 100 - W.pct + 1), cname: v.cname });
  out += ' ' + pick(s, 'rk3', ['No place wins everything; this one picks its battles.', 'Every place is a trade-off. The table below shows exactly which one.', 'The full table below has the rest, profile by profile.', 'Which of these matters to you is the whole question.']);
  return out;
}

/* A place story: two short paragraphs, 450 to 900 characters, only from figures on the page. */
export function placeStory(v) {
  const s = String(v.id || v.name);
  const V = { ...v, pop: n0(v.pop), dens: v.density >= 0 ? n0(v.density) : '', alt: v.alt != null ? n0(Math.round(v.alt / 10) * 10) : '', relief: v.relief != null ? n0(Math.round(v.relief / 10) * 10) : '',
    lakeKm: v.lakeKm != null ? n1(v.lakeKm) : '', seaKm: v.seaKm != null ? n0(v.seaKm) : '', metroKm: v.metroKm != null ? n0(v.metroKm) : '',
    seaOf: v.sea ? ' of the ' + String(v.sea).replace(/^The /, '') : '', seaOfComma: v.sea ? ', on the ' + String(v.sea).replace(/^The /, '') : '', sea: v.sea ? String(v.sea).replace(/^The /, '') : 'sea' };
  const p1 = [sizeLine(s, v), densityLine(s, v), settingLine(s, v)].filter(Boolean).map((t) => fill(t, V)).join(' ');
  const p2 = [growthLine(s, v), metroLine(s, v), lightLine(s, v)].filter(Boolean).map((t) => fill(t, V)).join(' ');
  const p3 = fill(rankLine(s, v), V);
  const title = pick(s, 'h', ['The short version', 'In a nutshell', 'What the numbers say', 'First impressions, by the numbers', 'The quick read']);
  const paras = [p1, p2, p3].filter((t) => t && t.trim());
  return '<section class="card nz-story"><h2>' + esc(fill(title, V)) + '</h2>' + paras.map((t) => '<p>' + esc(t) + '</p>').join('') + '</section>';
}

/* Ranking commentary: who leads, how close it is, and whether one region runs away with it. */
export function rankingTake(v) {
  const s = v.key, top = v.top || []; if (top.length < 3) return '';
  const [a, b, c] = top, gap = a.score - b.score, spread = top.length >= 10 ? top[0].score - top[9].score : null;
  const V = { a: a.name, b: b.name, c: c.name, as: n1(a.score), gap: n1(gap), spread: spread != null ? n1(spread) : '', cname: v.cname, prof: v.prof, n: n0(v.n) };
  const lines = [];
  lines.push(gap < 0.5 ? pick(s, 'g', ['{a} edges out {b} by {gap} points, which is a photo finish in anyone’s book, with {c} right behind.', '{a} and {b} are separated by {gap} points. Call it a tie with a tiebreaker; {c} completes the podium.'])
    : gap < 3 ? pick(s, 'g', ['{a} leads on {as} points, with {b} and {c} close enough to make it interesting.', '{a} takes first place ({as}), {b} second, {c} third, and the margins are slim.', 'Top spot goes to {a} with {as} points; {b} and {c} are breathing down its neck.'])
    : pick(s, 'g', ['{a} runs away with it: {as} points and a {gap}-point lead over {b}. {c} is third.', 'This one is not close. {a} scores {as}, a clear {gap} points ahead of {b}, with {c} in third.']));
  if (spread != null) lines.push(spread < 4 ? pick(s, 's', ['Only {spread} points separate first from tenth, so the top ten are really one group; read the details, not just the order.', 'The top ten sit within {spread} points of each other. Rank matters less here than fit.'])
    : spread > 15 ? pick(s, 's', ['The field spreads out fast: tenth place is already {spread} points behind.', 'By tenth place the gap is {spread} points. The leaders really are different.']) : '');
  if (v.regionTop && v.regionTop.count >= 5) lines.push(fill(pick(s, 'r', ['{count} of the top ten are in {region}. If this profile is you, start looking there.', '{region} owns this list: {count} of the top ten.', 'Geography is not shy here: {count} of the top ten sit in {region}.']), { region: v.regionTop.region, count: WORDS[v.regionTop.count] || v.regionTop.count }).replace(/^([a-z])/, (m) => m.toUpperCase()));
  lines.push(pick(s, 'e', ['{n} places in {cname} pass the minimums for this profile.', 'In total {n} places in {cname} qualify.', '{n} places made the cut in {cname}.']));
  if (v.lead) lines.unshift(v.lead);
  return '<div class="nz-take"><p>' + esc(lines.filter(Boolean).map((t) => fill(t, V)).join(' ')) + '</p></div>';
}

/* A country in three or four sentences: its biggest place, how lopsided it is, who grows, who sits highest. */
export function countryStory(v) {
  const s = 'c|' + v.cc, out = [];
  const V = { c: v.name, n: n0(v.n), big: v.big && v.big.name, bigPop: v.big && n0(v.big.pop), share: v.share != null ? n0(v.share) : '', med: v.median != null ? n0(v.median) : '',
    gName: v.grow && v.grow.name, g: v.grow && ('+' + n1(v.grow.g)), hName: v.high && v.high.name, alt: v.high && n0(Math.round(v.high.alt / 10) * 10) };
  if (v.big) out.push(v.share >= 25 ? pick(s, 'b', ['{big} dominates: {share}% of everyone we count in {c} lives there, so the rest of the map is a very different country.', 'All roads lead to {big}, home to {share}% of the residents we count. Life outside it runs at another tempo.'])
    : v.share >= 10 ? pick(s, 'b', ['{big} is the largest place ({bigPop}), but with {share}% of the residents it leads without owning the country.', 'The biggest name is {big}, {bigPop} people, a capital of attention rather than of everything.'])
    : pick(s, 'b', ['Even {big}, the largest place, holds only {share}% of the residents: this is a country of many centres.', '{c} spreads itself around. The largest place, {big}, has just {share}% of the residents we count.']));
  if (v.median != null) out.push(pick(s, 'm', ['The typical place here has about {med} residents, so most of the {n} on the map are far smaller than the names you know.', v.median < 5000 ? 'Half of the {n} places have fewer than {med} residents. Most of the map is villages and small towns, not cities.' : 'Half of the {n} places have more than {med} residents: the local units here are big, so a place on this map is often a whole town with its suburbs.', v.median < 3000 ? 'Median size: {med} residents. In other words, the typical place is a village, not a town.' : v.median < 20000 ? 'Median size: {med} residents. In other words, the typical place is a small town with one high street.' : 'Median size: {med} residents. Here even the typical place is a sizeable town, because the local units are large.']));
  if (v.grow) out.push(pick(s, 'g', ['The fastest grower among the larger places is {gName}, {g}% in five years.', '{gName} is where the moving vans go: {g}% in five years, the most among the larger places.']));
  if (v.high && v.high.alt > 600) out.push(pick(s, 'h', ['The most mountainous setting belongs to {hName}, where the land around averages about {alt} m and winter is a season, not a forecast.', 'For altitude, look at {hName}: the terrain around it averages some {alt} m.']));
  return out.length ? '<section class="card nz-story"><h2>' + esc(pick(s, 't', ['The country in a few lines', 'A quick portrait', 'Before the rankings'])) + '</h2><p>' + esc(out.map((t) => fill(t, V)).join(' ')) + '</p></section>' : '';
}
