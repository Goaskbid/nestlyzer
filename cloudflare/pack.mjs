// Nestlyzer -> Cloudflare (prepared, not active). Turns the published site (_site) into a Cloudflare deployment folder
// (cf_site) under Cloudflare's 100,000-file limit WITHOUT changing a single URL or byte of a page:
// every place page /places/<cc>/<id>/index.html is moved into a per-country pack file /_packs/places/<cc>/<n>.json,
// and worker.js serves it back at the same URL. All other files are hard-linked unchanged.
// Usage: node cloudflare/pack.mjs [_site] [cf_site]
import fs from 'node:fs'; import path from 'node:path';
const SRC = path.resolve(process.argv[2] || '_site'), OUT = path.resolve(process.argv[3] || 'cf_site'), PER = 100;
import { bucketOf } from './bucket.js';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const RE = /^places\/([a-z]{2})\/([^/]+)\/index\.html$/, packs = {}; let files = 0, packed = 0;
(function walk(d) { for (const e of fs.readdirSync(path.join(SRC, d), { withFileTypes: true })) {
  const rel = d ? d + '/' + e.name : e.name;
  if (e.isDirectory()) { walk(rel); continue; }
  const m = RE.exec(rel);
  if (m) { (packs[m[1]] ||= []).push([m[2], fs.readFileSync(path.join(SRC, rel), 'utf8')]); packed++; continue; }
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true }); fs.linkSync(path.join(SRC, rel), path.join(OUT, rel)); files++;
} })('');
const index = {};
for (const [cc, list] of Object.entries(packs)) {
  const n = Math.max(1, Math.ceil(list.length / PER)), b = Array.from({ length: n }, () => ({}));
  for (const [id, html] of list) b[bucketOf(id, n)][id] = html;
  fs.mkdirSync(path.join(OUT, '_packs/places', cc), { recursive: true });
  b.forEach((o, i) => fs.writeFileSync(path.join(OUT, '_packs/places', cc, i + '.json'), JSON.stringify(o))); files += n; index[cc] = n;
}
fs.writeFileSync(path.join(OUT, '_packs/places/index.json'), JSON.stringify(index)); files++;
for (const f of ['_headers']) fs.copyFileSync(new URL('./' + f, import.meta.url), path.join(OUT, f)), files++;
let big = 0; (function chk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) chk(p); else if (fs.statSync(p).size > 25 * 1048576) big++; } })(OUT);
console.log(JSON.stringify({ files, packed_pages: packed, countries: Object.keys(index).length, over_25MiB: big, limit_ok: files <= 100000 && !big }));
if (files > 100000 || big) process.exit(1);
