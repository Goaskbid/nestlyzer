'use strict';
/* Pure descriptive statistics. No hypothesis tests, validation badges or weight changes. */
const finite = Number.isFinite;
const median = a => { const s=a.slice().sort((x,y)=>x-y); if(!s.length)return null; const k=Math.floor(s.length/2); return s.length%2?s[k]:(s[k-1]+s[k])/2; };
function ranks(a) {
  if (!a.every(finite)) throw new TypeError('Ranks require finite numbers');
  const s=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]), r=Array(a.length);
  for(let i=0;i<s.length;){let j=i;while(j+1<s.length&&s[j+1][0]===s[i][0])j++;for(let k=i;k<=j;k++)r[s[k][1]]=(i+j)/2;i=j+1;}
  return r;
}
function spearman(a,b) {
  if(a.length!==b.length)throw new Error('Unmatched statistic arrays');
  if(a.length<2)return null;
  const x=ranks(a),y=ranks(b),m=(a.length-1)/2;let xy=0,xx=0,yy=0;
  for(let i=0;i<a.length;i++){const dx=x[i]-m,dy=y[i]-m;xy+=dx*dy;xx+=dx*dx;yy+=dy*dy;}
  return xx&&yy?Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy))):null;
}
function percentile(a,v){if(!a.length||!finite(v))return null;const n=a.filter(x=>x<v).length,t=a.filter(x=>x===v).length;return a.length===1?.5:(n+(t-1)/2)/(a.length-1);}
function aggregate(rows) {
  const groups=new Map(),unresolved=[];
  for(const r of rows){if(!finite(r.x)||!finite(r.y))continue;if(!r.group){unresolved.push(r);continue;}if(!groups.has(r.group))groups.set(r.group,[]);groups.get(r.group).push(r);}
  const units=[],conflicts=[];
  for(const [key,a] of groups){const ys=new Set(a.map(x=>x.y));if(ys.size!==1){conflicts.push(key);continue;}
    const sorted=a.slice().sort((a,b)=>a.id.localeCompare(b.id));
    units.push({id:key,name:a[0].groupName||a[0].name,x:median(a.map(x=>x.x)),y:a[0].y,places:a.length,representative:sorted[0].id});}
  units.sort((a,b)=>b.x-a.x||a.id.localeCompare(b.id));
  return {units,unresolved:unresolved.length,conflicts};
}
function stats(rows,minN=30) {
  const a=aggregate(rows),u=a.units,n=u.length;
  const result={linkedPlaces:rows.length,units:n,unresolvedUnits:a.unresolved,conflictingUnits:a.conflicts.length,
    status:n<minN?'insufficient_units':'descriptive',rho:null,top:null,examples:[],sample:[],sampling:'Deterministic evenly spaced score-order sample, not random; not used to estimate the statistics.'};
  if(n<minN){result.sample=sample(u,60);return result;}
  result.rho=spearman(u.map(r=>r.x),u.map(r=>r.y));
  if(result.rho===null){result.status='constant_series';result.sample=sample(u,60);return result;}
  const y=u.map(x=>x.y).sort((a,b)=>a-b),q=f=>y[Math.floor(f*(n-1))];
  const high=q(.8),low=q(.2),target=Math.ceil(n*.1),cutoff=u[target-1].x,top=u.filter(x=>x.x>=cutoff);
  const ambiguous=high===low;
  const upper=x=>ambiguous?x.y>high:x.y>=high,lower=x=>ambiguous?x.y<low:x.y<=low;
  const share=(a,f)=>a.length?a.filter(f).length/a.length:null;
  result.top={target,targetFraction:.1,actual:top.length,tieExpanded:top.length>target,scoreCutoff:cutoff,
    upperCutoff:high,lowerCutoff:low,coincidentCutoffs:ambiguous,upperShare:share(top,upper),lowerShare:share(top,lower),
    referenceUpperShare:share(u,upper),referenceLowerShare:share(u,lower)};
  result.top.upperDifference=result.top.upperShare-result.top.referenceUpperShare;
  const highs=top.filter(lower).slice(0,5).map(x=>({...x,kind:'high_score_lower_outcome'}));
  const middleScore=median(u.map(z=>z.x));
  const lows=u.filter(x=>x.x<middleScore&&upper(x)).sort((a,b)=>b.y-a.y||a.id.localeCompare(b.id)).slice(0,5).map(x=>({...x,kind:'lower_score_higher_outcome'}));
  result.examples=[...highs,...lows];result.sample=sample(u,60);return result;
}
function sample(u,max){if(u.length<=max)return u;return Array.from({length:max},(_,i)=>u[Math.round(i*(u.length-1)/(max-1))]);}
function inputOverlap(profile,outcome,cc,semantic=false){
  const w=profile.weights||{}, paths=[];let kind='none_detected';
  if(outcome==='industry_lq'&&(w.cluster||0)>0){paths.push('cluster');kind='direct';}
  if(outcome==='population_change'&&!semantic){
    if((w.demographics||0)>0){paths.push('demographics');kind=cc==='CH'?'related_construct':'direct';}
    if((w.family||0)>0){paths.push('family');if(kind==='none_detected')kind='possible_derived';}
    if(profile.focus && Object.keys(profile.focus).some(k=>/population_growth/.test(k))){paths.push('focus');kind='direct';}
  }
  return {known:paths.length>0,kind,paths,remainingDependencies:'Derived inputs and spatial dependence may remain. No diagnostic here is a held-out test.'};
}
module.exports={median,ranks,spearman,percentile,aggregate,stats,inputOverlap};
