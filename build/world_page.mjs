/* Nestlyzer 2.14: the Worldwide module (/world/). One search across all countries, for households and business sites.
   Static page in the site's own style: the default view (world, young families) is rendered at build time for search
   engines and slow phones; a small script then switches profile, scope and country from the published rank files
   (data/rank/<scope>.json, model world-4). Every list carries its evidence: the national, same-everywhere and in-country
   shares of each score, the data depth of each country, the in-country check against real moves and the world
   benchmark against independently documented hubs. Nothing here changes a score. */
import fs from 'node:fs';
import path from 'node:path';

const SCOPES = [['world', 'World'], ['europe', 'Europe'], ['americas', 'Americas'], ['asia_pacific', 'Asia-Pacific'], ['mideast_africa', 'Middle East and Africa']];
const READY = { detailed: ['Detailed local data', 'about 40 official measures for the commune itself'], partial: ['Partial local data', 'about 20 official measures for the commune itself'], foundation: ['Municipal data', '15 to 22 official measures for the municipality'], basic: ['Regional data', 'figures mostly for the county, prefecture or region, not the town itself'] };

// a dot-matrix world (the globe's look, flat): one dot per 2.5 degrees of land, drawn as zero-length round-capped lines
function landDots(ROOT, topojson) {
  const topo = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/source/natural-earth_land-50m.topo.json'), 'utf8'));
  const key = Object.keys(topo.objects)[0], fc = topojson.feature(topo, topo.objects[key]);
  const polys = [];
  for (const f of fc.features || [fc]) { const g = f.geometry; if (!g) continue; const P = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []; for (const p of P) { const r = p[0]; let a = 180, b = 90, c = -180, d = -90; for (const [x, y] of r) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } polys.push({ r, a, b, c, d }); } }
  const inside = (x, y, r) => { let o = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) o = !o; } return o; };
  let d = '';
  for (let lat = 78.75; lat > -57; lat -= 2.5) for (let lon = -178.75; lon < 180; lon += 2.5) {
    if (polys.some((p) => lon >= p.a && lon <= p.c && lat >= p.b && lat <= p.d && inside(lon, lat, p.r))) d += `M${(lon + 180).toFixed(2)} ${(80 - lat).toFixed(2)}h0`;
  }
  return d;
}

