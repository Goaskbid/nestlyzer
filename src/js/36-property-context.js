/* Read-only property observations. No rental imputation or new scoring weights. */
function propertyContextHTML(r, full) {
  var biz=typeof isBizKey==='function'&&typeof S!=='undefined'&&isBizKey(S.profile);
  if(biz)return '';
  if(false)return '<details class="nz-market"'+(full?' open':'')+'><summary>Business premises and operating costs</summary><dl><div><dt>Commercial rent and vacancy</dt><dd>Not supplied for this site</dd></div><div><dt>Occupancy cost relative to turnover</dt><dd>Not available: matched sector and premises evidence required</dd></div></dl><small>Residential rent is not used as business-premises evidence.</small></details>';
  r=r||{};var raw=r.factorRaw||{},levels=r.factorLevel||{},fields=typeof META!=='undefined'&&META.factors||[];
  var byId={};fields.forEach(function(f){byId[f.id]=f;});
  var rentIDs=['n_rent_paid_mean','n_rent_net_m2_local','n_rent_net_m2','n_rent_flat_m2','n_rent_flat12_m2','n_rent_flat3_m2','n_rent_house_m2','n_rent_new_lease','n_rent_us','n_rent_au','n_rent_ca','n_rent_m2_it'];
  function observation(id){
    var f=byId[id],v=raw[id];if(!f||!fin(v))return null;
    var country=f.by_country&&f.by_country[r.country];
    var base=country||((f.countries||[]).indexOf(r.country)>=0?f:null);if(!base)return null;
    var supports={0:'Municipal observation',1:'Large-region observation',2:'Regional observation',3:'County/district observation',9:'National observation'};
    return {name:f.name,value:v,unit:base.unit||f.unit||'Unit unresolved',period:base.source_period||base.period||'Period unresolved',support:supports[levels[id]]||'Geographic support unresolved',source:base.source_name||'Source unresolved',url:base.source_url||''};
  }
  var rent=rentIDs.map(observation).filter(Boolean)[0],vacancy=observation('vacancy_rate_balance'),burden=observation('n_housing_burden_us');
  function row(title,o){return '<div><dt>'+esc(o?o.name:title)+'</dt><dd>'+(o?esc(fmt(o.value,2)+' '+o.unit):'Not supplied for this place')+'</dd>'+(o?'<small>'+esc(o.period+' | '+o.support)+'; '+(/^https:\/\//.test(o.url)?'<a href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer">'+esc(o.source)+'</a>':esc(o.source))+'</small>':'')+'</div>';}
  var summary=rent?rent.name+': '+fmt(rent.value,2)+' '+rent.unit:'Rent and vacancy: data availability';
  if(!rent&&!burden)return '';   // 2.15.23: shown only where a rent or cost-burden figure exists; vacancy is in Key facts
  return '<details class="nz-market"><summary>'+esc(summary)+'</summary><dl>'+(rent?row('Rent',rent):'')+(vacancy?row('Residential vacancy',vacancy):'')+(burden?row('Housing costs relative to income',burden):'')+'</dl></details>';
}
