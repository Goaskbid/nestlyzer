/* Raw comparison contract. Never turns estimates or different periods into a winner. */
var NZComparisonFacts=(function(){
 'use strict';
 function datum(f,r){
  var hasMap=f.by_country&&Object.keys(f.by_country).length>0;
  var b=hasMap?(f.by_country[r.country]||{}):f;
  var raw=(r.factorRaw||{})[f.id], finite=typeof raw==='number'&&Number.isFinite(raw);
  var estimated=!!((r.factorEst||{})[f.id]||/^(n_cost_est_income|n_ch_price_pressure)$/.test(f.id)||/estimate|modelled|modeled|imput/.test([f.name,f.description,f.methodology_note,b.methodology_note].join(' ').toLowerCase()));
  var unit=b.unit||f.unit||'',period=b.period||b.source_period||'',url=b.source_url||b.url||'',publisher=b.source_name||'';
  // A field-level unit is part of the factor contract. Missing country sources never inherit another country's publisher.
  var level=(r.factorLevel||{})[f.id],support=level===0?'Local':level===9?'National':[1,2,3].indexOf(level)>=0?'Regional':'Support unresolved';
  var cohort=b.cohort||b.population_universe||f.cohort||f.population_universe||'',statistic=b.statistic||f.statistic||'';
  return {value:finite?raw:null,unit:String(unit),period:String(period),url:/^https?:\/\//i.test(url)?url:'',publisher:publisher,
   estimated:estimated,support:support,level:level,country:r.country,cohort:String(cohort),statistic:String(statistic),factor_id:f.id,
   scenario:b.scenario_id||f.scenario_id||null};
 }
 function direction(f,ds){
  if(!['higher','lower'].includes(f.direction)||ds.length<2||ds.some(function(d){return d.value===null||d.estimated||!d.unit||!d.period||!d.url||d.support==='Support unresolved';}))return null;
  // No current-taxes superlative from historical or unmatched household scenarios.
  if(f.category==='tax')return null;
  var first=ds[0];
  if(ds.some(function(d){return d.country!==first.country||d.unit!==first.unit||d.period!==first.period||d.url!==first.url||d.support!==first.support||d.cohort!==first.cohort||d.statistic!==first.statistic;}))return null;
  return f.direction==='higher'?'max':'min';
 }
 return {datum:datum,direction:direction};
})();
if(typeof module==='object'&&module.exports)module.exports=NZComparisonFacts;
