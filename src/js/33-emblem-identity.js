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
 /* 2.15.30-r13: coats of arms collected once by Nestlyzer's own collector (Wikidata P94, matched by official code, openly
    licensed files only), one small same-origin file per country. Gives the Commons file name without asking Wikidata. */
 var collected={},HASH={};
 function decode(doc,code){if(doc.v===2){HASH.last=code.slice(0,2);code=code.slice(2);}var k=code.indexOf('~');if(k<0)return null;var i=code.slice(0,k),rest=code.slice(k+1),name=(i?doc.p[parseInt(i,36)]||'':'')+rest;return name.slice(-1)==='\u0000'?name.slice(0,-1):name+'.svg';}
 function collectedFile(cc,oid){
  if(!cc||!/^[A-Z]{2}$/.test(cc)||oid==null||typeof fetch!=='function')return Promise.resolve(null);
  if(!collected._i)collected._i=fetch('/data/arms/index.json',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():{};}).catch(function(){return {};});
  if(!collected[cc])collected[cc]=collected._i.then(function(ix){return ix&&ix[cc]?fetch('/data/arms/'+cc+'.json',{credentials:'same-origin'}):null;}).then(function(r){return r&&r.ok?r.json():null;}).then(function(d){return d&&(d.v===1||d.v===2)&&d.m&&Array.isArray(d.p)?d:null;}).catch(function(){collected[cc]=null;return null;});
  return collected[cc].then(function(d){var c=d&&d.m[String(oid)];if(!c)return null;var n=decode(d,c);if(n&&d.v===2)HASH[n]=HASH.last;return n;});
 }
 /* r14: state and province arms by exact ISO 3166-2 code (P300), from the same collection: {code:[file,name]} */
 var regions=null;
 function collectedRegion(code){
  if(!/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(String(code||''))||typeof fetch!=='function')return Promise.resolve(null);
  if(!regions)regions=fetch('/data/arms/regions.json',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():{};}).catch(function(){regions=null;return {};});
  return regions.then(function(m){var v=m&&m[code];if(!(Array.isArray(v)&&v[0]))return null;if(/^[0-9a-f]{2}$/.test(v[2]||''))HASH[v[0]]=v[2];return {file:v[0],name:v[1]||code};});
 }
 /* r14: a collected file is shown straight from upload.wikimedia.org (its folder is stored with the name), so no Commons
    API request is needed and nothing depends on it. SVGs come as a 120 px PNG; other images fall back to the original file
    if Commons has no 120 px version. Only openly licensed files are in the collection; the link opens the file page with
    author and licence. */
 function direct(name,of){var h=HASH[name];if(!h||!/^[0-9a-f]{2}$/.test(h))return null;var u=encodeURIComponent(name.replace(/ /g,'_')).replace(/%2C/g,',').replace(/%28/g,'(').replace(/%29/g,')'),base='https://upload.wikimedia.org/wikipedia/commons/',dir=h.charAt(0)+'/'+h+'/',svg=/\.svg$/i.test(name);
  return {src:base+'thumb/'+dir+u+'/120px-'+u+(svg?'.png':/\.(tiff?|webp)$/i.test(name)?'.png':''),full:base+dir+u,lic:'open licence, author and terms on the file page',by:'Wikimedia Commons',of:of||'',page:'https://commons.wikimedia.org/wiki/File:'+u,direct:true};}
 if(typeof document!=='undefined')document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG'&&/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\//.test(t.src)&&!t.dataset.nzfb){t.dataset.nzfb='1';t.src=t.src.replace('/thumb/','/').replace(/\/120px-[^/]+$/,'');}},true);
 return {request:request,verify:verify,values:values,collectedFile:collectedFile,decode:decode,collectedRegion:collectedRegion,direct:direct};
})();
if(typeof module==='object'&&module.exports)module.exports=NZEmblemIdentity;
