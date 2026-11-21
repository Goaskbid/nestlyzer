// Nestlyzer Worker (prepared, not active). Static files are served by Cloudflare first and cost nothing; this script only
// runs when no static file matches. It answers place pages from the pack files made by pack.mjs, at their original URLs,
// and returns a real 404 for anything else. No secrets, no external calls.
import { bucketOf } from './bucket.js';
const RE = /^\/places\/([a-z]{2})\/([^/]+)\/?$/;
let INDEX = null;
async function asset(env, req, p) { return env.ASSETS.fetch(new Request(new URL(p, req.url), { method: 'GET' })); }
export default {
  async fetch(req, env) {
    const url = new URL(req.url), m = RE.exec(url.pathname);
    if (m && (req.method === 'GET' || req.method === 'HEAD')) {
      if (!url.pathname.endsWith('/')) return Response.redirect(url.origin + url.pathname + '/' + url.search, 301);
      if (!INDEX) { const r = await asset(env, req, '/_packs/places/index.json'); INDEX = r.ok ? await r.json() : {}; }
      const n = INDEX[m[1]];
      if (n) {
        const r = await asset(env, req, '/_packs/places/' + m[1] + '/' + bucketOf(m[2], n) + '.json');
        if (r.ok) { const html = (await r.json())[m[2]]; if (html) return new Response(req.method === 'HEAD' ? null : html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate', 'x-content-type-options': 'nosniff' } }); }
      }
    }
    const nf = await asset(env, req, '/404.html');
    return new Response(nf.ok ? await nf.text() : 'Not found', { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
};
