// Copies only what visitors need into a publish folder (default: _site). Used by CI and by package.py.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.argv[2] || '_site');
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json'), 'utf8'));
const slug = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dirs = ['assets', 'vendor', 'data', 'best', 'method', 'legal', 'about', 'business', 'insights', ...meta.countries.map((c) => slug(c.name))];
const files = ['index.html', '404.html', 'ads.txt', 'favicon.ico', 'favicon.svg', 'robots.txt', 'site.webmanifest', 'sw.js', 'offline.html', 'CNAME', '.nojekyll', 'VERSION.txt'];
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
let n = 0, bytes = 0;
function copy(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dst, f)); return; }
  fs.copyFileSync(src, dst); n++; bytes += st.size;
}
for (const d of dirs) if (fs.existsSync(path.join(ROOT, d))) copy(path.join(ROOT, d), path.join(OUT, d));
for (const f of files) if (fs.existsSync(path.join(ROOT, f))) copy(path.join(ROOT, f), path.join(OUT, f));
for (const f of fs.readdirSync(ROOT)) if (/^sitemap(-[a-z0-9-]+)?\.xml$/.test(f)) copy(path.join(ROOT, f), path.join(OUT, f));
console.log(`public folder ${path.relative(ROOT, OUT)}: ${n} files, ${(bytes / 1e6).toFixed(1)} MB`);
// 2.13: check the published folder itself: every sitemap child exists and every listed address has its page
{ const rd = (f) => fs.readFileSync(path.join(OUT, f), 'utf8'), locs = (x) => [...x.matchAll(/<loc>https:\/\/nestlyzer\.com\/([^<]*)<\/loc>/g)].map((m) => m[1]);
  const idx = fs.existsSync(path.join(OUT, 'sitemap.xml')) ? rd('sitemap.xml') : '', kids = idx.includes('<sitemapindex') ? locs(idx) : [];
  const missKid = kids.filter((k) => !fs.existsSync(path.join(OUT, k)));
  const urls = idx.includes('<sitemapindex') ? kids.filter((k) => !missKid.includes(k)).flatMap((k) => locs(rd(k))) : locs(idx);
  const missPage = urls.filter((u) => !fs.existsSync(path.join(OUT, u, u === '' || u.endsWith('/') ? 'index.html' : '')));
  console.log(`published check: ${kids.length} sitemap files, ${urls.length} addresses, ${missKid.length + missPage.length} missing`);
  if (missKid.length || missPage.length) { console.error('Missing in the published folder:', missKid.concat(missPage).slice(0, 10).join(', ')); process.exit(1); } }
if (bytes > 900e6) { console.error('Too large for GitHub Pages (1 GB limit)'); process.exit(1); }
