import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {default:W,resetForTests}=await import(pathToFileURL(path.resolve(process.argv[2]||process.cwd(),'cloudflare/worker.js')).href);
let mode='pack404';
const env={ASSETS:{async fetch(req){const p=new URL(req.url).pathname;if(p.endsWith('/index.json')){if(mode==='network')throw new TypeError('Synthetic upstream connection failure');return Response.json({ch:1});}if(p.includes('/_packs/')){if(mode==='pack404')return new Response('unavailable',{status:404});if(mode==='invalidpack')return Response.json([]);return Response.json({'261':'<h1>Zurich</h1>'});}return new Response('Not found',{status:200});}}};
const rows=[];for(const m of ['pack404','invalidpack','network','recovered']){mode=m;resetForTests();try{const r=await W.fetch(new Request('https://nestlyzer.com/places/ch/261/'),env);rows.push({mode:m,status:r.status,body:await r.text(),headers:Object.fromEntries(r.headers)});}catch(e){rows.push({mode:m,rejected:e.message});}}
console.log(JSON.stringify(rows,null,2));