export function worldPage({ ROOT, topojson, meta, esc, fmtInt, flagImg, PICON, appLink, page, VERSION }) {
  const cfg = meta.config, dormant = new Set(cfg.bizDormant || []);
  const rank = {}; for (const [s] of SCOPES) { const f = path.join(ROOT, 'data/rank', s + '.json'); if (fs.existsSync(f)) rank[s] = JSON.parse(fs.readFileSync(f, 'utf8')); }
  if (!rank.world) return;
  const order = (cfg.order || Object.keys(cfg.profiles)).concat(Object.keys(cfg.profiles)).filter((k, i, a) => a.indexOf(k) === i);
  const prof = order.filter((k) => cfg.profiles[k] && rank.world.profiles[k] && !dormant.has(k)).map((k) => [k, cfg.profiles[k].name, cfg.profiles[k].business ? 1 : 0, cfg.profiles[k].intro || cfg.profiles[k].desc || '']);
  const names = Object.fromEntries(meta.countries.map((c) => [c.cc, c.name]));
  // data depth per country: the app's own readiness label (municipal statistics, or figures mostly regional)
  const ready = {};
  for (const c of meta.countries) { try { const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/c', c.cc + '.json'), 'utf8')); const i = d.cols.indexOf('ready'); const cnt = {}; for (const r of d.rows) cnt[r[i]] = (cnt[r[i]] || 0) + 1; ready[c.cc] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0]; } catch (e) { ready[c.cc] = 'basic'; } }
  // evidence: the in-country check against real moves, and the world benchmark (never part of a score)
  const J = (p) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch (e) { return null; } };
  const EA = J('docs/audit/evidence_audit_all.json') || J('docs/audit/evidence_audit.json'), WB = J('docs/audit/world_benchmark.json'), REF = J('build/source/benchmarks/world_reference.json');
  const ev = {};
  for (const [k] of prof) {
    const a = EA && EA.profiles && EA.profiles[k], b = WB && WB[k];
    ev[k] = [a ? [a.top30_grows_faster_in, a.countries, a.median_gap_pct_points, a.verdict.split(':')[0]] : null, b ? [b.in_top_100, b.references, b.median_percentile, REF.profiles[k].why] : null];
  }
  const dots = landDots(ROOT, topojson);
  const icon = (k) => PICON[k] || '';
  const chip = (p, on) => `<button type="button" class="wx-chip" data-wp="${p[0]}" data-biz="${p[2]}" aria-pressed="${on}"${p[2] ? ' hidden' : ''}>${icon(p[0])}<span>${esc(p[1])}</span></button>`;
  // build-time default view: world, young families, first 25 metro areas
  const def = rank.world.profiles.young_family, defRows = def.top.slice(0, 25);
  const rowHTML = (t, i, k) => { const cc = t[0].split(':')[0]; return `<li class="wx-row" data-cc="${cc}"><span class="wx-rk">${i + 1}</span><a class="wx-nm" href="${appLink({ cc, p: k, sel: t[0] })}">${flagImg(cc, 14)} ${esc(t[1])}</a><span class="wx-meta">${esc(names[cc] || cc)}</span><span class="wx-sc">${t[2].toFixed(1)}</span></li>`; };
  const pinsSVG = (rows) => rows.filter((t) => t[8] != null).map((t, i) => `<circle cx="${(t[9] + 180).toFixed(1)}" cy="${(80 - t[8]).toFixed(1)}" r="${i < 10 ? 2.4 : 1.5}" class="wx-pin${i < 10 ? ' wx-pin-top' : ''}"/>`).join('');
  const css = `<style>
.wx-hero{display:grid;gap:10px;margin:8px 0 18px}.wx-hero h1{font-size:var(--step-4);line-height:1.02;margin:0}.wx-hero .lede{max-width:62ch;margin:0}
.wx-panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-l);padding:14px;display:grid;gap:12px;box-shadow:var(--shadow)}
.wx-seg{display:inline-flex;gap:4px;background:var(--surface-2);border-radius:999px;padding:4px;max-width:100%;overflow-x:auto;scrollbar-width:none}.wx-seg button{border:0;background:none;font:inherit;font-weight:600;padding:8px 14px;border-radius:999px;color:var(--ink-2);cursor:pointer;min-height:36px}.wx-seg button[aria-pressed="true"]{background:var(--ink);color:var(--paper)}
.wx-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}.wx-chip{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:7px 12px;font:inherit;font-size:var(--step--1);cursor:pointer;min-height:36px;color:var(--ink)}.wx-chip svg{width:16px;height:16px}.wx-chip[aria-pressed="true"]{border-color:var(--ink);background:var(--ink);color:var(--paper)}.wx-chip[hidden]{display:none}
.wx-row-ctl{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.wx-row-ctl select{font:inherit;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);min-height:38px}
.wx-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:18px;margin-top:18px;align-items:start}@media (max-width:900px){.wx-grid{grid-template-columns:1fr}}
.wx-map{position:sticky;top:calc(var(--header-h,64px) + 10px);background:var(--navy,#0b2e5c);border-radius:var(--radius-l);padding:10px;overflow:hidden}@media (max-width:900px){.wx-map{position:static}}
.wx-map svg{width:100%;height:auto;display:block}.wx-land{stroke:rgba(255,255,255,.28);stroke-width:1.3;stroke-linecap:round;fill:none}.wx-pin{fill:#f5c542;opacity:.8}.wx-pin-top{fill:#fff;stroke:#f5c542;stroke-width:.8;opacity:1}.wx-pin.on{fill:#ff6b5b;opacity:1}
.wx-maplegend{color:rgba(255,255,255,.75);font-size:12px;margin:6px 4px 0}
.wx-list{list-style:none;margin:0;padding:0;display:grid;gap:6px}.wx-row{display:grid;grid-template-columns:2.2em minmax(0,1fr) auto;grid-template-areas:"rk nm sc" "rk mt sc" "rk why why";column-gap:10px;row-gap:2px;padding:10px 12px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}
.wx-rk{grid-area:rk;font-weight:700;color:var(--ink-3);font-variant-numeric:tabular-nums}.wx-nm{grid-area:nm;font-weight:650;color:var(--ink);text-decoration:none;min-width:0;overflow-wrap:anywhere}.wx-nm:hover{text-decoration:underline}.wx-meta{grid-area:mt;color:var(--ink-2);font-size:var(--step--1)}.wx-sc{grid-area:sc;font-weight:700;font-variant-numeric:tabular-nums;align-self:center;font-size:var(--step-1)}
.wx-why{grid-area:why;display:flex;height:6px;border-radius:3px;overflow:hidden;margin-top:6px;background:var(--surface-2)}.wx-why i{display:block}.wx-why .n{background:var(--blue,#2b6cb0)}.wx-why .a{background:var(--cyan,#0f9fb3)}.wx-why .l{background:var(--sun,#f5c542)}
.wx-key{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink-2)}.wx-key b{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.wx-badge{display:inline-block;font-size:11px;font-weight:650;padding:1px 7px;border-radius:999px;border:1px solid var(--line);color:var(--ink-2);margin-left:6px}.wx-badge.basic{border-color:var(--amber,#c98a00);color:var(--amber,#9a6a00)}
.wx-ev{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:18px 0}.wx-ev section{border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;background:var(--surface)}.wx-ev h3{margin:0 0 4px;font-size:var(--step-0)}.wx-ev p{margin:4px 0 0;font-size:var(--step--1);color:var(--ink-2)}.wx-ev .big{font-family:var(--font-display);font-size:var(--step-3);line-height:1;color:var(--ink)}
.wx-more{margin-top:10px}
.wx-tabwrap{overflow-x:auto;margin:10px 0 24px}.wx-tab{width:100%;border-collapse:collapse;font-size:var(--step--1)}.wx-tab th,.wx-tab td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}.wx-tab th{font-weight:650;color:var(--ink-2);border-bottom:2px solid var(--line-2,var(--line))}.wx-tab .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
</style>`;
  const P0 = prof.find((p) => p[0] === 'young_family') || prof[0];
  const body = `${css}<div class="wx-hero"><h1>Search the whole world.</h1><p class="lede">One ranking across ${meta.countries.length} countries for the household or company site you pick. Each place is compared on figures that mean the same everywhere, on how its country stands, and on how it ranks inside its own country, weighted by how much local data that country has. Nearby suburbs fold into one entry per metro area.</p></div>
<div class="wx-panel" id="wx-panel">
<div class="wx-row-ctl"><div class="wx-seg" role="group" aria-label="What to rank"><button type="button" data-wmode="home" aria-pressed="true">Places to live</button><button type="button" data-wmode="biz" aria-pressed="false">Business locations</button></div>
<div class="wx-seg" role="group" aria-label="Where">${SCOPES.map(([s, n], i) => `<button type="button" data-ws="${s}" aria-pressed="${i === 0}">${n}</button>`).join('')}</div></div>
<div class="wx-chips" role="group" aria-label="Profile">${prof.map((p) => chip(p, p === P0)).join('')}</div>
<div class="wx-row-ctl"><label class="small" for="wx-cc">Country</label><select id="wx-cc"><option value="">All countries</option></select><span class="small muted" id="wx-count">${fmtInt(def.ranked)} places ranked, ${def.top.length} metro areas listed</span></div>
</div>
<div class="wx-ev" id="wx-ev" aria-live="polite"></div>
<div class="wx-grid"><div><div class="wx-key" aria-hidden="true"><span><b style="background:var(--blue,#2b6cb0)"></b>Country level</span><span><b style="background:var(--cyan,#0f9fb3)"></b>Same everywhere (climate, reach, terrain)</span><span><b style="background:var(--sun,#f5c542)"></b>Rank inside its country</span></div>
<ol class="wx-list" id="wx-list" style="margin-top:10px">${defRows.map((t, i) => rowHTML(t, i, 'young_family')).join('')}</ol><button type="button" class="btn wx-more" id="wx-more">Show all 100</button></div>
<div class="wx-map" aria-label="Map of the listed places"><svg viewBox="0 0 360 137" role="img" aria-label="World map with the ranked places"><path class="wx-land" d="${dots}"/><g id="wx-pins">${pinsSVG(def.top)}</g></svg><p class="wx-maplegend">White: top 10. Yellow: the rest of the list. Tap a place in the list to find it here.</p></div></div>
<h2 style="font-size:var(--step-2);margin:30px 0 8px">How to read this ranking</h2><ul class="prose"><li><b>The bar under each place</b> shows what its score rests on: the country's standing on comparable national figures (World Bank, Transparency International and others), measures that mean the same everywhere (climate class, residents within 100 km, terrain, the sea), and how the place ranks inside its own country.</li><li><b>Data depth.</b> A country's internal ranking counts only as far as its local data reaches. Where the figures are mostly regional (marked Regional data), a place's rank inside its country is pulled towards the middle, so a thin data set cannot carry a town to the world top.</li><li><b>One entry per metro area.</b> The best place within 25 km stands for its area and says how many more ranked places it folds in.</li><li><b>City profiles</b> (students, mobile professionals, singles, head offices, tech and finance) compare towns and cities of 50,000 or more residents, because that is where the evidence says these people and firms go.</li><li><b>Checks, not tweaks.</b> The evidence boxes above compare each ranking with real population movement and with independently documented hubs. These checks never enter a score, and no place is moved by hand.</li></ul>
<h2 id="evidence" style="font-size:var(--step-2);margin:30px 0 8px">Evidence for every profile</h2><p>Two checks run with every release. <b>Real moves:</b> in each country with an official five-year population change, did the profile's top 30 grow faster than the country's other places? <b>Documented hubs:</b> for profiles with clear independent evidence, how many of the named hubs appear in the world top 100 metro areas? Neither check enters a score.</p>
<div class="wx-tabwrap"><table class="wx-tab"><thead><tr><th>Profile</th><th class="num">Real moves: countries where the top grew faster</th><th>Verdict</th><th class="num">Documented hubs in the world top 100</th></tr></thead><tbody>${prof.filter((p) => ev[p[0]][0] || ev[p[0]][1]).map((p) => { const [a, b] = ev[p[0]]; return `<tr><td>${esc(p[1])}</td><td class="num">${a ? a[0] + ' of ' + a[1] : '–'}</td><td>${a ? esc(a[3]) : '–'}</td><td class="num">${b ? b[0] + ' of ' + b[1] : '–'}</td></tr>`; }).join('')}</tbody></table></div>
<script>window.NZW=${JSON.stringify({ P: prof, N: names, R: Object.fromEntries(Object.entries(ready).map(([c, r]) => [c, r])), RD: READY, EV: ev, V: VERSION }).replace(/</g, '\\u003c')};</script>
<script>${WORLD_JS}</script>`;
  page({ p: '/world/', title: 'Worldwide ranking of places to live and business locations | Nestlyzer', desc: `Search ${meta.countries.length} countries at once: the best places to live and the best business locations worldwide, by continent and by profile, with the evidence behind every score.`, body, crumbs: [['Home', '/'], ['Worldwide', '/world/']] });
}

const WORLD_JS = `(function(){var W=window.NZW,$=function(s){return document.querySelector(s)},$$=function(s){return [].slice.call(document.querySelectorAll(s))};
var st={m:'home',s:'world',p:'young_family',cc:'',all:false},cache={};
try{var h=new URLSearchParams(location.hash.slice(1));if(h.get('g'))st.s=h.get('g');if(h.get('p')){st.p=h.get('p');st.m=W.P.some(function(x){return x[0]===st.p&&x[2]})?'biz':'home'}if(h.get('cc'))st.cc=h.get('cc')}catch(e){}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function load(s){return cache[s]=cache[s]||fetch('/data/rank/'+s+'.json?v='+W.V).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
function link(cc,id){return '/#/explore?'+new URLSearchParams({cc:cc,p:st.p,sel:id}).toString()}
function flag(cc){return '<img class="flag" src="/assets/flags/'+cc.toLowerCase()+'.png" alt="" width="19" height="14" loading="lazy">'}
function evHTML(){var e=W.EV[st.p]||[],a=e[0],b=e[1],o='';
 o+='<section><h3>Do people really move to these places?</h3>'+(a?'<div class="big">'+a[0]+' of '+a[1]+'</div><p>countries where the top 30 of this profile grew faster than the country\\'s other places over five years (median gap '+(a[2]>0?'+':'')+a[2]+' percentage points): <b>'+esc(a[3])+'</b>.</p>':'<p>No population-change test for this profile yet (too few countries with the five-year figure, or a business profile).</p>')+'</section>';
 o+='<section><h3>Does it find the places others document?</h3>'+(b?'<div class="big">'+b[0]+' of '+b[1]+'</div><p>independently documented hubs for this profile are in the world top 100 metro areas; half of them are in the top '+b[2]+'%. Reference: '+esc(b[3])+'</p>':'<p>No reference list for this profile yet. Reference lists exist where independent evidence names clear hubs.</p>')+'</section>';
 o+='<section><h3>What the scores rest on</h3><p>National figures from the World Bank, Transparency International, V-Dem and the World Bank\\'s Women, Business and the Law; climate classes, residents within 100 km and terrain measured the same way everywhere; and each country\\'s own local statistics. <a href="/method/">Method</a></p></section>';
 $('#wx-ev').innerHTML=o}
function render(){$$('[data-wmode]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.wmode===st.m))});$$('[data-ws]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.ws===st.s))});
 $$('.wx-chip').forEach(function(b){var biz=b.dataset.biz==='1';b.hidden=(st.m==='biz')!==biz;b.setAttribute('aria-pressed',String(b.dataset.wp===st.p))});
 evHTML();var box=$('#wx-list');box.setAttribute('aria-busy','true');
 load(st.s).then(function(G){var pr=G.profiles[st.p];box.removeAttribute('aria-busy');
  if(!pr||!pr.top.length){box.innerHTML='<li class="wx-row"><span></span><span class="wx-nm">This profile is ranked country by country only</span><span class="wx-meta">Its criteria rely on figures each country defines its own way.</span></li>';$('#wx-pins').innerHTML='';$('#wx-count').textContent='';return}
  var ccs={};pr.top.forEach(function(t){ccs[t[0].split(':')[0]]=1});var sel=$('#wx-cc'),cur=st.cc;sel.innerHTML='<option value="">All countries</option>'+Object.keys(ccs).sort(function(a,b){return (W.N[a]||a).localeCompare(W.N[b]||b)}).map(function(c){return '<option value="'+c+'"'+(c===cur?' selected':'')+'>'+esc(W.N[c]||c)+'</option>'}).join('');if(cur&&!ccs[cur]){st.cc='';sel.value=''}
  var rows=pr.top.map(function(t,i){return {t:t,i:i}}).filter(function(x){return !st.cc||x.t[0].indexOf(st.cc+':')===0}),shown=st.all?rows:rows.slice(0,25);
  $('#wx-count').textContent=pr.ranked.toLocaleString('en')+' places ranked, '+pr.top.length+' metro areas listed'+(st.cc?', '+rows.length+' in '+(W.N[st.cc]||st.cc):'');
  box.innerHTML=shown.map(function(x){var t=x.t,cc=t[0].split(':')[0],n=t[4]||0,a=t[5]||0,l=Math.max(0,100-n-a),rd=W.RD[W.R[cc]]||W.RD.basic,top=Math.max(1,Math.round(100-t[3]));
   return '<li class="wx-row" data-id="'+esc(t[0])+'"><span class="wx-rk">'+(x.i+1)+'</span><a class="wx-nm" href="'+link(cc,t[0])+'">'+flag(cc)+' '+esc(t[1])+'</a><span class="wx-meta">'+esc(W.N[cc]||cc)+' · top '+top+'% in the country'+(t[7]?' · stands for '+t[7]+' more nearby':'')+'<span class="wx-badge'+(W.R[cc]==='basic'?' basic':'')+'" title="'+esc(rd[1])+'">'+rd[0]+'</span>'+(t[6]?'<span class="wx-badge basic">Thin evidence</span>':'')+'</span><span class="wx-sc">'+t[2].toFixed(1)+'</span><span class="wx-why" role="img" aria-label="Country level '+n+'%, same-everywhere measures '+a+'%, rank in its country '+l+'%"><i class="n" style="width:'+n+'%"></i><i class="a" style="width:'+a+'%"></i><i class="l" style="width:'+l+'%"></i></span></li>'}).join('');
  $('#wx-more').hidden=st.all||rows.length<=25;
  $('#wx-pins').innerHTML=rows.filter(function(x){return x.t[8]!=null}).map(function(x,j){return '<circle data-id="'+esc(x.t[0])+'" cx="'+(x.t[9]+180).toFixed(1)+'" cy="'+(80-x.t[8]).toFixed(1)+'" r="'+(j<10?2.4:1.5)+'" class="wx-pin'+(j<10?' wx-pin-top':'')+'"><title>'+esc(x.t[1])+'</title></circle>'}).join('');
 }).catch(function(){box.removeAttribute('aria-busy');box.innerHTML='<li class="wx-row"><span></span><span class="wx-nm">The ranking did not load</span><span class="wx-meta">Check the connection and pick again.</span></li>'});
 try{history.replaceState(null,'','#'+new URLSearchParams({g:st.s,p:st.p}).toString()+(st.cc?'&cc='+st.cc:''))}catch(e){}}
document.addEventListener('click',function(ev){var b=ev.target.closest('[data-wmode],[data-ws],.wx-chip,#wx-more');if(!b)return;
 if(b.dataset.wmode){st.m=b.dataset.wmode;var f=W.P.filter(function(x){return (x[2]===1)===(st.m==='biz')})[0];if(f)st.p=f[0];st.all=false}
 else if(b.dataset.ws){st.s=b.dataset.ws;st.cc='';st.all=false}else if(b.dataset.wp){st.p=b.dataset.wp;st.all=false}else if(b.id==='wx-more'){st.all=true}render()});
document.addEventListener('change',function(ev){if(ev.target.id==='wx-cc'){st.cc=ev.target.value;st.all=false;render()}});
document.addEventListener('mouseover',function(ev){var r=ev.target.closest('.wx-row[data-id]');$$('.wx-pin.on').forEach(function(c){c.classList.remove('on')});if(r){var c=document.querySelector('.wx-pin[data-id="'+r.dataset.id+'"]');if(c)c.classList.add('on')}});
document.addEventListener('focusin',function(ev){var r=ev.target.closest&&ev.target.closest('.wx-row[data-id]');if(r){var c=document.querySelector('.wx-pin[data-id="'+r.dataset.id+'"]');$$('.wx-pin.on').forEach(function(x){x.classList.remove('on')});if(c)c.classList.add('on')}});
render()})();`;
