const fs=require('fs'),path=require('path');const Engine=require('../src/engine.js');
const meta=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/meta.json')));
const fx=JSON.parse(fs.readFileSync(path.join(__dirname,'../build/source/legacy_builder_fixtures.json')));
const e=new Engine(meta,{method:'v1'});let pass=0,fail=0;
for(const f of fx){const g=e.buildGuided(f.s);const a=JSON.stringify(Object.entries(g.weights).sort()),b=JSON.stringify(Object.entries(f.w).sort());
 const sa=JSON.stringify(Object.entries(g.builderStrict).sort()),sb=JSON.stringify(Object.entries(f.strict).sort());
 if(a===b&&g.minPop===f.minPop&&sa===sb)pass++;else{fail++;if(fail<4)console.log('FAIL',JSON.stringify(f.s),a,b,g.minPop,f.minPop,sa,sb);}}
console.log(`legacy builder fixtures: ${pass} pass, ${fail} fail`);process.exitCode=fail?1:0;
