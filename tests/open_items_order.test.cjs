'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Engine=require('../src/engine.js');
function rank(rows,method='v2',evidence='legacy'){
 const e={method,evidence,profiles:{demo:{weights:{}}},sanctioned:{},categoriesFor(){return{}},
 scoreRaw(r){return{score:r.score,coverage:r.coverage??80,weighted:80,measured:r.thin?20:80,thin:r.thin,cats:{}}},eligibilityFail(){return null},computeRanks(){}};
 return Engine.prototype.rank.call(e,rows.map((x,i)=>({...x,id:x.id||String(i),country:'CH',sourceConfidence:x.sourceConfidence??50})),'demo',{country:'CH',subRanks:false}).scored;
}
for(const evidence of ['legacy','fixed','weighted']){
 test('thin results follow supported results in '+evidence,()=>{const r=rank([{id:'thin',score:99,thin:true},{id:'supported',score:30,thin:false}],'v2',evidence);assert.deepEqual(r.map(x=>x.id),['supported','thin']);assert.deepEqual(r.map(x=>x.overall),[30,99]);});
 test('finite zero outranks missing, '+evidence,()=>{assert.deepEqual(rank([{id:'missing',score:null},{id:'zero',score:0}],'v2',evidence).map(x=>x.id),['zero','missing']);});
 test('descending within each evidence tier '+evidence,()=>{assert.deepEqual(rank([{id:'d',score:10,thin:true},{id:'b',score:20,thin:false},{id:'c',score:80,thin:true},{id:'a',score:50,thin:false}],'v2',evidence).map(x=>x.id),['a','b','c','d']);});
}
test('ties do not depend on input order in v2',()=>{const a=[{id:'CH:2',score:50},{id:'CH:1',score:50}];assert.deepEqual(rank(a).map(x=>x.id),rank([...a].reverse()).map(x=>x.id));});
test('v1 retains input tie order',()=>assert.deepEqual(rank([{id:'b',score:50},{id:'a',score:50}],'v1').map(x=>x.id),['b','a']));
test('rank has contiguous ordinal positions',()=>assert.deepEqual(rank([{score:70},{score:20}]).map(x=>x.rank),[1,2]));
test('scores are unchanged by ordering policy',()=>{const a=[{id:'a',score:1.27,thin:false},{id:'b',score:99.8,thin:true}];for(const x of rank(a))assert.equal(x.overall,a.find(y=>y.id===x.id).score);});
