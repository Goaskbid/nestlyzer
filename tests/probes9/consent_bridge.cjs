/* Probe from the external audit of upload (9) (NZ9-08), kept as a regression test. */
'use strict';
const fs=require('fs'),vm=require('vm');const root=process.argv[2]||process.cwd();
const html=fs.readFileSync(root+'/index.html','utf8');/* r19: the published pages move repeated inline scripts to /assets/shared-inline/; read those too */const header=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map(x=>{const m=/src="?(\/assets\/shared-inline\/[^" >]+)/.exec(x[1]);return m?fs.readFileSync(root+m[1],'utf8'):x[2]}).find(x=>x.includes("gtag('consent','default'"));
if(!header)throw Error('No generated consent header');
let callback,reloads=0;const loads=[],cookies=[],store=new Map([['nz:consent2',JSON.stringify({v:2,a:true,d:true,t:1,src:'tcf'})]]);
const el={classList:{add(){},remove(){}},querySelector(){return {focus(){}}}};
const document={getElementById(){return el},querySelector(){return null},addEventListener(){},createElement(){return {}},head:{appendChild(s){loads.push(s.src)}}};Object.defineProperty(document,'cookie',{get(){return '_ga=synthetic'},set(v){cookies.push(v)}});
const ctx={document,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},location:{origin:'https://nestlyzer.com',pathname:'/',hostname:'nestlyzer.com',reload(){reloads++}},setTimeout(){},Date,console};ctx.window=ctx;ctx.addEventListener=()=>{};ctx.__tcfapi=(name,v,cb)=>{callback=cb};vm.createContext(ctx);vm.runInContext(header,ctx);vm.runInContext(fs.readFileSync(root+'/assets/consent.js','utf8'),ctx);
const before=JSON.parse(store.get('nz:consent2'));callback({gdprApplies:true,eventStatus:'useractioncomplete',purpose:{consents:{1:false,8:false}},vendor:{consents:{755:false}}},true);
const updates=ctx.dataLayer.map(x=>Array.from(x)).filter(x=>x[0]==='consent');
console.log(JSON.stringify({scenario:'Returning TCF user initially granted; then CMP callback revokes consent. External CMP scripts and Google traffic are not executed.',before,after:JSON.parse(store.get('nz:consent2')),consent_commands:updates,reloads,script_loads:loads,cookies_deleted:cookies.length},null,2));
