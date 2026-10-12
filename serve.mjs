// Local static server that mimics GitHub Pages (gzip, 404.html, index.html in folders).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const ROOT = path.resolve(process.argv[2] || '.'); const PORT = +process.argv[3] || 8787;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  let status = 200;
  if (!fs.existsSync(f)) { f = path.join(ROOT, '404.html'); status = 404; }
  const ext = path.extname(f); let body = fs.readFileSync(f);
  const h = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=600' };
  if (/text|json|javascript|svg|xml/.test(h['Content-Type']) && /gzip/.test(req.headers['accept-encoding'] || '')) { body = zlib.gzipSync(body); h['Content-Encoding'] = 'gzip'; }
  res.writeHead(status, h); res.end(body);
}).listen(PORT, () => console.log('serving', ROOT, 'on', PORT));
