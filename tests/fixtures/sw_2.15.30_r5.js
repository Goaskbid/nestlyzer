const V='nz-2.15.30';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['/offline.html','/assets/site.css?v=2.15.30','/data/meta.json?v=2.15.30'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c).then(()=>x.keys()).then(ks=>{const pages=ks.filter(k=>!/[?]v=|offline/.test(k.url));if(pages.length>40)pages.slice(0,pages.length-40).forEach(k=>x.delete(k))}))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match('/offline.html'))));return}
if(/^\/(data|assets|vendor)\//.test(u.pathname)&&u.search.indexOf('v=')>=0){e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res})))}});
