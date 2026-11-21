// Local test of worker.js against the packed folder: every sampled place page must come back byte-identical to the
// published file at the same URL; missing places and probes must get a real 404.
import fs from 'node:fs'; import path from 'node:path'; import W from './worker.js';
const SITE = path.resolve(process.argv[2] || '_site'), CF = path.resolve(process.argv[3] || 'cf_site');
const env = { ASSETS: { fetch: async (req) => { const p = path.join(CF, decodeURIComponent(new URL(req.url).pathname)); return fs.existsSync(p) && fs.statSync(p).isFile() ? new Response(fs.readFileSync(p)) : new Response('', { status: 404 }); } } };
const all = []; for (const cc of fs.readdirSync(path.join(SITE, 'places'))) { const d = path.join(SITE, 'places', cc); if (!fs.statSync(d).isDirectory()) continue; for (const id of fs.readdirSync(d)) if (fs.existsSync(path.join(d, id, 'index.html'))) all.push([cc, id]); }
let ok = 0, bad = [];
for (let i = 0; i < all.length; i += Math.max(1, Math.floor(all.length / 3000))) { const [cc, id] = all[i];
  const r = await W.fetch(new Request(`https://nestlyzer.com/places/${cc}/${id}/`), env), t = await r.text();
  if (r.status === 200 && t === fs.readFileSync(path.join(SITE, 'places', cc, id, 'index.html'), 'utf8')) ok++; else bad.push(cc + '/' + id); }
const probes = ['/places/fr/99999x/', '/.env', '/build/seo_expand.mjs', '/places/zz/1/', '/app.js.map'];
const nf = []; for (const p of probes) { const r = await W.fetch(new Request('https://nestlyzer.com' + p), env); if (r.status !== 404) nf.push(p + ' ' + r.status); }
const red = await W.fetch(new Request('https://nestlyzer.com/places/fr/07010'), env);
console.log(JSON.stringify({ checked: ok + bad.length, identical: ok, mismatched: bad.slice(0, 5), probes_not_404: nf, redirect: red.status + ' ' + red.headers.get('location') }));
process.exit(!bad.length && !nf.length && red.status === 301 ? 0 : 1);
