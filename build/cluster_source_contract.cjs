'use strict';
/* Input validation and candidate calculation only. No implicit publication. */
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const FIN=Number.isFinite, SERVICES=['G-I','J','K','L','M_N','O-Q','R-U'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function textFile(file){const b=fs.readFileSync(file);if(/^\s*<(?:!doctype|html)/i.test(b.toString('utf8',0,150)))throw Error('HTML is not source data');return {text:(b[0]===31&&b[1]===139?zlib.gunzipSync(b):b).toString('utf8').replace(/^\uFEFF/,''),sha256:sha(b)};}
function csv(text,delimiter=','){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else quoted=false;}else cell+=c;}
 else if(c==='"'){if(cell)throw Error('Unexpected quote');quoted=true;}else if(c===delimiter){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('Unterminated CSV quote');if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}return rows;
}
function cell(s){s=String(s??'').trim();if(!s||/^:(?:\s+[a-z]+)?$/i.test(s))return {value:null,flags:s.replace(':','').trim(),missing:true};
 const m=/^(-?\d+(?:\.\d+)?)(?:\s+([a-z]+(?:\s+[a-z]+)*))?$/i.exec(s);if(!m)throw Error('Invalid numeric observation '+s);
 const v=Number(m[1]);if(!FIN(v)||v<0)throw Error('Negative/non-finite employment');return {value:v,flags:m[2]||'',missing:false};}
