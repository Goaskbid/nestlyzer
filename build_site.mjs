// Nestlyzer static site build: bundles the app shell and renders the SEO pages.
//   node build/build_site.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const terser = require('terser');
const esbuild = require('esbuild');
const topojson = require('topojson-client');
const Engine = require(path.join(ROOT, 'src/engine.js'));
const NestData = require(path.join(ROOT, 'src/data.js'));

const VERSION = process.env.NZ_VERSION || '2.4.1';
const SITE = 'https://nestlyzer.com';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => { const f = path.join(ROOT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = (s) => NestData.translit(String(s || '')).replace(/[øØ]/g, 'o').replace(/[æÆ]/g, 'ae').replace(/[łŁ]/g, 'l').replace(/[đĐð]/g, 'd').replace(/þ/g, 'th').replace(/œ/g, 'oe').replace(/ı/g, 'i').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmtInt = (v) => Number.isFinite(v) ? Math.round(v).toLocaleString('en-GB') : '–';
const fmt = (v, d = 0) => Number.isFinite(v) ? Number(v).toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d }) : '–';
const signed = (v, d = 1) => Number.isFinite(v) ? (v > 0 ? '+' : '') + fmt(v, d) : '–';
const FLAG = { EL: 'GR', UK: 'GB' };
const PICON = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/icons/icons.json'), 'utf8'));
const ico = (k, size = 20) => `<svg class="pico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PICON[k] || PICON.self_fit}</svg>`;
const flagImg = (cc, h = 14) => `<img class="flag" src="/assets/flags/${cc.toLowerCase()}.png" alt="" width="${Math.round(h * 4 / 3)}" height="${h}" loading="lazy" decoding="async">`;
const flag = (cc) => { cc = FLAG[cc] || cc; return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65); };
const km = (a, b) => { const R = 6371, la1 = a[1] * Math.PI / 180, la2 = b[1] * Math.PI / 180, dl = la2 - la1, dn = (b[0] - a[0]) * Math.PI / 180; const h = Math.sin(dl / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const stripParen = (s) => String(s || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/,\s*(Stadt|Markt|Gemeinde|Landeshauptstadt|Hansestadt)$/i, '').trim();
const TODAY = new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------------ data
const meta = JSON.parse(read('data/meta.json'));
const engine = new Engine(meta, { method: 'v2' });
const cfg = meta.config;
const countries = meta.countries.slice().sort((a, b) => a.cc === 'CH' ? -1 : b.cc === 'CH' ? 1 : a.name.localeCompare(b.name));
const SH = {};
const KG = { Csa: 'Mediterranean, hot summer', Csb: 'Mediterranean, warm summer', Cfa: 'Humid subtropical', Cfb: 'Oceanic', Cfc: 'Subpolar oceanic', Dfa: 'Continental, hot summer', Dfb: 'Continental, warm summer', Dfc: 'Subarctic', Dsb: 'Continental, dry warm summer', Dsc: 'Subarctic, dry summer', BSh: 'Hot semi-arid', BSk: 'Cold semi-arid', BWh: 'Hot desert', BWk: 'Cold desert', ET: 'Alpine tundra', EF: 'Ice cap' };
for (const c of countries) {
  const sh = JSON.parse(read(`data/c/${c.cc}.json`)), all = NestData.hydrate(sh);
  let xs = null; try { xs = JSON.parse(read(`data/x/${c.cc}.json`)); } catch (e) { xs = null; }
  if (xs) { const NM = { kg: 1, lake: 1, river: 1, port: 1, border: 1, metro: 1, land: 1, sea: 1 }; all.forEach((r, i) => { const o = {}; for (const k in xs.cols) { const v = xs.cols[k][i]; if (v != null) o[k] = NM[k] ? xs.strs[v] : v; } r.x = o; }); }
  SH[c.cc] = { sh, recs: all.filter((r) => !r.superseded), capital: xs && xs.capital };
}
const profiles = cfg.order.filter((k) => engine.profiles[k]);
const TOTAL = fmtInt(countries.reduce((a, c) => a + c.n, 0));
const PROFILE_COPY = {"young_family": "Families with young children: safe streets, schools and childcare nearby, room to grow and costs that leave something over.", "low_income": "Households on a tight budget: low housing pressure, modest taxes, basic services and a job market within reach.", "low_income_family": "Families on a tight budget: a solid family base and safety first, then the lowest costs that still work day to day.", "single_parent": "One parent, one income: childcare, safety, short everyday trips and costs that stay manageable.", "pensioner": "Couples after work: good health care, calm, safety, easy daily errands and a fair tax burden.", "single_pensioner": "Living alone in retirement: doctors close by, safety, services within walking distance and manageable costs.", "early_retiree": "Stopping work early: a pleasant setting, good health care, sensible taxes and a city within reach, without needing a local job market.", "single": "One working adult: jobs, a real centre, services and safety; a low tax rate alone does not win.", "young_professional": "Early in a career: access to a big job market, city services and transport at a cost that still works.", "dinks": "Two incomes, no children: job depth, restaurants and culture, quick connections to a larger centre.", "remote": "Working from home: calm surroundings, reasonable costs, good local services and a station or airport within reach. Broadband speed is not in the data yet.", "commuter": "Daily trips to work: a big job centre close by, plus calm and costs at home. Distances are straight lines, not timetables.", "car_free": "Life without a car: dense services, a centre within reach and public transport; remote places cannot win on scenery.", "student": "Studying: a university within reach, the right language area, affordable living and young services.", "first_home": "Buying a first home: affordable prices, new housing being built, a stable population and jobs nearby.", "budget": "Moving on the lowest budget: costs and housing pressure first, with enough services and access to stay practical.", "urban": "City life: amenities, jobs, transport and density; small remote places are left out.", "expat_professional": "Moving abroad for work: international jobs, services, a hub airport and safety. International-school data is not in yet.", "healthcare_first": "Health comes first: doctors and hospitals within reach, calm and safety, with practical services around.", "nature": "Nature first: open land, low density, a good climate and the basics nearby.", "rural_value": "Value in the countryside: lower costs and open land in smaller places that still have basic services.", "hnw": "A large budget: low taxes matter, but only together with safety, health care, services and quality of life.", "swiss_lottery": "A windfall: where it goes furthest after tax and still buys a good life. Tax detail is only joined for Switzerland.", "climate": "Planning for a changing climate: environment, water, safety, health care and long-term comfort.", "coastal": "Life by the sea: close to the coast first, then calm, health care, safety and costs. Landlocked countries are honestly left out."};
const TILE_BLURB = { commuter: 'Short, reliable trips to a big job centre, plus calm and costs', dinks: 'Two incomes, no children: jobs, city life and quick connections', expat_professional: 'International jobs, a hub airport and services that work in English', swiss_lottery: 'Where a windfall goes furthest after tax, with quality of life (tax detail in Switzerland)', hnw: 'Tax, safety, privacy and services for a large household budget', remote: 'Work from home: calm, costs, lifestyle and a station or airport within reach' };
const KEY_PROFILES = ['young_family', 'pensioner', 'remote', 'commuter', 'single', 'budget'];
const AUDIENCE = {
  young_family: 'young families', low_income: 'low-income households', low_income_family: 'low-income families', single_parent: 'single parents', pensioner: 'retired couples', single_pensioner: 'single pensioners', early_retiree: 'early retirees', single: 'single professionals', young_professional: 'young professionals', dinks: 'couples without children (DINKs)', remote: 'remote workers', commuter: 'commuters', car_free: 'car-free households', student: 'students', first_home: 'first-time home buyers', budget: 'movers on a budget', urban: 'city lovers', expat_professional: 'expat professionals', healthcare_first: 'people who put healthcare first', nature: 'nature lovers', rural_value: 'rural value seekers', hnw: 'high-net-worth movers', swiss_lottery: 'lottery winners', climate: 'climate-conscious movers', coastal: 'people who want to live by the sea'
};
const PSLUG = Object.fromEntries(profiles.map((k) => [k, slugify(engine.profiles[k].name)]));

function regionLevel(cc) {
  if (cc === 'CH') return 'CH';
  if ((cfg.regionLevel || {})[cc]) return cfg.regionLevel[cc];
  const n1 = new Set(), n2 = new Set();
  for (const r of SH[cc].recs) if (r.n3) { n1.add(r.n1); n2.add(r.n2); }
  if (n2.size > 1 && n2.size <= 30) return 'n2';
  if (n1.size > 1) return 'n1';
  if (n2.size > 1) return 'n2';
  return 'none';
}
const nutsName = (cc, code) => (SH[cc].sh.nuts || {})[code] || code;
const regionOf = (r) => { if (r.country === 'CH') return { code: r.canton, name: r.cantonName }; const l = regionLevel(r.country); if (l === 'none') return null; const code = l === 'n1' ? r.n1 : r.n2; return code ? { code, name: nutsName(r.country, code) } : null; };
const localOf = (r) => r.country === 'CH' ? r.cantonName : nutsName(r.country, r.n3);
const cslug = (cc) => slugify(countries.find((c) => c.cc === cc).name);
const rslugCache = {};
function rslug(cc, reg) { const k = cc + ':' + reg.code; if (!rslugCache[k]) { const s = slugify(reg.name); rslugCache[k] = s && s.length > 1 ? s : reg.code.toLowerCase(); } return rslugCache[k]; }

// rankings: country-wide and per region, every profile
const FAST = !!process.env.NZ_FAST;
console.time('rank');
const RANK = {};      // RANK[cc][profile] = {byId:{id:{rank,score}}, n, list}
const RRANK = {};     // RRANK[cc][regionCode][profile]
for (const c of (FAST ? [] : countries)) {
  const recs = SH[c.cc].recs;
  RANK[c.cc] = {}; RRANK[c.cc] = {};
  for (const p of profiles) {
    const res = engine.rank(recs, p, { country: c.cc, subRanks: false });
    const byId = {}; res.scored.forEach((x) => { byId[x.id] = { rank: x.rank, score: x.overall }; });
    RANK[c.cc][p] = { byId, n: res.scored.length, list: res.scored.slice(0, 40), reasons: res.reasons };
  }
  const regs = {};
  for (const r of recs) { const g = regionOf(r); if (g) (regs[g.code] ||= { reg: g, recs: [] }).recs.push(r); }
  for (const [code, o] of Object.entries(regs)) {
    RRANK[c.cc][code] = { reg: o.reg, recs: o.recs, p: {} };
    for (const p of profiles) {
      const res = engine.rank(o.recs, p, { country: c.cc, subRanks: false });
      const byId = {}; res.scored.forEach((x) => { byId[x.id] = { rank: x.rank, score: x.overall }; });
      RRANK[c.cc][code].p[p] = { byId, n: res.scored.length, list: res.scored.slice(0, 15) };
    }
  }
}
console.timeEnd('rank');

// ------------------------------------------------------------------ page registry (paths)
const PAGES = {};      // record id -> path
const pageRecs = [];
for (const c of (FAST ? [] : countries)) {
  const used = {};
  const list = SH[c.cc].recs.filter((r) => c.cc === 'CH' || r.population >= 30000);
  for (const r of list) {
    const g = regionOf(r);
    const base = `/${cslug(c.cc)}/${g ? rslug(c.cc, g) + '/' : ''}`;
    let s = slugify(stripParen(r.name)) || slugify(r.name) || r.oid.toLowerCase();
    if (used[base + s]) s = s + '-' + slugify(r.oid);
    used[base + s] = 1;
    PAGES[r.id] = base + s + '/';
    pageRecs.push(r);
  }
}
const regionPath = (cc, reg) => `/${cslug(cc)}/${rslug(cc, reg)}/`;
const countryPath = (cc) => `/${cslug(cc)}/`;
const profilePath = (p) => `/best/${PSLUG[p]}/`;
const appLink = (o) => '/#/explore?' + new URLSearchParams(o).toString();

// ------------------------------------------------------------------ bundles
async function bundle() {
  const css = (await esbuild.transform(read('src/css/base.css') + read('src/css/app.css') + read('src/css/v3.css'), { loader: 'css', minify: true })).code;
  const siteCss = (await esbuild.transform(read('src/css/base.css'), { loader: 'css', minify: true })).code;
  const parts = ['src/engine.js', 'src/data.js', ...fs.readdirSync(path.join(ROOT, 'src/js')).sort().map((f) => 'src/js/' + f)];
  const app = ('var PICON = ' + JSON.stringify(PICON) + ';\n') + parts.map((p) => read(p)).join('\n;\n').replace(/__VERSION__/g, VERSION);
  const min = process.env.NZ_DEBUG ? { code: '(function(){' + app + '\n})();' } : await terser.minify('(function(){' + app + '\n})();', { compress: { passes: 2 }, mangle: true, format: { comments: false } });
  if (min.error) throw min.error;
  return { css, siteCss, js: min.code };
}

// ------------------------------------------------------------------ shared chrome
const ICON_X = {
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20Z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
};
const ICON = { fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>', map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></svg>', list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>', pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>', spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4L12 3Z"/></svg>', search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>', moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/></svg>' };
const MARK_INLINE = '<svg class="mark" viewBox="0 0 64 64" width="34" height="34" aria-hidden="true"><path class="mk-pin" d="M32 61.5C26.4 54.6 8.5 41 8.5 25.3 8.5 12.4 19 2.5 32 2.5s23.5 9.9 23.5 22.8C55.5 41 37.6 54.6 32 61.5Z"/><ellipse cx="32" cy="21.8" rx="7.2" ry="9" fill="#fff"/><path d="M16.8 24.6h30.4c0 9-6.8 15.4-15.2 15.4s-15.2-6.4-15.2-15.4Z" fill="#F5B700"/><path d="M19.6 30c3.5 1.6 7.7 2.4 12.4 2.4s8.9-.8 12.4-2.4M23.3 35.3c2.7 1.1 5.6 1.6 8.7 1.6s6-.5 8.7-1.6" fill="none" stroke="#0B2E5C" stroke-opacity=".3" stroke-width="1.7" stroke-linecap="round"/></svg>';
function header(isApp, cc, appHref) {
  const ex = appHref || appLink({ cc: cc || 'CH', p: 'young_family' });
  return `<header class="site-header"><a class="brand" href="/" data-home aria-label="Nestlyzer home">${MARK_INLINE}<b>Nestlyzer</b></a>
<nav class="nav" aria-label="Main"><a href="${ex}">Explore</a><a href="/#countries">Countries</a><a href="/#profiles">Profiles</a><a href="/method/">Method</a></nav>
<div class="header-tools">${isApp ? `<button class="btn btn-sm sl-btn" type="button" data-lt="saved" aria-label="Your shortlist">${ICON_X.heart}<span>Shortlist</span><span class="sl-n badge" hidden>0</span></button>` : ''}${isApp ? `<button class="search-trigger" type="button" data-search aria-label="Search places">${ICON.search}<span>Search ${TOTAL} places</span><kbd>/</kbd></button>` : `<a class="btn btn-sm btn-primary" href="${ex}">${ICON.map}Open the map</a>`}<button class="icon-btn" type="button" data-theme-toggle aria-label="Switch light or dark theme">${ICON.moon}</button><details class="menu"><summary class="icon-btn" aria-label="Menu"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary><nav class="menu-panel" aria-label="Menu"><a href="${ex}">Explore the map</a><a href="/#countries">Countries</a><a href="/#profiles">Profiles</a><a href="/method/">Method</a><a href="/legal/">Imprint and privacy</a></nav></details></div></header>`;
}
function footer() {
  return `<footer class="site-footer"><div class="footer-grid">
<section><h2>Legal notice</h2><p><b>Operator:</b> Torsten Sauter, Alte Landstrasse 77, 8706 Meilen, Switzerland. <b>Contact:</b> <a href="mailto:torsten.sauter@icloud.com">torsten.sauter@icloud.com</a>.</p><p>Nestlyzer is a research and decision-support website. It is not a public authority, financial adviser, tax adviser, real-estate broker, medical adviser, immigration adviser or legal adviser. <a href="/legal/">Imprint and policies</a></p></section>
<section><h2>Privacy</h2><p>There is no account system and no server-side user profile. Searches, filters, saved places and guided-profile answers stay in your browser. Public enrichment calls go to official data services, Wikimedia, Wikidata, OpenStreetMap and map tile servers, which receive normal technical request data. ${ANALYTICS ? 'Visit statistics (Google Analytics) and the ad service load only after you agree.' : 'There is no visitor tracking or analytics. The ad service loads only after you agree.'}</p><p>User relocation preferences are never sold or used for advertising.</p></section>
<section><h2>Minimum disclosure</h2><p>Scores are decision aids. Verify taxes, residence rules, school access, healthcare, housing, noise, transport, permits and property details with the responsible authority or a qualified adviser. Country-specific tax outputs are only reliable where that country's tax module is joined.</p><p>Photos, coats of arms, public text, contact links, advertising and cross-border notes do not affect the score.</p></section>
<section><h2>Sources and licences</h2><p>Public datasets and media keep their own terms. OSM-derived data requires attribution. Creative Commons and Wikimedia media may require creator, source and licence attribution. Boundaries are for visualisation and are not cadastral documents.</p><p><a href="https://www.fedlex.admin.ch/eli/cc/2022/491/en">Swiss FADP</a> · <a href="https://commission.europa.eu/law/law-topic/data-protection_en">EU data protection</a> · <a href="https://osmfoundation.org/wiki/Licence/Attribution_Guidelines">OSM attribution</a> · <a href="https://creativecommons.org/reusing-cc-licensed-content/">Creative Commons reuse</a> · <a href="https://gisco-services.ec.europa.eu/distribution/v2/lau/download/">Eurostat GISCO LAU</a> · <a href="https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d">swissBOUNDARIES3D</a> · <a href="/method/#sources">All sources</a></p></section>
</div><div class="footer-legal"><span><b>Nestlyzer.com</b>, find where you fit. Operator: Torsten Sauter, Alte Landstrasse 77, 8706 Meilen, Switzerland. Contact: torsten.sauter@icloud.com.</span><span><a href="/legal/">Imprint</a> · <a href="/legal/#privacy">Privacy</a> · <a href="/legal/#advertising">Advertising</a> · <a href="/legal/#cookies" data-privacy>Privacy settings</a> · <a href="/method/">Methodology</a> · <a href="/about/">About</a> · <a href="/sitemap.xml">Sitemap</a></span></div></footer>`;
}
const STATIC_JS = `try{var t=localStorage.getItem('nz:theme');if(t)document.documentElement.dataset.theme=JSON.parse(t)}catch(e){}`;
const STATIC_TAIL = `__CONSENT_HTML__
<script>(function(){function g(k){try{return JSON.parse(localStorage.getItem('nz:'+k))}catch(e){return null}}function s(k,v){try{localStorage.setItem('nz:'+k,JSON.stringify(v))}catch(e){}}var xb=document.querySelectorAll('[data-extoggle]');function xl(){xb.forEach(function(b){b.textContent='Live content: '+(g('ext')===false?'off':'on')})}xl();document.addEventListener('click',function(e){if(e.target.closest('[data-extoggle]')){s('ext',g('ext')===false?true:false);xl()}});var SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',MOON=document.querySelector('[data-theme-toggle]').innerHTML;function ic(){var d=document.documentElement,dk=d.dataset.theme==='dark'||(!d.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);document.querySelector('[data-theme-toggle]').innerHTML=dk?SUN:MOON}ic();document.addEventListener('click',function(e){if(e.target.closest('[data-theme-toggle]')){var d=document.documentElement,cur=d.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),n=cur==='dark'?'light':'dark';d.dataset.theme=n;s('theme',n);ic()}})})()</script>__CONSENT_JS__`;
// ---- analytics + advertising (Google Analytics G-HR6G9XFTKZ, Google AdSense ca-pub-2870312071451207)
// Consent Mode v2: everything denied until the visitor chooses. In the EEA, UK and Switzerland the consent dialog is
// Google Privacy & Messaging (a Google-certified IAB TCF CMP, configured in AdSense). Elsewhere, or if that dialog
// is not configured, Nestlyzer's own banner asks. Either way the footer link "Privacy settings" reopens the choice.
const GA_ID = 'G-HR6G9XFTKZ', ADS_CLIENT = 'ca-pub-2870312071451207';
// Privacy-first mode is the default: no Google Analytics at all, never personalised ads, and the ad script itself
// loads only after the visitor presses "Accept" (before that, nothing is sent to Google). NZ_PRIVACY=full restores
// the earlier setup (Analytics and personalised ads after consent).
const PRIVACY_STRICT = process.env.NZ_PRIVACY !== 'full';
// Light Google Analytics (default on; NZ_ANALYTICS=off removes it): loads only after "Accept all", Google signals and
// ad personalisation switched off, so visits are counted but never linked to advertising profiles.
const ANALYTICS = process.env.NZ_ANALYTICS !== 'off';
const GA_LOADER = `gtag('js',new Date());gtag('config','${GA_ID}',{page_location:location.origin+location.pathname,allow_google_signals:false,allow_ad_personalization_signals:false});window.nzGA=function(){if(window.nzGAon)return;window.nzGAon=1;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GA_ID}';document.head.appendChild(s)};`;
const ADS_LOADER = `(window.adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=1;window.nzAds=function(){if(window.nzAdsOn)return;window.nzAdsOn=1;var s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}';document.head.appendChild(s)};`;
// Google Analytics loads only after the visitor agrees (Consent Mode "basic"); the AdSense script loads with all
// consent signals denied so that Google's consent dialog can appear and only limited, cookieless ads are possible.
const tracking = ({ ads = true } = {}) => `<meta name="google-adsense-account" content="${ADS_CLIENT}">
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});gtag('set','ads_data_redaction',true);${ANALYTICS ? GA_LOADER : `window.nzGA=function(){};`}${PRIVACY_STRICT && ads ? ADS_LOADER : ''}try{var c=JSON.parse(localStorage.getItem('nz:consent2'));if(c&&c.v===2){gtag('consent','update',{analytics_storage:c.a&&${ANALYTICS}?'granted':'denied',ad_storage:c.d?'granted':'denied',ad_user_data:c.d?'granted':'denied',ad_personalization:c.d&&!${PRIVACY_STRICT}?'granted':'denied'});if(c.a)nzGA()${PRIVACY_STRICT && ads ? ';if(c.d&&window.nzAds)nzAds()' : ''}}}catch(e){}</script>${ads && !PRIVACY_STRICT ? `
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}" crossorigin="anonymous"></script>` : ''}`;
const CONSENT_HTML = `<div class="consent" id="consent" role="dialog" aria-modal="false" aria-labelledby="consent-t"><div class="consent-text"><b id="consent-t">Your privacy choice</b><p>${PRIVACY_STRICT ? (ANALYTICS ? 'Nestlyzer is free and paid for by ads that are never personalised. If you agree, Google Analytics measures how the site is used (without advertising features) and Google AdSense shows non-personalised ads; both set cookies. With “Only necessary”, neither loads and nothing is sent to Google.' : 'Nestlyzer is free and paid for by ads that are never personalised. If you agree, Google AdSense loads and may set cookies to count and limit ads. With “Only necessary”, no ad is loaded and nothing is sent to Google.') : 'Nestlyzer is free and paid for by ads. If you agree, Google may set cookies to count visits (Google Analytics) and to show and measure ads, including personalised ones (Google AdSense). With “Only necessary”, Analytics does not load, no cookies are set, and Google may show only limited ads.'} Change it any time under “Privacy settings”. <a href="/legal/#privacy">Privacy policy</a></p></div><div class="consent-actions"><button class="btn btn-sm" type="button" data-consent="no">Only necessary</button><button class="btn btn-sm" type="button" data-consent="yes">Accept all</button></div></div>`;
const CONSENT_SRC = `(function(){var K='nz:consent2',el=document.getElementById('consent');if(!el)return;function get(){try{var c=JSON.parse(localStorage.getItem(K));return c&&c.v===2?c:null}catch(e){return null}}function put(y){var c={v:2,a:y,d:y,t:Date.now()};try{localStorage.setItem(K,JSON.stringify(c))}catch(e){}try{localStorage.removeItem('nz:consent')}catch(e){}if(window.gtag)gtag('consent','update',{analytics_storage:y&&${ANALYTICS}?'granted':'denied',ad_storage:y?'granted':'denied',ad_user_data:y?'granted':'denied',ad_personalization:y&&!${PRIVACY_STRICT}?'granted':'denied'});if(y&&window.nzGA)nzGA();if(y&&window.nzAds)nzAds();el.classList.remove('open')}var cmp=null;function own(){el.classList.add('open')}function decide(){if(get())return;if(cmp)return;own()}var hooked=false;function hook(){if(hooked||typeof window.__tcfapi!=='function')return hooked;hooked=true;try{window.__tcfapi('addEventListener',2,function(d,ok){if(ok&&d){if(d.gdprApplies){cmp='tcf';el.classList.remove('open');if(d.eventStatus==='tcloaded'||d.eventStatus==='useractioncomplete'){var y=!!(d.purpose&&d.purpose.consents&&d.purpose.consents[1]);try{localStorage.setItem(K,JSON.stringify({v:2,a:y,d:y,t:Date.now(),src:'tcf'}))}catch(e){}if(y&&window.nzGA)nzGA()}}else if(!cmp){decide()}}})}catch(e){decide()}setTimeout(function(){if(!cmp)decide()},1200);return true}if(!hook()){if(!document.querySelector('script[src*="adsbygoogle.js"]'))decide();else{window.addEventListener('load',hook);setTimeout(function(){if(!hook())decide()},900)}}window.NZConsent={get:get,set:put,mode:function(){return cmp||'own'}};document.addEventListener('click',function(e){var b=e.target.closest('[data-consent]');if(b){put(b.dataset.consent==='yes');return}var p=e.target.closest('[data-privacy]');if(p){e.preventDefault();if(cmp==='tcf'&&window.googlefc&&window.googlefc.callbackQueue){window.googlefc.callbackQueue.push(window.googlefc.showRevocationMessage)}else{own();var f=el.querySelector('button');if(f)f.focus()}}})})()`;
const CONSENT_JS = `<script src="/assets/consent.js?v=${VERSION}" defer></script>`;
// EU and UK representative (Art. 27 GDPR / UK GDPR). Fill in name and postal address once appointed, e.g.
// 'Jane Doe, Musterstrasse 1, 10115 Berlin, Germany, jane@example.com'. Empty means the policy says requests go to the controller.
const EU_REP = process.env.NZ_EU_REP || '';
const UK_REP = process.env.NZ_UK_REP || '';
// service worker: versioned cache; pages network-first (so a new release shows at once), data and assets cache-first
// (their URLs carry ?v=VERSION); nothing from other hosts is touched (ads, analytics, maps, Wikimedia pass straight through)
const SW_SRC = `const V='nz-__VERSION__';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['/offline.html','/assets/site.css?v=__VERSION__','/data/meta.json?v=__VERSION__'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c).then(()=>x.keys()).then(ks=>{const pages=ks.filter(k=>!/[?]v=|offline/.test(k.url));if(pages.length>40)pages.slice(0,pages.length-40).forEach(k=>x.delete(k))}))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match('/offline.html'))));return}
if(/^\\/(data|assets|vendor)\\//.test(u.pathname)&&u.search.indexOf('v=')>=0){e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res})))}});
`;
const ADS_TXT = `google.com, ${ADS_CLIENT.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`;
const trimDesc = (d) => { d = String(d); if (d.length <= 158) return d; const c = d.slice(0, 155); return c.slice(0, c.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…'; };
const fitTitle = (parts) => { let t = parts[0].replace(/ \/ [^,(|]+/, ''); if (t.length > 58) t = t.slice(0, 56).replace(/\s+\S*$/, '') + '…'; for (const x of parts.slice(1)) if ((t + x).length <= 58) t += x; return t + ' | Nestlyzer'; };
function page({ p, title, desc, body, jsonld = [], crumbs = [], cc = null, appHref = null }) {
  desc = trimDesc(desc);
  const ld = jsonld.concat(crumbs.length ? [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: SITE + c[1] })) }] : []);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${p}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Nestlyzer"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${p}"><meta property="og:image" content="${SITE}/assets/og.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><meta name="theme-color" content="#F2F4F0">
<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin-standard-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/site.css?v=${VERSION}"><script>${STATIC_JS}</script>${tracking({ ads: p !== '/legal/' })}
${ld.length ? `<script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld).replace(/</g, '\\u003c')}</script>` : ''}</head><body><a class="skip" href="#main">Skip to content</a>${CONSENT_HTML}${header(false, cc, appHref)}
<main id="main" class="page">${crumbs.length > 1 ? `<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => i < crumbs.length - 1 ? `<a href="${c[1]}">${esc(c[0])}</a><span aria-hidden="true">›</span>` : `<span aria-current="page">${esc(c[0])}</span>`).join('')}</nav>` : ''}${body}</main>${footer()}${STATIC_TAIL.replace('__CONSENT_HTML__', '').replace('__CONSENT_JS__', CONSENT_JS)}</body></html>`;
  write(p.replace(/^\//, '') + 'index.html', html);
  SITEMAP.push(p);
}
const SITEMAP = [];

// ------------------------------------------------------------------ helpers for content
const depthText = (cc) => { const d = countries.find((c) => c.cc === cc).depth; return d === 'detailed' ? 'Detailed module: 28 official Swiss factors (Federal Statistical Office portraits, ESTV tax burden) plus four geographic measures.' : d === 'partial' ? 'Partial module: official population, age structure and growth from Statistics Austria plus four geographic measures.' : 'Foundation data: population, density and five-year growth from Eurostat GISCO LAU plus four geographic measures. Local tax, school, safety, health and housing data are not joined yet, so these rankings are a first filter, not a verdict.'; };
const scoreCell = (v) => `<span class="chip ${v >= 70 ? 'tone-good' : v >= 50 ? 'tone-mid' : 'tone-bad'}"><b>${fmt(v)}</b></span>`;
const placeLink = (r, p = 'young_family') => PAGES[r.id] ? `<a href="${PAGES[r.id]}">${esc(r.name)}</a>` : `<a href="${appLink({ cc: r.country, p, sel: r.id })}">${esc(r.name)}</a>`;
function topList(list, cc, p, extra) {
  if (!list.length) return '<p class="muted">No municipality passes this profile here. The profile needs data this country does not have yet, or no place meets its minimums.</p>';
  return `<ol class="rank-list">${list.map((x) => `<li><span class="n">${x.rank}</span><span>${placeLink(x.r, p)}<br><span class="small muted">${esc(localOf(x.r) || '')}, ${fmtInt(x.r.popNow)} residents</span></span>${scoreCell(x.overall)}</li>`).join('')}</ol><p class="small"><a href="${appLink({ cc, p, ...(extra || {}) })}">See all on the map</a></p>`;
}
function cats(r) { return engine.categories(r); }
const UNITS = { PT: ['parish', 'parishes'], IE: ['local electoral area', 'local electoral areas'], EL: ['community', 'communities'], CY: ['community', 'communities'], MT: ['locality', 'localities'] };
const unitW = (cc, n) => (UNITS[cc] || ['municipality', 'municipalities'])[n === 1 ? 0 : 1];
const units = (cc, n) => fmtInt(n) + ' ' + unitW(cc, n);
const pl = (n, w, ws) => fmtInt(n) + ' ' + (n === 1 ? w : (ws || w + 's'));
const MULTILINGUAL = new Set(['CH', 'BE', 'LU', 'FI']);
// non-Latin names get their Latin spelling next to them, in titles and headings
const kindSuffix = (r) => r.country === 'PL' && DUPNAME.has(r.country + '|' + r.name) ? ({ '1': ' (town)', '2': ' (rural)', '3': ' (town and rural)' }[String(r.oid).slice(-1)] || '') : '';
const latinName = (r) => /[\u0370-\u03ff\u0400-\u04ff]/.test(r.name) ? `${r.name} (${NestData.translit(r.name)})` : r.name;
function sizeLabel(r) { const p = r.population, u = unitW(r.country, 1); return p >= 100000 && !UNITS[r.country] ? 'city' : p >= 30000 ? 'large ' + u : p >= 10000 ? 'mid-sized ' + u : p >= 3000 ? 'compact ' + u : 'small ' + u; }
function nearest(r, n, pool) { if (!Number.isFinite(r.lat)) return []; return pool.filter((o) => o.id !== r.id && Number.isFinite(o.lat)).map((o) => ({ r: o, d: km([r.lon, r.lat], [o.lon, o.lat]) })).sort((a, b) => a.d - b.d).slice(0, n); }
function languageNote(r) {
  const A = cfg.languageAreas;
  let k = null;
  if (r.country === 'CH') k = r.canton === 'TI' ? 'italian' : ['GE', 'VD', 'NE', 'JU'].includes(r.canton) ? 'french' : ['FR', 'VS', 'BE', 'GR'].includes(r.canton) ? 'bilingual' : 'german';
  else for (const [kk, a] of Object.entries(A)) if ((a.countries || []).includes(r.country)) { k = kk; break; }
  return k && A[k] ? A[k].name.replace(' options', '') : '';
}

// daylight and sunset (same formulas as the app, 25-params.js)
const TZC = { PT: 0, IE: 0, UK: 0, IS: 0, FI: 2, EE: 2, LV: 2, LT: 2, RO: 2, BG: 2, EL: 2, CY: 2 };
function sunDay(r, summer) {
  if (!Number.isFinite(r.lat)) return null;
  const d = (summer ? 23.44 : -23.44) * Math.PI / 180, f = r.lat * Math.PI / 180, h0 = -0.833 * Math.PI / 180;
  const c = (Math.sin(h0) - Math.sin(f) * Math.sin(d)) / (Math.cos(f) * Math.cos(d));
  const len = c <= -1 ? 24 : c >= 1 ? 0 : 2 * Math.acos(c) * 180 / Math.PI / 15;
  const tz = (r.country === 'PT' && r.lon < -20 ? -1 : r.country === 'ES' && r.lon < -13 ? 0 : TZC[r.country] ?? 1) + (summer && r.country !== 'IS' ? 1 : 0);
  const noon = 12 - r.lon / 15 - (summer ? -1.8 : 1.6) / 60;
  return { len, set: len >= 24 || len <= 0 ? null : noon + len / 2 + tz };
}
const hm = (h) => { const m = Math.round(h * 60); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };
const clk = (h) => { h = (h + 24) % 24; const m = Math.round(h * 60); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); };
const DUPNAME = new Set();
const METROS = {}; let METRO_HOME = null; // METROS[cc] = [{ name, recs, home }]
function metrosOf(cc) {
  if (METROS[cc]) return METROS[cc];
  const by = {};
  for (const r of SH[cc].recs) { const m = r.x && r.x.metro; if (m) (by[m] ||= []).push(r); }
  if (!METRO_HOME) { METRO_HOME = {}; for (const c2 of countries) { const xs = JSON.parse(read(`data/x/${c2.cc}.json`)); for (const m of xs.metros || []) if (m[3]) METRO_HOME[m[0]] = c2.cc; } }
  METROS[cc] = Object.entries(by).filter(([, l]) => l.length >= 5).map(([name, recs]) => ({ name, recs, home: !METRO_HOME[name] || METRO_HOME[name] === cc, pop: recs.reduce((a, r) => a + r.population, 0) })).sort((a, b) => b.pop - a.pop);
  return METROS[cc];
}
const metroPath = (cc, name) => `/${cslug(cc)}/greater-${slugify(name)}/`;
const metroTitle = (cc, m) => m.home ? `Greater ${m.name}` : `Greater ${m.name}, ${countries.find((x) => x.cc === cc).name} side`;
function metroPage(cc, m) {
  const cname = countries.find((x) => x.cc === cc).name, t = metroTitle(cc, m);
  const shown = KEY_PROFILES.filter((p) => engine.profiles[p]);
  const listFor = (p) => m.recs.map((r) => [r, RANK[cc][p].byId[r.id]]).filter((x) => x[1]).sort((a, b) => a[1].rank - b[1].rank).slice(0, 10).map(([r, b], i) => ({ r, rank: i + 1, overall: b.score }));
  const maxKm = Math.max(...m.recs.map((r) => r.x.metro_km || 0));
  const big = m.recs.slice().sort((a, b) => b.population - a.population).filter((r) => PAGES[r.id]).slice(0, 40);
  const body = `<h1>Best places to live in ${esc(t)}</h1><p class="lede">${units(cc, m.recs.length)} with ${fmtInt(m.pop)} residents within about ${fmtInt(Math.ceil(maxKm / 5) * 5)} km of ${esc(m.name)}${m.home ? '' : ', on the ' + esc(cname) + ' side of the border'}, ranked for ${profiles.length} household profiles. ${esc(depthText(cc))}</p>
<p class="small muted">A greater area here means every municipality whose nearest big-city core is ${esc(m.name)}, within a radius that grows with the size of the city (20 to 60 km). It is a practical commuting belt, not an official region.</p>
${!m.home ? (() => { const homeCc = countries.find((c2) => c2.cc !== cc && metrosOf(c2.cc).some((x) => x.name === m.name && x.home)); return homeCc ? `<p class="small">The core of the area lies in ${esc(homeCc.name)}: <a href="${metroPath(homeCc.cc, m.name)}">Greater ${esc(m.name)} in ${esc(homeCc.name)}</a>.</p>` : ''; })() : ''}
<div class="cta-band"><h2>Rank ${esc(t)} for your household</h2><a class="btn" href="${appLink({ cc, p: 'young_family', r: 'M:' + m.name })}">Open the map</a></div>
<div class="grid-2">${shown.map((p) => `<section class="card"><h2 style="font-size:var(--step-2)"><a href="${profilePath(p)}" style="color:inherit">For ${esc(AUDIENCE[p])}</a></h2>${topList(listFor(p), cc, p, { r: 'M:' + m.name })}</section>`).join('')}</div>
${big.length ? `<section style="margin-top:28px"><h2 style="font-size:var(--step-2);margin-bottom:10px">Towns in ${esc(t)}</h2><ul class="linklist">${big.map((r) => `<li>${placeLink(r)} <span class="small muted">${fmtInt(r.popNow)}</span></li>`).join('')}</ul></section>` : ''}`;
  const yf = listFor('young_family');
  page({ p: metroPath(cc, m.name), cc, appHref: appLink({ cc, p: 'young_family', r: 'M:' + m.name }), title: fitTitle([`Best places to live in ${t}`]), desc: `Where to live around ${m.name}: ${units(cc, m.recs.length)} in ${t} ranked for families, retirees, commuters and remote workers, from public data.`, body,
    crumbs: [['Home', '/'], [cname, countryPath(cc)], [t, metroPath(cc, m.name)]],
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: `Best places in ${t} for young families`, itemListElement: yf.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.r.name, url: PAGES[x.r.id] ? SITE + PAGES[x.r.id] : undefined })) }] });
}
function highlightsOf(r) {
  const x = r.x || {}, out = [], fr = r.factorRaw || {};
  if (x.land) out.push(`The landscape belongs to ${/Mountains|Alps|Apennines|Pyrenees|Plain|Delta|Riviera|Islands|Lakeland|Upland|Forest|Ardennes|Harz|Sudetes|Balkans|Massif|Vosges|Sierra/.test(x.land.split(', ')[0]) ? 'the ' : ''}${x.land.split(', ')[0]}.`);
  if (Number.isFinite(x.lake_km) && x.lake && x.lake_km < 8) out.push(x.lake_km < 1 ? `It lies on ${x.lake}.` : `${x.lake} is ${fmt(x.lake_km, 1)} km away.`);
  if (Number.isFinite(fr.geo_coast_km) && fr.geo_coast_km < 15) out.push(fr.geo_coast_km < 2 ? `It is right on the coast${x.sea ? ' of the ' + x.sea.replace(/^The /, '') : ''}.` : `The ${x.sea || 'sea'} is ${fmt(fr.geo_coast_km)} km away.`);
  if (Number.isFinite(x.river_km) && x.river && x.river_km < 1) out.push(`The ${x.river} runs through or right past it.`);
  if (x.metro && Number.isFinite(x.metro_km) && x.metro_km > 3) out.push(`It is part of Greater ${x.metro}, ${fmt(x.metro_km)} km from the city centre.`);
  if (Number.isFinite(x.border_km) && x.border && x.border_km < 15) out.push(`The border with ${x.border} is ${fmt(x.border_km)} km away.`);
  const w = sunDay(r, false), su = sunDay(r, true);
  if (w && su && w.set != null && su.set != null) out.push(`On the shortest day the sun is up for ${hm(w.len)} and sets around ${clk(w.set)}; in late June it sets around ${clk(su.set)}.`);
  return out;
}


// ---- small inline graphics for the search-engine pages (no scripts, theme-aware through CSS variables)
const catName = (k) => (meta.categoryLabels[k] || k).replace('Environment and climate', 'Green space');
const bins = [34, 48, 60, 72, 85];
const binOf = (v) => bins.filter((b) => v >= b).length;
function dotMap(cc, p, title, recs0, R0, cap = 2600) {
  const R = R0 || RANK[cc][p]; if (!R) return '';
  const recs = (recs0 || SH[cc].recs).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && !r.superseded);
  if (recs.length < 3) return '';
  const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
  const mlat = med(recs.map((r) => r.lat)), mlon = med(recs.map((r) => r.lon));
  const km = (r) => 111 * Math.hypot(r.lat - mlat, (r.lon - mlon) * Math.cos(mlat * Math.PI / 180));
  let pts = recs.filter((r) => km(r) < 1100);
  const onMap = new Set(pts.map((r) => r.id));
  const top10 = R.list.slice(0, 10).map((x, i) => ({ r: x.r, rank: i + 1 }));
  const top = top10.filter((t) => onMap.has(t.r.id)), off = top10.filter((t) => !onMap.has(t.r.id));
  if (pts.length > cap) { const keep = new Set(top.map((t) => t.r.id)); pts = pts.slice().sort((a, b) => b.popNow - a.popNow).slice(0, cap).filter((r) => !keep.has(r.id)).concat(pts.filter((r) => keep.has(r.id))); }
  const k = Math.cos(mlat * Math.PI / 180);
  const xs = pts.map((r) => r.lon * k), ys = pts.map((r) => -r.lat);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = 600, H = Math.max(260, Math.min(620, Math.round(W * (y1 - y0) / Math.max(x1 - x0, 1e-6))));
  const sc = Math.min((W - 40) / Math.max(x1 - x0, 1e-6), (H - 40) / Math.max(y1 - y0, 1e-6));
  const X = (r) => 20 + (r.lon * k - x0) * sc + (W - 40 - (x1 - x0) * sc) / 2, Y = (r) => 20 + (-r.lat - y0) * sc + (H - 40 - (y1 - y0) * sc) / 2;
  const rad = pts.length > 1500 ? 1.6 : pts.length > 300 ? 2.4 : 3.6;
  const groups = [[], [], [], [], [], [], []];
  for (const r of pts) { const a = R.byId[r.id]; groups[a ? binOf(a.score) : 6].push(`M${X(r).toFixed(1)} ${Y(r).toFixed(1)}h0`); }
  const paths = groups.map((g, i) => g.length ? `<path class="${i === 6 ? 'dm-out' : 'dm-' + i}" stroke-width="${rad * 2}" d="${g.join('')}"/>` : '').join('');
  // pins: placed in rank order; a pin that would cover another moves outward and keeps a thin line to its place
  const placed = [];
  const pins = top.map((t) => {
    const px = X(t.r), py = Y(t.r); let bx = px, by = py, step = 0;
    while (placed.some((q) => Math.hypot(q[0] - bx, q[1] - by) < 20) && step < 60) { step++; const a = step * 2.399, d = 12 + step * 2.2; bx = Math.min(W - 11, Math.max(11, px + Math.cos(a) * d)); by = Math.min(H - 11, Math.max(11, py + Math.sin(a) * d)); }
    placed.push([bx, by]);
    const href = PAGES[t.r.id] || appLink({ cc, p, sel: t.r.id });
    const line = step ? `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}"/><circle class="dm-dot" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.6"/>` : '';
    return `<a href="${href}" class="dm-pin">${line}<g transform="translate(${bx.toFixed(1)} ${by.toFixed(1)})"><circle r="9"/><text y="3.5">${t.rank}</text></g><title>#${t.rank} ${esc(t.r.name)}</title></a>`;
  }).reverse().join('');
  if (!top10.length) title = title.replace(/; numbers mark the top 10$/, '') + ': no place here passes this profile yet, so every dot is grey';
  const offNote = off.length ? ` ${off.map((t) => '#' + t.rank).join(', ')} ${off.length > 1 ? 'lie' : 'lies'} outside this map (overseas).` : '';
  return `<figure class="dotmap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><g stroke-linecap="round">${paths}</g>${pins}</svg><figcaption><span>${esc(title)}.${esc(offNote)}</span><span class="dm-key"><i class="dm-0"></i>weaker<i class="dm-2"></i><i class="dm-3"></i><i class="dm-4"></i><i class="dm-5"></i>best fit <i class="dm-out"></i>not ranked</span></figcaption></figure>`;
}
function barList(items) { // [[label, value 0..100]]
  return `<ul class="bars">${items.map(([l, v]) => `<li><span class="bl">${esc(l)}</span><span class="bt"><span class="bf dm-${binOf(v)}" style="width:${Math.max(3, Math.min(100, v)).toFixed(0)}%"></span></span><b>${fmt(v)}</b></li>`).join('')}</ul>`;
}
function popChart(ap) {
  if (!ap || ap.length < 2) return '';
  const hi = Math.max(...ap.map((x) => x.population)), first = ap[0], last = ap[ap.length - 1];
  const W = 320, H = 126, bw = W / ap.length;
  const bars = ap.map((x, i) => { const h = Math.max(2, 74 * x.population / hi); return `<g><rect x="${(i * bw + 4).toFixed(1)}" y="${(102 - h).toFixed(1)}" width="${(bw - 8).toFixed(1)}" height="${h.toFixed(1)}" rx="4"/><text x="${(i * bw + bw / 2).toFixed(1)}" y="118">${x.year}</text><text class="v" x="${(i * bw + bw / 2).toFixed(1)}" y="${(96 - h).toFixed(1)}">${fmtInt(x.population)}</text><title>${x.year}: ${fmtInt(x.population)}</title></g>`; }).join('');
  const ch = (last.population / first.population - 1) * 100;
  return `<svg class="popchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Residents by year: ${ap.map((x) => x.year + ' ' + fmtInt(x.population)).join(', ')}">${bars}</svg><p class="small muted">${ch >= 0 ? '+' : '−'}${fmt(Math.abs(ch), 1)}% from ${first.year} to ${last.year}. Bars start at zero.</p>`;
}
// ------------------------------------------------------------------ municipality / town pages
function placePage(r) {
  const cc = r.country, reg = regionOf(r), c = cats(r), fr = r.factorRaw || {}, g = r.geo || {};
  const cname = countries.find((x) => x.cc === cc).name;
  const rows = profiles.map((p) => {
    const a = RANK[cc][p].byId[r.id], b = reg ? RRANK[cc][reg.code].p[p].byId[r.id] : null;
    const why = a ? '' : (() => { const s = engine.scoreRaw(r, p, 55, cc); if (!s) return 'not enough data'; const f = engine.eligibilityFail(r, p, cc) || ''; return f.replace(/^(.*) floor$/i, (m0, k) => 'below the minimum for ' + k.toLowerCase()).replace(/population/i, 'too few residents'); })();
    return `<tr><td><a href="${profilePath(p)}">${esc(engine.profiles[p].name)}</a></td><td class="num nowrap">${a ? `<span class="sbar"><i class="dm-${binOf(a.score)}" style="width:${Math.round(a.score)}%"></i></span>${scoreCell(a.score)}` : ''}</td><td class="num">${a ? `#${fmtInt(a.rank)} of ${fmtInt(RANK[cc][p].n)}` : `<span class="small muted">not ranked: ${esc(why)}</span>`}</td><td class="num">${b ? `#${b.rank} of ${RRANK[cc][reg.code].p[p].n}` : '–'}</td><td class="nowrap"><a class="small" href="${appLink({ cc, p, sel: r.id })}" aria-label="${esc(engine.profiles[p].name)} on the map">Map</a></td></tr>`;
  }).join('');
  const ranked = profiles.map((p) => [p, RANK[cc][p].byId[r.id]]).filter((x) => x[1]).sort((a, b) => a[1].rank / RANK[cc][a[0]].n - b[1].rank / RANK[cc][b[0]].n);
  const NICHE = new Set(['swiss_lottery', 'hnw']);
  const best = ranked.filter(([p]) => !NICHE.has(p)).slice(0, 3).map(([p, a]) => `${AUDIENCE[p]} (top ${Math.max(1, Math.ceil(100 * a.rank / RANK[cc][p].n))}%, #${fmtInt(a.rank)} of ${fmtInt(RANK[cc][p].n)})`);
  const top = Object.entries(c).filter(([k]) => !k.endsWith('_access') && !(k === 'coast' && !(fr.geo_coast_km < 80))).sort((a, b) => b[1] - a[1]);
  const t = r.trend || {};
  const five = Number.isFinite(t.population_5y_pct) ? t.population_5y_pct : fr.common_population_growth_5y;
  const facts = [
    ['Residents', fmtInt(r.popNow)], ['Density', fmtInt(r.area_km2 > 0 ? r.popNow / r.area_km2 : r.density) + ' per km²'], ['Area', fmt(r.area_km2, 1) + ' km²'],
    Number.isFinite(five) ? ['5-year growth', signed(five) + '%'] : null,
    Number.isFinite(fr.single_income_tax_100k) ? ['Tax, single, CHF 100k', fmt(fr.single_income_tax_100k, 1) + '%'] : null,
    Number.isFinite(fr.family_income_tax_100k) ? ['Tax, family, CHF 100k', fmt(fr.family_income_tax_100k, 1) + '%'] : null,
    Number.isFinite(fr.wealth_tax_1m) ? ['Wealth tax on CHF 1m', fmt(fr.wealth_tax_1m, 2) + '‰'] : null,
    Number.isFinite(fr.geo_hub_airport_km) ? ['Hub airport', `${fmt(fr.geo_hub_airport_km)} km` + (g.hubAirport ? ` (${g.hubAirport.replace(/ Airport.*$/, '')})` : '')] : null,
    Number.isFinite(fr.geo_major_city_km) ? ['Nearest city of 100k+', fr.geo_major_city_km === 0 ? 'Itself' : fmt(fr.geo_major_city_km) + ' km'] : null,
    Number.isFinite(fr.geo_catchment_30km) ? ['Within 30 km', fmtInt(fr.geo_catchment_30km) + ' people'] : null,
    Number.isFinite(fr.geo_coast_km) && fr.geo_coast_km < 80 ? ['Sea coast', fmt(fr.geo_coast_km) + ' km'] : null,
    r.x && r.x.kg && KG[r.x.kg] ? ['Climate type', KG[r.x.kg] + ' (' + r.x.kg + ')'] : null,
    r.x && Number.isFinite(r.x.alt) ? ['Terrain around it', 'about ' + fmtInt(Math.round(r.x.alt / 10) * 10) + ' m, height range ' + fmtInt(Math.round((r.x.relief || 0) / 10) * 10) + ' m'] : null,
    r.x && Number.isFinite(r.x.lake_km) && r.x.lake_km < 25 && r.x.lake ? ['Nearest large lake', r.x.lake + ', ' + (r.x.lake_km < 1 ? 'on the shore' : fmt(r.x.lake_km, r.x.lake_km < 10 ? 1 : 0) + ' km')] : null,
    r.x && Number.isFinite(r.x.river_km) && r.x.river_km < 10 && r.x.river ? ['Nearest major river', r.x.river + ', ' + (r.x.river_km < 1 ? 'under 1 km' : fmt(r.x.river_km, 1) + ' km')] : null,
    r.x && Number.isFinite(r.x.rail_km) ? ['Main railway line', r.x.rail_km < 1 ? 'under 1 km' : fmt(r.x.rail_km, 1) + ' km'] : null,
    r.x && Number.isFinite(r.x.border_km) && r.x.border_km < 60 && r.x.border ? ['Border with ' + r.x.border, fmt(r.x.border_km) + ' km'] : null,
    r.x && Number.isFinite(r.x.cap_km) && SH[cc].capital ? ['Distance to ' + SH[cc].capital, fmt(r.x.cap_km) + ' km'] : null,
    r.x && Number.isFinite(r.x.pop10) ? ['Within 10 km', fmtInt(r.x.pop10) + ' people'] : null,
    r.x && r.x.metro ? ['Greater area', 'Greater ' + r.x.metro + (r.x.metro_km > 3 ? ', ' + fmt(r.x.metro_km) + ' km out' : ', the core')] : null,
    r.x && r.x.land ? ['Landscape', r.x.land] : null,
    (() => { const w = sunDay(r, false); return w && w.set != null ? ['Winter daylight', hm(w.len) + ', sunset ' + clk(w.set)] : null; })(),
  ].filter(Boolean);
  const note = cc === 'CH' ? cfg.placeNotes[stripParen(r.name) + '|' + r.canton] : null;
  const pool = SH[cc].recs;
  const near = nearest(r, 8, cc === 'CH' ? pool : pool.filter((o) => PAGES[o.id] || o.population >= 5000));
  const lang = languageNote(r);
  const intro = `${r.name} is a ${sizeLabel(r)} in ${reg ? reg.name + ', ' : ''}${cname}, home to ${fmtInt(r.popNow)} people${lang && MULTILINGUAL.has(cc) ? ` in the ${lang} area` : ''}. ` + (best.length ? `Of the ${profiles.length} household profiles on Nestlyzer, its strongest are ${best.join(', ')}.` : `It does not pass the minimums of any household profile in ${cname} yet, usually because of its size or missing local data.`);
  const hl = highlightsOf(r);
  const ctaHref = appLink({ cc, p: (ranked.find(([k]) => !NICHE.has(k)) || ranked[0] || ['young_family'])[0], sel: r.id });
  const body = `<h1>Living in ${esc(latinName(r) + kindSuffix(r))}${DUPNAME.has(cc + '|' + r.name) && reg ? `<span class="h1-sub">, ${esc(reg.name)}</span>` : ''}</h1><p class="lede">${esc(intro)}</p>
<div class="facts">${facts.map(([k, v]) => `<div class="fact"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
<div class="cta-band"><h2>See ${esc(r.name)} on the map</h2><a class="btn" href="${ctaHref}">Open in Nestlyzer</a></div>
${hl.length ? `<section class="card" style="margin-top:18px"><h2 style="font-size:var(--step-2);margin-bottom:8px">Good to know about ${esc(r.name)}</h2><ul>${hl.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>${r.x && r.x.metro && metrosOf(cc).some((m) => m.name === r.x.metro) ? `<p class="small"><a href="${metroPath(cc, r.x.metro)}">Best places in Greater ${esc(r.x.metro)}</a></p>` : ''}</section>` : ''}
<div class="grid-2"><section class="card"><h2 style="font-size:var(--step-2);margin-bottom:8px">How ${esc(r.name)} ranks</h2><p class="small muted">Scores run 0 to 100 against every municipality in ${esc(cname)}. Ranks count only the places that pass each profile's minimums, so the totals differ by profile. ${esc(depthText(cc))}</p><div style="overflow-x:auto"><table class="table stack"><thead><tr><th>Profile</th><th class="num">Score</th><th class="num">In ${esc(cname)}</th><th class="num">In ${esc(reg ? reg.name : 'region')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>
<section class="card"><h2 style="font-size:var(--step-2);margin-bottom:8px">Strengths and trade-offs</h2>${barList(top.map(([k, v]) => [catName(k), v]))}
${note ? `<h3 style="margin-top:18px">Local context</h3><p>${esc(note.setting)} ${esc(note.background || '')}</p>${note.proximity ? `<p>${esc(note.proximity)}</p>` : ''}${note.watch ? `<p><b>Watch:</b> ${esc(note.watch)}</p>` : ''}` : ''}
${t.annual_population ? `<h3 style="margin-top:18px">Residents by year</h3>${popChart(t.annual_population)}` : ''}
${near.length ? `<h3 style="margin-top:18px">Nearby</h3><ul class="linklist">${near.map((o) => `<li>${placeLink(o.r)} <span class="small muted">${Math.round(o.d)} km</span></li>`).join('')}</ul>` : ''}</section></div>
<p class="small muted" style="margin-top:20px">Data: ${cc === 'CH' ? 'Swiss FSO regional portraits, ESTV tax burden 2018, Eurostat GISCO LAU' : 'Eurostat GISCO LAU ' + ((meta.population || {}).year || 2024) + (cc === 'AT' ? ', Statistics Austria' : '')}; locations EDJNet LAU centres; airports OurAirports; coastline Natural Earth. Updated ${TODAY}. Rankings are decision aids, not advice.</p>`;
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'Place', name: r.name, url: SITE + PAGES[r.id], additionalProperty: [{ '@type': 'PropertyValue', name: 'Residents', value: r.popNow }], address: { '@type': 'PostalAddress', addressRegion: reg ? reg.name : undefined, addressCountry: FLAG[cc] || cc }, ...(Number.isFinite(r.lat) ? { geo: { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lon } } : {}), containedInPlace: { '@type': 'AdministrativeArea', name: reg ? reg.name : cname } }];
  page({ p: PAGES[r.id], cc, appHref: ctaHref, title: fitTitle([`Living in ${latinName(r)}${kindSuffix(r)}`, DUPNAME.has(cc + '|' + r.name) && reg ? `, ${reg.name}` : '', `, ${cname}`, ': ranks and facts']), desc: `${r.name} (${fmtInt(r.popNow)} residents): how it ranks for families, retirees, commuters, remote workers and ${profiles.length - 4} more profiles, with distances, growth${cc === 'CH' ? ' and tax burden' : ''}.`, body, jsonld, crumbs: [['Home', '/'], [cname, countryPath(cc)], ...(reg ? [[reg.name, regionPath(cc, reg)]] : []), [r.name, PAGES[r.id]]] });
}

// ------------------------------------------------------------------ region pages
function regionPage(cc, code) {
  const R = RRANK[cc][code], reg = R.reg, cname = countries.find((x) => x.cc === cc).name;
  const recs = R.recs, pop = recs.reduce((a, r) => a + r.population, 0);
  const big = recs.slice().sort((a, b) => b.population - a.population);
  const linked = cc === 'CH' ? recs.slice().sort((a, b) => a.name.localeCompare(b.name)) : big.filter((r) => PAGES[r.id]);
  const shown = KEY_PROFILES.filter((p) => engine.profiles[p]);
  const body = `<h1>Best places to live in ${esc(reg.name)}</h1><p class="lede">${units(cc, recs.length)} and ${fmtInt(pop)} residents in ${esc(reg.name)}, ${esc(cname)}, ranked for ${profiles.length} household profiles. ${esc(depthText(cc))}</p>
${recs.length >= 8 ? dotMap(cc, 'young_family', `Young family fit across ${reg.name}, one dot per place${recs.length > 1500 ? ' (the 1,500 largest shown)' : ''}; numbers mark the top 10`, recs, R.p.young_family, 1500) : ''}
<div class="cta-band"><h2>Rank ${esc(reg.name)} for your household</h2><a class="btn" href="${appLink({ cc, p: 'young_family', ...(cc === 'CH' ? { a: code } : { r: code }) })}">Open the map</a></div>
<div class="grid-2">${shown.map((p) => `<section class="card"><h2 style="font-size:var(--step-2)"><a href="${profilePath(p)}" style="color:inherit">For ${esc(AUDIENCE[p])}</a></h2>${topList(R.p[p].list.slice(0, 10).map((x) => x), cc, p)}</section>`).join('')}</div>
<section style="margin-top:28px"><h2 style="font-size:var(--step-2);margin-bottom:10px">All profiles in ${esc(reg.name)}</h2><table class="table"><thead><tr><th>Profile</th><th>Top place</th><th class="num">Score</th><th class="num">Places that pass</th></tr></thead><tbody>${profiles.map((p) => { const x = R.p[p].list[0]; return `<tr><td><a href="${profilePath(p)}">${esc(engine.profiles[p].name)}</a></td><td>${x ? placeLink(x.r, p) : '–'}</td><td class="num">${x ? scoreCell(x.overall) : ''}</td><td class="num">${fmtInt(R.p[p].n)}</td></tr>`; }).join('')}</tbody></table></section>
${linked.length ? `<section style="margin-top:28px"><h2 style="font-size:var(--step-2);margin-bottom:10px">${cc === 'CH' ? 'Every municipality' : 'Towns of 30,000+'} in ${esc(reg.name)}</h2><ul class="linklist">${linked.map((r) => `<li>${placeLink(r)} <span class="small muted">${fmtInt(r.popNow)}</span></li>`).join('')}</ul></section>` : ''}`;
  page({ p: regionPath(cc, reg), cc, appHref: appLink({ cc, p: 'young_family', ...(cc === 'CH' ? { a: code } : { r: code }) }), title: fitTitle([`Best places to live in ${reg.name}`, `, ${cname}`]), desc: `Where to live in ${reg.name}: ${units(cc, recs.length)} ranked for families, retirees, commuters, remote workers and more, from public data.`, body, crumbs: [['Home', '/'], [cname, countryPath(cc)], [reg.name, regionPath(cc, reg)]],
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: `Best places in ${reg.name} for young families`, itemListElement: R.p.young_family ? R.p.young_family.list.slice(0, 10).map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.r.name, url: PAGES[x.r.id] ? SITE + PAGES[x.r.id] : undefined })) : [] }] });
}

// ------------------------------------------------------------------ country pages
function countryPage(c) {
  const cc = c.cc, regs = Object.values(RRANK[cc]).sort((a, b) => a.reg.name.localeCompare(b.reg.name));
  const big = SH[cc].recs.slice().sort((a, b) => b.population - a.population).slice(0, 30);
  const shown = KEY_PROFILES.filter((p) => engine.profiles[p]);
  const body = `<h1>${flagImg(cc, 30)} Best places to live in ${esc(c.name)}</h1><p class="lede">${units(cc, c.n)} and ${fmtInt(c.pop)} residents, ranked for ${profiles.length} household profiles. ${esc(depthText(cc))}</p>
<div class="facts"><div class="fact"><span>Municipalities</span><b>${fmtInt(c.n)}</b></div><div class="fact"><span>Residents</span><b>${fmtInt(c.pop)}</b></div><div class="fact"><span>Regions</span><b>${regs.length || 1}</b></div><div class="fact"><span>Data depth</span><b style="font-size:1.1rem">${esc(({ detailed: 'Detailed', partial: 'Partial', foundation: 'Early indication' })[c.depth] || (c.depth || '').replace(/^./, (m) => m.toUpperCase()))}</b></div></div>
${dotMap(cc, 'young_family', `Young family fit across ${c.name}, one dot per place${SH[cc].recs.length > 2600 ? ' (the 2,600 largest shown)' : ''}; numbers mark the top 10`)}
<div class="cta-band"><h2>Rank ${esc(c.name)} for your household</h2><a class="btn" href="${appLink({ cc, p: 'young_family' })}">Open the map</a></div>
<div class="grid-2">${shown.map((p) => `<section class="card"><h2 style="font-size:var(--step-2)"><a href="${profilePath(p)}" style="color:inherit">For ${esc(AUDIENCE[p])}</a></h2>${topList(RANK[cc][p].list.slice(0, 10), cc, p)}</section>`).join('')}</div>
${regs.length ? `<section style="margin-top:28px"><h2 style="font-size:var(--step-2);margin-bottom:10px">Regions</h2><ul class="linklist">${regs.map((o) => `<li><a href="${regionPath(cc, o.reg)}">${esc(o.reg.name)}</a> <span class="small muted">${pl(o.recs.length, 'place')}</span></li>`).join('')}</ul></section>` : ''}
${metrosOf(cc).length ? `<section style="margin-top:28px"><h2 style="font-size:var(--step-2);margin-bottom:10px">Greater areas</h2><ul class="linklist">${metrosOf(cc).map((m) => `<li><a href="${metroPath(cc, m.name)}">${esc(metroTitle(cc, m))}</a> <span class="small muted">${pl(m.recs.length, 'place')}</span></li>`).join('')}</ul></section>` : ''}
<section style="margin-top:28px"><h2 style="font-size:var(--step-2);margin-bottom:10px">Largest places</h2><ul class="linklist">${big.map((r) => `<li>${placeLink(r)} <span class="small muted">${fmtInt(r.popNow)}</span></li>`).join('')}</ul></section>`;
  const yfC = RANK[cc].young_family ? RANK[cc].young_family.list.slice(0, 10) : [];
  page({ p: countryPath(cc), cc, jsonld: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: `Best places in ${c.name} for young families`, itemListElement: yfC.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.r.name, url: PAGES[x.r.id] ? SITE + PAGES[x.r.id] : undefined })) }], title: fitTitle([`Best places to live in ${c.name}`, `: ${units(cc, c.n)} ranked`]), desc: `Where to live in ${c.name}? Compare ${units(cc, c.n)} for families, retirees, commuters, remote workers, students and more. Transparent scores from public data.`, body, crumbs: [['Home', '/'], [c.name, countryPath(cc)]] });
}


// ------------------------------------------------------------------ about page (founder interview)
function aboutPage() {
  const A = JSON.parse(read('build/content/about.json'));
  const findPlace = (name) => { for (const cc of Object.keys(SH)) { const r = SH[cc].recs.find((x) => x.name === name && !x.superseded && PAGES[x.id]); if (r) return r; } return null; };
  const fig = (k, lead) => {
    const f = A.photos[k], r = f.find ? findPlace(f.find) : null, link = f.link || (r ? PAGES[r.id] : '');
    return `<figure class="about-fig${lead ? ' lead' : ''} ${k === 'meilen' ? 'tall' : ''}"><img src="/assets/about/${f.src}-700.jpg" srcset="/assets/about/${f.src}-700.jpg 700w, /assets/about/${f.src}.jpg 1400w" sizes="(max-width: 760px) 100vw, (min-width: 1000px) 840px, 720px" alt="${esc(f.alt)}" loading="${lead ? 'eager' : 'lazy'}" decoding="async"><figcaption>${esc(f.caption)}${link ? ` <a href="${link}">${esc(f.linkText || (r ? r.name + ' on Nestlyzer' : 'On Nestlyzer'))}</a>` : ''}</figcaption></figure>`;
  };
  const linkify = (t) => esc(t).replace('CurveScout concerns', '<a href="https://curvescout.com" rel="noopener">CurveScout</a> concerns').replace('DipMapper concerns', '<a href="https://dipmapper.com" rel="noopener">DipMapper</a> concerns');
  let firstPhoto = true;
  const qa = A.qa.map((x) => {
    if (x.photo) { const h = fig(x.photo, firstPhoto); firstPhoto = false; return h; }
    return `<section class="qa"><h2>${esc(x.q)}</h2>${x.a.map((p) => `<p>${linkify(p)}</p>`).join('')}${x.note ? `<aside class="about-note"><b>How Nestlyzer does it.</b> ${esc(x.note)}</aside>` : ''}</section>`;
  }).join('\n');
  const body = `<article class="about"><h1>${esc(A.title)}</h1><p class="lede">${esc(A.standfirst)}</p>
${A.intro.map((p) => `<p>${esc(p)}</p>`).join('')}
${qa}
<div class="cta-band"><h2>Find where you fit</h2><a class="btn" href="${appLink({ cc: 'CH', p: 'young_family' })}">Open the map</a></div>
<p class="small muted">Interview with Torsten Sauter, founder and operator of Nestlyzer, Meilen, Switzerland. Photos: Torsten Sauter. Contact: <a href="mailto:torsten.sauter@icloud.com">torsten.sauter@icloud.com</a>.</p></article>`;
  page({ p: '/about/', title: 'About Nestlyzer: an interview with founder Torsten Sauter | Nestlyzer', desc: 'Why Nestlyzer exists: a conversation with founder Torsten Sauter about choosing where to live, rankings that change with your priorities, and looking beyond familiar places.', body,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About Nestlyzer', url: SITE + '/about/', mainEntity: { '@type': 'Person', name: 'Torsten Sauter', jobTitle: 'Founder', worksFor: { '@type': 'Organization', name: 'Nestlyzer', url: SITE }, address: { '@type': 'PostalAddress', addressLocality: 'Meilen', addressCountry: 'CH' } } }],
    crumbs: [['Home', '/'], ['About', '/about/']] });
}

// ------------------------------------------------------------------ profile pages
function bestIndexPage() {
  const body = `<h1>Best places to live, by household</h1><p class="lede">${profiles.length} household profiles, each a transparent set of weights. Pick yours to see its best places in Switzerland and across ${countries.length - 1} more European countries.</p>
<div class="tiles">${profiles.map((k) => `<a class="tile" href="${profilePath(k)}" style="--tone:${cfg.tones[k] || '#0e7490'}"><span class="ico">${ico(k, 20)}</span><span><b>${esc(engine.profiles[k].name)}</b><small>${esc(TILE_BLURB[k] || (engine.profiles[k].intro || '').split('.')[0])}</small></span></a>`).join('')}</div>
<div class="cta-band"><h2>Or build your own profile</h2><a class="btn" href="${appLink({ cc: 'CH', p: 'young_family' })}">Open the map</a></div>`;
  page({ p: '/best/', title: 'Best places to live in Europe for every kind of household | Nestlyzer', desc: `Rankings for ${profiles.length} household profiles: families, retirees, students, commuters, remote workers and more, across ${countries.length} European countries.`, body, crumbs: [['Home', '/'], ['Profiles', '/best/']] });
}
function profilePage(p) {
  const P = engine.profiles[p];
  const w = Object.entries(P.weights).sort((a, b) => b[1] - a[1]);
  const strict = Object.entries(P.strict || {});
  const ch = RANK.CH[p];
  const others = countries.filter((c) => c.cc !== 'CH').map((c) => [c, RANK[c.cc][p]]).filter(([, R]) => R.n);
  const body = `<h1>Best places to live for ${esc(AUDIENCE[p])}</h1><p class="lede">${esc(PROFILE_COPY[p] || ((P.intro || '') + ' ' + P.desc))}</p>
<section class="card"><h2 style="font-size:var(--step-2);margin-bottom:8px">What this profile weighs</h2><div style="display:flex;flex-wrap:wrap;gap:6px">${w.map(([k, v]) => `<span class="chip">${esc(catName(k))} <b>${v}</b></span>`).join('')}</div>${strict.length ? `<p class="small" style="margin-top:10px">Minimum category scores in Switzerland: ${strict.map(([k, v]) => `${esc(catName(k))} ${v}`).join(', ')}.${P.minPop ? ` Places need at least ${fmtInt(P.minPop)} residents.` : ''}</p>` : P.minPop ? `<p class="small">Places need at least ${fmtInt(P.minPop)} residents.</p>` : ''}</section>
<div class="cta-band"><h2>Rank any country for ${esc(AUDIENCE[p])}</h2><a class="btn" href="${appLink({ cc: 'CH', p })}">Open the map</a></div>
<div class="grid-2"><section class="card"><h2 style="font-size:var(--step-2)">${flagImg('CH', 18)} Switzerland, top 20</h2><p class="small muted">Deepest data: 28 official factors.</p>${topList(ch.list.slice(0, 20), 'CH', p)}</section>
<section class="card"><h2 style="font-size:var(--step-2)">Across Europe</h2><p class="small muted">Best match per country among places in Europe with at least 5,000 residents (overseas territories such as French Guiana or Réunion are left out here). Outside Switzerland and Austria this is an early indication from population, growth and geography only, so treat it as a first filter.</p><table class="table"><tbody>${others.map(([c, R]) => { const eu = (r) => r.lat > 27 && r.lat < 72 && r.lon > -32 && r.lon < 45; const x = R.list.find((y) => y.r.popNow >= 5000 && eu(y.r)) || R.list.find((y) => eu(y.r)) || R.list[0]; return `<tr><td>${flagImg(c.cc)} <a href="${countryPath(c.cc)}">${esc(c.name)}</a></td><td>${placeLink(x.r, p)}</td><td class="num">${scoreCell(x.overall)}</td></tr>`; }).join('')}</tbody></table></section></div>
<section style="margin-top:28px"><h2 style="font-size:var(--step-2);margin-bottom:10px">Other profiles</h2><ul class="linklist">${profiles.filter((k) => k !== p).map((k) => `<li><a href="${profilePath(k)}">${esc(engine.profiles[k].name)}</a></li>`).join('')}</ul></section>`;
  page({ p: profilePath(p), title: fitTitle([`Best places for ${AUDIENCE[p]}`, ' in Europe']), desc: `Where should ${AUDIENCE[p]} live? Rankings across Switzerland and 34 European countries with the weights shown, from public data.`, body, crumbs: [['Home', '/'], ['Profiles', '/#profiles'], [P.name, profilePath(p)]] });
}

// ------------------------------------------------------------------ method + legal
function methodPage() {
  const f = meta.factors.filter((x) => x.score_role === 'scored' || x.score_role === 'scored_access_proxy');
  const body = `<h1>How Nestlyzer scores places</h1><p class="lede">Every number on Nestlyzer comes from a public dataset, a visible weight or a documented rule. This page lists all of them.</p>
<div class="prose"><h2>The short version</h2><p>Each factor is scored 0 to 100. Factors roll up into categories (costs, family, safety, jobs, mobility and so on), and a category score is the mean of its factor scores. A household profile weights the categories. Profiles also set minimum population and, in Switzerland, minimum category scores, so a tiny village cannot win on one strong number.</p>
<p>Photos, coats of arms, Wikipedia text, contact details, nearby sights, cross-border notes and advertising never change a score.</p>
<h2>Data depth by country</h2><p>Switzerland has the deepest module. Austria adds official age structure. Elsewhere, Nestlyzer uses the Eurostat LAU foundation (population, density, five-year growth) plus four geographic measures that are computed the same way everywhere. Where data is thin, coverage drops and the score is shrunk toward zero instead of being filled with guesses.</p>
<h2>What changed in method v2 (October 2026)</h2><ul>${Engine.METHOD_V2.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p>The previous method (v1) is kept for audit: add <code>&amp;method=v1</code> to any map link. Our regression suite checks that v1 still reproduces the old site's rankings exactly.</p>
<h2>Confidence and coverage</h2><p>${esc(cfg.terms.confidence)}</p><p>Coverage is the share of a profile's weighted factors that can be scored for a place. Outside Switzerland, coverage is estimated from the number of joined official fields and capped at 78%.</p></div>
<h2 style="font-size:var(--step-2);margin:28px 0 10px">All factors</h2><div style="overflow-x:auto"><table class="table stack"><thead><tr><th>Factor</th><th>Category</th><th>Better when</th><th>Countries</th><th>Source</th><th>What it measures</th></tr></thead><tbody>${f.map((x) => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(catName(x.category))}</td><td>${esc(x.direction)}</td><td>${esc((x.countries || ['all']).join(', '))}</td><td>${esc((meta.sources[x.source_id] || {}).name || x.source_id)}</td><td class="small">${esc(x.description)}</td></tr>`).join('')}</tbody></table></div>
<h2 style="font-size:var(--step-2);margin:28px 0 10px">All profiles and weights</h2><div style="overflow-x:auto"><table class="table stack"><thead><tr><th>Profile</th><th>Weights</th><th>Minimums (Switzerland)</th><th class="num">Min. residents</th></tr></thead><tbody>${profiles.map((p) => { const P = engine.profiles[p]; return `<tr><td><a href="${profilePath(p)}">${esc(P.name)}</a></td><td class="small">${Object.entries(P.weights).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${esc(catName(k))} ${v}`).join(', ')}</td><td class="small">${Object.entries(P.strict || {}).map(([k, v]) => `${esc(catName(k))} ${v}`).join(', ') || '–'}</td><td class="num">${P.minPop ? fmtInt(P.minPop) : '–'}</td></tr>`; }).join('')}</tbody></table></div>
<h2 id="freshness" style="font-size:var(--step-2);margin:28px 0 10px">How fresh the data is</h2>
<div class="facts"><div class="fact"><span>Residents, density, growth</span><b>${(meta.population || {}).year || 2024}</b></div><div class="fact"><span>Five-year growth from</span><b>${(meta.population || {}).base_year || 2019}</b></div><div class="fact"><span>Swiss portraits and tax</span><b>2021 / 2018</b></div><div class="fact"><span>Last build</span><b>${TODAY}</b></div></div>
<p>Every month Nestlyzer asks Eurostat whether a newer year of municipal population figures has been published. When one appears, the rankings are rebuilt and checked automatically: a country is updated only if at least 85% of its places match the new table and its total population moves by less than 12%, and a single place whose population jumps by more than half (usually a merger) keeps its previous figures until the change is understood. Geography (coast, airports, railways, terrain, climate) does not change from year to year. ${((meta.population || {}).kept_countries || []).length ? 'Kept at the previous year this time: ' + esc(meta.population.kept_countries.join(', ')) + '.' : ''}</p>
<h2 id="sources" style="font-size:var(--step-2);margin:28px 0 10px">Sources</h2><ul>${Object.entries(meta.sources).filter(([k]) => /gisco|swiss_fso|estv|fso|statistik|ourairports|natural_earth|edjnet|nuts2json|swiss_maps|model_access/.test(k)).filter(([k, x], i, all) => all.findIndex(([, y]) => (y.url || y.name) === (x.url || x.name)) === i).map(([k, s]) => `<li><b>${esc(s.name || k)}</b>${/^https?:/.test(s.url || '') ? ` <a href="${esc(s.url)}">${esc(s.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : ''}${s.licence ? `. ${esc(s.licence)}` : ''}${s.note ? `. ${esc(s.note)}` : ''}</li>`).join('')}<li><b>Wikipedia, Wikidata and Wikimedia Commons</b> for photos, summaries, coats of arms and contact details, loaded in your browser and never scored.</li><li><b>OpenStreetMap</b> via Overpass for nearby sights, and OpenFreeMap vector tiles for the basemap. © OpenStreetMap contributors.</li></ul>
<h2 style="font-size:var(--step-2);margin:28px 0 10px">Known limits</h2><ul class="prose"><li>Distances are straight lines from population-weighted centres, not travel times.</li><li>Outside Switzerland there is no local tax, school, crime, health or housing data yet.</li><li>Swiss tax burden figures are from ESTV 2018 and are relative comparisons, not personal tax advice.</li><li>About 1.7% of European municipalities (mostly merged or renamed communes) have no point location; they are ranked but not drawn and have no distance factors.</li></ul>`;
  page({ p: '/method/', title: 'Methodology: how Nestlyzer ranks places to live | Nestlyzer', desc: 'Every factor, weight, source and rule behind Nestlyzer rankings, including data depth by country and known limits.', body, crumbs: [['Home', '/'], ['Method', '/method/']] });
}
function legalPage() {
  const body = `<h1>Imprint and policies</h1><p class="lede">Last updated: 11 October 2026</p><div class="prose">
<nav class="toc" aria-label="On this page"><a href="#imprint">Imprint</a> · <a href="#privacy">Privacy policy</a> · <a href="#cookies">Cookies and consent</a> · <a href="#terms">Terms of use</a> · <a href="#advertising">Advertising</a> · <a href="#disclaimer">Disclaimer</a> · <a href="#report">Report a problem</a> · <a href="#accessibility">Accessibility</a> · <a href="#copyright">Sources and licences</a></nav>

<h2 id="imprint">Imprint</h2>
<p>Operator and responsible for content:<br>Torsten Sauter<br>Alte Landstrasse 77<br>8706 Meilen<br>Switzerland<br>Email: <a href="mailto:torsten.sauter@icloud.com">torsten.sauter@icloud.com</a></p>
<p>Nestlyzer.com is a privately operated information website. It is not a public authority and does not sell goods or services to visitors.</p>

<h2 id="privacy">Privacy policy</h2>
<p>This policy explains which personal data are processed when you use nestlyzer.com, for what purpose, on what legal basis and with whom they are shared. It follows the Swiss Federal Act on Data Protection (FADP), for visitors in the European Economic Area the EU General Data Protection Regulation (GDPR), and for visitors in the United Kingdom the UK GDPR.</p>

<h3>1. Controller</h3>
<p>Torsten Sauter, Alte Landstrasse 77, 8706 Meilen, Switzerland, <a href="mailto:torsten.sauter@icloud.com">torsten.sauter@icloud.com</a>. Write to this address for any privacy request.</p>

<h3>2. No account, no form, nothing stored on our side</h3>
<p>Nestlyzer has no user accounts, no contact forms and no database of visitors. Your profile choice, filters, shortlist, guided-profile answers, theme and privacy choice are saved only in your own browser (local storage) so that the site remembers them. They are never sent to us. You can delete them at any time by clearing this site's data in your browser.</p>

<h3>3. Hosting</h3>
<p>The site is hosted on GitHub Pages, a service of GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA. When you open a page, your browser sends technical data to GitHub, including your IP address, the page requested, date and time, and browser type. GitHub uses these data to deliver the site and to keep it secure and may keep them in server logs. Legal basis: our legitimate interest in a reliable and secure website (Art. 6(1)(f) GDPR). See the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">GitHub Privacy Statement</a>.</p>

<h3>4. Content loaded from other services</h3>
<p>To show maps, photos and local context, your browser loads content directly from the following services. They receive your IP address and the technical request data needed to deliver the content. Legal basis: our legitimate interest in showing maps and public information about places (Art. 6(1)(f) GDPR).</p>
<ul>
<li>Map tiles: OpenFreeMap (<a href="https://openfreemap.org" rel="noopener">openfreemap.org</a>), a free, independently run map service based on OpenStreetMap data.</li>
<li>Place descriptions, photos, coats of arms and official contact details: Wikipedia, Wikidata and Wikimedia Commons, operated by the Wikimedia Foundation, Inc., USA (<a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy" rel="noopener">privacy policy</a>).</li>
<li>Nearby sights and the count of everyday places (schools, shops, doctors and similar) around a municipality: the OpenStreetMap Overpass API at overpass-api.de, operated in Germany.</li>
<li>Regional statistics (economic output, unemployment, life expectancy, median age, doctors): the Eurostat dissemination API of the European Commission, Luxembourg.</li>
<li>Monthly weather averages: NASA POWER, a service of the US National Aeronautics and Space Administration, USA.</li>
<li>Detailed municipal boundaries, only when you click “Boundaries”: Eurostat GISCO, European Commission, Luxembourg.</li>
</ul>
<p>Fonts, icons and the map software are hosted on nestlyzer.com itself. No fonts are loaded from Google.</p>

${!ANALYTICS ? `<h3>5. No analytics</h3>
<p>Nestlyzer does not use Google Analytics or any other analytics, statistics or tracking service. We do not count or follow visitors.</p>

` : `<h3>5. Analytics (Google Analytics 4), only with your consent</h3>
<p>With your consent we use Google Analytics 4 to understand how the site is used, for example which countries and pages are popular, so that we can improve it. Provider for visitors in Europe: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland; data may also be processed by Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA. Google Analytics sets cookies (for example <code>_ga</code> and <code>_ga_*</code>, stored for up to two years) and processes usage data such as pages viewed, approximate location, device and browser. Google Analytics 4 does not store IP addresses. Your profile, filters and shortlist are not sent to Google Analytics; only the page path is recorded.</p>
<p>Google Analytics is loaded only after you agree. Without your consent it is not loaded, sets no cookies and sends nothing. Google signals and ad personalisation are switched off, so your visit is not linked to advertising profiles. Google acts as our processor for Analytics. Legal basis: your consent (Art. 6(1)(a) GDPR), which you can withdraw at any time under “Privacy settings”. More: <a href="https://policies.google.com/privacy" rel="noopener">Google Privacy Policy</a>, <a href="https://business.safety.google/privacy/" rel="noopener">Google business data responsibility</a>.</p>

`}<h3>6. Advertising (Google AdSense)</h3>
<p>Nestlyzer is free and financed by advertising from Google AdSense, a service of Google Ireland Limited (address above) and Google LLC, USA.</p>
${PRIVACY_STRICT ? '<p>Google asks every AdSense site to publish the following notes. They describe personalised advertising in general; Nestlyzer requests only non-personalised ads.</p>' : ''}
<ul>
<li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</li>
<li>Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the internet.</li>
<li>You can opt out of personalised advertising in Google's <a href="https://myadcenter.google.com/" rel="noopener">My Ad Center</a> (ad settings). You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info/choices/" rel="noopener">aboutads.info</a> or, in Europe, <a href="https://www.youronlinechoices.eu/" rel="noopener">youronlinechoices.eu</a>.</li>
<li>The third-party vendors and ad networks that may serve ads on this site are listed in ${PRIVACY_STRICT ? '' : 'the consent dialog and in '}<a href="https://support.google.com/admanager/answer/9012903" rel="noopener">Google's list of ad technology providers</a>.</li>
</ul>
<p>${PRIVACY_STRICT ? 'Ads on Nestlyzer are never personalised, and the ad service is not even loaded until you press “Accept all”. With “Only necessary”, your browser does not contact Google at all.' : 'Personalised ads are shown only with your consent.'} Advertising cookies (also those for non-personalised ads, which use cookies to limit how often an ad is shown and to prevent fraud) are set only with your consent. ${PRIVACY_STRICT ? 'Without your consent the ad service is not loaded at all, so no ads are shown and Google receives nothing from your visit.' : 'Without consent, Google can show only limited ads:'}${PRIVACY_STRICT ? '' : `  no cookies or other local storage are used for advertising, but Google still processes technical data (such as IP address and the page address) to deliver the ad, count it and prevent fraud. The AdSense script itself loads on every content page, with all consent signals set to "denied" until you choose, so that Google can show its consent dialog.`} For AdSense, Google is an independent controller. Legal basis: your consent (Art. 6(1)(a) GDPR) for ${PRIVACY_STRICT ? 'loading the ad service and its cookies.' : 'advertising cookies and personalised ads;'} ${PRIVACY_STRICT ? '' : 'our legitimate interest in financing the site (Art. 6(1)(f) GDPR) for limited ads.'} How Google uses data from sites that use its services: <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">policies.google.com/technologies/partner-sites</a>. Google's advertising cookies: <a href="https://business.safety.google/adscookies/" rel="noopener">business.safety.google/adscookies</a>.</p>

<h3>7. Transfers outside Switzerland and the EEA</h3>
<p>GitHub and Google may process data in the USA. GitHub, Inc. and Google LLC are certified under the EU-US Data Privacy Framework, its UK Extension and the Swiss-US Data Privacy Framework, which the European Commission, the UK government and the Swiss Federal Council recognise as providing an adequate level of data protection for certified companies. Wikipedia, Wikidata and Wikimedia Commons content is requested by your browser directly from the Wikimedia Foundation, whose servers may be in the USA; the Wikimedia Foundation is not certified under that framework, so the USA may not offer the same level of protection for these requests. The same applies to weather averages requested from NASA POWER, a US government service. These requests name only the places the app is showing (the open place and the top picks on screen, by name, Wikidata number or coordinates), never anything about you, but each service sees your IP address. They start when the map or a place is shown, and you can switch them off: <button class="btn btn-sm" type="button" data-extoggle>Live content: on</button> (photos, nearby places, weather, everyday-life counts and regional statistics are then not loaded). Nestlyzer sends no data of its own to these services.</p>
<h3>8. Representative in the EU and the UK</h3>
<p>${EU_REP ? `For visitors in the European Union, our representative under Art. 27 GDPR is: ${EU_REP}. ` : ''}${UK_REP ? `For visitors in the United Kingdom, our representative under Art. 27 UK GDPR is: ${UK_REP}. ` : ''}${EU_REP || UK_REP ? 'You can contact the representative instead of the controller about anything in this policy.' : 'Visitors in the European Union and the United Kingdom can send every data protection request directly to the controller at the address above, in English, German or French. We answer within one month.'}</p>

<h3>9. How long data are kept</h3>
<p>Data in your browser stay until you delete them or change your choice. ${!ANALYTICS ? '' : 'Google Analytics keeps event-level data for the retention period set in our account (at most 14 months) and then deletes them automatically. '}Hosting logs and data processed by Google AdSense are kept by GitHub and Google according to their own policies linked above.</p>

<h3>10. Your rights</h3>
<p>You have the right to information about your data, to correction, deletion and restriction of processing, to object to processing based on legitimate interest, to data portability and to withdraw your consent at any time with effect for the future. To exercise these rights, write to the controller. You may also complain to a data protection authority: in Switzerland the Federal Data Protection and Information Commissioner (FDPIC, <a href="https://www.edoeb.admin.ch" rel="noopener">edoeb.admin.ch</a>); in the EEA the authority of your country of residence or work; in the United Kingdom the Information Commissioner's Office (ICO, <a href="https://ico.org.uk" rel="noopener">ico.org.uk</a>).</p>

<h3>11. Other points</h3>
<p>Using Nestlyzer does not require you to provide any personal data. Nestlyzer ranks places, not people: no decisions about you are made by automated means. The short texts about each place (“Why #1”, the good, the not-so-good and so on) are written automatically by fixed rules from the published data; no visitor data and no AI service are involved. The site is not directed at children under 16. We may update this policy when the site or the law changes; the date at the top shows the current version.</p>

<h2 id="cookies">Cookies and consent</h2>
${PRIVACY_STRICT ? `<p>When you first visit, Nestlyzer's own banner asks whether ${ANALYTICS ? 'visit statistics and ' : ''}the ad service may load, with two equal buttons. Until you press “Accept all”, no Google script is loaded and no cookie is set. With “Only necessary”, that stays so.${ANALYTICS ? ' “Accept all” allows both visit statistics (Google Analytics) and non-personalised ads.' : ' Nestlyzer uses no analytics.'}</p>` : `<p>When you first visit, you choose whether to allow analytics and advertising cookies. Where Google's consent dialog is shown (Google Privacy &amp; Messaging, a consent platform certified under the IAB Transparency and Consent Framework, used for the European Economic Area, the United Kingdom and Switzerland), you make the choice there and can decide per purpose and per vendor. Otherwise Nestlyzer's own banner asks, with two equal buttons. Until you choose, no Google cookies are set and Google Analytics is not loaded. The advertising script does load, with every consent signal set to "denied", so that Google can show its consent dialog and, if you decline, only limited ads without cookies.</p>`}
<p><button class="btn" type="button" data-privacy>Change privacy settings</button></p>
<table class="tbl"><thead><tr><th>Name</th><th>Set by</th><th>Purpose</th><th>Duration</th><th>Needs consent</th></tr></thead><tbody>
<tr><td>nz:theme, nz:saved, nz:cmp, nz:home, nz:builder, nz:custom, nz:img, nz:toured, nz:gamebest, nz:ext</td><td>Nestlyzer (local storage)</td><td>Remember theme, shortlist and the places ticked to compare, your home place, guided profile, loaded images, whether you saw the tour, your best game streak, and whether live content is switched on</td><td>Until you delete them</td><td>No</td></tr>
<tr><td>nz:consent2</td><td>Nestlyzer (local storage)</td><td>Remember your privacy choice</td><td>Until you delete it</td><td>No</td></tr>
${PRIVACY_STRICT ? '' : '<tr><td>FCCDCF, FCNEC</td><td>Google consent dialog</td><td>Store your consent choice</td><td>Up to 13 months</td><td>No</td></tr>'}
${!ANALYTICS ? '' : '<tr><td>_ga, _ga_*</td><td>Google Analytics</td><td>Distinguish visitors and sessions for statistics</td><td>Up to 2 years</td><td>Yes</td></tr>'}
<tr><td>__gads, __gpi, __eoi, IDE and others</td><td>Google AdSense and ad partners</td><td>${PRIVACY_STRICT ? 'Show and measure non-personalised ads; limit how often an ad is shown; prevent fraud' : 'Show, personalise and measure ads; limit how often an ad is shown'}</td><td>Up to 13 months</td><td>Yes</td></tr>
</tbody></table>

<h2 id="terms">Terms of use</h2>
<p>By using nestlyzer.com you accept these terms. They are short because the service is simple: it is free, needs no account and sells nothing.</p>
<ol>
<li><b>What Nestlyzer is.</b> A free information service that ranks municipalities using public statistics and fixed, published weights. Rankings are opinions computed by a stated method, not facts about any place and not advice.</li>
<li><b>Fair use.</b> You may use the site for personal and professional research and share links to it. Do not copy the site or its data in bulk by automated means, do not interfere with its operation, and respect the licences of the data sources listed on the method page.</li>
<li><b>Content.</b> Design, texts and code are protected by copyright (© Torsten Sauter). Statistics, maps, photos and texts from third parties remain under their own licences and are credited where shown.</li>
<li><b>No warranty.</b> The site is provided as it is. We do not guarantee that it is available at all times, error-free, complete or up to date.</li>
<li><b>Liability.</b> To the extent permitted by law, we are not liable for decisions taken on the basis of the site, for content of linked websites or for indirect damage. Liability for intent and gross negligence, and any liability that cannot be excluded by law (including mandatory consumer protection rules in your country of residence), remains unaffected.</li>
<li><b>Changes.</b> We may change the site and these terms at any time. The version on this page applies.</li>
<li><b>Law and jurisdiction.</b> Swiss law applies, excluding conflict-of-law rules. The place of jurisdiction is Meilen, Switzerland, unless mandatory law gives you the right to sue or be sued at your place of residence.</li>
</ol>

<h2 id="advertising">Advertising policy</h2>
<p>Ads are shown by Google AdSense and labelled as advertising. Ads and sponsorships never influence scores, rankings, confidence values, map colours, factor weights or editorial text. Sponsorship enquiries are handled by email only; any sponsored content would be clearly labelled as such. Nestlyzer does not use affiliate links.</p>

<h2 id="disclaimer">Disclaimer</h2>
<p>Nestlyzer is a research and decision-support tool. It is not legal, tax, investment, immigration, medical, real-estate or financial advice. Scores are computed from public statistics, which can be incomplete, out of date or wrong. Check every question about taxes, schools, healthcare, housing, permits, commuting and residency with the competent authority or a qualified adviser. We take care with the content but give no guarantee that it is accurate, complete or current. Links to other websites are provided for information; their operators are responsible for their content.</p>

<h2 id="report">Report a problem or a rights issue</h2>
<p>If a place is described wrongly, a photo infringes your rights, personal data appear that should not, or anything on the site is unlawful, write to <a href="mailto:torsten.sauter@icloud.com?subject=Nestlyzer%20report">torsten.sauter@icloud.com</a> with the page address and what is wrong. We check every report and remove or correct content promptly, usually within a few days. Photos and texts from Wikimedia Commons, Wikipedia and Wikidata can also be corrected at their source.</p>

<h2 id="accessibility">Accessibility</h2>
<p>Nestlyzer aims to be usable by everyone: it works with a keyboard (<kbd>/</kbd> opens search, <kbd>Esc</kbd> closes panels), supports screen readers with labelled controls, respects reduced-motion settings, offers a dark theme and scales with your browser's text size. The map itself is visual; every ranking it shows is also available as a list. If something is hard to use for you, tell us at the address above.</p>

<h2 id="copyright">Sources and licences</h2>
<p>Statistics come from official public sources, listed with their licences on the <a href="/method/#sources">method page</a>. Map data © OpenStreetMap contributors (ODbL). Boundaries © EuroGeographics and Swiss Federal Office of Topography where stated. Photos and texts from Wikimedia projects remain under their own licences, credited where shown. Site design, text and code © Torsten Sauter. For corrections to place data or contact details, write to the email address above.</p>
</div>`;
  page({ p: '/legal/', title: 'Imprint, privacy policy and cookies | Nestlyzer', desc: 'Operator, privacy policy, cookies and consent, advertising policy, disclaimer and licences for Nestlyzer.com.', body, crumbs: [['Home', '/'], ['Imprint and policies', '/legal/']] });
}

// ------------------------------------------------------------------ hero map (Switzerland, young family, SVG)
function heroSvg() {
  const simp = require('topojson-simplify');
  let t = JSON.parse(read('data/geo/ch.topo.json'));
  t = simp.presimplify(t); t = simp.simplify(t, simp.quantile(t, 0.35));
  const ramp = ['#E7ECF1', '#C5E4D2', '#86C9A2', '#35A6A3', '#1E6FD9', '#0B2E5C'];
  const col = (v) => !Number.isFinite(v) ? '#EEF1EC' : v >= 85 ? ramp[5] : v >= 72 ? ramp[4] : v >= 60 ? ramp[3] : v >= 48 ? ramp[2] : v >= 34 ? ramp[1] : ramp[0];
  const k = Math.cos(46.8 * Math.PI / 180), x0 = 5.95, y0 = 47.81, S = 1000 / ((10.5 - 5.95) * k);
  const P = ([lon, lat]) => [Math.round((lon - x0) * k * S), Math.round((y0 - lat) * S)];
  const ring = (r) => { let out = [], last = null; for (const c of r) { const p = P(c); if (!last || p[0] !== last[0] || p[1] !== last[1]) out.push(p); last = p; } return out.length > 2 ? 'M' + out.map((p) => p.join(' ')).join('L') + 'Z' : ''; };
  const geomPath = (g) => !g ? '' : (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).map((poly) => poly.map(ring).join('')).join('');
  const byCol = {};
  for (const g of t.objects.municipalities.geometries) { const r = SH.CH.recs.find((x) => x.oid === String(g.id)); if (!r) continue; const c = col(engine.surface(r, 'young_family', 'score', 'CH')); (byCol[c] ||= []).push(g); }
  const fills = Object.entries(byCol).map(([c, gs]) => `<path fill="${c}" d="${geomPath(topojson.merge(t, gs))}"/>`).join('');
  const mesh = geomPathLines(topojson.mesh(t, t.objects.municipalities, (a, b) => a !== b));
  function geomPathLines(m) { return m.coordinates.map((line) => { const pts = line.map(P); return 'M' + pts.map((p) => p.join(' ')).join('L'); }).join(''); }
  const cant = geomPathLines(topojson.mesh(t, t.objects.cantons, (a, b) => a !== b));
  const lakes = topojson.feature(t, t.objects.lakes);
  const H = Math.round((47.81 - 45.81) * S);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${H}" role="img" aria-label="Switzerland municipalities coloured by young-family fit">${fills}<path fill="none" stroke="#fff" stroke-width="1.6" d="${cant}"/><path fill="#B9D8EE" d="${lakes.features.map((f) => geomPath(f.geometry)).join('')}"/></svg>`;
  write('assets/hero-ch.svg', svg);
  return { kb: Math.round(svg.length / 1024), ramp };
}

// ------------------------------------------------------------------ landing (index)
function landing() {
  const totalN = countries.reduce((a, c) => a + c.n, 0), totalPop = countries.reduce((a, c) => a + c.pop, 0);
  const nf = meta.factors.filter((f) => f.score_role === 'scored').length;
  const who = ['young_family', 'pensioner', 'remote', 'student', 'commuter', 'single_parent', 'expat_professional', 'coastal'];
  const faq = [
    ['How does Nestlyzer decide where I should live?', 'You pick who is moving, for example a young family or a retired couple. Each profile weights categories such as costs, safety, family, jobs, mobility and environment. Nestlyzer scores every municipality in the country you choose and ranks them. Every weight and source is listed on the methodology page.'],
    ['Which countries are covered?', `${countries.length} European countries with ${fmtInt(totalN)} municipalities. Switzerland has the deepest data (28 official factors including municipal tax burden). Austria adds age structure. Other countries use population, density and growth plus geographic measures such as airport and big-city distance.`],
    ['Is it free and do I need an account?', 'It is free and there is no account. Your shortlist and custom profile stay in your browser.'],
    ['Can I build my own profile?', 'Yes. Answer a few short questions about household, budget, daily anchor, mobility, tax sensitivity, climate, language and target countries, then fine-tune the weights. Nestlyzer shows which standard profiles are closest to yours.'],
    ['Is this financial, tax or legal advice?', 'No. Nestlyzer is a decision aid built on public statistics. Check taxes, permits, schools, healthcare and housing with the responsible authority or a qualified adviser.'],
    ['Where does the data come from?', 'Eurostat GISCO LAU, the Swiss Federal Statistical Office, the Swiss Federal Tax Administration, Statistics Austria, EDJNet population-weighted centres, OurAirports and Natural Earth. Photos and descriptions come from Wikimedia projects and never affect scores.'],
  ];
  const CH = RANK.CH && RANK.CH.young_family ? RANK.CH.young_family.list.slice(0, 5) : [];
  const html = `<section class="cine" id="cine" aria-labelledby="cine-h">
<canvas id="cine-a" class="cine-layer" aria-hidden="true"></canvas><canvas id="cine-b" class="cine-layer" aria-hidden="true"></canvas><div class="cine-vignette" aria-hidden="true"></div>
<div class="cine-inner"><div class="cine-copy">
<h1 id="cine-h">Find where<br>you fit.</h1>
<p class="cine-lede">Every municipality in ${countries.length} European countries, ranked for the life you are moving into.<span class="lede-more"> Families, retirees, students, commuters, remote workers and more.</span></p>
<div class="cine-card"><p class="cine-q">Who is moving?</p><div class="who" role="group" aria-label="Household">${who.map((k, i) => `<button type="button" data-who="${k}" aria-pressed="${i === 0}">${ico(k, 17)}${esc(engine.profiles[k].name)}</button>`).join('')}<button type="button" class="more" data-start="builder">${ico('self_fit', 17)}Build my own</button></div>
<div class="go"><div class="field"><label for="start-country" class="visually-hidden">Country</label><select class="select" id="start-country">${countries.map((c) => `<option value="${c.cc}">${esc(c.name)}</option>`).join('')}</select></div><a class="btn btn-sun" href="/#/explore?cc=CH&p=young_family" data-start="go">Show my places</a></div></div>
</div></div>
<p class="cine-legend" aria-live="polite"><span>Each light is one of ${fmtInt(totalN)} municipalities. The brightest are each country's best fit for a <b id="cine-prof">young family</b>.</span><span class="ramp"><em>weaker fit</em><i style="background:#1b4565"></i><i style="background:#21868f"></i><i style="background:#5cc29c"></i><i style="background:#cde79a"></i><i style="background:#f7cf74"></i><i style="background:#fff4d6"></i><em>best fit</em></span></p>
</section>
<div class="stats"><div>${ico('ui_map', 22)}<b data-count="${totalN}">${fmtInt(totalN)}</b><span>municipalities ranked</span></div><div>${ico('ui_globe', 22)}<b>${countries.length}</b><span>countries, one method</span></div><div>${ico('ui_users', 22)}<b>${profiles.length}</b><span>household profiles, or build your own</span></div><div>${ico('ui_database', 22)}<b>${fmt(totalPop / 1e6, 0)} million</b><span>residents covered by public data</span></div></div>
<section class="band"><h2>More than a ranking</h2><p class="lede">Every place comes with the numbers, the photos and the story behind them.</p><div class="ftiles">
<div class="ftile"><span>📸</span><b>Photos from the street</b><p>Openly licensed pictures taken in and around each place, with credits.</p></div>
<div class="ftile"><span>👍</span><b>The good and the not-so-good</b><p>Plain-language highlights, watch-outs and the unusual, written from the data.</p></div>
<div class="ftile"><span>🌦️</span><b>Weather through the year</b><p>Highs, lows and rain by month, plus the climate type.</p></div>
<div class="ftile"><span>🏔️</span><b>Land, water and rails</b><p>Terrain, lakes, rivers, the sea, railway lines, motorways and borders for every municipality.</p></div>
<div class="ftile"><span>♥</span><b>Shortlist and compare</b><p>Save places with notes, tick two or three to see them side by side, and set your home to compare everything against.</p></div>
<div class="ftile"><span>🃏</span><b>Records, look-alikes and a game</b><p>Find the extremes, the places most like yours elsewhere in Europe, and test yourself.</p></div>
</div></section>
<section class="band"><h2>From “where?” to a shortlist in three moves</h2><ol class="steps"><li>${ico('ui_users', 26)}<h3>Say who is moving</h3><p>Pick one of ${profiles.length} profiles or answer a few questions to build your own. The weights stay visible, so you always know why a place ranks.</p></li><li>${ico('ui_map', 26)}<h3>Choose where to look</h3><p>A whole country, a region or a single canton or département. Narrow it by size, airport, big-city or sea distance.</p></li><li>${ico('ui_scale', 26)}<h3>Compare and decide</h3><p>Every place gets a scorecard, trends, close alternatives and local context. Save favourites, compare side by side and print a booklet for the visit.</p></li></ol></section>
<section class="band feature"><div class="feature-copy"><h2>Switzerland, down to the last commune</h2><p class="lede">2,172 municipalities with 28 official factors, including the municipal tax burden for singles, families, retirees and wealth. This is the young family fit, right now:</p><ol class="rank-list">${CH.map((x) => `<li><span class="n">${x.rank}</span><span><a href="${PAGES[x.r.id] || '#'}">${esc(x.r.name)}</a><br><span class="small muted">${esc(x.r.cantonName)}, ${fmtInt(x.r.popNow)} residents</span></span><span class="chip tone-good"><b>${fmt(x.overall)}</b></span></li>`).join('')}</ol><a class="btn btn-primary" href="/#/explore?cc=CH&p=young_family">Open Switzerland</a></div><figure class="feature-map"><img src="/assets/hero-ch.svg?v=${VERSION}" alt="Swiss municipalities coloured by fit for young families" width="1000" height="652" loading="lazy" decoding="async"><figcaption>Young family fit, municipality by municipality</figcaption></figure></section>
<section class="band" id="profiles"><h2>A profile for every kind of move</h2><p class="lede">Each profile is a transparent set of weights. Open one to see its best places across Europe.</p><div class="tiles">${profiles.map((k) => `<a class="tile" href="${profilePath(k)}" style="--tone:${cfg.tones[k] || '#0e7490'}"><span class="ico">${ico(k, 20)}</span><span><b>${esc(engine.profiles[k].name)}</b><small>${esc(TILE_BLURB[k] || (engine.profiles[k].intro || '').split('.')[0])}</small></span></a>`).join('')}</div></section>
<section class="band" id="countries"><h2>${countries.length} countries, honest about depth</h2><p class="lede"><span class="depth detailed"></span>Detailed official data <span class="depth partial" style="margin-left:12px"></span>Partial <span class="depth foundation" style="margin-left:12px"></span>Foundation data plus geography. We show what each country can and cannot tell you.</p><div class="tiles">${countries.map((c) => `<a class="tile" href="${countryPath(c.cc)}"><span class="ico flagico">${flagImg(c.cc, 20)}</span><span><b><span class="depth ${c.depth}"></span>${esc(c.name)}</b><small>${fmtInt(c.n)} municipalities</small></span></a>`).join('')}</div></section>
<section class="band"><div class="card ad-card"><div style="max-width:62ch"><h2 style="font-size:var(--step-1)">Partner placement <span class="chip" style="margin-left:6px">Advertising</span></h2><p class="small" style="margin:6px 0 0">Paid messages are clearly labelled and stay separate from rankings, scores and editorial place context. <a href="/legal/#advertising">Advertising policy</a></p></div><a class="btn" href="mailto:torsten.sauter@icloud.com?subject=Nestlyzer%20advertising%20inquiry">Contact for sponsorship</a></div></section>
<section class="band faq"><h2>Questions people ask</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section><div style="height:72px"></div>`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Nestlyzer', url: SITE + '/', description: 'Find the best place to live in Europe for your household.', potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: SITE + '/?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Nestlyzer', url: SITE + '/', logo: SITE + '/assets/icon-512.png', email: 'torsten.sauter@icloud.com' },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }];
  return { html, ld };
}

// ------------------------------------------------------------------ hero point cloud (landing)
const HERO_PROFILES = ['young_family', 'pensioner', 'remote', 'student', 'commuter', 'single_parent', 'expat_professional', 'coastal'];
function heroBin() {
  const pts = [];
  for (const c of countries) for (const r of SH[c.cc].recs) if (Number.isFinite(r.lat) && r.lon > -25 && r.lon < 45 && r.lat > 27 && r.lat < 72) pts.push(r);
  pts.sort((a, b) => a.population - b.population);
  const n = pts.length, buf = Buffer.alloc(4 + n * (2 + 2 + 1 + 4));
  buf.writeUInt32LE(n, 0);
  let o = 4;
  for (const r of pts) { buf.writeUInt16LE(Math.round((r.lon + 25) / 70 * 65535), o); o += 2; }
  for (const r of pts) { buf.writeUInt16LE(Math.round((r.lat - 27) / 45 * 65535), o); o += 2; }
  for (const r of pts) { buf.writeUInt8(Math.max(0, Math.min(255, Math.round(Math.log10(Math.max(r.population, 10)) * 40))), o); o += 1; }
  // bands are relative within each country, so every country shows its own best places as brightly
  const band = HERO_PROFILES.map(() => new Map());
  HERO_PROFILES.forEach((p, pi) => {
    const byC = {};
    for (const r of pts) { const sr = engine.scoreRaw(r, p, 55, r.country); if (!sr || engine.eligibilityFail(r, p, r.country)) { band[pi].set(r, 1); continue; } (byC[r.country] = byC[r.country] || []).push([r, sr.score]); }
    for (const cc in byC) { const a = byC[cc].sort((x, y) => x[1] - y[1]); a.forEach(([r], i) => band[pi].set(r, Math.max(2, Math.min(15, 2 + Math.floor(13 * (i + 0.5) / a.length))))); }
  });
  for (const r of pts) {
    for (let k = 0; k < 8; k += 2) { buf.writeUInt8((band[k].get(r) << 4) | band[k + 1].get(r), o); o += 1; }
  }
  fs.writeFileSync(path.join(ROOT, 'data/hero.bin'), buf);
  write('data/hero.json', JSON.stringify({ v: VERSION, profiles: HERO_PROFILES, n, frame: { lon: [-25, 45], lat: [27, 72] }, layout: 'u32 n | u16 lon[n] | u16 lat[n] | u8 log10(pop)*40 [n] | u8 two 4-bit scores [n*4] in profile order; 0 = no value, 1..15 = score bands' }));
  return n;
}

// ------------------------------------------------------------------ run
const t0 = Date.now();
const B = await bundle();
const hero = heroSvg();
console.time('heroBin'); const heroN = heroBin(); console.timeEnd('heroBin');
const L = landing();
let shell = read('src/shell.html');
shell = shell.replace('__CSS__', () => B.css).replace('__JS__', () => B.js).replace('__LANDING__', () => L.html).replace('__HEADER__', () => header(true)).replace('__FOOTER__', () => footer()).replace('__TRACKING__', () => tracking()).replace('__CONSENT_HTML__', () => CONSENT_HTML).replace('__CONSENT_JS__', () => '<script>' + CONSENT_SRC + '</script>')
  .replace('__JSONLD__', () => JSON.stringify(L.ld).replace(/</g, '\\u003c')).replace(/__VERSION__/g, VERSION).replace(/__TOTAL__/g, TOTAL)
  .replace('__FIT__', ICON.fit).replace('__MAP__', ICON.map).replace('__LIST__', ICON.list).replace('__PIN__', ICON.pin).replace(/__SPARK__/g, ICON.spark).replace(/__SLIDERS__/g, ICON_X.sliders).replace(/__HEART__/g, ICON_X.heart).replace(/__CLOSE__/g, ICON_X.close);
write('index.html', shell);
write('assets/site.css', B.siteCss);
// clean previously generated page folders
if (!FAST) {
const GEN_ROOTS = new Set([...countries.map((c) => cslug(c.cc)), 'best', 'method', 'legal']);
for (const d of GEN_ROOTS) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
SITEMAP.length = 0; SITEMAP.push('/');
methodPage(); legalPage(); aboutPage();
{ const seen = new Map(); for (const r of pageRecs) { const k = r.country + '|' + r.name; seen.set(k, (seen.get(k) || 0) + 1); } for (const [k, n] of seen) if (n > 1) DUPNAME.add(k); }
bestIndexPage();
for (const p of profiles) profilePage(p);
for (const c of countries) { countryPage(c); for (const code of Object.keys(RRANK[c.cc])) regionPage(c.cc, code); for (const m of metrosOf(c.cc)) metroPage(c.cc, m); }
for (const r of pageRecs) placePage(r);
write('data/pages.json', JSON.stringify(PAGES));
// static page → app view, used by the single-file offline copy so its links stay inside the app
const ROUTES = {};
for (const c of countries) {
  ROUTES[countryPath(c.cc)] = appLink({ cc: c.cc, p: 'young_family' });
  for (const code of Object.keys(RRANK[c.cc])) ROUTES[regionPath(c.cc, RRANK[c.cc][code].reg)] = appLink({ cc: c.cc, p: 'young_family', ...(c.cc === 'CH' ? { a: code } : { r: code }) });
  for (const m of metrosOf(c.cc)) ROUTES[metroPath(c.cc, m.name)] = appLink({ cc: c.cc, p: 'young_family', r: 'M:' + m.name });
}
for (const p of profiles) ROUTES[profilePath(p)] = appLink({ cc: 'CH', p });
ROUTES['/best/'] = appLink({ cc: 'CH', p: 'young_family' });
for (const [id, pth] of Object.entries(PAGES)) ROUTES[pth] = appLink({ cc: id.split(':')[0], p: 'young_family', sel: id });
write('data/routes.json', JSON.stringify(ROUTES));
}
// 404, sitemap(s), robots, manifest
write('ads.txt', ADS_TXT);
write('assets/consent.js', CONSENT_SRC);
write('404.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | Nestlyzer</title><meta name="robots" content="noindex"><meta name="google-adsense-account" content="${ADS_CLIENT}"><link rel="stylesheet" href="/assets/site.css?v=${VERSION}"><script>${STATIC_JS}</script></head><body>${header(false)}<main class="page"><h1>This page moved or never existed</h1><p class="lede">Search every place on the map instead, or start from a country.</p><p><a class="btn btn-primary" href="/#/explore?cc=CH&p=young_family">Open the map</a> <a class="btn" href="/">Home</a></p></main>${footer()}</body></html>`);
if (!FAST) {
const chunks = []; for (let i = 0; i < SITEMAP.length; i += 45000) chunks.push(SITEMAP.slice(i, i + 45000));
const urlset = (list) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>\n`;
if (chunks.length === 1) write('sitemap.xml', urlset(chunks[0]));
else { chunks.forEach((c, i) => write(`sitemap-${i + 1}.xml`, urlset(c))); write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${chunks.map((_, i) => `<sitemap><loc>${SITE}/sitemap-${i + 1}.xml</loc><lastmod>${TODAY}</lastmod></sitemap>`).join('')}</sitemapindex>\n`); }
}
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
write('sw.js', SW_SRC.replace(/__VERSION__/g, VERSION));
write('offline.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | Nestlyzer</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/site.css?v=${VERSION}"></head><body><main class="page"><h1>You are offline</h1><p class="lede">Nestlyzer needs a connection for the first visit to each country. Places you have opened before still work. Check your connection and <a href="/">try again</a>.</p></main></body></html>`);
write('site.webmanifest', JSON.stringify({ id: '/', name: 'Nestlyzer: find where you fit', short_name: 'Nestlyzer', description: 'Find where you fit: rank European municipalities for your household.', lang: 'en', dir: 'ltr', scope: '/', start_url: '/#/explore?cc=CH&p=young_family', display: 'standalone', display_override: ['standalone', 'minimal-ui'], orientation: 'any', categories: ['lifestyle', 'travel', 'utilities'], background_color: '#F2F4F0', theme_color: '#0B2E5C',
  shortcuts: [{ name: 'Explore the map', short_name: 'Map', url: '/#/explore?cc=CH&p=young_family' }, { name: 'My shortlist', short_name: 'Shortlist', url: '/#/explore?cc=CH&p=young_family&lt=saved' }, { name: 'Best places for families', short_name: 'Families', url: profilePath('young_family') }],
  icons: [{ src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/assets/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, null, 1));
write('CNAME', 'nestlyzer.com\n');
write('.nojekyll', '\n');
write('VERSION.txt', `Nestlyzer ${VERSION}\nbuilt ${new Date().toISOString()}\ndata ${meta.v}\npages ${SITEMAP.length}\n`);
console.log(`built ${SITEMAP.length} pages, index ${Math.round(shell.length / 1024)} KB (js ${Math.round(B.js.length / 1024)} KB, css ${Math.round(B.css.length / 1024)} KB), hero ${hero.kb} KB in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
