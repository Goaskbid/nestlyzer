// Copies only what visitors need into a publish folder (default: _site). Used by CI and by package.py.
import {createRequire} from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const OutputContract=createRequire(import.meta.url)('./release_output_contract.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.argv[2] || '_site');
import { optimize } from './deduplicate_static_assets.mjs';
import {slimPages,inventory} from './slim_place_pages.mjs';
import {packRows} from './pack_place_rows.mjs';
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json'), 'utf8'));
const slug = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dirs = ['assets', 'vendor', 'data', 'best', 'method', 'legal', 'about', 'press', 'business', 'insights', 'world', 'incentives', 'districts', 'immigration', 'evidence-lab', 'places', 'rankings', 'sources', ...meta.countries.map((c) => slug(c.name))];
const files = ['index.html', '404.html', 'ads.txt', 'favicon.ico', 'favicon.svg', 'robots.txt', 'site.webmanifest', 'sw.js', 'offline.html', 'CNAME', '.nojekyll', 'VERSION.txt', '.well-known/tdmrep.json'];
// Reject destructive destinations BEFORE removing any output. This command never writes outside this checkout.
const relOut = path.relative(ROOT, OUT);
const protectedRoots = [...dirs, 'src', 'build', 'tools', 'tests', '.git', '.github', '.cache', 'node_modules'];
if (!relOut || relOut.startsWith('..') || path.isAbsolute(relOut) || process.argv.length > 3 || (process.argv[2] || '').startsWith('-') || protectedRoots.some(d => relOut === d || relOut.startsWith(d + path.sep))) throw new Error('Unsafe public-output destination: ' + OUT);
for (let q = OUT; q !== ROOT; q = path.dirname(q)) { if (fs.existsSync(q) && fs.lstatSync(q).isSymbolicLink()) throw new Error('Symlink in public-output path'); }
if (!fs.existsSync(path.join(ROOT, 'index.html')) || !fs.existsSync(path.join(ROOT, 'sitemap.xml'))) throw new Error('Build the complete source site before publishing');
console.log('Evidence Lab release gate:', JSON.stringify(createRequire(import.meta.url)('./validate_evidence_lab_release.cjs').verify(ROOT)));
console.log('Generated-page deduplication:', JSON.stringify(optimize(ROOT)));
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
let n = 0, bytes = 0, claimCopyRepairs = 0;
function copy(src, dst) {
  if (/^data[\\/](audit|downloads)([\\/]|$)/.test(path.relative(ROOT, src))) return;   // r8: internal collection files and audit worksheets stay off the public site (IP)   // 2.15.16: build-time list only (the app never reads it)
  const st = fs.lstatSync(src); if (st.isSymbolicLink()) throw new Error("Symlink in public input: " + src);
  if (st.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dst, f)); return; }
  if (path.relative(ROOT, src) === path.join('data', 'routes.json')) return;
  if(src.endsWith('.html')){const fix=OutputContract.repairClaimCopy(fs.readFileSync(src,'utf8'));if(fix.replacements){fs.writeFileSync(dst,fix.text);claimCopyRepairs+=fix.replacements;n++;bytes+=Buffer.byteLength(fix.text);return;}}
  fs.copyFileSync(src, dst); n++; bytes += st.size;
}
for (const d of dirs) if (fs.existsSync(path.join(ROOT, d))) copy(path.join(ROOT, d), path.join(OUT, d));
for (const f of files) if (fs.existsSync(path.join(ROOT, f))) { fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true }); copy(path.join(ROOT, f), path.join(OUT, f)); }
for (const f of fs.readdirSync(ROOT)) if (/^sitemap(-[a-z0-9-]+)?\.xml$/.test(f)) copy(path.join(ROOT, f), path.join(OUT, f));
// r14 engine protection: every published script ships minified, without comments (the app bundles already are). Names
// that pages call stay intact (top-level names are not renamed); strings and behaviour are unchanged.
{ const terser=createRequire(import.meta.url)('terser');let mins=0,saved=0;
  for(const f of fs.readdirSync(path.join(OUT,'assets'))){if(!f.endsWith('.js'))continue;const p=path.join(OUT,'assets',f),src=fs.readFileSync(p,'utf8');
    if(!/\/\*|(^|[^:'"\\])\/\/\s/m.test(src))continue;
    const r=await terser.minify(src,{ecma:2020,compress:false,mangle:true,format:{comments:false}});
    if(r.code&&r.code.length<src.length){fs.writeFileSync(p,r.code);mins++;saved+=src.length-r.code.length;}}
  console.log('Engine protection: minified '+mins+' scripts, '+saved+' bytes of comments and spacing removed'); }
// Lossless footprint pass on the deployment copy. Raw data and authored source are untouched.
const registryFile=path.join(ROOT,'.cache/seo/pages.json');
if(!fs.existsSync(registryFile))throw Error('Complete generated-page registry is required');
const auditDir=path.join(ROOT,'.cache/size-audit');fs.mkdirSync(auditDir,{recursive:true});
const registry=JSON.parse(fs.readFileSync(registryFile,'utf8')), beforeSlim=inventory(OUT);
const syntax=slimPages(OUT,registry,{apply:true,manifestPath:path.join(auditDir,'page-syntax.jsonl.gz')});
const packed=packRows(OUT,registry,{apply:true,manifestPath:path.join(auditDir,'profile-rows.jsonl.gz')});
const afterSlim=inventory(OUT);n=afterSlim.files;bytes=afterSlim.bytes;
fs.writeFileSync(path.join(auditDir,'summary.json'),JSON.stringify({schema:'release-230-footprint',before:beforeSlim,after:afterSlim,syntax,packed,bytes_saved:beforeSlim.bytes-afterSlim.bytes,claimCopyRepairs},null,2));
console.log('Verified footprint reduction:',JSON.stringify({before:beforeSlim.bytes,after:afterSlim.bytes,saved:beforeSlim.bytes-afterSlim.bytes,claimCopyRepairs}));
console.log(`public folder ${path.relative(ROOT, OUT)}: ${n} files, ${(bytes / 1e6).toFixed(1)} MB`);
if (!fs.existsSync(path.join(OUT, 'sitemap.xml'))) { console.error('Missing required sitemap.xml in the published artifact'); process.exit(1); }
// 2.13: check the published folder itself: every sitemap child exists and every listed address has its page
{ const rd = (f) => fs.readFileSync(path.join(OUT, f), 'utf8'), locs = (x) => [...x.matchAll(/<loc>https:\/\/nestlyzer\.com\/([^<]*)<\/loc>/g)].map((m) => m[1]);
  const idx = fs.existsSync(path.join(OUT, 'sitemap.xml')) ? rd('sitemap.xml') : '', kids = idx.includes('<sitemapindex') ? locs(idx) : [];
  const missKid = kids.filter((k) => !fs.existsSync(path.join(OUT, k)));
  const urls = idx.includes('<sitemapindex') ? kids.filter((k) => !missKid.includes(k)).flatMap((k) => locs(rd(k))) : locs(idx);
  const missPage = urls.filter((u) => !fs.existsSync(path.join(OUT, u, u === '' || u.endsWith('/') ? 'index.html' : '')));
  console.log(`published check: ${kids.length} sitemap files, ${urls.length} addresses, ${missKid.length + missPage.length} missing`);
  if (!urls.length || missKid.length || missPage.length) { console.error('Missing in the published folder:', missKid.concat(missPage).slice(0, 10).join(', ')); process.exit(1); }
  // 2.15.24 SEO gate (owner rules 14 Nov 2026): no duplicate, noindex or non-canonical address; robots.txt names the sitemap
  const seen = new Set(), dup = [], noidx = [], canon = [];
  for (const u of urls) { if (seen.has(u)) { dup.push(u); continue; } seen.add(u);
    const fp = path.join(OUT, u, u === '' || u.endsWith('/') ? 'index.html' : ''); let h = ''; try { const fd = fs.openSync(fp, 'r'), b = Buffer.alloc(65536); h = b.toString('utf8', 0, fs.readSync(fd, b, 0, 65536, 0)); fs.closeSync(fd); } catch (e) {}
    const head=OutputContract.headContract(h,'https://nestlyzer.com/'+u);if(head.noindex)noidx.push(u);if(!head.canonical_ok)canon.push(u); }
  const robots = fs.existsSync(path.join(OUT, 'robots.txt')) ? fs.readFileSync(path.join(OUT, 'robots.txt'), 'utf8') : '';
  const robotsOk = /^Sitemap:\s*https:\/\/nestlyzer\.com\/sitemap\.xml\s*$/mi.test(robots);
  console.log(`sitemap SEO gate: ${dup.length} duplicates, ${noidx.length} noindex, ${canon.length} non-canonical, robots.txt ${robotsOk ? 'names the sitemap' : 'MISSING the sitemap line'}`);
  if (dup.length || noidx.length || canon.length || !robotsOk) { console.error('Sitemap gate failed:', dup.concat(noidx, canon).slice(0, 10).join(', ')); process.exit(1); } }
// 2.15.28: a merged Swiss municipality's former page forwards to the new municipality (old links and search results keep working)
{ const zlib = await import('zlib'); const lp = path.join(ROOT, 'build', 'seo-legacy-paths.json.gz'), rp = path.join(ROOT, '.cache', 'seo', 'registry.json'), sp = path.join(ROOT, 'data', 'search.json');
  if (fs.existsSync(lp) && fs.existsSync(rp) && fs.existsSync(sp)) {
    const legacy = JSON.parse(zlib.gunzipSync(fs.readFileSync(lp)).toString('utf8')).paths, reg = JSON.parse(fs.readFileSync(rp, 'utf8')).byId || {}, sj = JSON.parse(fs.readFileSync(sp, 'utf8'));
    const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); let fwd = 0;
    for (const r of sj.rows) { if (r.length < 6) continue; const from = legacy[r[0] + ':' + r[1]], to = reg[r[0] + ':' + r[4]]; if (!from || !to || !to.url) continue;
      const f = path.join(OUT, from, 'index.html'); if (fs.existsSync(f)) continue; fs.mkdirSync(path.dirname(f), { recursive: true });
      const u = 'https://nestlyzer.com' + to.url;
      fs.writeFileSync(f, '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + e(r[2]) + ' is now part of ' + e(r[5]) + ' | Nestlyzer</title><meta name="robots" content="noindex"><link rel="canonical" href="' + e(u) + '"><meta http-equiv="refresh" content="0;url=' + e(to.url) + '"></head><body><p>' + e(r[2]) + ' merged into <a href="' + e(to.url) + '">' + e(r[5]) + '</a>.</p></body></html>'); fwd++; }
    console.log('forwarding pages for merged municipalities:', fwd); } }
// r17: the globe reads the gzipped point cloud (data/hero.bin.gz); the uncompressed copy stays in the repository for
// the single-file builds but is not published (1.45 MB); a browser without DecompressionStream shows the still globe
{ const hb = path.join(OUT, 'data', 'hero.bin'); if (fs.existsSync(hb) && fs.existsSync(hb + '.gz')) fs.rmSync(hb); }
// r19 (audit NZ9-12): the country files (data/c, data/x) are published gzipped (level 9, deterministic header) and the
// app bundles switch to the gzip loader (src/js/01-gunzip.js); the plain copies stay in the repository for the
// single-file builds and the tests. About 95 MB of publication headroom.
{ const zlib = await import('node:zlib'); let before = 0, after = 0, nf = 0;
  for (const d of ['c', 'x']) { const dir = path.join(OUT, 'data', d); if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) { if (!f.endsWith('.json')) continue; const fp = path.join(dir, f), raw = fs.readFileSync(fp), gz = zlib.gzipSync(raw, { level: 9, mtime: 0 });
      if (gz[0] !== 0x1f || zlib.gunzipSync(gz).compare(raw) !== 0) { console.error('Stopped: gzip round trip failed for', fp); process.exit(1); }
      fs.writeFileSync(fp + '.gz', gz); fs.rmSync(fp); before += raw.length; after += gz.length; nf++; } }
  let sw = 0; for (const f of fs.readdirSync(path.join(OUT, 'assets'))) { if (!f.endsWith('.js')) continue; const fp = path.join(OUT, 'assets', f), t = fs.readFileSync(fp, 'utf8'); if (t.includes('__NZ_DATA_GZ__')) { fs.writeFileSync(fp, t.split('__NZ_DATA_GZ__').join('1')); sw++; } }
  if (nf && !sw) { console.error('Stopped: country files gzipped but no bundle carries the gzip switch.'); process.exit(1); }
  console.log('country files gzipped:', nf, 'files,', (before / 1e6).toFixed(1), 'MB ->', (after / 1e6).toFixed(1), 'MB; loader switched on in', sw, 'bundles'); }
// 2.15.30-r6: stamp the service worker with a hash of everything it caches (assets, vendor, data), so every release that
// changes any of them gets a new cache and open tabs reload into it. Same content, same stamp: no needless reloads.
{ const crypto = await import('node:crypto'); const h = crypto.createHash('sha256'); const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else { h.update(path.relative(OUT, f)); h.update(fs.readFileSync(f)); } } };
  for (const d of ['assets', 'vendor', 'data']) walk(path.join(OUT, d));
  const swf = path.join(OUT, 'sw.js'), stamp = h.digest('hex').slice(0, 12), sw = fs.readFileSync(swf, 'utf8');
  if (!sw.includes('__BUILD__')) { console.error('Stopped: sw.js has no build stamp placeholder.'); process.exit(1); }
  fs.writeFileSync(swf, sw.replace(/__BUILD__/g, stamp)); console.log('service worker build stamp:', stamp); }
// Count the final artifact, including forwarders added after the initial copy.
const finalTree=OutputContract.sizeTree(OUT);n=finalTree.files;bytes=finalTree.bytes;
console.log('Final publication receipt:',JSON.stringify(finalTree));
// r16 (audit NZ-AUD-14): bytes per top-level directory after every redirect and fingerprint, written next to the site so
// every release keeps a size receipt and growth per area is visible from one release to the next
{ const per = {}; for (const e of fs.readdirSync(OUT, { withFileTypes: true })) { const p0 = path.join(OUT, e.name); if (e.isDirectory()) { const t = OutputContract.sizeTree(p0); per[e.name] = { files: t.files, bytes: t.bytes }; } else { per['(root files)'] = per['(root files)'] || { files: 0, bytes: 0 }; per['(root files)'].files++; per['(root files)'].bytes += fs.statSync(p0).size; } }
  const top = Object.entries(per).sort((a, b) => b[1].bytes - a[1].bytes);
  console.log('Size by directory (MB):', top.slice(0, 12).map(([k, v]) => k + ' ' + (v.bytes / 1e6).toFixed(1)).join(', '));
  fs.mkdirSync(path.join(ROOT, 'docs', 'audit'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'docs', 'audit', 'publication_size.json'), JSON.stringify({ total: finalTree, budget_bytes: 850e6, github_hard_limit_bytes: 1e9, by_directory: Object.fromEntries(top) }, null, 1)); }
/* r19 (audit NZ9-12): an explicit growth reserve. The release stops if less than 40 MB of the 850 MB budget is left, so the
   planned data additions (about 5 to 10 MB) always fit; it warns below 60 MB. */
console.log('Publication headroom: ' + (finalTree.headroom / 1e6).toFixed(1) + ' MB (reserve required: 40 MB)');
if(finalTree.headroom<40000000){console.error('Stopped: publication headroom below the 40 MB growth reserve.');process.exit(1);}
if(finalTree.headroom<60000000)console.warn('Publication headroom below 60 MB; keep new raw archives outside this artifact.');
// GitHub rules are hard requirements (owner, 9 Nov 2026): the published site stays far below the 1 GB Pages limit, with
// room for data growth and fast deploys within the 10-minute window. Stop the build instead of publishing anything larger.
if (bytes > 850e6) { console.error('Stopped: ' + (bytes / 1e6).toFixed(0) + ' MB is above the 850 MB safety budget for GitHub Pages (hard limit 1 GB).'); process.exit(1); }
if (n > 200000) { console.error('Stopped: too many files for a safe Pages deployment (' + n + ').'); process.exit(1); }
