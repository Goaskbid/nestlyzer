/* Pure business-priority contract. Works in Node tests and the browser. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NZBusinessPriority=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function create(profiles,baseId,weights){
 const base=profiles[baseId];
 if(!/^biz_/.test(baseId)||baseId==='biz_custom_fit'||!base||!base.business)throw Error('Select a standard business profile');
 if(!weights||typeof weights!=='object'||Array.isArray(weights))throw Error('Weights object required');
 const allowed=Object.keys(base.weights||{}),out=Object.create(null);let total=0;
 for(const [k,v] of Object.entries(weights)){
  if(!allowed.includes(k)||!Number.isFinite(v)||v<0||v>100)throw Error('Unknown or invalid business priority: '+k);
  out[k]=v;total+=v;
 }
 if(!(total>0)||!Number.isFinite(total))throw Error('At least one business priority must be positive');
 for(const k of allowed)if(!(k in out))out[k]=0;
 const p=clone(base);
 delete p.weightsV1;
 p.name='My business priorities';p.business=true;p.weights=Object.assign({},out);p.custom=true;p.baseProfile=baseId;
 p.desc='User-selected priorities based on '+base.name+'. Standard site requirements remain in force.';p.intro=p.desc;
 return {version:1,baseProfile:baseId,weights:Object.assign({},out),profile:p};
}
function encode(x){return JSON.stringify({version:1,baseProfile:x.baseProfile,weights:x.weights});}
function decode(profiles,s){
 if(typeof s!=='string'||s.length>8000)throw Error('Invalid shared business scenario');
 const x=JSON.parse(s);if(x.version!==1)throw Error('Unsupported scenario version');
 return create(profiles,x.baseProfile,x.weights);
}
return {create,encode,decode};
});
