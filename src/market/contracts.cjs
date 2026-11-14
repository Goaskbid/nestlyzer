'use strict';
/* Deterministic comparability helpers. No imputation and no automatic weight promotion. */
function bad(reason){return {status:'unavailable',reason,value:null,score_eligible:false};}
function comparable(a,b,keys){for(const k of keys)if(a[k]==null||b[k]==null||a[k]!==b[k])return k;return null;}
function valid(o){return o&&typeof o.value==='number'&&Number.isFinite(o.value)&&o.status==='observed'&&o.source_id&&o.source_url&&o.period_start&&o.period_end&&o.geo_id&&o.geo_level&&o.licence_reviewed===true;}
function annual(o){const multipliers={month:12,week:52,year:1};return multipliers[o.payment_period]===undefined?null:o.value*multipliers[o.payment_period];}
function rentIncome(rent,income,options={}){
 if(!valid(rent)||!valid(income))return bad('Observations or source-rights metadata incomplete');
 if(rent.role!=='residential_rent'||income.role!=='household_income')return bad('Wrong input concepts');
 const mismatch=comparable(rent,income,['currency','geo_id','geo_level','boundary_version','period_start','period_end','cohort','income_basis']);
 if(mismatch)return bad('Incompatible '+mismatch);
 const r=annual(rent),i=annual(income);if(r===null||i===null||r<0||i<=0)return bad('Invalid annualisation or denominator');
 if(rent.statistic!==income.statistic)return bad('Different statistical summaries');
 if(rent.statistic==='median'&&!options.allowAreaRatio)return bad('Ratio of medians is not observed household burden');
 if(rent.statistic!=='mean'&&rent.statistic!=='median')return bad('Unsupported statistical summary');
 return {status:'context_only',value:100*r/i,unit:'percent',label:rent.statistic==='median'?'Area ratio of medians, not household burden':'Ratio of cohort means, not the mean household burden',annualisation:'monthly x12; weekly x52; annual x1',score_eligible:false};
}
function businessBurden(cost,output){
 if(!valid(cost)||!valid(output))return bad('Observations or source-rights metadata incomplete');
 if(cost.role!=='commercial_occupancy_cost'||!['sector_turnover','sector_value_added'].includes(output.role))return bad('Wrong business concepts');
 const mismatch=comparable(cost,output,['currency','geo_id','geo_level','boundary_version','period_start','period_end','sector','classification','size_band','statistical_unit','cohort','statistic']);
 if(mismatch)return bad('Incompatible '+mismatch);
 const a=annual(cost),b=annual(output);if(a===null||b===null||a<0||b<=0)return bad('Invalid annualisation or denominator');
 return {status:'context_only',value:100*a/b,unit:'percent',label:'Sector occupancy-cost ratio; not an individual-company forecast',score_eligible:false};
}
function trend(a,b,mode='percent'){
 if(!valid(a)||!valid(b))return bad('Observations or source-rights metadata incomplete');
 const mismatch=comparable(a,b,['metric_id','currency','geo_id','geo_level','boundary_version','cohort','statistic','definition_version','unit','price_basis','source_id']);
 if(mismatch)return bad('Incompatible '+mismatch);
 if(a.break_in_series||b.break_in_series)return bad('Series break');
 const d0=Date.parse(a.period_end),d1=Date.parse(b.period_end);
 if(!Number.isFinite(d0)||!Number.isFinite(d1)||d1<=d0)return bad('Invalid trend endpoints');
 if(Date.parse(a.period_start)>d0||Date.parse(b.period_start)>d1)return bad('Invalid period span');
 if(mode==='points')return a.unit==='percent'?{status:'context_only',value:b.value-a.value,unit:'percentage points',score_eligible:false}:bad('Point changes require a percentage rate');
 if(a.value<=0||b.value<0)return bad('Invalid baseline');
 if(mode==='percent')return {status:'context_only',value:100*(b.value/a.value-1),unit:'percent',score_eligible:false};
 return bad('Unsupported change mode');
}
module.exports={rentIncome,businessBurden,trend,valid};
