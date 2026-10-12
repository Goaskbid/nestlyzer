// Builds dist/nestlyzer.html: the complete app in ONE file that works when opened straight from disk
// (double-click, file://). All 35 countries, search, map engine, outlines, fonts, flags and icons are packed
// inside (gzip + base64, unpacked on demand per country). Live extras need internet: map tiles, Wikipedia
// photos and text, sights. No analytics or ads run in this offline copy. The website itself uses index.html.
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// NZ_SINGLE_LIVE=1 builds dist/live/index.html instead: the same single file for the website itself (upload it as
// index.html when GitHub Actions is not used). It keeps the consent banner, light Analytics and the ad loader.
const LIVE = process.env.NZ_SINGLE_LIVE === '1';
const OUT = LIVE ? path.join(ROOT, 'dist', 'live', 'index.html') : path.join(ROOT, 'dist', 'nestlyzer.html');
const rd = (p) => fs.readFileSync(path.join(ROOT, p));
const MIME = { '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.bin': 'application/octet-stream' };
const dataURI = (p) => `data:${MIME[path.extname(p)]};base64,${rd(p).toString('base64')}`;

let html = rd('index.html').toString();

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
if ((html.match(/<script>/g) || []).length < 3) throw new Error('app script lost');

// 2) head links that point at files: inline what matters, drop the rest
html = html.replace(/<link rel="preload"[^>]*>\s*/g, '').replace(/<link rel="manifest"[^>]*>/, '').replace(/<link rel="preconnect"[^>]*>/, '')
  .replace(/<link rel="icon" href="\/favicon\.ico"[^>]*>/, '')
  .replace(/(href|src)="(\/assets\/[\w./-]+\.(?:png|svg))(?:\?v=[\w.]+)?"/g, (m, a, p) => `${a}="${dataURI(p.slice(1))}"`)
  .replace(/url\((["']?)(\/assets\/[\w./-]+\.(?:woff2|svg|png))(?:\?v=[\w.]+)?\1\)/g, (m, q, p) => `url(${dataURI(p.slice(1))})`);

// 3) the data pack
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(path.join(ROOT, d))) { const p = d + '/' + f; fs.statSync(path.join(ROOT, p)).isDirectory() ? walk(p) : files.push(p); } };
walk('data'); walk('vendor'); walk('assets/flags');
for (let i = files.length - 1; i >= 0; i--) if (files[i] === 'data/routes.json') files.splice(i, 1);
files.push('assets/icon-192.png', 'assets/mark.svg', 'assets/more.js');
const pack = {};
let raw = 0;
for (const p of files) {
  if (/LICENSE|\.txt$/.test(p)) continue;
  const b = rd(p); raw += b.length;
  const z = /\.(png|woff2)$/.test(p) ? null : zlib.gzipSync(b, { level: 9 });
  pack[p] = [MIME[path.extname(p)] || 'application/octet-stream', z ? 1 : 0, (z || b).toString('base64')];
}
const packJSON = JSON.stringify(pack);

const ROUTES = fs.existsSync(path.join(ROOT, 'data/routes.json')) ? rd('data/routes.json').toString() : '{}';
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
var of=window.fetch.bind(window);window.fetch=function(u,o){var k=key(u);return k?Promise.resolve(resp(k)):of(u,o)};
window.NZ_ASSET_URL=function(p){var k=key(p);if(!k)return 'https://nestlyzer.com'+p;var e=pk()[k];return e[1]?'https://nestlyzer.com'+p:'data:'+e[0]+';base64,'+e[2]};
var blobs={};window.NZ_BLOB=function(src){var k=key(src);if(!k)return Promise.resolve(src);if(blobs[k])return blobs[k];return blobs[k]=resp(k).blob().then(function(b){return URL.createObjectURL(b)})};
function fixImg(el){var s=el.getAttribute('src');if(s&&s.charAt(0)==='/'&&s.indexOf('/assets/')===0){var k=key(s);if(k){var e=pk()[k];if(!e[1])el.setAttribute('src','data:'+e[0]+';base64,'+e[2])}}}
new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType!==1)return;if(n.tagName==='IMG')fixImg(n);else if(n.querySelectorAll)n.querySelectorAll('img[src^="/assets/"]').forEach(fixImg)})})}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('img[src^="/assets/"]').forEach(fixImg)});
window.addEventListener('click',function(ev){if(ev.defaultPrevented)return;var a=ev.target.closest&&ev.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(!h||h.charAt(0)!=='/'||h.charAt(1)==='/')return;ev.preventDefault();if(h==='/'){location.hash='';return}if(h.indexOf('/#')===0){location.hash=h.slice(1);return}var rt=ROUTES[h.split('#')[0]];if(rt){location.hash=rt.slice(1);window.scrollTo(0,0);return}if(h.indexOf('/legal/')===0||h.indexOf('/method/')===0||h.indexOf('/about/')===0){var sec=h.split('#')[1]||'';var ifr=document.getElementById('nz-doc');if(!ifr){ifr=document.createElement('div');ifr.id='nz-doc';ifr.setAttribute('role','dialog');ifr.setAttribute('aria-modal','true');ifr.style.cssText='position:fixed;inset:0;z-index:200;background:var(--surface,#fff);overflow:auto;padding:16px';document.body.appendChild(ifr)}var doc=DOCS[h.indexOf('/legal/')===0?'legal':h.indexOf('/about/')===0?'about':'method'];ifr.innerHTML='<p><button type="button" class="btn btn-sm" onclick="this.parentNode.parentNode.remove()">Close</button> <a href="https://nestlyzer.com'+h+'" target="_blank" rel="noopener">Open on nestlyzer.com</a></p>'+doc;if(sec){var t=ifr.querySelector('#'+sec);if(t)t.scrollIntoView()}else ifr.scrollTop=0;return}${LIVE ? `location.hash='';window.scrollTo(0,0)` : `a.setAttribute('href','https://nestlyzer.com'+h);a.setAttribute('target','_blank');a.setAttribute('rel','noopener');ev.preventDefault();window.open('https://nestlyzer.com'+h,'_blank','noopener')`}},false)})()</script>`;
html = html.replace('<head>', '<head>\n' + SHIM);
const bodyAt = html.indexOf('<body>') + '<body>'.length;
html = html.slice(0, bodyAt) + `\n<script type="application/json" id="nz-pack">${packJSON.replace(/</g, '\\u003c')}</script>\n` + html.slice(bodyAt);
// the pack must come before the app script and never inside it
if (html.indexOf('id="nz-pack"') > html.lastIndexOf('<script>')) throw new Error('pack after app script');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`standalone ${path.relative(ROOT, OUT)}: ${(html.length / 1e6).toFixed(1)} MB (${Object.keys(pack).length} packed files, ${(raw / 1e6).toFixed(1)} MB unpacked)`);
