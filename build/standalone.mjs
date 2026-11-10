// Builds dist/nestlyzer.html: the complete app in ONE file that works when opened straight from disk
// (double-click, file://). All 35 countries, search, map engine, outlines, fonts, flags and icons are packed
// inside (gzip + base64, unpacked on demand per country). Live extras need internet: map tiles, Wikipedia
// photos and text, sights. No analytics or ads run in this offline copy. The website itself uses index.html.
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// NZ_SINGLE_LIVE=1 builds dist/live/index.html instead: the same single file for the website itself (upload it as
// index.html when GitHub Actions is not used). It keeps the consent banner, light Analytics and the ad loader.
// NZ_SPLIT=1 builds dist/site/: a small index.html plus one data file per country (data/p/{CC}.json) and the other
// data files as they are. Visitors download only the countries they open; GitHub Pages compresses the JSON. Every file
// stays far below GitHub's limits and the whole upload is about 60 files. This is the recommended website build.
const SPLIT = process.env.NZ_SPLIT === '1';
const LIVE = SPLIT || process.env.NZ_SINGLE_LIVE === '1';
const OUT = SPLIT ? path.join(ROOT, 'dist', 'site', 'index.html') : LIVE ? path.join(ROOT, 'dist', 'live', 'index.html') : path.join(ROOT, 'dist', 'nestlyzer.html');
// every file of the website sits in ONE folder (no subfolders), so a single drag-and-drop upload can't miss anything
const FLAT = (p) => 'nzdata-' + p.replace(/^data\//, '').replace(/\//g, '-');
const EXTERNAL = (p) => SPLIT && /^data\/(c|x|geo)\/|^data\/(search|pages|icons|anchors|anchors_ror|kpis|ports|national)\.json$|^data\/rank\/|^data\/audit\/|^data\/downloads\/|^data\/start_biz\.html$|^data\/start_countries\.html$|^data\/hero\.bin$/.test(p);
const rd = (p) => fs.readFileSync(path.join(ROOT, p));
const MIME = { '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.bin': 'application/octet-stream' };
const dataURI = (p) => `data:${MIME[path.extname(p)]};base64,${rd(p).toString('base64')}`;

let html = rd('index.html').toString();
// 2.15.16: the website loads the app from assets/app.js and assets/app.css (cached across pages); the single-file
// builds put both back inline so they still work from disk or as one uploaded file
html = html.replace(/<link rel="stylesheet" href="\/assets\/app\.css\?v=[\w.-]+">/, () => '<style>' + rd('assets/app.css').toString() + '</style>')
  .replace(/<script defer src="\/assets\/app\.js\?v=[\w.-]+"><\/script>/, () => '<script>' + rd('assets/app.js').toString() + '</script>');

if (!LIVE) {
// 1) no analytics, ads or consent banner in a local preview
html = html.replace(/<meta name="google-adsense-account"[^>]*>\s*/g, '')
  .replace(/<script>window\.dataLayer=[\s\S]*?<\/script>\s*/, '')
  .replace(/<script async src="https:\/\/www\.googletagmanager\.com[^>]*><\/script>\s*/, '')
  .replace(/<script async src="https:\/\/pagead2\.googlesyndication\.com[^>]*><\/script>\s*/, '')
  .replace(/<script>\(function\(\)\{var K='nz:consent2'[\s\S]*?<\/script>/, '')
  .replace(/<div class="consent" id="consent"[\s\S]*?data-consent="yes">Accept all<\/button><\/div><\/div>/, '');
  if (/googletagmanager|adsbygoogle\.js\?|id="consent"/.test(html)) throw new Error('tracking not fully stripped');
}
// the app itself is one large inline script (over 100 KB); make sure it survived the edits above
if (!(html.match(/<script>[\s\S]*?<\/script>/g) || []).some((t) => t.length > 100000)) throw new Error('app script lost');

// 2) head links that point at files: inline what matters, drop the rest
html = html.replace(/<link rel="preload"[^>]*>\s*/g, '').replace(/<link rel="manifest"[^>]*>/, '').replace(/<link rel="preconnect"[^>]*>/, '')
  .replace(/<link rel="icon" href="\/favicon\.ico"[^>]*>/, '')
  .replace(/(href|src)="(\/assets\/[\w./-]+\.(?:png|svg))(?:\?v=[\w.]+)?"/g, (m, a, p) => `${a}="${dataURI(p.slice(1))}"`)
  .replace(/url\((["']?)(\/assets\/[\w./-]+\.(?:woff2|svg|png))(?:\?v=[\w.]+)?\1\)/g, (m, q, p) => `url(${dataURI(p.slice(1))})`);

// 3) the data pack
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(path.join(ROOT, d))) { const p = d + '/' + f; fs.statSync(path.join(ROOT, p)).isDirectory() ? walk(p) : files.push(p); } };
walk('data'); walk('vendor'); walk('assets/flags');
// build-time only (2.11): the app reads one rank file per region and never the national table or the combined list
for (let i = files.length - 1; i >= 0; i--) if (files[i].startsWith('data/place-detail/')) files.splice(i, 1);   // 2.15.16: rich place details are served by the website only
const BUILD_ONLY = new Set(['data/routes.json', 'data/rank/global.json', 'data/national.json']);
for (let i = files.length - 1; i >= 0; i--) if (BUILD_ONLY.has(files[i])) files.splice(i, 1);
files.push('assets/icon-192.png', 'assets/mark.svg', 'assets/more.js', 'assets/globe.js', 'assets/bizglobe.js', 'assets/fx.js', 'assets/nzx.js', 'assets/home.js');
const pack = {};
let raw = 0;
const SITE = path.dirname(OUT), split = {};
if (SPLIT) { fs.rmSync(SITE, { recursive: true, force: true }); fs.mkdirSync(SITE, { recursive: true }); }
const GEOW = {};
for (const p of files) {
  if (/LICENSE|\.txt$/.test(p)) continue;
  if (EXTERNAL(p)) {
    const m = p.match(/^data\/(c|x)\/([A-Z]{2})\.json$/);
    if (m) {
      let t = rd(p).toString();
      // level columns (fl: empty or one digit per place) travel as one digit string per column, '0' = none (2.11.2:
      // keeps the largest country file under GitHub's 20 MiB); src/data.js reads both forms
      if (m[1] === 'c') { const o = JSON.parse(t); if (o.fl) { for (const k in o.fl) if (Array.isArray(o.fl[k]) && o.fl[k].every((v) => v == null || (Number.isInteger(v) && v >= 0 && v <= 9))) o.fl[k] = o.fl[k].map((v) => v == null ? '0' : String(v)).join(''); t = JSON.stringify(o); } }
      (split[m[2]] = split[m[2]] || {})[m[1]] = t;
    }
    // 2.12: the region outlines of the countries outside Europe travel as one file (19 countries, keeps the upload at 90 files)
    else if (/^data\/geo\/w\/[A-Z]{2}\.json$/.test(p)) GEOW[p.slice(-7, -5)] = JSON.parse(rd(p).toString());
    else fs.copyFileSync(path.join(ROOT, p), path.join(SITE, FLAT(p)));
    continue;
  }
  const b = rd(p); raw += b.length;
  const z = /\.(png|woff2)$/.test(p) ? null : zlib.gzipSync(b, { level: 9 });
  pack[p] = [MIME[path.extname(p)] || 'application/octet-stream', z ? 1 : 0, (z || b).toString('base64')];
}
if (SPLIT && Object.keys(GEOW).length) fs.writeFileSync(path.join(SITE, 'nzdata-geo-w.json'), JSON.stringify(GEOW));
const packJSON = JSON.stringify(pack);
const PACKS = {}, GROUPS = [], GRP = {};
if (SPLIT) {
  for (const cc of Object.keys(split).sort()) {
    const o = split[cc]; if (!o.c) throw new Error('country without main file: ' + cc);
    // 2.12: whole numbers written as 100.0 by Python become 100 (same value when parsed; keeps the US pack under GitHub's 20 MiB)
    const slim = (t) => t && t.replace(/([\[,:])(-?\d+)\.0(?=[,\]}])/g, '$1$2');
    // US county survey shares (ACS, CDC: n_*_us) carry four decimals; two are more than the page ever shows (1)
    if (cc === 'US' && o.c) { const C = JSON.parse(o.c); for (const k in C.fr || {}) if (/_us$/.test(k)) C.fr[k] = C.fr[k].map((v) => typeof v === 'number' ? Math.round(v * 100) / 100 : v); o.c = JSON.stringify(C); }
    PACKS[cc] = '{"c":' + slim(o.c) + ',"x":' + (slim(o.x) || 'null') + '}';
  }
  // 2.14: countries under 1 MB travel together in group packs of up to 4 MB, so the upload stays within 90 files
  let gi = 0, cur = null;
  for (const cc of Object.keys(PACKS).sort()) {
    if (PACKS[cc].length >= 1e6) { fs.writeFileSync(path.join(SITE, FLAT('data/p/' + cc + '.json')), PACKS[cc]); continue; }
    if (!cur || cur.n + PACKS[cc].length > 4e6) { cur = { id: 'g' + (++gi), n: 0, parts: [] }; GROUPS.push(cur); }
    cur.parts.push('"' + cc + '":' + PACKS[cc]); cur.n += PACKS[cc].length; GRP[cc] = cur.id;
  }
  for (const g of GROUPS) fs.writeFileSync(path.join(SITE, 'nzdata-p-' + g.id + '.json'), '{"g":{' + g.parts.join(',') + '}}');
}

const VERSION = process.env.NZ_VERSION || (rd('build/build_site.mjs').toString().match(/NZ_VERSION \|\| '([\d.]+)'/) || [0, 'x'])[1];
// 2.15.16: the 145,000 regular place routes (/places/xx/ID/) are derived in the shim instead of listed (keeps the file small)
const PLACE_RE = /^\/places\/([a-z]{2})\/([^/]+)\/$/;
const ROUTES = fs.existsSync(path.join(ROOT, 'data/routes.json')) ? JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(rd('data/routes.json'))).filter(([k, v]) => { const m = k.match(PLACE_RE); return !(m && v === '/#/explore?cc=' + m[1].toUpperCase() + '&p=young_family&sel=' + m[1].toUpperCase() + '%3A' + encodeURIComponent(decodeURIComponent(m[2]))); }))) : '{}';
// the legal and method pages travel inside the single file, so the imprint and privacy policy are always reachable
const docBody = (p) => { const h = rd(p).toString(); const m = h.match(/<main id="main" class="page">([\s\S]*?)<\/main>/); return m ? m[1].replace(/<script[\s\S]*?<\/script>/g, '') : ''; };
const MIMEJ = (p) => `data:image/jpeg;base64,${rd(p).toString('base64')}`;
const aboutBody = () => docBody('about/index.html').replace(/ srcset="[^"]*"/g, '').replace(/loading="lazy"/g, 'loading="eager"').replace(/src="\/(assets\/about\/[\w-]+-700\.jpg)"/g, (m, p) => `src="${MIMEJ(p)}"`);
const DOCS = JSON.stringify({ legal: docBody('legal/index.html'), method: docBody('method/index.html'), about: aboutBody() });
const SHIM = `<script>/* standalone shim: serves /data, /vendor and /assets from the packed copy below */
window.NZ_STANDALONE=true;(function(){var ROUTES=${ROUTES.replace(/</g, '\\u003c')};var DOCS=${DOCS.replace(/</g, '\\u003c')};var P=null;function pk(){if(!P)P=JSON.parse(document.getElementById('nz-pack').textContent);return P}
function key(u){var s=String(u&&u.url||u);var m=s.match(/^(?:file:\\/\\/[^#?]*?)?\\/((?:data|vendor|assets)\\/[^?#]+)/)||s.match(/^((?:data|vendor|assets)\\/[^?#]+)/);return m&&pk()[m[1]]?m[1]:null}
function bytes(b64){var s=atob(b64),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
function resp(k){var e=pk()[k],u=bytes(e[2]),body=e[1]?new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip')):u;return new Response(body,{status:200,headers:{'Content-Type':e[0]}})}
var of=window.fetch.bind(window),GW=null;${SPLIT ? `var CP={},GRP=${JSON.stringify(GRP)};function nzMissing(st){if(document.getElementById('nz-missing'))return;var d=document.createElement('div');d.id='nz-missing';d.setAttribute('role','alert');d.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;background:#7a1f1f;color:#fff;padding:14px 16px;border-radius:12px;font:15px/1.45 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)';d.innerHTML=location.protocol==='file:'?'<b>Opened from your computer.</b> This page loads its country data from the website, so it only works on nestlyzer.com (or a local web server).':'<b>Data files are missing on this website.</b> index.html needs the nzdata files from the same release next to it. Upload every file of the release (select all files in the folder and drag them in together), then reload.';document.body.appendChild(d)}if(location.protocol==='file:')document.addEventListener('DOMContentLoaded',function(){nzMissing(0)});function cpart(s){var m=s.match(/\\/data\\/(c|x)\\/(\\w+)\\.json/);if(!m)return null;var cc=m[2],pf=GRP[cc]||cc;if(!CP[pf])CP[pf]=of('/nzdata-p-'+pf+'.json?v=${VERSION}').then(function(r){if(!r.ok){nzMissing(r.status);throw new Error('data '+r.status)}return r.json()},function(e){nzMissing(0);throw e});return CP[pf].then(function(d){if(d.g)d=d.g[cc]||{};var v=d[m[1]];return new Response(JSON.stringify(v),{status:v==null?404:200,headers:{'Content-Type':'application/json'}})})}` : ''}window.fetch=function(u,o){var k=key(u);if(k)return Promise.resolve(resp(k));${SPLIT ? `var s=String(u&&u.url||u),c=cpart(s);if(c)return c;var fm=s.match(/^(?:https?:\\/\\/[^/]+)?\\/data\\/([^?#]+)(\\?[^#]*)?/);var gw=fm&&fm[1].match(/^geo\\/w\\/([A-Z]{2})\\.json$/);if(gw){GW=GW||of('/nzdata-geo-w.json'+(fm[2]||''),o).then(function(r){if(!r.ok){nzMissing(r.status);throw new Error('geo '+r.status)}return r.json()});return GW.then(function(all){return new Response(JSON.stringify(all[gw[1]]||{type:'FeatureCollection',features:[]}),{status:200,headers:{'Content-Type':'application/json'}})})}if(fm)return of('/nzdata-'+fm[1].replace(/\\//g,'-')+(fm[2]||''),o).then(function(r){if(!r.ok)nzMissing(r.status);return r});` : ''}return of(u,o)};
window.NZ_ASSET_URL=function(p){var k=key(p);if(!k)return 'https://nestlyzer.com'+p;var e=pk()[k];return e[1]?'https://nestlyzer.com'+p:'data:'+e[0]+';base64,'+e[2]};
var blobs={};window.NZ_BLOB=function(src){var k=key(src);if(!k)return Promise.resolve(src);if(blobs[k])return blobs[k];return blobs[k]=resp(k).blob().then(function(b){return URL.createObjectURL(b)})};
function fixImg(el){var s=el.getAttribute('src');if(s&&s.charAt(0)==='/'&&s.indexOf('/assets/')===0){var k=key(s);if(k){var e=pk()[k];if(!e[1])el.setAttribute('src','data:'+e[0]+';base64,'+e[2])}}}
new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType!==1)return;if(n.tagName==='IMG')fixImg(n);else if(n.querySelectorAll)n.querySelectorAll('img[src^="/assets/"]').forEach(fixImg)})})}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('img[src^="/assets/"]').forEach(fixImg)});
/* 2.14 (owner audit A0): on the website, a link the single file cannot show itself (Insights, business.html, Worldwide)
   is a normal page load; it never falls back to the start page */
