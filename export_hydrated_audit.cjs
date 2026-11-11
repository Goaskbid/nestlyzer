/* Audit the actual runtime decoder, including regional and county fallbacks. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];
if(!args.includes('--root')||!args.includes('--out'))throw Error('--root and --out required');
const root=path.resolve(arg('--root')),out=path.resolve(arg('--out')),D=require(path.join(root,'src/data.js'));
fs.mkdirSync(out,{recursive:true});
for(const file of fs.readdirSync(path.join(root,'data/c')).filter(f=>/^[A-Z]{2}\.json$/.test(f)).sort()){
 const sh=JSON.parse(fs.readFileSync(path.join(root,'data/c',file),'utf8'));
 const rows=D.hydrate(sh).map(r=>({id:r.id,popNow:r.popNow,fr:r.factorRaw,fs:r.factorScores,fl:r.factorLevel||{}}));
 fs.writeFileSync(path.join(out,file+'.gz'),zlib.gzipSync(JSON.stringify(rows)));
}
