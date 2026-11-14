// Copies only what visitors need into a publish folder (default: _site). Used by CI and by package.py.
import {createRequire} from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.argv[2] || '_site');
import { optimize } from './deduplicate_static_assets.mjs';
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json'), 'utf8'));
const slug = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dirs = ['assets', 'vendor', 'data', 'best', 'method', 'legal', 'about', 'business', 'insights', 'world', 'incentives', 'districts', 'immigration', 'evidence-lab', 'places', 'rankings', 'sources', ...meta.countries.map((c) => slug(c.name))];
const files = ['index.html', '404.html', 'ads.txt', 'favicon.ico', 'favicon.svg', 'robots.txt', 'site.webmanifest', 'sw.js', 'offline.html', 'CNAME', '.nojekyll', 'VERSION.txt'];
// Reject destructive destinations BEFORE removing any output. This command never writes outside this checkout.
const relOut = path.relative(ROOT, OUT);
const protectedRoots = [...dirs, 'src', 'build', 'tools', 'tests', '.git', '.github', '.cache', 'node_modules'];
if (!relOut || relOut.startsWith('..') || path.isAbsolute(relOut) || process.argv.length > 3 || (process.argv[2] || '').startsWith('-') || protectedRoots.some(d => relOut === d || relOut.startsWith(d + path.sep))) throw new Error('Unsafe public-output destination: ' + OUT);
for (let q = OUT; q !== ROOT; q = path.dirname(q)) { if (fs.existsSync(q) && fs.lstatSync(q).isSymbolicLink()) throw new Error('Symlink in public-output path'); }
if (!fs.existsSync(path.join(ROOT, 'index.html')) || !fs.existsSync(path.join(ROOT, 'sitemap.xml'))) throw new Error('Build the complete source site before publishing');
console.log('Evidence Lab release gate:', JSON.stringify(createRequire(import.meta.url)('./validate_evidence_lab_release.cjs').verify(ROOT)));
console.log('Generated-page deduplication:', JSON.stringify(optimize(ROOT)));
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
let n = 0, bytes = 0;
function copy(src, dst) {
  const st = fs.lstatSync(src); if (st.isSymbolicLink()) throw new Error("Symlink in public input: " + src);
  if (st.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dst, f)); return; }
  if (path.relative(ROOT, src) === path.join('data', 'routes.json')) return;   // 2.15.16: build-time list only (the app never reads it)
  fs.copyFileSync(src, dst); n++; bytes += st.size;
}
for (const d of dirs) if (fs.existsSync(path.join(ROOT, d))) copy(path.join(ROOT, d), path.join(OUT, d));
for (const f of files) if (fs.existsSync(path.join(ROOT, f))) copy(path.join(ROOT, f), path.join(OUT, f));
for (const f of fs.readdirSync(ROOT)) if (/^sitemap(-[a-z0-9-]+)?\.xml$/.test(f)) copy(path.join(ROOT, f), path.join(OUT, f));
console.log(`public folder ${path.relative(ROOT, OUT)}: ${n} files, ${(bytes / 1e6).toFixed(1)} MB`);
if (!fs.existsSync(path.join(OUT, 'sitemap.xml'))) { console.error('Missing required sitemap.xml in the published artifact'); process.exit(1); }
// 2.13: check the published folder itself: every sitemap child exists and every listed address has its page
{ const rd = (f) => fs.readFileSync(path.join(OUT, f), 'utf8'), locs = (x) => [...x.matchAll(/<loc>https:\/\/nestlyzer\.com\/([^<]*)<\/loc>/g)].map((m) => m[1]);
  const idx = fs.existsSync(path.join(OUT, 'sitemap.xml')) ? rd('sitemap.xml') : '', kids = idx.includes('<sitemapindex') ? locs(idx) : [];
  const missKid = kids.filter((k) => !fs.existsSync(path.join(OUT, k)));
  const urls = idx.includes('<sitemapindex') ? kids.filter((k) => !missKid.includes(k)).flatMap((k) => locs(rd(k))) : locs(idx);
  const missPage = urls.filter((u) => !fs.existsSync(path.join(OUT, u, u === '' || u.endsWith('/') ? 'index.html' : '')));
  console.log(`published check: ${kids.length} sitemap files, ${urls.length} addresses, ${missKid.length + missPage.length} missing`);
  if (!urls.length || missKid.length || missPage.length) { console.error('Missing in the published folder:', missKid.concat(missPage).slice(0, 10).join(', ')); process.exit(1); } }
// GitHub rules are hard requirements (owner, 9 Nov 2026): the published site stays far below the 1 GB Pages limit, with
// room for data growth and fast deploys within the 10-minute window. Stop the build instead of publishing anything larger.
if (bytes > 850e6) { console.error('Stopped: ' + (bytes / 1e6).toFixed(0) + ' MB is above the 850 MB safety budget for GitHub Pages (hard limit 1 GB).'); process.exit(1); }
if (n > 200000) { console.error('Stopped: too many files for a safe Pages deployment (' + n + ').'); process.exit(1); }
