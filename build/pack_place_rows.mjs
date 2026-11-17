/** Dictionary-pack duplicate rows in the existing deferred profile tables.
 * The first static rows, all facts, charts, links and JSON-LD are untouched.
 * A content-hashed renderer expands the exact original arrays synchronously,
 * then runs the UNCHANGED original ranks.js bytes. No fetch/decompression API.
 */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import zlib from 'node:zlib';import {fileURLToPath} from 'node:url';
import {tokens,registryFiles,contentDigest,inventory} from './slim_place_pages.mjs';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const serialize=x=>JSON.stringify(x).replace(/</g,'\\u003c');
function attr(t,k){return t.parts?.attrs.find(a=>a.name.toLowerCase()===k)?.value;}
function file(root,rel){if(path.isAbsolute(rel)||!rel||rel.includes('\\')||rel.includes('\0')||rel.split('/').some(x=>x==='..'||x==='.'))throw Error('Unsafe path');let q=root;for(const s of rel.split('/')){q=path.join(q,s);if(fs.existsSync(q)&&fs.lstatSync(q).isSymbolicLink())throw Error('Symlink refused');}return q;}
function write(f,s){const tmp=f+'.nz-'+crypto.randomBytes(6).toString('hex')+'.part';try{fs.writeFileSync(tmp,s,{flag:'wx'});fs.renameSync(tmp,f);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
export function extractRows(html){
 if(!html.includes('/assets/ranks.js')||!html.includes('nzr'))return null;
 const ts=[...tokens(html)];const data=[],render=[];
 for(let i=0;i<ts.length;i++){const t=ts[i];if(t.kind!=='tag'||t.parts.name!=='script')continue;
  const names=t.parts.attrs.map(a=>a.name.toLowerCase());if(new Set(names).size!==names.length)return null;
  if((attr(t,'class')||'').split(/\s+/).includes('nzr')&&attr(t,'type')==='application/json'&&!names.includes('data-nz-packed')&&ts[i+1]?.kind==='raw'){
   let rows;try{rows=JSON.parse(ts[i+1].text);}catch{return null;}
   if(!Array.isArray(rows)||!rows.every(r=>Array.isArray(r)&&r.length===7&&Number.isInteger(r[0])&&r[0]>=0))return null;
   data.push({index:i,rows,originalJSON:ts[i+1].text});
  }
  if(/^\/assets\/ranks\.js(?:\?[^#]*)?$/.test(attr(t,'src')||'')&&names.includes('defer')&&!names.includes('async')&&!names.includes('type'))render.push(i);
 }
 if(data.length!==1||render.length!==1||render[0]<data[0].index)return null;
 return{ts,data:data[0],renderIndex:render[0]};
}
export function packDocument(html,ids,dictionary,assetURL){
 const x=extractRows(html);if(!x)return null;
 const packed=x.data.rows.map(r=>ids.has(JSON.stringify(r))?ids.get(JSON.stringify(r)):r);
 const restored=packed.map(r=>Number.isInteger(r)?dictionary[r]:r);
 if(JSON.stringify(restored)!==JSON.stringify(x.data.rows))throw Error('Profile row value invariant failed');
 const json=serialize({v:1,r:packed});let rowsPacked=packed.filter(Number.isInteger).length;if(!rowsPacked)return null;
 const out=x.ts.map(t=>t.text),start=out[x.data.index];
 out[x.data.index]=start.slice(0,-1)+' data-nz-packed=1>';
 out[x.data.index+1]=json;
 const oldsrc=attr(x.ts[x.renderIndex],'src'),oldtag=out[x.renderIndex];
 if(oldtag.split(oldsrc).length!==2)throw Error('Ambiguous renderer URL');
 out[x.renderIndex]=oldtag.replace(oldsrc,assetURL);
 const next=out.join('');
 // Reversal uses the checked exact decoded data and original tag syntax.
 const reverse=out.slice();reverse[x.data.index]=start;reverse[x.data.index+1]=x.data.originalJSON;reverse[x.renderIndex]=oldtag;
 if(contentDigest(reverse.join(''))!==contentDigest(html))throw Error('Non-profile content changed');
 if(Buffer.byteLength(next)>=Buffer.byteLength(html))return null;
 return{html:next,rowsPacked,rows:x.data.rows.length,contentDigest:contentDigest(html)};
}
export function decoderSource(dictionary){return '(function(){"use strict";var D='+serialize(dictionary)+';document.querySelectorAll(\'script.nzr[data-nz-packed="1"]\').forEach(function(s){var o=JSON.parse(s.textContent);if(o.v!==1||!Array.isArray(o.r))throw Error("Unsupported place row pack");var r=o.r.map(function(x){if(Number.isInteger(x)){if(x<0||x>=D.length)throw Error("Invalid profile row reference");return D[x];}if(!Array.isArray(x))throw Error("Invalid profile row");return x;});s.textContent=JSON.stringify(r);s.removeAttribute("data-nz-packed");});})();\n';}
export function packRows(root,registry,{apply=false,minUses=8,manifestPath=null}={}){
 if(fs.lstatSync(root).isSymbolicLink())throw Error('Symlink root refused');root=fs.realpathSync(root);
 if(!Number.isInteger(minUses)||minUses<2)throw Error('Invalid minimum uses');
 const original=file(root,'assets/ranks.js');if(!fs.existsSync(original))return{schema:'place-row-pack-1',status:'not_applicable_no_native_renderer',netBytesSaved:0};
 const loader=fs.readFileSync(original,'utf8');
 if(!loader.includes("querySelectorAll('script.nzr')")||!loader.includes('JSON.parse(s.textContent).forEach'))return{schema:'place-row-pack-1',status:'unsupported_renderer_contract',netBytesSaved:0};
 const files=registryFiles(registry),counts=new Map(),eligible=[];let scanned=0;
 for(const rel of files){const html=fs.readFileSync(file(root,rel),'utf8');scanned++;const x=extractRows(html);if(!x)continue;eligible.push(rel);for(const row of x.data.rows){const k=JSON.stringify(row);counts.set(k,(counts.get(k)||0)+1);}}
 const rows=[...counts].filter(([k,n])=>n>=minUses&&k.length>16).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 const dictionary=rows.map(([k])=>JSON.parse(k)),ids=new Map(rows.map(([k],i)=>[k,i]));
 if(!dictionary.length)return{schema:'place-row-pack-1',status:'no_repeated_rows',scannedPages:scanned,eligiblePages:eligible.length,netBytesSaved:0};
 const source=decoderSource(dictionary)+loader,assetName='assets/rank-view-'+sha(source)+'.js',url='/'+assetName,dest=file(root,assetName);
 if(fs.existsSync(dest)&&fs.readFileSync(dest,'utf8')!==source)throw Error('Renderer hash conflict');
 const newAssetBytes=fs.existsSync(dest)?0:Buffer.byteLength(source);let before=0,after=0,packedRows=0,totalRows=0;const manifest=[];
 for(const rel of eligible){const html=fs.readFileSync(file(root,rel),'utf8'),x=packDocument(html,ids,dictionary,url);if(!x)continue;const b=Buffer.byteLength(html),a=Buffer.byteLength(x.html);before+=b;after+=a;packedRows+=x.rowsPacked;totalRows+=x.rows;manifest.push({path:rel,before:sha(html),after:sha(x.html),beforeBytes:b,afterBytes:a,rows:x.rows,packedRows:x.rowsPacked,contentDigest:x.contentDigest});}
 const net=before-after-newAssetBytes;
 if(apply&&net>0){fs.mkdirSync(path.dirname(dest),{recursive:true});if(!fs.existsSync(dest))write(dest,source);for(const m of manifest){const f=file(root,m.path),html=fs.readFileSync(f,'utf8');if(sha(html)!==m.before)throw Error('Concurrent page edit');const x=packDocument(html,ids,dictionary,url);if(!x||sha(x.html)!==m.after)throw Error('Non-deterministic pack');write(f,x.html);}}
 if(manifestPath){fs.mkdirSync(path.dirname(manifestPath),{recursive:true});write(manifestPath,zlib.gzipSync(Buffer.from(manifest.map(m=>JSON.stringify(m)).join('\n')+'\n'),{level:9}));}
 return{schema:'place-row-pack-1',mode:apply?'apply':'dry_run',status:'evaluated',scannedPages:scanned,eligiblePages:eligible.length,changedPages:net>0?manifest.length:0,dictionaryRows:dictionary.length,packedRowInstances:packedRows,checkedProfileRows:totalRows,htmlBytesBefore:before,htmlBytesAfter:after,newSharedAssetBytes:newAssetBytes,netBytesSaved:Math.max(0,net),applied:apply&&net>0,originalRendererSHA256:sha(loader),rendererAsset:url,sourceRendererUnchanged:true,staticFirstRowsUnchanged:true,profileValuesUnchanged:true,chartsRemoved:false,coloursChanged:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=process.argv.slice(2),o={};for(let i=0;i<a.length;i++){if(a[i]==='--apply'){if(o.apply)throw Error('Duplicate apply');o.apply=true;continue;}if(!['--root','--registry','--report','--manifest'].includes(a[i])||o[a[i]]!==undefined||!a[i+1]||a[i+1].startsWith('--'))throw Error('Invalid argument '+a[i]);o[a[i]]=a[++i];}
 if(!o['--root']||!o['--registry'])throw Error('--root and --registry required');const root=path.resolve(o['--root']);if(fs.existsSync(path.join(root,'src'))||fs.existsSync(path.join(root,'.git')))throw Error('Use a generated publish folder');
 for(const name of ['--report','--manifest'])if(o[name]){const r=path.relative(root,path.resolve(o[name]));if(!r||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r)))throw Error('Report must be outside public output');}
 const before=inventory(root),r=packRows(root,JSON.parse(fs.readFileSync(o['--registry'],'utf8')),{apply:!!o.apply,manifestPath:o['--manifest']||null});const after=o.apply?inventory(root):{...before,bytes:before.bytes-r.netBytesSaved};const report={...r,publicBefore:before,publicAfter:after,measurement:o.apply?'actual_files':'projected',publicBudgetBytes:850000000,headroomBytes:850000000-after.bytes};
 if(o['--report']){fs.mkdirSync(path.dirname(path.resolve(o['--report'])),{recursive:true});write(path.resolve(o['--report']),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));if(after.bytes>850000000)process.exitCode=1;
}