window.addEventListener('click',function(ev){if(ev.defaultPrevented)return;var a=ev.target.closest&&ev.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(!h||h.charAt(0)!=='/'||h.charAt(1)==='/'||h.indexOf('/nzdata-')===0)return;ev.preventDefault();if(h==='/'){location.hash='';return}if(h.indexOf('/#')===0){location.hash=h.slice(1);return}var rt=(ROUTES[h.split('#')[0]]||(function(k){var m=k.match(/^\\/places\\/([a-z]{2})\\/([^/]+)\\/$/);if(!m)return;var c=m[1].toUpperCase();return '/#/explore?cc='+c+'&p=young_family&sel='+c+'%3A'+encodeURIComponent(decodeURIComponent(m[2]))})(h.split('#')[0]));if(rt){location.hash=rt.slice(1);window.scrollTo(0,0);return}if(h.indexOf('/legal/')===0||h.indexOf('/method/')===0||h.indexOf('/about/')===0){var sec=h.split('#')[1]||'';var ifr=document.getElementById('nz-doc');if(!ifr){ifr=document.createElement('div');ifr.id='nz-doc';ifr.setAttribute('role','dialog');ifr.setAttribute('aria-modal','true');ifr.style.cssText='position:fixed;inset:0;z-index:200;background:var(--surface,#fff);overflow:auto;padding:16px';document.body.appendChild(ifr)}var doc=DOCS[h.indexOf('/legal/')===0?'legal':h.indexOf('/about/')===0?'about':'method'];ifr.innerHTML='<p><button type="button" class="btn btn-sm" onclick="this.parentNode.parentNode.remove()">Close</button> <a href="https://nestlyzer.com'+h+'" target="_blank" rel="noopener">Open on nestlyzer.com</a></p>'+doc;if(sec){var t=ifr.querySelector('#'+sec);if(t)t.scrollIntoView()}else ifr.scrollTop=0;return}${LIVE ? `location.href=h` : `a.setAttribute('href','https://nestlyzer.com'+h);a.setAttribute('target','_blank');a.setAttribute('rel','noopener');ev.preventDefault();window.open('https://nestlyzer.com'+h,'_blank','noopener')`}},false)})()</script>`;
html = html.replace('<head>', '<head>\n' + SHIM);
const bodyAt = html.indexOf('<body>') + '<body>'.length;
html = html.slice(0, bodyAt) + `\n<script type="application/json" id="nz-pack">${packJSON.replace(/</g, '\\u003c')}</script>\n` + html.slice(bodyAt);
// the pack must come before the app script and never inside it
if (html.indexOf('id="nz-pack"') > html.lastIndexOf('<script>')) throw new Error('pack after app script');
if (SPLIT) html = html.replace(/\/business\/\?/g, '/business.html?').replace(/(["'])\/business\/(["'])/g, '$1/business.html$2');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
// root files of the website (2.12.2: from the built site when no hand-kept copy exists; the flat site has no sitemap,
// so its robots.txt must not point to one)
if (SPLIT) for (const f of ['404.html', 'CNAME', 'ads.txt', 'robots.txt', '.nojekyll']) {
  const hand = path.join(ROOT, 'build', 'source', 'site-root', f), built = path.join(ROOT, '_site', f), to = path.join(SITE, f);
  if (f === 'robots.txt') fs.writeFileSync(to, 'User-agent: *\nAllow: /\n');
  else if (f === '.nojekyll') fs.writeFileSync(to, '');
  else if (fs.existsSync(hand)) fs.copyFileSync(hand, to);
  else if (fs.existsSync(built)) fs.copyFileSync(built, to);
  else throw new Error('missing website root file ' + f);
}
if (SPLIT && fs.existsSync(path.join(ROOT, 'business', 'index.html'))) fs.writeFileSync(path.join(SITE, 'business.html'), rd('business/index.html').toString().replace(/(["'(])\/business\/(?=[?#"'])/g, '$1/business.html'));
console.log(`standalone ${path.relative(ROOT, OUT)}: ${(html.length / 1e6).toFixed(1)} MB (${Object.keys(pack).length} packed files, ${(raw / 1e6).toFixed(1)} MB unpacked)`);
