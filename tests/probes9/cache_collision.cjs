'use strict';
const fs=require('fs');const root=process.argv[2]||process.cwd();
const E=require(root+'/src/engine.js');const meta=JSON.parse(fs.readFileSync(root+'/data/meta.json'));
const r={id:'CH:synthetic-cache-probe',country:'CH',population:10000,factorScores:{n_gps_100k_us:80},factorRaw:{},factorLevel:{},x:{},sourceConfidence:80};
const e=new E(meta,{method:'v2'});const before={...e.categories(r)};
delete r.factorScores.n_gps_100k_us;r.factorScores.n_exercise_us=80;
const reused={...e.categories(r)},fresh={...new E(meta,{method:'v2'}).categories(r)};
const report={probe:'Synthetic in-place key replacement with actual catalogue IDs',from:'n_gps_100k_us',to:'n_exercise_us',before,reused,fresh,equal:JSON.stringify(reused)===JSON.stringify(fresh),catalogue:meta.factors.filter(f=>['n_gps_100k_us','n_exercise_us'].includes(f.id)).map(f=>({id:f.id,category:f.category}))};
console.log(JSON.stringify(report,null,2));
