// r16 fault probes for worker.js (audit NZ-AUD-06/08/09). No network, no credentials.   node cloudflare/test-worker-faults.mjs
import W, { resetForTests } from './worker.js';
import { bucketOf } from './bucket.js';
const id = '261', page = '<!doctype html><title>Zurich</title>';
let mode = 'fail', calls = 0;
const pack = { [id]: page };
const env = { ASSETS: { async fetch(req) {
  const p = new URL(req.url).pathname;
  if (p === '/_packs/places/index.json') { calls++; await new Promise((r) => setTimeout(r, 5));
    if (mode === 'fail') return new Response('temporary', { status: 503 });
    if (mode === 'bad') return new Response('{not json', { status: 200 });
    if (mode === 'proto') return Response.json({});
    return Response.json({ ch: 1 }); }
  if (p === '/_packs/places/ch/' + bucketOf(id, 1) + '.json') { if (mode === 'packthrow') throw new TypeError('connection reset'); return mode === 'packfail' ? new Response('x', { status: 500 }) : mode === 'pack404' ? new Response('x', { status: 404 }) : mode === 'packarr' ? Response.json([]) : Response.json(pack); }
  if (p === '/404.html') return new Response('<h1>Not found</h1>');
  return new Response('', { status: 404 });
} } };
const get = (path, method = 'GET') => W.fetch(new Request('https://nestlyzer.com' + path, { method }), env);
const c = {};
const SEC = ['x-content-type-options', 'referrer-policy', 'strict-transport-security', 'permissions-policy', 'x-frame-options'];
const hasSec = (r) => SEC.every((h) => r.headers.get(h));
resetForTests(); mode = 'fail';
const a = await get('/places/ch/261/');
c['index 503: answers 503 (temporary), not a false 404'] = a.status === 503 && hasSec(a);
mode = 'ok';
const b = await get('/places/ch/261/');
c['index recovered: the same instance serves the page'] = b.status === 200 && (await b.text()) === page && hasSec(b);
c['failed index fetch was retried'] = calls === 2;
resetForTests(); mode = 'bad'; const m1 = await get('/places/ch/261/'); c['malformed index: 503'] = m1.status === 503;
resetForTests(); mode = 'proto'; const m2 = await get('/places/ch/261/'); c['empty index is rejected as invalid: 503'] = m2.status === 503;
resetForTests(); mode = 'ok'; calls = 0;
await Promise.all([get('/places/ch/261/'), get('/places/ch/261/'), get('/places/ch/261/')]);
c['concurrent first requests share one index fetch'] = calls === 1;
let protoOK = true;
for (const k of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) for (const meth of ['GET', 'HEAD']) {
  const r = await get('/places/ch/' + k + '/', meth); if (r.status !== 404 || !hasSec(r)) protoOK = false; }
for (const cc of ['constructor', 'proto']) { const r = await get('/places/' + cc + '/261/'); if (r.status !== 404) protoOK = false; }
c['prototype property names give a real 404 for GET and HEAD'] = protoOK;
const h = await get('/places/ch/261/', 'HEAD'); c['HEAD of a valid page: 200 without body'] = h.status === 200 && (await h.text()) === '';
const red = await get('/places/ch/261'); c['missing slash: 301 with security headers'] = red.status === 301 && /\/places\/ch\/261\/$/.test(red.headers.get('location')) && hasSec(red);
const nf = await get('/places/ch/999/'); c['unknown place: 404 with security headers'] = nf.status === 404 && hasSec(nf);
mode = 'packfail'; const pf = await get('/places/ch/261/'); c['pack 500: 503, not 404'] = pf.status === 503;
/* r19 (audit NZ9-09): an announced bucket that is missing, not an object, or throws is a temporary failure; recovery needs no restart */
mode = 'pack404'; const p4 = await get('/places/ch/261/'); c['announced pack missing (404): 503 with retry-after and no-store'] = p4.status === 503 && p4.headers.get('retry-after') && p4.headers.get('cache-control') === 'no-store';
mode = 'packarr'; const pa = await get('/places/ch/261/'); c['pack is an array: 503'] = pa.status === 503;
mode = 'packthrow'; let pt; try { pt = await get('/places/ch/261/'); } catch (e) { pt = { status: 'threw' }; } c['pack fetch throws: 503, no escaped exception'] = pt.status === 503;
mode = 'ok'; const rc = await get('/places/ch/261/'); c['recovers after the failures without a restart: 200'] = rc.status === 200;
mode = 'ok'; const ab = await get('/places/ch/999/'); c['absent place in a valid pack is still 404'] = ab.status === 404;
for (const [k, v] of Object.entries(c)) console.log((v ? 'ok   ' : 'FAIL ') + k);
const ok = Object.values(c).every(Boolean); console.log('WORKER FAULT TEST:', ok ? 'PASS' : 'FAIL'); process.exit(ok ? 0 : 1);
