/* One explicit identity/rank/depth contract. Presentation only: never changes scores. */
var NZCardUI = (function () {
  'use strict';
  function finite(x) { return typeof x === 'number' && Number.isFinite(x); }
  function escape(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function rank(input) {
    input = input || {};
    var valid = Number.isInteger(input.rank) && input.rank > 0;
    var total = Number.isInteger(input.total) && input.total > 0 ? input.total : null;
    if (valid && total !== null && input.rank > total) return {label:'Rank unavailable',detail:'Ranking denominator inconsistent',state:'invalid'};
    if (!valid) return {label:'Not ranked',detail:input.reason || 'Outside this ranking or eligibility unresolved',state:'unranked'};
    return {label:'#' + input.rank.toLocaleString('en-GB') + (total ? ' of ' + total.toLocaleString('en-GB') : ''),detail:[input.profile,input.scope].filter(Boolean).join(' | ') || 'Comparison scope unavailable',state:'ranked'};
  }
  function depth(record, result) {
    record = record || {}; result = result || {};
    var counts = {local:0,regional:0,national:0,unresolved:0}, raw = record.factorRaw || {}, levels = record.factorLevel || {};
    Object.keys(raw).forEach(function (key) {
      if (!finite(raw[key])) return;
      var v = levels[key];
      if (v === 0) counts.local++;
      else if ([1,2,3].indexOf(v) >= 0) counts.regional++;
      else if (v === 9) counts.national++;
      else counts.unresolved++;
    });
    var known = ['local','regional','national'].filter(function (k) { return counts[k] > 0; });
    var label = known.length > 1 ? 'Mixed inputs' : known.length === 1 ? {local:'Local inputs',regional:'Regional inputs',national:'National inputs'}[known[0]] : 'Support unresolved';
    var details = [];
    ['local','regional','national','unresolved'].forEach(function (k) { if(counts[k]) details.push(counts[k] + ' ' + k); });
    if (finite(result.weighted) && result.weighted >= 0 && result.weighted <= 100) details.push(Math.round(result.weighted) + '% of profile weight covered');
    if (!details.length) details.push('No resolved input support supplied');
    return {label:label,detail:details.join('; '),counts:counts,state:known.length ? (counts.unresolved ? 'partial' : 'described') : 'unresolved'};
  }
  function metadata(input) {   // 2.15.23: two short facts, details on hover/tap only
    var r=rank(input),d=input.depth || depth(input.record,input.result);
    return '<dl class="nz-card-meta" data-card-required="rank depth"><div data-card-rank="'+r.state+'" title="'+escape(r.detail)+'"><dt>Rank</dt><dd>'+escape(r.label)+'</dd></div><div data-card-depth="'+d.state+'" title="'+escape(d.detail)+'"><dt>Data depth</dt><dd>'+escape(d.label)+((/(\d+)% of profile weight/.exec(d.detail)||[])[1]?'<small> · '+(/(\d+)% of profile weight/.exec(d.detail))[1]+'% inputs</small>':'')+'</dd></div></dl>';
  }
  function emblem(record) {
    record=record||{};
    return '<span class="nz-emblem" data-place-emblem="'+escape(record.id||'')+'" data-emblem-name="'+escape(record.name||'this place')+'" aria-label="Coat of arms of '+escape(record.name||'this place')+'"><svg class="nz-shield" viewBox="0 0 24 28" width="22" height="26" aria-hidden="true"><path d="M2 2h20v11c0 7-5 11-10 13C7 24 2 20 2 13z" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".45"/></svg></span>';
  }
  function validEmblem(item,id) {
    return !!(item && item.place_id===id && item.permitted_use_reviewed===true && /^\/assets\/arms\/[A-Za-z0-9_.-]+\.(svg|png|webp)$/.test(item.asset||'') && !item.asset.includes('..') && /^[a-f0-9]{64}$/.test(item.sha256||'') && item.attribution && item.licence && /^https:\/\//.test(item.source_url||'') && item.reviewed_by && /^\d{4}-\d{2}-\d{2}$/.test(item.reviewed_on||''));
  }
  var manifestPromise=null;
  function manifest() {
    if (!manifestPromise) manifestPromise=fetch('/data/emblems-reviewed.json',{credentials:'same-origin'}).then(function(r){if(!r.ok)throw Error('Emblem manifest unavailable');return r.json();}).then(function(m){if(m.schema!=='nestlyzer-reviewed-emblems-1'||!m.items)throw Error('Emblem manifest invalid');return m;}).catch(function(e){manifestPromise=null;throw e;});
    return manifestPromise;
  }
  function hydrateEmblems(root) {
    if(typeof document==='undefined')return Promise.resolve();
    root=root||document;
    var slots=Array.from(root.querySelectorAll('[data-place-emblem]'));
    if(root.matches && root.matches('[data-place-emblem]'))slots.unshift(root);
    slots=slots.filter(function(s){return !s.dataset.emblemStarted;});
    if(!slots.length)return Promise.resolve();
    slots.forEach(function(s){s.dataset.emblemStarted='1';});
    return manifest().then(function(m){slots.forEach(function(slot){
      var id=slot.dataset.placeEmblem,item=m.items[id];
      if(!slot.isConnected)return;
      if(!validEmblem(item,id)){slot.dataset.emblemState='unavailable';return;}
      var img=new Image();img.alt='Coat of arms of '+slot.dataset.emblemName;img.width=32;img.height=38;img.decoding='async';img.loading='eager';
      img.onload=function(){if(!slot.isConnected||slot.dataset.placeEmblem!==id)return;link.hidden=false;slot.replaceChildren(link);slot.dataset.emblemState='available';};
      img.onerror=function(){if(!slot.isConnected||slot.dataset.placeEmblem!==id)return;slot.dataset.emblemState='unavailable';slot.dataset.emblemState='load-error';};
      var link=document.createElement('a');link.href=item.source_url;link.target='_blank';link.rel='noopener noreferrer';link.title=item.attribution+'; '+item.licence;link.setAttribute('aria-label',img.alt+'; source and attribution');link.addEventListener('click',function(e){e.stopPropagation();});link.appendChild(img);
      slot.dataset.emblemState='loading';img.src=item.asset;
    });}).catch(function(){slots.forEach(function(slot){if(slot.isConnected){slot.dataset.emblemState='load-error';delete slot.dataset.emblemStarted;}});});
  }
  function start() {
    hydrateEmblems(document);
    var queued=false;
    new MutationObserver(function(mutations){
      if(queued||!mutations.some(function(m){return Array.from(m.addedNodes).some(function(n){return n.nodeType===1&&(n.matches('[data-place-emblem]')||n.querySelector('[data-place-emblem]'));});}))return;
      queued=true;Promise.resolve().then(function(){queued=false;hydrateEmblems(document);});
    }).observe(document.body,{childList:true,subtree:true});
  }
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
  return {rank:rank,depth:depth,metadata:metadata,emblem:emblem,validEmblem:validEmblem,hydrateEmblems:hydrateEmblems};
})();
if(typeof module==='object'&&module.exports)module.exports=NZCardUI;
function placeEmblemHTML(r){return NZCardUI.emblem(r);}
function cardMetaInput(r,x,options){
  options=options||{};x=x||{};r=r||{};
  var current=typeof RES!=='undefined'&&RES&&RES.byId&&RES.byId[r.id];
  if(!options.ignoreCurrent&&current)x=current;
  var total=options.total!==undefined?options.total:typeof RES!=='undefined'&&RES&&Array.isArray(RES.scored)?RES.scored.length:null;
  var scope=options.scope|| (typeof scopeName==='function'?scopeName():'Comparison scope unavailable');
  var profile=options.profile||(typeof profileName==='function'&&typeof S!=='undefined'?profileName(S.profile):'Profile unavailable');
  return {rank:x.rank,total:total,scope:scope,profile:profile,reason:options.reason,record:r,result:x,depth:options.depthUnavailable?{label:'Support unresolved',detail:options.depthUnavailable,state:'unresolved'}:null};
}
function cardMetaHTML(r,x,options){return NZCardUI.metadata(cardMetaInput(r,x,options));}
function cardMetricHTML(r,x,options){
 var input=cardMetaInput(r,x,options),rk=NZCardUI.rank(input),dp=NZCardUI.depth(r,x);
 return '<div class="metric nz-metric" data-card-rank="'+rk.state+'"><span>Rank</span><b>'+esc(rk.label)+'</b><small>'+esc(rk.detail)+'</small></div><div class="metric nz-metric" data-card-depth="'+dp.state+'"><span>Data depth</span><b>'+esc(dp.label.replace(/ inputs$/,''))+((/(\d+)% of profile weight/.exec(dp.detail)||[])[1]?' · '+(/(\d+)% of profile weight/.exec(dp.detail))[1]+'% inputs':'')+'</b><small>'+esc(dp.detail)+'</small></div>';
}
