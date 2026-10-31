/* Search-engine pages for the flat upload (2.12).
   The flat folder that nestlyzer.com serves has no static pages: every link such as /switzerland/ answers with 404.html,
   which forwards to the app. Search engines therefore see one page and a wall of 404s, which is why the site gets almost
   no search traffic. This pack adds the pages that answer the searches people actually type ("best places to live in
   Switzerland", "best places for young families", "where to retire in Europe"): the 45 country pages, the profile pages,
   the founder interview and the legal page, each self-contained (styles and consent inline, no /assets/ files), plus a
   sitemap that lists only pages that exist. Every page links into the app for the full ranking.
   Output: dist/seo/ (folders as served: switzerland/index.html, best/young-family/index.html ...), at most 90 files.
     node build/seo_pack.mjs                                                                                     */
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'dist', 'seo'), SITE = 'https://nestlyzer.com';
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json')));
const css = fs.readFileSync(path.join(ROOT, 'assets/site.css'), 'utf8'), consent = fs.readFileSync(path.join(ROOT, 'assets/consent.js'), 'utf8');
fs.rmSync(OUT, { recursive: true, force: true }); for (const d of fs.readdirSync(path.join(ROOT, 'dist'))) if (/^seo-\d+$/.test(d)) fs.rmSync(path.join(ROOT, 'dist', d), { recursive: true, force: true });
const slug = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pages = [];
for (const c of meta.countries) pages.push(slug(c.name) + '/');
for (const d of fs.readdirSync(path.join(ROOT, 'best'))) if (fs.existsSync(path.join(ROOT, 'best', d, 'index.html'))) pages.push('best/' + d + '/');
if (fs.existsSync(path.join(ROOT, 'business'))) for (const d of fs.readdirSync(path.join(ROOT, 'business'))) if (fs.existsSync(path.join(ROOT, 'business', d, 'index.html'))) pages.push('business/' + d + '/');
for (const p of ['about/', 'legal/', 'method/', 'business/']) if (fs.existsSync(path.join(ROOT, p, 'index.html'))) pages.push(p);
const flag = (cc) => cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase().replace('UK', 'GB').replace('EL', 'GR')].map((ch) => 0x1F1E6 + ch.charCodeAt(0) - 65)) : '';
let n = 0, bytes = 0; const urls = [];
for (const p of pages) {
  const src = path.join(ROOT, p, 'index.html'); if (!fs.existsSync(src)) { console.log('missing', p); continue; }
  let h = fs.readFileSync(src, 'utf8');
  h = h.replace(/<link rel="stylesheet" href="\/assets\/site\.css[^"]*">/, '<style>' + css + '</style>')
    .replace(/<script src="\/assets\/consent\.js[^"]*"[^>]*><\/script>/, '<script>' + consent + '</script>')
    .replace(/<link rel="apple-touch-icon"[^>]*>/g, '')
    .replace(/<img[^>]*src="\/assets\/flags\/([a-z]{2})\.png"[^>]*>/g, (m, cc) => '<span aria-hidden="true">' + flag(cc) + '</span>')
    .replace(/(content|href)="\/assets\/og\.png"/g, '$1="' + SITE + '/favicon.svg"').replace(/(content|href)="https:\/\/nestlyzer\.com\/assets\/og\.png"/g, '$1="' + SITE + '/favicon.svg"');
  // founder interview photos: the 700 px versions inline (about 300 KB in all), srcset dropped
  h = h.replace(/\s+srcset="[^"]*"/g, (m) => /\/assets\/about\//.test(m) ? '' : m)
    .replace(/"\/assets\/about\/([a-z-]+?)(-700)?\.jpg"/g, (m, nm) => '"data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'assets/about', nm + '-700.jpg')).toString('base64') + '"');
  const left = (h.match(/["(]\/assets\/[^"')]+/g) || []).filter((u) => !/\/assets\/fonts\//.test(u)); if (!left.length) left.length = 0;
  if (left.length) throw new Error(p + ' still needs ' + [...new Set(left)].slice(0, 5).join(', '));
  const f = path.join(OUT, p, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, h); n++; bytes += h.length; urls.push(SITE + '/' + p);
}
// the four web fonts the pages use (SIL Open Font License files travel with them)
for (const f of fs.readdirSync(path.join(ROOT, 'assets/fonts'))) { const to = path.join(OUT, 'assets/fonts', f); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(ROOT, 'assets/fonts', f), to); }
urls.unshift(SITE + '/');
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map((u) => `<url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
// GitHub's upload page takes at most 100 files at once: split into batches of at most 90 (seo-1, seo-2 ...)
const all = []; (function walk(d, rel) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const q = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) walk(q, r); else all.push(r); } })(OUT, '');
all.sort((a, b) => (a.includes('/') ? 1 : 0) - (b.includes('/') ? 1 : 0) || a.localeCompare(b));
const count = all.length, nb = Math.ceil(count / 90);
for (let b = 0; b < nb; b++) for (const r of all.slice(b * 90, (b + 1) * 90)) { const to = path.join(ROOT, 'dist', 'seo-' + (b + 1), r); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(OUT, r), to); }
const big = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const q = path.join(d, e.name); if (e.isDirectory()) walk(q); else if (fs.statSync(q).size > 20 * 1024 * 1024) big.push(q); } })(OUT);
if (big.length) throw new Error('over 20 MiB: ' + big.join(', '));
console.log('seo pack', count, 'files in', nb, 'upload batches,', (bytes / 1024 / 1024).toFixed(1), 'MB,', urls.length, 'URLs in the sitemap');
