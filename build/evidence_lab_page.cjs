'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(L){
 if(L.schema!=='nz-evidence-lab-2')throw Error('Unsupported Evidence Lab snapshot');
 const profiles=Object.values(L.profiles),active=profiles.filter(p=>p.active),countries=Object.entries(L.countryNames).sort((a,b)=>a[1].localeCompare(b[1]));
 const rows=countries.map(([cc,name])=>{const a=L.countries[cc],pairs=Object.entries(a.profiles),hh=pairs.filter(([p,v])=>!L.profiles[p].business&&v.status==='descriptive').length,biz=pairs.filter(([p,v])=>L.profiles[p].business&&v.status==='descriptive').length;
 return `<tr><th scope="row"><a href="?cc=${esc(cc)}&amp;p=pensioner">${esc(name)}</a></th><td>${a.activePlaces.toLocaleString('en-GB')}</td><td>${hh} / ${active.filter(p=>!p.business).length}</td><td>${biz} / ${active.filter(p=>p.business).length}</td><td>Not tested</td></tr>`;}).join('');
 return `<link rel="stylesheet" href="/assets/evidence-lab.css?v=${L.input_sha256.slice(0,12)}">
<section id="evidence-lab" class="elab" data-input-sha="${L.input_sha256}" aria-labelledby="lab-title">
<header class="elab-heading"><div><p class="elab-kicker">Nestlyzer / research and accountability</p><h1 id="lab-title">Evidence Lab</h1><p>Inspect what a ranking rests on, where it disagrees with context, and what still needs testing.</p></div><span class="elab-status">Descriptive diagnostics</span></header>
<form id="elab-controls" class="elab-controls" aria-label="Select an evidence check">
<label>Country<select id="elab-country" name="cc">${countries.map(([cc,n])=>`<option value="${cc}"${cc==='CH'?' selected':''}>${esc(n)}</option>`).join('')}</select></label>
<label>Profile<select id="elab-profile" name="p">${[false,true].map(b=>`<optgroup label="${b?'Business':'Households'}">${active.filter(p=>p.business===b).map(p=>`<option value="${p.id}"${p.id==='pensioner'?' selected':''}>${esc(p.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>
<button class="btn" id="elab-export" type="button" disabled>Export check</button></form>
<div id="elab-live" class="visually-hidden" role="status" aria-live="polite"></div>
<section id="elab-check" aria-label="Selected evidence check"><p>Loading the stored audit. No model is trained in your browser.</p></section>
<div class="elab-overview" aria-label="Audit scope"><div><b>${L.summary.countries}</b><span>countries, including gaps</span></div><div><b>${L.summary.publicProfiles}</b><span>public profiles</span></div><div><b>0</b><span>independently validated profiles</span></div></div>
<section class="elab-section" aria-labelledby="elab-world-title"><div class="elab-section-head"><h2 id="elab-world-title">Coverage for this profile</h2><label class="elab-search">Find a country<input id="elab-search" type="search" placeholder="Country name or code" autocomplete="off"></label></div><p id="elab-coverage-note" class="small muted">All countries remain visible, including those without an outcome.</p><div id="elab-coverage" class="elab-country-grid"></div><button id="elab-more" class="btn" type="button" hidden>Show all countries</button></section>
<details class="elab-section"><summary>Definitions, sources and promotion rules</summary>
<div class="elab-definitions"><section><h3>Context is not validation</h3><p>Population growth is not migration by retirement status or household type. An existing industry cluster is not evidence of new investment or commercial success.</p></section>
<section><h3>Two sources must be independent</h3><p>Two websites repeating one dataset are one evidence family. Regional values copied to multiple towns are not independent municipal observations.</p></section>
<section><h3>Read the signed relationship</h3><p>Spearman rank correlation runs from -1 to +1. Negative values are visible, not hidden. Constant series have no defined correlation. No significance or causal claim is made.</p></section>
<section><h3>Weights do not change here</h3><p>Promotion requires matched cohort outcomes, separate geographic and temporal holdouts, documented uncertainty, independent sources and matching benchmark receipts. The current weights are preserved, not certified.</p></section></div>
<p class="small">Data snapshot: ${esc(L.built)}. Model: ${esc(L.model.method)} / ${esc(L.model.evidenceMode)}. Fingerprint <code>${L.input_sha256.slice(0,16)}</code>. <a href="/data/evidence/lab.json">Full machine-readable audit</a>.</p>
<div id="elab-references"></div></details>
<details class="elab-section"><summary>All ${profiles.length} profile contracts, including ${profiles.length-active.length} inactive configurations</summary><p>Inactive configurations are retained for audit, not silently included in public country rankings. None is independently validated by this Lab.</p><div class="elab-table-wrap"><table><thead><tr><th>Profile</th><th>State</th><th>Required outcome evidence</th></tr></thead><tbody>${profiles.map(p=>`<tr><th scope="row">${esc(p.name)}</th><td>${p.active?'Public':'Inactive'}</td><td>${esc(p.requiredEvidence||'Not supplied')}</td></tr>`).join('')}</tbody></table></div></details>
<details class="elab-section"><summary>Complete country coverage, available without JavaScript</summary><div class="elab-table-wrap"><table class="table"><caption>Descriptive checks, not independent validations</caption><thead><tr><th>Country</th><th>Active places</th><th>Household diagnostics</th><th>Business diagnostics</th><th>Validation</th></tr></thead><tbody>${rows}</tbody></table></div></details>
<noscript><p>JavaScript is disabled. The country table, scope and methodology remain available above. The full audit JSON contains each country-profile result.</p></noscript>
</section><script defer src="/assets/evidence-lab.js?v=${L.input_sha256.slice(0,12)}"></script>`;
}
module.exports={render,esc};