function parseEurostat(text){
 const lines=text.trimEnd().split(/\r?\n/),head=lines.shift().split('\t'),dims=head[0].split('\\')[0].split(',').map(x=>x.trim()),years=head.slice(1).map(x=>x.trim());
 for(const k of ['freq','unit','wstatus','nace_r2','geo'])if(!dims.includes(k))throw Error('Missing Eurostat dimension '+k);
 if(!years.length||years.some(x=>!/^\d{4}$/.test(x))||new Set(years).size!==years.length)throw Error('Invalid year axis');
 const records=new Map(),ignored={nonregional:0,wrongSeries:0},units=new Set();
 for(const [i,line] of lines.entries()){if(!line.trim())continue;const a=line.split('\t'),values=a[0].split(',');if(values.length!==dims.length||a.length!==head.length)throw Error('TSV width mismatch at '+(i+2));const d=Object.fromEntries(dims.map((k,n)=>[k,values[n].trim()]));
  if(!/^[A-Z]{2}[A-Z0-9]{3}$/.test(d.geo)){ignored.nonregional++;continue;}
  if(d.freq!=='A'||d.wstatus!=='EMP'||!['THS','THS_PER'].includes(d.unit)){ignored.wrongSeries++;continue;}units.add(d.unit);
  if(!['B-E',...SERVICES].includes(d.nace_r2))continue;
  for(let j=0;j<years.length;j++){const obs=cell(a[j+1]),key=[d.geo,years[j],d.unit,d.nace_r2].join('|');const r={...d,period:years[j],...obs};if(records.has(key)&&JSON.stringify(records.get(key))!==JSON.stringify(r))throw Error('Conflicting duplicate '+key);records.set(key,r);}
 }
 const groups=new Map();for(const r of records.values()){const key=[r.geo,r.period,r.unit].join('|');if(!groups.has(key))groups.set(key,{geo:r.geo,period:r.period,unit:r.unit,sectors:{}});groups.get(key).sectors[r.nace_r2]=r;}
 const complete=[],held=[];
 for(const g of groups.values()){const missing=['B-E',...SERVICES].filter(k=>!g.sectors[k]||g.sectors[k].value===null);if(missing.length){held.push({geo:g.geo,period:g.period,unit:g.unit,missing});continue;}
  complete.push({geo:g.geo,country:g.geo.slice(0,2),period:g.period,unit:g.unit,industry:g.sectors['B-E'].value,services:SERVICES.reduce((n,k)=>n+g.sectors[k].value,0),flags:Object.fromEntries(Object.entries(g.sectors).filter(([,v])=>v.flags).map(([k,v])=>[k,v.flags])),support:'NUTS3',kind:'regional-employment-context'});
 }
 return {records:complete,held,ignored,units:[...units],sourceCells:records.size};
}
function parseLocal(text){
 const rows=csv(text),header=rows.shift()||[],required=['official_id','industry','services','unit','period','source_id','geography_vintage'];if(new Set(header).size!==header.length)throw Error('Duplicate CSV header');for(const k of required)if(!header.includes(k))throw Error('Required local column '+k);
 const records=[],held=[],seen=new Map();for(const [i,arr]of rows.entries()){if(arr.length!==header.length)throw Error('Local CSV width mismatch at '+(i+2));const r=Object.fromEntries(header.map((k,n)=>[k,arr[n].trim()]));for(const k of ['official_id','unit','period','source_id','geography_vintage'])if(!r[k])throw Error('Missing '+k+' at row '+(i+2));
  if(!['employee_positions','persons_employed','establishments'].includes(r.unit))throw Error('Unapproved local unit '+r.unit);
  if(!/^\d{4}(?:-\d{2}-\d{2})?$/.test(r.period))throw Error('Invalid local period');const a=cell(r.industry),b=cell(r.services);const v={...r,industry:a.value,services:b.value,flags:{industry:a.flags,services:b.flags},support:'municipality',kind:r.unit==='establishments'?'municipal-establishment-context':'municipal-employment-context'};
  const key=[r.official_id,r.period,r.unit,r.source_id,r.geography_vintage].join('|');if(seen.has(key)&&JSON.stringify(seen.get(key))!==JSON.stringify(v))throw Error('Conflicting local observation '+key);if(seen.has(key))continue;seen.set(key,v);
  if(a.missing||b.missing)held.push({...v,reason:'missing-sector-observation'});else records.push(v);
 }return {records,held};
}
function percentile(values){const a=values.filter(FIN).slice().sort((x,y)=>x-y);return v=>{if(!FIN(v)||!a.length)return null;if(a.length===1||a[0]===a.at(-1))return 50;let lo=0,hi=a.length;while(lo<hi){let m=(lo+hi)>>1;if(a[m]<v)lo=m+1;else hi=m;}const first=lo;lo=0;hi=a.length;while(lo<hi){let m=(lo+hi)>>1;if(a[m]<=v)lo=m+1;else hi=m;}return ((first+Math.max(first,lo-1))/2)/(a.length-1)*100;};}
function cohort(records,contract){
 if(!contract||!contract.period||!contract.unit||!Array.isArray(contract.expected_ids)||!contract.expected_ids.length||!contract.geography_vintage)throw Error('Explicit period, unit, expected geography roster and vintage required');
 const wanted=new Set(contract.expected_ids.map(String));if(wanted.size!==contract.expected_ids.length)throw Error('Duplicate expected geography');
 const selected=records.filter(r=>r.period===contract.period&&r.unit===contract.unit&&wanted.has(String(r.geo??r.official_id)));
 const by=new Map();for(const r of selected){const id=String(r.geo??r.official_id);if(by.has(id))throw Error('Ambiguous duplicate in scoring cohort '+id);by.set(id,r);}
 const missing=[...wanted].filter(id=>!by.has(id));if(missing.length)throw Error('Incomplete geography cohort: '+missing.length+' units missing');
 const out=[...by.values()];if(out.some(r=>r.geography_vintage&&r.geography_vintage!==contract.geography_vintage))throw Error('Geography vintage mismatch');
 const pi=percentile(out.map(r=>Math.log1p(r.industry))),ps=percentile(out.map(r=>Math.log1p(r.services))),shares=out.map(r=>r.industry+r.services>0?r.industry/(r.industry+r.services):null),pish=percentile(shares),pssh=percentile(shares.map(x=>FIN(x)?1-x:null));
 return out.map((r,i)=>({...r,industryScore:shares[i]===null?null:Math.round((pi(Math.log1p(r.industry))+pish(shares[i]))/2),servicesScore:shares[i]===null?null:Math.round((ps(Math.log1p(r.services))+pssh(1-shares[i]))/2),score_kind:'candidate-relative-context-not-site-feasibility',score_eligible:false,denominator:out.length,denominator_definition:'industry B-E plus services G-U; excludes agriculture and construction',geography_vintage:contract.geography_vintage}));
}
module.exports={textFile,csv,cell,parseEurostat,parseLocal,percentile,cohort,SERVICES,sha};
