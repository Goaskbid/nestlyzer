// Nestlyzer Worker (prepared, not active). Static files are served by Cloudflare first and cost nothing; this script only
// runs when no static file matches. It answers place pages from the pack files made by pack.mjs, at their original URLs,
// and returns a real 404 for anything else. No secrets, no external calls.
// r16 (audit NZ-AUD-06/08/09): only a successfully parsed and validated index is cached (a failed fetch is retried on the
// next request, concurrent requests share one fetch), a backing-store failure answers 503 instead of a false 404, lookups
// accept only own string properties of the index and the pack, and every response carries the site's security headers.
import { bucketOf } from './bucket.js';
const RE = /^\/places\/([a-z]{2})\/([A-Za-z0-9._-]{1,40})\/?$/;
const SEC = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'permissions-policy': 'camera=(), microphone=(), payment=()',
  'x-frame-options': 'SAMEORIGIN'
};
const own = (o, k) => o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
let INDEX = null, PENDING = null;
class Unavailable extends Error {}
function respond(body, status, extra, method) {
  const h = new Headers(Object.assign({}, SEC, extra || {}));
  return new Response(method === 'HEAD' ? null : body, { status, headers: h });
}
// r19 (audit NZ9-09): a thrown backing-store fetch is a temporary failure, never an escaped exception or a false 404
async function asset(env, req, p) { try { return await env.ASSETS.fetch(new Request(new URL(p, req.url), { method: 'GET' })); } catch (e) { throw new Unavailable('fetch ' + p); } }
async function loadIndex(env, req) {
  if (INDEX) return INDEX;
  if (!PENDING) PENDING = (async () => {
    try {
      const r = await asset(env, req, '/_packs/places/index.json');
      if (!r.ok) throw new Unavailable('index ' + r.status);
      let j; try { j = await r.json(); } catch (e) { throw new Unavailable('index not JSON'); }
      if (!j || typeof j !== 'object' || Array.isArray(j) || !Object.keys(j).length || Object.keys(j).some((k) => !/^[a-z]{2}$/.test(k) || !Number.isInteger(j[k]) || j[k] < 1)) throw new Unavailable('index invalid');
      INDEX = j; return j;
    } finally { PENDING = null; }
  })();
  return PENDING;
}
export function resetForTests() { INDEX = null; PENDING = null; }
export default {
  async fetch(req, env) {
    const url = new URL(req.url), m = RE.exec(url.pathname), method = req.method;
    if (m && (method === 'GET' || method === 'HEAD')) {
      if (!url.pathname.endsWith('/')) return respond(null, 301, { location: url.origin + url.pathname + '/' + url.search }, method);
      try {
        const index = await loadIndex(env, req);
        if (own(index, m[1])) {
          const n = index[m[1]];
          const r = await asset(env, req, '/_packs/places/' + m[1] + '/' + bucketOf(m[2], n) + '.json');
          // every bucket the index announces must exist and be a plain object: a missing or malformed pack is 503
          if (!r.ok) throw new Unavailable('pack ' + r.status);
          else {
            let pack; try { pack = await r.json(); } catch (e) { throw new Unavailable('pack not JSON'); }
            if (!pack || typeof pack !== 'object' || Array.isArray(pack)) throw new Unavailable('pack invalid');
            if (own(pack, m[2]) && typeof pack[m[2]] === 'string' && pack[m[2]].length) {
              return respond(pack[m[2]], 200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' }, method);
            }
          }
        }
      } catch (e) {
        if (e instanceof Unavailable) return respond('Temporarily unavailable, please try again in a moment.', 503, { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '30', 'cache-control': 'no-store' }, method);
        throw e;
      }
    }
    let nf = null; try { nf = await asset(env, req, '/404.html'); } catch (e) { nf = null; }
    return respond(nf && nf.ok ? await nf.text() : 'Not found', 404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }, method);
  }
};
