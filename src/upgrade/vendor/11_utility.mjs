/* Original Nestlyzer utility components. No competitor code or scoring coefficients. */
export const VERSION='nz-final-20261106-v2';
export const finite=v=>typeof v==='number'&&Number.isFinite(v);
export const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanID=v=>typeof v==='string'&&/^[A-Za-z0-9_.:\-]{1,160}$/.test(v);

export const POINT_STATUSES=new Set(['value','observed','estimate','modelled_estimate']);
export const safeURL=value=>{
 try {const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;return u.href;}catch{return null;}
};
export const validCoordinates=v=>Array.isArray(v)&&v.length===2&&v.every(finite)&&Math.abs(v[0])<=180&&Math.abs(v[1])<=90;
export function pointUsable(f){return !!f&&POINT_STATUSES.has(f.status)&&finite(f.value)&&f.withdrawn!==true;}
export function deepFreeze(o){if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);for(const v of Object.values(o))deepFreeze(v);}return o;}
export function formatFact(f){
 if(!f||f.withdrawn===true)return 'Not available';
 if(f.status==='interval_censored'&&finite(f.upper))return `${f.upperInclusive?'at most ':'less than '}${f.upper} ${f.unit}`;
 if(!pointUsable(f))return f.status==='suppressed'?'Suppressed by source':'Not available';
 return `${Number(f.value.toFixed(2)).toLocaleString('en-GB')} ${f.unit}`;
}
const BASIS=['metric','unit','definitionId','geographicSupport','statistic','scenario','methodVersion'];
const EXT_BASIS=['universe','denominator','priceBasis','currencyBasis','boundaryVersion','temporalAggregation'];
export function compatible(a,b){
 if(!a||!b)return {ok:false,reason:'missing_observation'};
 if(!safeURL(a.source)||!safeURL(b.source))return {ok:false,reason:'missing_source'};
 for(const k of BASIS)if(typeof a[k]!=='string'||!a[k]||a[k]!==b[k])return {ok:false,reason:`incompatible_${k}`};
 for(const k of EXT_BASIS)if((a[k]!==undefined||b[k]!==undefined)&&(!a[k]||a[k]!==b[k]))return {ok:false,reason:`incompatible_${k}`};
 if(!a.period||!b.period)return {ok:false,reason:'missing_period'};
 if(a.period!==b.period&&!(a.cohortApproved===true&&b.cohortApproved===true&&a.cohortId&&a.cohortId===b.cohortId))return {ok:false,reason:'incompatible_period'};
 return {ok:true};
}
export function evidenceRef(f,entity){
 return {entity,recordId:f?.recordId||null,metric:f?.metric||null,source:safeURL(f?.source),sourceId:f?.sourceId||null,period:f?.period||null,methodVersion:f?.methodVersion||null,value:pointUsable(f)?f.value:null,unit:f?.unit||null,status:f?.status||'missing'};
}
export function compareFacts(a,b){
 const c=compatible(a,b);if(!c.ok)return {...c,a:formatFact(a),b:formatFact(b),delta:null};
 if(a.status==='interval_censored'||b.status==='interval_censored')return {ok:false,reason:'censored_no_point_difference',a:formatFact(a),b:formatFact(b),delta:null};
 if(!pointUsable(a)||!pointUsable(b))return {ok:false,reason:'missing_suppressed_or_withdrawn',delta:null};
 return {ok:true,delta:a.value-b.value,unit:a.unit,a:formatFact(a),b:formatFact(b),periods:[a.period,b.period],statisticalSignificance:'not_tested',evidence:[evidenceRef(a),evidenceRef(b)]};
}
function basisKey(f){return JSON.stringify([...BASIS,...EXT_BASIS].map(k=>f?.[k]??null).concat(f?.cohortApproved===true&&f?.cohortId?'cohort:'+f.cohortId:'period:'+f?.period));}
export function comparisonGroups(rows,keys){
 const groups=new Map(),excluded=[],seen=new Set();
 for(const r of rows){
  if(r&&seen.has(r.id))throw new Error('Duplicate place identity in comparison');if(r)seen.add(r.id);
  if(!r||!cleanID(r.id)||keys.some(k=>!pointUsable(r.facts?.[k]))){excluded.push({id:r?.id,reason:'missing_suppressed_or_censored'});continue;}
  if(keys.some(k=>!compatible(r.facts[k],r.facts[k]).ok)){excluded.push({id:r.id,reason:'missing_basis'});continue;}
  const key=keys.map(k=>basisKey(r.facts[k])).join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);
 }
 return {groups:[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,rows])=>({key,rows:rows.sort((a,b)=>a.id.localeCompare(b.id))})),excluded};
}
export function scatterRows(rows,x,y,{logX=false,logY=false,cohortKey=null}={}){
 if(x===y)return {points:[],excluded:[],needsChoice:false,reason:'choose_distinct_axes',cohorts:[]};
 const g=comparisonGroups(rows,[x,y]);
 const choice=cohortKey?g.groups.find(a=>a.key===cohortKey):g.groups.length===1?g.groups[0]:null;
 const cohorts=g.groups.map(a=>({key:a.key,count:a.rows.length,periods:[...new Set(a.rows.map(r=>r.facts[x].period))]}));
 if(!choice)return {points:[],excluded:g.excluded,needsChoice:g.groups.length>1,reason:cohortKey?'unknown_cohort':g.groups.length>1?'select_comparison_cohort':'no_usable_observations',cohorts,x,y,logX,logY};
 const excluded=g.excluded.concat(g.groups.filter(a=>a!==choice).flatMap(a=>a.rows.map(r=>({id:r.id,reason:'different_comparison_basis'}))));
 const points=[];for(const r of choice.rows){const a=r.facts[x],b=r.facts[y];if(logX&&a.value<=0||logY&&b.value<=0){excluded.push({id:r.id,reason:'nonpositive_log'});continue;}points.push({id:r.id,label:r.name,x:logX?Math.log10(a.value):a.value,y:logY?Math.log10(b.value):b.value,rawX:a.value,rawY:b.value});}
 return {points,excluded,needsChoice:false,cohorts,cohortKey:choice.key,x,y,logX,logY};
}
export function alternatives(reference,rows,contracts,{limit=6}={}){
 if(!reference||!Array.isArray(contracts)||contracts.length<2||new Set(contracts.map(c=>c.id)).size!==contracts.length)throw new Error('Reference and distinct declared dimensions required');
 if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('Bounded alternative count required');
 for(const c of contracts)if(!finite(c.scale)||c.scale<=0||!finite(c.weight)||c.weight<=0)throw new Error('Positive fixed scales and weights required');
 const result=[],excluded=[];
 for(const r of rows){if(r.id===reference.id)continue;let sum=0,total=0,bad=null,contributions=[];
  for(const c of contracts){const a=reference.facts?.[c.id],b=r.facts?.[c.id],cmp=compareFacts(b,a);if(!cmp.ok){bad=cmp.reason;break;}sum+=c.weight*Math.abs(cmp.delta)/c.scale;total+=c.weight;contributions.push({metric:c.id,delta:cmp.delta,unit:cmp.unit,evidence:[evidenceRef(b,r.id),evidenceRef(a,reference.id)]});}
  if(bad)excluded.push({id:r.id,reason:bad});else result.push({id:r.id,name:r.name,distance:sum/total,contributions});
 }
 result.sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
 return {results:result.slice(0,limit),excluded,meaning:'Similarity only on the named dimensions; not overall fit.'};
}
export function tradeoffFrontier(rows,contracts,{cohortKey=null}={}){
 if(contracts.length<2||new Set(contracts.map(c=>c.id)).size!==contracts.length||contracts.some(c=>!['lower','higher'].includes(c.direction)))throw new Error('Distinct criteria and explicit directions required');
 const g=comparisonGroups(rows,contracts.map(c=>c.id));const choice=cohortKey?g.groups.find(a=>a.key===cohortKey):g.groups.length===1?g.groups[0]:null;
 if(!choice)return {ids:[],excluded:g.excluded,needsChoice:g.groups.length>1,cohorts:g.groups.map(a=>({key:a.key,count:a.rows.length})),meaning:'Select one compatible comparison cohort.'};
 const dominates=(a,b)=>contracts.every(c=>c.direction==='lower'?a.facts[c.id].value<=b.facts[c.id].value:a.facts[c.id].value>=b.facts[c.id].value)&&contracts.some(c=>a.facts[c.id].value!==b.facts[c.id].value);
 return {ids:choice.rows.filter(b=>!choice.rows.some(a=>a.id!==b.id&&dominates(a,b))).map(r=>r.id),excluded:[...g.excluded,...g.groups.filter(a=>a!==choice).flatMap(a=>a.rows.map(r=>({id:r.id,reason:'different_comparison_basis'})))],needsChoice:false,criteria:contracts.map(c=>c.id),meaning:'No selected alternative is better on every shown dimension; other requirements remain relevant.'};
}
export function answerShortlist(intent,rows,metric,{baselineId=null}={}){
 if(rows.length<2)return {text:'Select two or three places to compare.',claims:[],type:'action'};
 if(rows.length>3)return {text:'The comparison supports up to three places.',claims:[],type:'action'};
 if(intent==='lowest'){
  const base=rows.find(r=>pointUsable(r.facts?.[metric]));if(!base)return {text:'No usable numerical observations for this question.',claims:[],type:'gap'};
  if(rows.some(r=>!compareFacts(r.facts?.[metric],base.facts[metric]).ok))return {text:'Read these values separately. Their definitions, dates or evidence states do not support one numerical comparison.',claims:[],type:'gap'};
  const min=Math.min(...rows.map(r=>r.facts[metric].value)),winners=rows.filter(r=>r.facts[metric].value===min);
  return {text:`${winners.map(r=>r.name).join(' and ')} ${winners.length===1?'has':'have'} the lowest reported value: ${formatFact(winners[0].facts[metric])}. This is a comparison of this measure, not overall fit.`,claims:rows.map(r=>evidenceRef(r.facts[metric],r.id)),type:'sourced'};
 }
 if(intent==='difference'){
  const base=rows.find(r=>r.id===baselineId);if(!base)return {text:'Choose an explicit reference place first.',claims:[],type:'action'};
  const ds=rows.filter(r=>r.id!==base.id).map(r=>({name:r.name,id:r.id,...compareFacts(r.facts?.[metric],base.facts?.[metric])}));
  return {text:ds.map(d=>d.ok?`${d.name}: ${d.delta>=0?'+':''}${Number(d.delta.toFixed(2))} ${d.unit} versus ${base.name}.`:`${d.name}: no numerical difference is shown because the observations are not comparable.`).join(' '),claims:ds.filter(d=>d.ok).flatMap(d=>[evidenceRef(rows.find(r=>r.id===d.id).facts[metric],d.id),evidenceRef(base.facts[metric],base.id)]),type:'comparison'};
 }
 if(intent==='missing')return {text:rows.map(r=>`${r.name}: ${(r.criticalUnknowns||[]).join(', ')||'requirements have not been supplied to this view; readiness is unknown'}.`).join(' '),claims:[],type:'coverage'};
 return {text:'Use the factual comparison questions. Personal tax, eligibility and relocation advice are not generated.',claims:[],type:'unsupported'};
}
export function snapshotDiff(before,after){
 const changes=[];for(const key of ['modelVersion','geographyVersion'])if(before[key]!==after[key])changes.push({kind:key==='modelVersion'?'method':'geography',before:before[key],after:after[key]});
 const old=new Map();for(const o of before.observations||[]){if(!o.identity||old.has(o.identity))throw new Error('Unique observation identities required');old.set(o.identity,o);}
 const seen=new Set();for(const o of after.observations||[]){if(!o.identity||seen.has(o.identity))throw new Error('Unique observation identities required');seen.add(o.identity);const p=old.get(o.identity);if(!p){changes.push({kind:'added',identity:o.identity,after:o});continue;}
  if(p.contentHash!==o.contentHash)changes.push({kind:p.period!==o.period?'new_period':'source_revision',identity:o.identity,before:p,after:o});old.delete(o.identity);}
 for(const [identity,o]of old)changes.push({kind:'removed',identity,before:o});return changes;
}
export function shareState(state){
 if(!cleanID(state.profile))throw new Error('Invalid profile');
 const ids=[...new Set(state.ids||[])];if(ids.length>30||ids.some(id=>!cleanID(id)))throw new Error('Invalid share identities');
 const q=new URLSearchParams({p:state.profile,cc:/^[A-Z]{2}$/.test(state.cc)?state.cc:'ALL',list:ids.join(',')});
 for(const k of ['lens','axisY','city','tab','dataVersion','modelVersion'])if(cleanID(state[k]))q.set(k,state[k]);
 return '#/explore?'+q.toString(); // No private notes, household inputs, or tracking parameters.
}
export function parseShare(hash,allowedProfiles){
 if(typeof hash!=='string'||hash.length>6000||!hash.startsWith('#/explore?'))throw new Error('Invalid share');
 const q=new URLSearchParams(hash.slice(hash.indexOf('?')+1)),profile=q.get('p');
 if(!allowedProfiles.includes(profile))throw new Error('Unknown profile');
 const ids=(q.get('list')||'').split(',').filter(Boolean);if(ids.length>30||ids.some(id=>!cleanID(id)))throw new Error('Invalid place identities');
 const cc=q.get('cc')||'ALL';if(!/^(ALL|[A-Z]{2})$/.test(cc))throw new Error('Invalid country');
 for(const k of ['lens','axisY','city','tab','dataVersion','modelVersion'])if(q.has(k)&&!cleanID(q.get(k)))throw new Error('Invalid share field');
 return {profile,cc,ids:[...new Set(ids)],lens:q.get('lens')||'score',axisY:q.get('axisY'),city:q.get('city'),tab:q.get('tab'),dataVersion:q.get('dataVersion'),modelVersion:q.get('modelVersion')};
}
export function capabilityMatrix(requirements,evidence){
 return requirements.map(r=>{const e=evidence[r.id];const verified=e&&e.verified===true&&e.source&&e.period;return {id:r.id,label:r.label,critical:!!r.critical,status:verified?(e.satisfied===true?'documented':e.satisfied===false?'not_met':'unknown'):'unknown',source:verified?e.source:null,period:verified?e.period:null};});
}
export function cohortState(getState){
 let serial=0;const key=s=>JSON.stringify([s.profile,s.cc,s.scope,s.lens,s.axisY,s.city,s.selected,s.compareIds,s.referenceId,s.dataVersion,s.modelVersion,s.geographyVersion]);
 return {invalidate(){serial++;},async load(fetcher){const snap=structuredClone(getState()),start=key(snap),ticket=++serial;const value=await fetcher(deepFreeze(snap));if(ticket!==serial||start!==key(getState()))return {stale:true};return {stale:false,value,snapshot:snap};}};
}
export function validateHierarchy(entities){
 const m=new Map();for(const e of entities){if(m.has(e.id))throw new Error('Duplicate entity');m.set(e.id,e);}
 for(const e of entities){const seen=new Set([e.id]);let p=e.parentId;while(p){if(!m.has(p))throw new Error('Missing parent');if(seen.has(p))throw new Error('Geography cycle');seen.add(p);p=m.get(p).parentId;}}
 return true;
}
// Reusable network component. It consumes supplied, reviewed network data; no network was invented in this pack.
export function shortestWalk(graph,start,{stepFree=false,maxMinutes=60}={}){
 if(graph?.metadata?.pedestrianAccessReviewed!==true||!graph.metadata.source||!graph.metadata.version)throw new Error('Reviewed pedestrian graph metadata required');
 if(!finite(maxMinutes)||maxMinutes<0)throw new Error('Invalid route budget');
 const nodes=new Set(graph.nodes),adj=new Map([...nodes].map(n=>[n,[]]));if(nodes.size!==graph.nodes.length||!nodes.has(start))throw new Error('Invalid nodes/origin');
 for(const e of graph.edges){if(!nodes.has(e.from)||!nodes.has(e.to)||!finite(e.minutes)||e.minutes<0)throw new Error('Invalid edge');if(e.walkAllowed!==true||stepFree&&e.stepFree!==true)continue;adj.get(e.from).push(e);}
 const distances=new Map([[start,0]]),previous=new Map(),heap=[];
 function push(pair){heap.push(pair);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=pair[0])break;heap[i]=heap[p];i=p;}heap[i]=pair;}
 function pop(){const root=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;if(heap[j][0]>=last[0])break;heap[i]=heap[j];i=j;}heap[i]=last;}return root;}
 push([0,start]);
 while(heap.length){const [best,u]=pop();if(best!==(distances.get(u)??Infinity))continue;if(best>maxMinutes)break;
  for(const e of adj.get(u)){const d=best+e.minutes;if(d<=maxMinutes&&d<(distances.get(e.to)??Infinity)){distances.set(e.to,d);previous.set(e.to,u);push([d,e.to]);}}
 }
 return {distances,previous,source:graph.metadata.source,version:graph.metadata.version};
}
export function errandCircuit(matrix,stopIds,{returnToStart=true}={}){
 // Matrix from one reviewed network/mode/time case; null means no known path, never zero.
 if(stopIds.length>8||new Set(stopIds).size!==stopIds.length)throw new Error('Up to eight unique stops');
 if(!matrix||matrix.verified!==true||!matrix.source||!matrix.caseId)throw new Error('Verified route matrix required');
 const start=matrix.origin;if(stopIds.includes(start))throw new Error('Origin cannot be a stop');
 const cost=(a,b)=>{const v=matrix.minutes[a]?.[b];return finite(v)&&v>=0?v:Infinity;};
 if(!stopIds.length)return {minutes:0,order:[start],source:matrix.source};
 let best={minutes:Infinity,order:[]};
 function visit(cur,left,total,order){if(total>=best.minutes)return;if(!left.length){const final=total+(returnToStart?cost(cur,start):0);if(final<best.minutes)best={minutes:final,order:returnToStart?[...order,start]:order};return;}
 for(let i=0;i<left.length;i++){const n=left[i],c=cost(cur,n);if(Number.isFinite(c))visit(n,left.filter((_,j)=>j!==i),total+c,[...order,n]);}}
 visit(start,stopIds,0,[start]);
 return Number.isFinite(best.minutes)?{...best,source:matrix.source,caseId:matrix.caseId,scope:'travel time only; opening hours and service capacity not established'}:{minutes:null,order:[],reason:'no_verified_complete_chain'};
}
export function seasonalComparison(series,months,{aggregation=null,daysByMonth=null}={}){
 if(!Array.isArray(months)||months.some(m=>!Number.isInteger(m)||m<1||m>12)||new Set(months).size!==months.length||!months.length)throw new Error('Explicit calendar months required');
 if(!['sum','mean','day_weighted_mean'].includes(aggregation))throw new Error('Declare aggregation for the measure');
 if(!series.length)return [];
 const base=series[0];return series.map(s=>{
  if(!s.unit||!s.definitionId||!s.period||s.unit!==base.unit||s.definitionId!==base.definitionId||s.period!==base.period||s.temporalAggregation!==base.temporalAggregation)return {id:s.id,value:null,reason:'incompatible_climatology'};
  const vals=months.map(m=>s.months?.[m]);if(!vals.every(finite))return {id:s.id,value:null,reason:'missing_month'};
  let value;if(aggregation==='sum')value=vals.reduce((a,b)=>a+b,0);else if(aggregation==='mean')value=vals.reduce((a,b)=>a+b,0)/vals.length;
  else {const weights=months.map(m=>daysByMonth?.[m]);if(weights.some(v=>!Number.isInteger(v)||v<28||v>31))throw new Error('Verified month-length weights required');value=vals.reduce((sum,v,i)=>sum+v*weights[i],0)/weights.reduce((a,b)=>a+b,0);}
  return {id:s.id,value,unit:s.unit,months,statistic:aggregation,source:s.source||null,period:s.period};
 });
}
export function guidedStops(records){
 return records.filter(r=>cleanID(r.id)&&safeURL(r.source)&&r.period&&r.publicationApproved===true).slice(0,12).map(r=>({id:r.id,title:r.name,body:r.summary,source:safeURL(r.source),period:r.period,coordinates:validCoordinates(r.coordinates)?r.coordinates:null}));
}
export function normalizedReasons(items){
 const by=new Map();for(const item of items){if(!cleanID(item.needId)||!finite(item.contribution))throw new Error('Reason identity and contribution required');const r=by.get(item.needId)||{needId:item.needId,label:item.label,total:0,evidence:[],components:[]};r.total+=item.contribution;r.components.push({label:item.label,contribution:item.contribution});r.evidence.push(...(item.evidence||[]));by.set(item.needId,r);}
 return [...by.values()].map(r=>({...r,tradeoff:r.components.some(i=>i.contribution>0)&&r.components.some(i=>i.contribution<0)})).sort((a,b)=>Math.abs(b.total)-Math.abs(a.total)||a.needId.localeCompare(b.needId));
}
export function reviewSelection(raw,{profiles,entityIds,defaultProfile='car_free',dataVersion,modelVersion}){
 const allowed=new Set(entityIds),pr=new Set(profiles);const list=(v,max)=>Array.isArray(v)?[...new Set(v.filter(x=>cleanID(x)&&allowed.has(x)))].slice(0,max):[];
 const compareIds=list(raw?.compareIds??raw?.ids,3);const savedIds=list(raw?.savedIds,1000);const warnings=[];
 if(raw?.dataVersion&&raw.dataVersion!==dataVersion)warnings.push('data_release_changed');if(raw?.modelVersion&&raw.modelVersion!==modelVersion)warnings.push('model_release_changed');
 return {state:{profile:pr.has(raw?.profile)?raw.profile:pr.has(defaultProfile)?defaultProfile:profiles[0],cc:/^(ALL|[A-Z]{2})$/.test(raw?.cc||'')?raw.cc:'ALL',savedIds,compareIds,referenceId:compareIds.includes(raw?.referenceId)?raw.referenceId:null,dataVersion,modelVersion},warnings};
}
export function createBoard(initial,config,onChange=()=>{}){
 let state=reviewSelection(initial,config).state;
 const commit=next=>{state=reviewSelection(next,config).state;onChange(deepFreeze(structuredClone(state)));return structuredClone(state);};
 return {get:()=>structuredClone(state),replace:next=>commit(next),profile:p=>{if(!config.profiles.includes(p))throw new Error('Unknown profile');return commit({...state,profile:p});},
 save:id=>{if(!config.entityIds.includes(id))throw new Error('Unknown place');return commit({...state,savedIds:state.savedIds.includes(id)?state.savedIds.filter(x=>x!==id):[...state.savedIds,id]});},
 compare:id=>{if(!config.entityIds.includes(id))throw new Error('Unknown place');if(!state.compareIds.includes(id)&&state.compareIds.length===3)return {ok:false,reason:'compare_limit',state:structuredClone(state)};const next=state.compareIds.includes(id)?state.compareIds.filter(x=>x!==id):[...state.compareIds,id];return {ok:true,state:commit({...state,compareIds:next})};},
 reference:id=>{if(!state.compareIds.includes(id))throw new Error('Reference must be in the comparison');return commit({...state,referenceId:id});},
 clear:()=>commit({...state,savedIds:[],compareIds:[],referenceId:null})};
}
export function encodeView(s){
 if(!cleanID(s.profile)||!Array.isArray(s.compareIds)||s.compareIds.length>3||s.compareIds.some(id=>!cleanID(id)))throw new Error('Invalid view');
 const q=new URLSearchParams({v:'2',p:s.profile,cc:/^(ALL|[A-Z]{2})$/.test(s.cc||'')?s.cc:'ALL',cmp:[...new Set(s.compareIds)].join(',')});
 for(const k of ['lens','axisY','city','tab','dataVersion','modelVersion','geographyVersion','referenceId'])if(cleanID(s[k]))q.set(k,s[k]);
 if(s.referenceId&&!s.compareIds.includes(s.referenceId))throw new Error('Reference must be selected');return '#/explore?'+q.toString();
}
export function decodeView(hash,config){
 if(typeof hash!=='string'||hash.length>6000||!hash.startsWith('#/explore?'))throw new Error('Invalid view');const q=new URLSearchParams(hash.slice(hash.indexOf('?')+1));
 const allowed=new Set(['v','p','cc','cmp','lens','axisY','city','tab','dataVersion','modelVersion','geographyVersion','referenceId']);
 for(const k of q.keys())if(!allowed.has(k)||q.getAll(k).length!==1)throw new Error('Unexpected or duplicate view field');
 if(q.get('v')!=='2'||!config.profiles.includes(q.get('p')))throw new Error('Unsupported view or profile');
 if(!/^(ALL|[A-Z]{2})$/.test(q.get('cc')||''))throw new Error('Invalid country scope');
 if(config.tabs&&q.has('tab')&&!config.tabs.includes(q.get('tab')))throw new Error('Unknown tab');
 const ids=(q.get('cmp')||'').split(',').filter(Boolean);if(ids.length>3||ids.some(id=>!config.entityIds.includes(id)))throw new Error('Unresolved place identity');
 const r={profile:q.get('p'),compareIds:ids,cc:q.get('cc')};
 for(const k of ['lens','axisY','city','tab','dataVersion','modelVersion','geographyVersion','referenceId'])if(q.has(k)){if(!cleanID(q.get(k)))throw new Error('Invalid view field');r[k]=q.get(k);}
 if(r.referenceId&&!ids.includes(r.referenceId))throw new Error('Reference not selected');
 if(config.lenses&&(r.lens&&!config.lenses.includes(r.lens)||r.axisY&&!config.lenses.includes(r.axisY)))throw new Error('Unknown lens');
 if(config.cities&&r.city&&!config.cities.includes(r.city))throw new Error('Unknown city');
 return {...r,warnings:reviewSelection(r,config).warnings};
}
