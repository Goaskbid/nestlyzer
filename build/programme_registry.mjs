/** Public facts remain subject to the application's separate review/release process.
 * This module joins presentation to existing records. It does not approve claims. */
import crypto from 'node:crypto';
export function programmeRecords(rows) {
  const ids = new Set();
  return rows.map(([cc,k,n,f,s,c,u,st,ck]) => {
    if (!cc || !k || !n || !Array.isArray(f)) throw Error('Invalid programme row');
    const id = 'programme-' + crypto.createHash('sha256').update([cc,k,n].join('\u001f')).digest('hex').slice(0,16);
    if (ids.has(id)) throw Error('Duplicate programme identity: '+id); ids.add(id);
    return {id,cc,k,n,f,s,c,u,st,ck,numericClaims:ck?.numericClaims||[],sources:[u,...(ck?.additional_sources||[])].filter(Boolean)};
  });
}
function safeURL(v) {try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function programmeMatrix(title, subtitle, rows, esc, flag, countryName) {
  if (!rows.length) return '';
  const grouped = [...rows].sort((a,b)=>countryName(a.cc).localeCompare(countryName(b.cc))||a.n.localeCompare(b.n));
  return `<figure class="pe-ch pe-matrix"><figcaption><b>${esc(title)}</b><small>${esc(subtitle)}</small></figcaption><details><summary>Compare ${grouped.length} programme records</summary><div class="pp-wrap"><table class="pp-tab"><thead><tr><th>Country and programme</th><th>Published figures</th><th>Conditions and status</th></tr></thead><tbody>${grouped.map(r=>`<tr data-chart-programme="${r.id}" data-k="${esc(r.k)}"><th>${flag(r.cc,14)} ${esc(countryName(r.cc))}<br><a href="#${r.id}">${esc(r.n)}</a></th><td>${propertyClaimFigures(r).map(esc).join('<br>')}</td><td>${r.st?'<b>'+esc(r.st)+'.</b> ':''}${esc(r.c||'Conditions not supplied in this record.')} ${r.sources.map((s,i)=>{const u=safeURL(s);return u?`<a href="${esc(u)}" rel="noopener noreferrer">Source ${i+1}</a>`:''}).join(' ')}</td></tr>`).join('')}</tbody></table></div></details><small>Different mechanisms and eligibility cases. These rows are not ordered by economic advantage and do not share a numerical tax or investment axis.</small></figure>`;
}
/** Only explicitly reviewed, same-basis claims may drive a numerical chart later. */
export function comparableProgrammeValues(records) {
  const fields=['metric','unit','qualifyingBase','mechanism','eligibleCohort','period','territoryBasis'];
  const cohorts = new Map(), excluded=[];
  for (const r of records) {
    const c=r.numericContract;
    if (!c || c.reviewed!==true || c.status!=='observed' || !Number.isFinite(c.value) || !fields.every(k=>typeof c[k]==='string'&&c[k].trim())) {excluded.push(r.id);continue;}
    const key=JSON.stringify(fields.map(k=>c[k]));
    if(!cohorts.has(key))cohorts.set(key,[]);
    cohorts.get(key).push({programmeId:r.id,value:c.value,sourceIds:c.sourceIds||[]});
  }
  return {cohorts:[...cohorts].map(([key,values])=>({key,values})),excluded};
}


/** A route-threshold comparison, not a ranking of permits, personal eligibility or total costs.
 * Values are owned by the SAME programme records as the cards. No fixed numeric bar arrays. */
export function propertyClaims(records) {
  const out=[], seen=new Set();
  for(const r of records) for(const c of r.numericClaims||[]) {
    if(c.measure!=='minimum_qualifying_property_acquisition_price'||c.basis!=='purchase_value_before_taxes_fees_and_other_conditions'||c.unit!=='EUR'||c.status!=='source_reported'||/^(closed|paused|suspended|withdrawn|expired)\b/i.test(r.st||'')) continue;
    if(!c.id||seen.has(c.id)||!Number.isFinite(c.value)||c.value<=0||!safeURL(c.source_url)||!/^\d{4}-\d{2}-\d{2}$/.test(c.checked_on)||!Number.isFinite(Date.parse(c.checked_on+'T00:00:00Z'))||new Date(c.checked_on+'T00:00:00Z').toISOString().slice(0,10)!==c.checked_on||c.checked_on>new Date().toISOString().slice(0,10)||!c.conditions)throw Error('Invalid property claim '+(c.id||r.id));
    seen.add(c.id);out.push({...c,programmeId:r.id,cc:r.cc});
  }
  return out.sort((a,b)=>a.cc.localeCompare(b.cc)||a.id.localeCompare(b.id));
}
export function propertyChart(records,esc,countryName){
 const rows=propertyClaims(records);if(!rows.length)return '';
 const max=Math.max(...rows.map(c=>c.value));
 const nf=v=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v);
 return `<figure class="pe-ch property-chart" aria-labelledby="property-chart-title"><figcaption><h2 id="property-chart-title">Property acquisition thresholds in selected EU residence routes</h2><p>Minimum qualifying purchase value in euros, before taxes, fees and other requirements. These are route-specific thresholds, not total costs, guaranteed permits or a ranking of countries. Coverage: ${[...new Set(rows.map(c=>countryName(c.cc)))].map(esc).join(', ')}.</p></figcaption><div class="property-axis" aria-hidden="true"><span>EUR 0</span><span>${esc(nf(max))}</span></div><div role="list">${rows.map(c=>`<div class="property-row" role="listitem" data-chart-programme="${c.programmeId}" data-claim-id="${esc(c.id)}"><a href="#${c.programmeId}">${esc(c.label)}</a><div class="property-track" aria-hidden="true"><i style="width:${(100*c.value/max).toFixed(4)}%"></i></div><strong>${esc(nf(c.value))}</strong><details><summary>Conditions and additional costs</summary><p>${esc(c.conditions)}</p></details><small><a href="${esc(safeURL(c.source_url))}" rel="noopener noreferrer">Official rule</a> · threshold checked ${esc(c.checked_on)}. No individual advice.</small></div>`).join('')}</div><p class="property-empty" hidden>No charted route matches this filter.</p></figure>`;
}
export function propertyClaimFigures(r){
 const rows=propertyClaims([r]);return rows.length?rows.map(c=>c.label+': '+new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(c.value)+' minimum qualifying purchase value'):r.f;
}
