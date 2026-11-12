/* Preserve page content; share identical classic scripts and omit HTML-optional end tags. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
export function compactOptional(html){
 return html.replace(/<\/li>(?=<li(?:\s|>)|<\/[ou]l>)/g,'').replace(/<\/(?:dt|dd)>(?=<(?:dt|dd)(?:\s|>)|<\/dl>)/g,'').replace(/<\/(?:td|th)>(?=<(?:td|th)(?:\s|>)|<\/tr>)/g,'').replace(/<\/tr>(?=<tr(?:\s|>)|<\/tbody>|<\/table>)/g,'');
}
function eligible(attrs,body){return !/\bsrc\s*=|\btype\s*=|\bnonce\s*=|\basync\b|\bdefer\b/i.test(attrs)&&body.length>=200&&!/document\.(?:write|currentScript)|import\.meta/.test(body);}
export function optimize(root){
 root=path.resolve(root);const registry=path.join(root,'.cache/seo/pages.json');
 if(!fs.existsSync(registry))return {status:'not_applied_no_complete_registry',bytesSaved:0};
 const entries=JSON.parse(fs.readFileSync(registry,'utf8'));const paths=[...new Set(entries.map(x=>x.path))];
 const files=[];const scripts=new Map();let before=0;
 for(const p of paths){
  if(!p.startsWith('/')||p.startsWith('//')||p.includes('..')||p.includes('\\')||p.includes('\0'))throw Error('Unsafe generated HTML path');
  const f=path.join(root,p.slice(1),p.endsWith('/')?'index.html':'');if(!f.endsWith('.html')||!fs.existsSync(f))continue;
  if(fs.lstatSync(f).isSymbolicLink())throw Error('Symlink in generated HTML');
  const h=fs.readFileSync(f,'utf8');files.push(f);before+=Buffer.byteLength(h);
  for(const m of h.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi))if(eligible(m[1],m[2])){const k=hash(m[2]);const old=scripts.get(k)||{body:m[2],count:0};old.count++;scripts.set(k,old);}
 }
 const chosen=new Map([...scripts].filter(([,s])=>s.count>=10));let sharedBytes=0,replacements=0,after=0,changed=0;
 const dest=path.join(root,'assets/shared-inline');fs.mkdirSync(dest,{recursive:true});
 for(const [k,s] of chosen){const p=path.join(dest,k.slice(0,20)+'.js');fs.writeFileSync(p,s.body);sharedBytes+=Buffer.byteLength(s.body);}
 for(const f of files){
  const old=fs.readFileSync(f,'utf8');let html=old.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi,(whole,attrs,body)=>{
   const k=hash(body);if(!eligible(attrs,body)||!chosen.has(k))return whole;replacements++;return '<script'+attrs+' src="/assets/shared-inline/'+k.slice(0,20)+'.js"></script>';
  });html=compactOptional(html);after+=Buffer.byteLength(html);if(html!==old){fs.writeFileSync(f,html);changed++;}
 }
 const result={schema:'static-dedup-1',htmlFiles:files.length,changedHtmlFiles:changed,sharedClassicScripts:chosen.size,scriptReplacements:replacements,htmlBytesBefore:before,htmlBytesAfter:after,sharedScriptBytes:sharedBytes,bytesSaved:before-after-sharedBytes,contentRemoved:false,chartsRemoved:false,profileRowsRemoved:false,scriptOrdering:'classic blocking script remains at original position; no async/defer added'};
 fs.writeFileSync(path.join(root,'.cache/seo/asset-deduplication.json'),JSON.stringify(result,null,2));return result;
}
