/** Public facts remain subject to the application's separate review/release process.
 * This module joins presentation to existing records. It does not approve claims. */
import crypto from 'node:crypto';
export function programmeRecords(rows) {
  const ids = new Set();
  return rows.map(([cc,k,n,f,s,c,u,st,ck]) => {
    if (!cc || !k || !n || !Array.isArray(f)) throw Error('Invalid programme row');
    const id = 'programme-' + crypto.createHash('sha256').update([cc,k,n].join('\u001f')).digest('hex').slice(0,16);
    if (ids.has(id)) throw Error('Duplicate programme identity: '+id); ids.add(id);
    return {id,cc,k,n,f,s,c,u,st,ck,sources:[u,...(ck?.additional_sources||[])].filter(Boolean)};
  });
}
function safeURL(v) {try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function programmeMatrix(title, subtitle, rows, esc, flag, countryName) {
  if (!rows.length) return '';
  const grouped = [...rows].sort((a,b)=>countryName(a.cc).localeCompare(countryName(b.cc))||a.n.localeCompare(b.n));
  return `<figure class="pe-ch pe-matrix"><figcaption><b>${esc(title)}</b><small>${esc(subtitle)}</small></figcaption><details><summary>Compare ${grouped.length} programme records</summary><div class="pp-wrap"><table class="pp-tab"><thead><tr><th>Country and programme</th><th>Published figures</th><th>Conditions and status</th></tr></thead><tbody>${grouped.map(r=>`<tr data-chart-programme="${r.id}" data-k="${esc(r.k)}"><th>${flag(r.cc,14)} ${esc(countryName(r.cc))}<br><a href="#${r.id}">${esc(r.n)}</a></th><td>${r.f.map(esc).join('<br>')}</td><td>${r.st?'<b>'+esc(r.st)+'.</b> ':''}${esc(r.c||'Conditions not supplied in this record.')} ${r.sources.map((s,i)=>{const u=safeURL(s);return u?`<a href="${esc(u)}" rel="noopener noreferrer">Source ${i+1}</a>`:''}).join(' ')}</td></tr>`).join('')}</tbody></table></div></details><small>Different mechanisms and eligibility cases. These rows are not ordered by economic advantage and do not share a numerical tax or investment axis.</small></figure>`;
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
