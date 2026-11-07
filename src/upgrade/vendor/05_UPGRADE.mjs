/* Original additive utilities. No dependency, remote service, score or private storage. */
const finite = x => typeof x === 'number' && Number.isFinite(x);
const fail = m => { throw new TypeError(m); };
export const STATUS = Object.freeze(['investigate', 'shortlist', 'park']);
export function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (finite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return fail('Non-JSON or nonfinite value');
}
const clone = v => JSON.parse(canonical(v));
const ident = x => typeof x === 'string' && x.length > 0 && x.length <= 200 && !/[\u0000-\u001f]/.test(x);
const list = (v, limit, what) => Array.isArray(v) && v.length <= limit ? v : fail(what);
export function validPoint(x, y) { return finite(x) && finite(y) && Math.abs(x) <= 180 && Math.abs(y) <= 90; }
function deltaLon(x) { return ((x + 180) % 360 + 360) % 360 - 180; }
function unwrap(ring) {
  const points = [[ring[0][0], ring[0][1]]];
  for (let i = 1; i < ring.length; i++) points.push([points[i-1][0] + deltaLon(ring[i][0] - ring[i-1][0]), ring[i][1]]);
  return points;
}
const orient = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function onSegment(p,a,b) { return Math.abs(orient(a,b,p)) < 1e-9 && p[0] >= Math.min(a[0],b[0])-1e-9 && p[0] <= Math.max(a[0],b[0])+1e-9 && p[1] >= Math.min(a[1],b[1])-1e-9 && p[1] <= Math.max(a[1],b[1])+1e-9; }
function intersects(a,b,c,d) {
  return onSegment(c,a,b)||onSegment(d,a,b)||onSegment(a,c,d)||onSegment(b,c,d)||((orient(a,b,c)>0)!==(orient(a,b,d)>0) && (orient(c,d,a)>0)!==(orient(c,d,b)>0));
}
export function validateArea(a) {
  if (!a || typeof a !== 'object') return fail('Area object required');
  if (a.kind === 'country') return /^[A-Z]{2}$/.test(a.code) ? {kind:'country',code:a.code} : fail('Country code');
  if (a.kind === 'region') return /^[A-Z]{2}$/.test(a.country) && ident(a.code) ? {kind:'region',country:a.country,code:a.code} : fail('Region identity');
  if (a.kind === 'entity') return ident(a.id) ? {kind:'entity',id:a.id} : fail('Entity identity');
  if (a.kind === 'bbox') {
    const {west,south,east,north}=a;
    if (!validPoint(west,south)||!validPoint(east,north)||south>=north||west===east) return fail('Invalid bounds');
    return {kind:'bbox',west,south,east,north};
  }
  if (a.kind !== 'polygon') return fail('Unsupported area kind');
  let ring = list(a.ring,201,'Polygon limited to 200 vertices plus closure').map(p => Array.isArray(p)&&p.length===2&&validPoint(...p)?p.slice():fail('Invalid vertex'));
  if (ring.length>1 && canonical(ring[0])===canonical(ring.at(-1))) ring.pop();
  if (ring.length<3 || new Set(ring.map(canonical)).size!==ring.length) return fail('Invalid polygon vertices');
  const r=unwrap(ring), xs=r.map(p=>p[0]);
  if (Math.max(...xs)-Math.min(...xs)>=180) return fail('Use bounding boxes for hemisphere-sized scopes');
  const twice=r.reduce((n,p,i)=>n+p[0]*r[(i+1)%r.length][1]-r[(i+1)%r.length][0]*p[1],0);
  if (Math.abs(twice)<1e-10) return fail('Degenerate polygon');
  for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++){
    if(j===i+1||(i===0&&j===r.length-1))continue;
    if(intersects(r[i],r[(i+1)%r.length],r[j],r[(j+1)%r.length]))return fail('Self-intersecting polygon');
  }
  return {kind:'polygon',ring};
}
export function validateScope(scope={areas:[],excluded:[]}) {
  const norm = key => {
    const seen=new Map();
    for(const a of list(scope[key]||[],20,'At most 20 scope areas')) { const v=validateArea(a);seen.set(canonical(v),v); }
    return [...seen.entries()].sort(([a],[b])=>a.localeCompare(b)).map(x=>x[1]);
  };
  return {areas:norm('areas'),excluded:norm('excluded')};
}
const RINGS = new WeakMap();
function areaMatch(p,a) {
  if(a.kind==='country')return p.cc===a.code;
  if(a.kind==='region')return p.cc===a.country && p.regionCode===a.code;
  if(a.kind==='entity')return p.id===a.id;
  if(!validPoint(p.longitude,p.latitude))return null;
  const x=p.longitude,y=p.latitude;
  if(a.kind==='bbox')return y>=a.south&&y<=a.north&&(a.west<a.east?x>=a.west&&x<=a.east:x>=a.west||x<=a.east);
  let r=RINGS.get(a);if(!r){r=unwrap(a.ring);RINGS.set(a,r);}const mid=r.reduce((n,p)=>n+p[0],0)/r.length;
  const point=[mid+deltaLon(x-mid),y];let inside=false;
  for(let i=0,j=r.length-1;i<r.length;j=i++){
    if(onSegment(point,r[i],r[j]))return true;
    if((r[i][1]>y)!==(r[j][1]>y) && point[0]<(r[j][0]-r[i][0])*(y-r[i][1])/(r[j][1]-r[i][1])+r[i][0])inside=!inside;
  }
  return inside;
}
function membership(place,s) {
  const inc=s.areas.map(a=>areaMatch(place,a)),exc=s.excluded.map(a=>areaMatch(place,a));
  if(exc.includes(true))return {included:false,reason:'excluded_area'};
  const matched=!inc.length||inc.includes(true);
  if(!matched)return inc.includes(null)?{included:null,reason:'coordinate_unknown'}:{included:false,reason:'outside_scope'};
  if(exc.includes(null))return {included:null,reason:'exclusion_unresolved'};
  return {included:true,reason:'within_selected_scope'};
}
export function scopeMembership(place,scope) { return membership(place,validateScope(scope)); }
export function filterPlaces(places,scope) {
  const unique=new Map(),s=validateScope(scope);let unknown=0,outside=0,excluded=0;
  for(const p of places){if(!ident(p.id))fail('Native ID required');if(unique.has(p.id)){if(canonical(unique.get(p.id))!==canonical(p))fail('Conflicting duplicate place');continue;}unique.set(p.id,p);}
  const items=[];
  for(const p of unique.values()){
    const m=membership(p,s);if(m.included===true)items.push(p);else if(m.included===null)unknown++;else if(m.reason==='excluded_area')excluded++;else outside++;
  }
  return {items,counts:{unique:unique.size,included:items.length,unknown,outside,excluded},scope:s};
}
export function folded(text) { return String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\u00df/g,'ss'); }
export function searchPlaces(places,query,{limit=30,cc=null}={}) {
  if(!Number.isInteger(limit)||limit<1||limit>200)fail('Limit 1..200');
  const q=folded(query).trim(),tokens=q.split(/\s+/).filter(Boolean);
  return places.filter(p=>(!cc||p.cc===cc)&&tokens.every(t=>folded([p.name,p.latin,p.officialName,p.countryName,p.cc,p.region].join(' ')).includes(t)))
    .sort((a,b)=>{const an=folded(a.name),bn=folded(b.name);const ax=an===q?0:an.startsWith(q)?1:2,bx=bn===q?0:bn.startsWith(q)?1:2;return ax-bx||an.localeCompare(bn)||a.id.localeCompare(b.id);}).slice(0,limit);
}
export function viewKey(context) {
  if(!ident(context.profile)||!['household','business'].includes(context.mode))fail('Profile and mode required');
  return canonical({profile:context.profile,mode:context.mode,scope:validateScope(context.scope)});
}
export function dismissPlace(state,id,context) {
  if(!ident(id))fail('Place ID required');const out=clone(state||{hidden:{},undo:[]}),key=viewKey(context);
  out.hidden=out.hidden||{};out.undo=out.undo||[];const ids=new Set(out.hidden[key]||[]);
  if(!ids.has(id)){ids.add(id);out.hidden[key]=[...ids].sort();out.undo.push({key,id});out.undo=out.undo.slice(-50);}
  return out;
}
export function undoDismiss(state) {
  const out=clone(state||{hidden:{},undo:[]}),last=(out.undo||[]).pop();
  if(last)out.hidden[last.key]=(out.hidden[last.key]||[]).filter(x=>x!==last.id);return out;
}
export function visiblePlaces(places,state,context) { const hidden=new Set(state?.hidden?.[viewKey(context)]||[]);return places.filter(p=>!hidden.has(p.id)); }
export function addRecentView(views,view,at) {
  if(!ident(view.name)||!Number.isFinite(Date.parse(at)))fail('View name and ISO timestamp required');
  const value={name:view.name.slice(0,80),profile:view.profile,mode:view.mode,scope:validateScope(view.scope),lastUsed:at};const key=viewKey(value);
  return [{...value,key},...list(views||[],50,'Too many views').filter(v=>v.key!==key)].slice(0,10);
}
const versions = v => {
  if(!v||!ident(v.data)||!ident(v.model)||!ident(v.geography))fail('Explicit version IDs required');
  return {data:v.data,model:v.model,geography:v.geography};
};
export function makeReviewPacket({profile,scope,versions:ver,places},generatedOn) {
  if(!ident(profile)||!Number.isFinite(Date.parse(generatedOn)))fail('Profile/timestamp required');
  const seen=new Set();const rows=list(places,100,'Review packet limited to 100 places').map(p=>{if(!ident(p.id)||!STATUS.includes(p.status)||seen.has(p.id))fail('Invalid/duplicate review item');seen.add(p.id);return {id:p.id,status:p.status};});
  return {format:'nestlyzer-review-v1',profile,scope:validateScope(scope),versions:versions(ver),generatedOn,places:rows};
}
export function previewReview(text,knownIds,current,allowedProfiles) {
  if(typeof text!=='string'||text.length>100000)fail('Review file too large');
  const p=JSON.parse(text);if(p.format!=='nestlyzer-review-v1'||!allowedProfiles.has(p.profile))fail('Unknown review format/profile');
  const safe=makeReviewPacket(p,p.generatedOn),warnings=[];
  if(canonical(versions(current.versions))!==canonical(safe.versions))warnings.push('release_mismatch');
  const changes=[],unresolved=[];
  for(const row of safe.places){if(!knownIds.has(row.id))unresolved.push(row);else if(current.statuses?.[row.id]!==row.status)changes.push({...row,previous:current.statuses?.[row.id]||null});}
  return {packet:safe,changes,unresolved,warnings,base:canonical(current)};
}
export function applyReview(current,preview,{confirmed=false,acceptVersionMismatch=false,ids=[]}={}) {
  if(!confirmed)fail('Explicit confirmation required');
  if(preview.base!==canonical(current))fail('Board changed; preview again');
  if(preview.warnings.includes('release_mismatch')&&!acceptVersionMismatch)fail('Review source version mismatch');
  const allowed=new Map(preview.changes.map(r=>[r.id,r]));const out=clone(current);out.statuses=out.statuses||{};
  for(const id of list(ids,100,'Too many approvals')){if(!allowed.has(id))fail('Only previewed changes may be applied');out.statuses[id]=allowed.get(id).status;}
  return out;
}
export function monthlySeries(rows,entity,metric) {
  const matches=rows.filter(r=>r.entity_id===entity&&r.indicator_id===metric&&r.slot!=='annual');
  const byMonth=new Map();let signature=null;
  for(const r of matches){const n=Number(r.slot),v=typeof r.value==='string'&&r.value.trim()!==''?Number(r.value):r.value;
    if(r.quality_flag)fail('Source series requires reconciliation: '+r.quality_flag);
    if(!Number.isInteger(n)||n<1||n>12||!finite(v)||r.observation_status!=='reported')fail('Invalid monthly observation');
    const sig=canonical([r.indicator_id,r.unit,r.reference_period,r.statistic,r.source_geo_level,r.source_id]);if(signature!==null&&sig!==signature)fail('Mixed series basis');signature=sig;
    if(byMonth.has(n))fail('Duplicate month');byMonth.set(n,{...r,value:v});
  }
  if(byMonth.size!==12)fail('A complete 12-month series is required');
  return {entity,metric,signature,values:Array.from({length:12},(_,i)=>byMonth.get(i+1))};
}
export function monthComparison(series,month) {
  if(!Number.isInteger(month)||month<1||month>12||!series.length||series.length>3)fail('Month 1..12 and 1..3 series required');
  if(new Set(series.map(s=>s.signature)).size!==1)fail('Incompatible source series');
  if(new Set(series.map(s=>s.entity)).size!==series.length)fail('Duplicate series');
  return series.map(s=>({entity:s.entity,record:s.values[month-1]}));
}
export function serviceContrast(a,b,per=10000) {
  const keys=['concept','unit','period','inventoryMethod','inventoryCoverage','denominatorConcept','boundaryBasis'];
  if(keys.some(k=>!ident(a[k])||a[k]!==b[k]))fail('Incompatible inventory/denominator definitions');
  if(a.inventoryCoverage!=='documented_complete')fail('Unknown completeness cannot support a service gap');
  if(!finite(a.count)||!finite(b.count)||a.count<0||b.count<0||!finite(a.denominator)||!finite(b.denominator)||a.denominator<=0||b.denominator<=0||!finite(per)||per<=0)fail('Invalid count or denominator');
  const av=per*a.count/a.denominator,bv=per*b.count/b.denominator;
  return {a:av,b:bv,difference:av-bv,unit:`recorded ${a.concept} per ${per} ${a.denominatorConcept}`,interpretation:'Observed inventory comparison only. Not unmet demand, commercial viability, service quality or available capacity.'};
}
export function createRequestGate(readSnapshot) {
  let generation=0;
  return {invalidate(){generation++;},async run(load){const g=++generation,key=canonical(readSnapshot());const data=await load();return g===generation&&key===canonical(readSnapshot())?{accepted:true,data}:{accepted:false,reason:'stale_snapshot'};}};
}
