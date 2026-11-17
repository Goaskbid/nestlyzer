/* Exact emblem discovery contract. No name-only joins or regional substitutes. */
var NZEmblemIdentity=(function(){
 'use strict';
 var country={CH:'Q39',DE:'Q183',FR:'Q142',IT:'Q38',ES:'Q29',AT:'Q40',NL:'Q55',BE:'Q31',UK:'Q145',SE:'Q34',NO:'Q20',PL:'Q36',BR:'Q155'};
 var property={CH:'P771',DE:'P439',FR:'P374',IT:'P635',ES:'P772',AT:'P964',NL:'P382',BE:'P1567',UK:'P836',SE:'P525',NO:'P2504'};
 function values(e,p){return (e&&e.claims&&e.claims[p]||[]).filter(function(c){return c.rank!=='deprecated'&&c.mainsnak&&c.mainsnak.datavalue;}).map(function(c){return c.mainsnak.datavalue.value;});}
 function request(r){
  if(!r||!country[r.country])return null;var oid=String(r.oid||r.official_id||'').trim(),prop=property[r.country];
  if(r.country==='NL'){oid=oid.replace(/^GM/,'');if(!/^\d{4}$/.test(oid))return null;}
  if(r.country==='PL'){oid=r.officialCodeBridge&&r.officialCodeBridge.terc||'';if(!/^\d{7}$/.test(oid))return null;prop='P1653';}
  if(r.country==='BR'){oid=r.officialCodeBridge&&r.officialCodeBridge.ibge||'';if(/^\d{7}$/.test(oid))prop='P1585';else{oid=String(r.oid||'');prop='P1566';if(!/^\d+$/.test(oid))return null;}}
  if(!prop||!oid||/[^A-Za-z0-9_-]/.test(oid))return null;
  if(r.country==='UK'&&!/^[ENSW]\d{8}$/.test(oid))return null;
  if(['SE','NO'].includes(r.country)&&!/^\d{4}$/.test(oid))return null;
  return {property:prop,value:oid,country:country[r.country],requireIBGE:r.country==='BR'&&prop==='P1566'};
 }
 function verify(entity,req){
  if(!entity||!req||!values(entity,req.property).some(function(v){return String(v)===req.value;}))return false;
  if(!values(entity,'P17').some(function(v){return v&&v.id===req.country;}))return false;
  if(req.requireIBGE&&!values(entity,'P1585').some(function(v){return /^\d{7}$/.test(String(v));}))return false;
  return true;
 }
 return {request:request,verify:verify,values:values};
})();
if(typeof module==='object'&&module.exports)module.exports=NZEmblemIdentity;
