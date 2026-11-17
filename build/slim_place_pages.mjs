/** Lossless static-page footprint pass. No dependency installation or network access.
 * - Shares byte-identical, URL-free, unaddressed inline styles at their original position.
 * - Omits quotes only where the HTML unquoted-attribute syntax preserves the value.
 * - Checks a reversible, syntax-normalised content digest for EVERY changed page.
 * Does not rewrite text, data, JSON-LD, script bodies, inline style declarations or colours.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const rawNames=new Set(['script','style','textarea','title','xmp','iframe','noembed','noframes']);
const spaces=/[\t\n\f\r ]/;
const safeValue=/^[^\t\n\f\r "'`=<>]+$/u;
const outPrefix='/assets/page-style/';

export function tagParts(tag) {
 const m=/^<([A-Za-z][^\t\n\f\r />]*)/.exec(tag);
 if(!m)return null;
 let i=m[0].length;const attrs=[];
 while(i<tag.length){
  while(spaces.test(tag[i]||'\0'))i++;
  if(tag[i]==='>' || tag.slice(i)==='/>')break;
  const start=i;while(i<tag.length&&!/[\t\n\f\r />=]/.test(tag[i]))i++;
  if(i===start)return null;
  const name=tag.slice(start,i);if(/["'<]/.test(name))return null;
  while(spaces.test(tag[i]||'\0'))i++;
  let value=null,qs=null,qe=null;
  if(tag[i]==='='){
   i++;while(spaces.test(tag[i]||'\0'))i++;
   if(tag[i]==='"'||tag[i]==="'"){
    qs=i;const q=tag[i++],vstart=i;while(i<tag.length&&tag[i]!==q)i++;
    if(i>=tag.length)return null;value=tag.slice(vstart,i);qe=i++;
   }else{
    const vstart=i;while(i<tag.length&&!/[\t\n\f\r >]/.test(tag[i]))i++;
    value=tag.slice(vstart,i);if(!value)return null;
   }
  }
  attrs.push({name,value,qs,qe});
 }
 return {name:m[1].toLowerCase(),attrs,selfClosing:tag.slice(i)==='/>'};
}

export function * tokens(html){
 let i=0;
 while(i<html.length){
  if(html.startsWith('<!--',i)){
   const e=html.indexOf('-->',i+4),end=e<0?html.length:e+3;
   yield {kind:'opaque',text:html.slice(i,end)};i=end;continue;
  }
  if(html[i]==='<'&&/^<(?:[A-Za-z]|\/[A-Za-z]|!|\?)/.test(html.slice(i,i+3))){
   let j=i+1,q=null;
   for(;j<html.length;j++){const c=html[j];if(q){if(c===q)q=null;}else if(c==='"'||c==="'")q=c;else if(c==='>'){j++;break;}}
   const text=html.slice(i,j),parts=tagParts(text);
   yield {kind:parts?'tag':'opaque',text,parts};i=j;
   if(parts?.name==='plaintext'){yield {kind:'raw',text:html.slice(i)};return;}
   if(parts&&rawNames.has(parts.name)){
    const re=new RegExp('</'+parts.name+'(?=[\\t\\n\\f\\r />])','ig');re.lastIndex=i;
    const e=re.exec(html),end=e?e.index:html.length;
    yield {kind:'raw',text:html.slice(i,end),owner:parts.name};i=end;
   }
  }else{let j=html.indexOf('<',i+1);if(j<0)j=html.length;yield{kind:'text',text:html.slice(i,j)};i=j;}
 }
}

export function compactTag(tag){
 const p=tagParts(tag);if(!p)return tag;let out=tag;
 for(const a of p.attrs.slice().reverse())if(a.qs!==null&&a.value&&safeValue.test(a.value)){
  // Before '/>' a separating space keeps the slash out of an unquoted attribute value.
  const gap=out[a.qe+1]==='/'?' ':'';
  out=out.slice(0,a.qs)+a.value+gap+out.slice(a.qe+1);
 }
 return out;
}

export function contentDigest(html){
 const h=crypto.createHash('sha256');
 for(const t of tokens(html)){
  if(t.kind==='tag')h.update(JSON.stringify(['tag',t.parts.name,t.parts.attrs.map(a=>[a.name.toLowerCase(),a.value]),t.parts.selfClosing]));
  else h.update(JSON.stringify([t.kind,t.text]));
 }
 return h.digest('hex');
}

export function canShareStyle(start,body){
 const p=tagParts(start);
 // URL bases change when CSS moves. Escapes and URL-bearing functions are refused conservatively.
 return p?.name==='style'&&!p.attrs.length&&!p.selfClosing&&Buffer.byteLength(body)>=256 &&
   !/\\|url\s*\(|@import|@charset|image(?:-set)?\s*\(|src\s*\(|sourceMappingURL|<\/style|expression\s*\(/i.test(body);
}

function noSharing(html){return /<base\b|<template\b|content-security-policy/i.test(html);}
function styles(html){
 const ts=[...tokens(html)],out=[];if(noSharing(html))return out;
 for(let i=0;i<ts.length-2;i++)if(ts[i].kind==='tag'&&ts[i+1].kind==='raw'&&ts[i+1].owner==='style'&&/^<\/style\s*>$/i.test(ts[i+2].text)&&canShareStyle(ts[i].text,ts[i+1].text))out.push({body:ts[i+1].text,id:sha(ts[i+1].text)});
 return out;
}

export function transform(html,selected=new Map()){
 const ts=[...tokens(html)],out=[],expanded=[],blocked=noSharing(html);let styleReplacements=0,quoteBytesSaved=0;
 for(let i=0;i<ts.length;i++){
  const t=ts[i];
  if(!blocked&&t.kind==='tag'&&ts[i+1]?.kind==='raw'&&ts[i+1].owner==='style'&&/^<\/style\s*>$/i.test(ts[i+2]?.text||'')&&canShareStyle(t.text,ts[i+1].text)){
   const body=ts[i+1].text,id=sha(body);
   if(selected.has(id)){
    if(selected.get(id).body!==body)throw Error('Style hash collision');
    out.push('<link rel=stylesheet href='+outPrefix+id+'.css>');
    expanded.push(t.text,body,ts[i+2].text);styleReplacements++;i+=2;continue;
   }
  }
  const next=t.kind==='tag'?compactTag(t.text):t.text;
  quoteBytesSaved+=Buffer.byteLength(t.text)-Buffer.byteLength(next);out.push(next);expanded.push(next);
 }
 const digest=contentDigest(html);if(contentDigest(expanded.join(''))!==digest)throw Error('Content invariant failed');
 return {html:out.join(''),digest,styleReplacements,quoteBytesSaved};
}

function safeFile(root,relative){
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('\\')||relative.includes('\0')||relative.split('/').some(x=>x==='..'||x==='.')||relative.endsWith('/'))throw Error('Unsafe path: '+relative);
 const f=path.join(root,relative);let q=root;
 for(const p of relative.split('/')){q=path.join(q,p);if(fs.existsSync(q)&&fs.lstatSync(q).isSymbolicLink())throw Error('Symlink refused: '+relative);}
 return f;
}
function atomicWrite(f,body){const tmp=f+'.nz-'+crypto.randomBytes(8).toString('hex')+'.part';try{fs.writeFileSync(tmp,body,{flag:'wx'});fs.renameSync(tmp,f);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
export function registryFiles(registry){
 if(!Array.isArray(registry))throw Error('Expected generated page registry array');
 return [...new Set(registry.map(e=>typeof e==='string'?e:e.path).map(p=>{
  if(typeof p!=='string'||!p.startsWith('/')||p.startsWith('//')||p.includes('?')||p.includes('#')||p.includes('%'))throw Error('Bad public route '+p);
  return p.slice(1)+(p.endsWith('/')?'index.html':'');
 }).filter(p=>p.endsWith('.html')&&p!=='index.html'&&p!=='offline.html'))].sort();
}
export function inventory(root){
 let bytes=0,files=0;const byExtension={};
 const walk=d=>{for(const n of fs.readdirSync(d)){const f=path.join(d,n),s=fs.lstatSync(f);if(s.isSymbolicLink())throw Error('Public symlink '+f);if(s.isDirectory())walk(f);else if(s.isFile()){bytes+=s.size;files++;const ext=path.extname(n)||'(none)';byExtension[ext]=(byExtension[ext]||0)+s.size;}else throw Error('Unsupported public file '+f);}};
 walk(root);return{files,bytes,byExtension};
}
export function slimPages(root,registry,{apply=false,minUses=10,manifestPath=null}={}){
 if(!Number.isInteger(minUses)||minUses<2)throw Error('minUses must be an integer >= 2');
 if(fs.lstatSync(root).isSymbolicLink())throw Error('Symlink root refused');root=fs.realpathSync(root);
 const files=registryFiles(registry);const blocks=new Map();
 for(const rel of files){const f=safeFile(root,rel);if(!fs.existsSync(f))throw Error('Missing generated page: '+rel);
  const buffer=fs.readFileSync(f),html=buffer.toString('utf8');if(!buffer.equals(Buffer.from(html)))throw Error('Non-UTF8 page '+rel);
  for(const s of styles(html)){const old=blocks.get(s.id)||{body:s.body,uses:0};old.uses++;blocks.set(s.id,old);}
 }
 const selected=new Map([...blocks].filter(([id,b])=>b.uses>=minUses&&b.uses*(Buffer.byteLength(b.body)+15-Buffer.byteLength('<link rel=stylesheet href='+outPrefix+id+'.css>'))>Buffer.byteLength(b.body)));
 let newAssetBytes=0,newAssets=0;
 for(const[id,b]of selected){const f=safeFile(root,outPrefix.slice(1)+id+'.css');if(fs.existsSync(f)){if(fs.readFileSync(f,'utf8')!==b.body)throw Error('Shared asset conflict');}else{newAssets++;newAssetBytes+=Buffer.byteLength(b.body);}}
 // Validate every transformation before writing any page. No whole-site HTML is retained in RAM.
 let before=0,after=0,changed=0,replacements=0,quoteBytesSaved=0;const manifest=[];
 for(const rel of files){const html=fs.readFileSync(safeFile(root,rel),'utf8'),x=transform(html,selected),b=Buffer.byteLength(html),a=Buffer.byteLength(x.html);before+=b;after+=a;replacements+=x.styleReplacements;quoteBytesSaved+=x.quoteBytesSaved;if(x.html!==html)changed++;manifest.push({path:rel,before:sha(html),after:sha(x.html),beforeBytes:b,afterBytes:a,contentDigest:x.digest});}
 const net=before-after-newAssetBytes;
 if(apply&&net>0){
  fs.mkdirSync(safeFile(root,outPrefix.slice(1,-1)),{recursive:true});
  for(const[id,b]of selected){const f=safeFile(root,outPrefix.slice(1)+id+'.css');if(!fs.existsSync(f))atomicWrite(f,b.body);}
  for(const m of manifest){const f=safeFile(root,m.path),html=fs.readFileSync(f,'utf8');if(sha(html)!==m.before)throw Error('Concurrent page edit: '+m.path);if(m.before!==m.after){const x=transform(html,selected);if(sha(x.html)!==m.after)throw Error('Non-deterministic transform');atomicWrite(f,x.html);}}
 }
 if(manifestPath){fs.mkdirSync(path.dirname(manifestPath),{recursive:true});atomicWrite(manifestPath,zlib.gzipSync(Buffer.from(manifest.map(m=>JSON.stringify(m)).join('\n')+'\n'),{level:9}));}
 return{schema:'nestlyzer-lossless-pages-1',mode:apply?'apply':'dry_run',checkedPages:files.length,changedPages:net>0?changed:0,htmlBytesBefore:before,htmlBytesAfter:after,newSharedAssetBytes:newAssetBytes,newSharedAssets:newAssets,sharedStyles:selected.size,styleReplacements:replacements,attributeQuoteBytesSaved:quoteBytesSaved,netBytesSaved:Math.max(0,net),applied:apply&&net>0,contentInvariantsPassed:files.length,contentRemoved:false,rankingValuesChanged:false,structuredDataChanged:false,coloursChanged:false,rootPageChanged:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),opt={};for(let i=0;i<args.length;i++){
  const k=args[i];if(k==='--apply'){if(opt.apply)throw Error('Duplicate --apply');opt.apply=true;continue;}
  if(!['--root','--registry','--report','--manifest','--budget','--reserve'].includes(k)||opt[k]!==undefined||!args[i+1]||args[i+1].startsWith('--'))throw Error('Invalid argument: '+k);opt[k]=args[++i];
 }
 if(!opt['--root']||!opt['--registry'])throw Error('--root and --registry required. Root must be a generated publish folder.');
 const root=path.resolve(opt['--root']);if(fs.existsSync(path.join(root,'src'))||fs.existsSync(path.join(root,'.git')))throw Error('Use a generated publish folder, not the source checkout');
 for(const name of ['--report','--manifest'])if(opt[name]){const r=path.relative(root,path.resolve(opt[name]));if(!r||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r)))throw Error('Report must be outside public output');}
 const budget=Number(opt['--budget']||850000000),reserve=Number(opt['--reserve']||100000000);
 if(!Number.isSafeInteger(budget)||budget<=0||!Number.isSafeInteger(reserve)||reserve<0||reserve>=budget)throw Error('Invalid budget/reserve');
 const start=inventory(root),result=slimPages(root,JSON.parse(fs.readFileSync(opt['--registry'],'utf8')),{apply:!!opt.apply,manifestPath:opt['--manifest']||null});
 const end=opt.apply?inventory(root):{...start,bytes:start.bytes-result.netBytesSaved};
 const report={...result,publicBefore:start,publicAfter:end,measurement:opt.apply?'actual_files':'projected',publicBudgetBytes:budget,headroomBytes:budget-end.bytes,targetReserveBytes:reserve,budgetPass:end.bytes<=budget,reservePass:budget-end.bytes>=reserve};
 if(opt['--report']){fs.mkdirSync(path.dirname(path.resolve(opt['--report'])),{recursive:true});atomicWrite(path.resolve(opt['--report']),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));if(!report.budgetPass)process.exitCode=1;
}
