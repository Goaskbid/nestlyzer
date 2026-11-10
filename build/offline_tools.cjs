/* Dependency-free build alternative for environments with no npm network.
 * It preserves JavaScript token spelling and line terminators, performs no unsafe
 * rewrites or mangling, and bundles the application's local ES module graph.
 * Default builds continue to use pinned terser/esbuild. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),acorn=require('./vendor/acorn.cjs');
function minifyJS(source){
  const tokens=[...acorn.tokenizer(source,{ecmaVersion:'latest',sourceType:'script',allowHashBang:true})];
  let out='',last=0,prev='';
  for(const t of tokens){if(t.type.label==='eof')continue; const text=source.slice(t.start,t.end),gap=source.slice(last,t.start);let sep='';
    if(out&&/[\r\n\u2028\u2029]/.test(gap))sep='\n';
    else if(out&&gap.length&&(/[\w$\u0080-\uffff]/.test(prev.slice(-1))&&/[\w$\u0080-\uffff]/.test(text[0])||/[+\-\/]/.test(prev.slice(-1))&&/[+\-\/]/.test(text[0])||prev.slice(-1)==='.'&&/\d/.test(text[0])))sep=' ';
    // Whitespace between a regexp and a keyword, number and dot, or keyword and regexp is meaningful.
    if(out&&gap.length&&((prev.endsWith('/')&&/\w/.test(text[0]))||(/\d/.test(prev.slice(-1))&&text[0]==='.')))sep=sep||' ';
    out+=sep+text;prev=text;last=t.end;
  }
  acorn.parse(out,{ecmaVersion:'latest',sourceType:'script',allowHashBang:true});return out;
}
function minifyCSS(src){let out='',quote='',comment=false,space=false;for(let i=0;i<src.length;i++){const c=src[i],n=src[i+1];if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}if(quote){out+=c;if(c==='\\'&&n){out+=n;i++;}else if(c===quote)quote='';continue;}if(c==='/'&&n==='*'){comment=true;i++;continue;}if(c==='"'||c==="'"){if(space&&out&&!/[{;:,]/.test(out.slice(-1)))out+=' ';space=false;quote=c;out+=c;continue;}if(/\s/.test(c)){space=true;continue;}if(space&&out&&!/[{;:,]/.test(out.slice(-1))&&!/[};:,]/.test(c))out+=' ';space=false;out+=c;}return out;}
function bundle(entry){const modules=new Map();function add(file){file=path.resolve(file);if(modules.has(file))return modules.get(file).id;const rec={id:modules.size,code:''};modules.set(file,rec);const src=fs.readFileSync(file,'utf8'),ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'module'});let edits=[],exports=[];for(const n of ast.body){if(n.type==='ImportDeclaration'){if(!n.source.value.startsWith('.'))throw Error('Offline bundler only accepts local modules');const id=add(path.resolve(path.dirname(file),n.source.value));let s='';for(const p of n.specifiers){if(p.type==='ImportSpecifier')s+='const '+p.local.name+'=__load('+id+')['+JSON.stringify(p.imported.name)+'];';else if(p.type==='ImportDefaultSpecifier')s+='const '+p.local.name+'=__load('+id+').default;';else s+='const '+p.local.name+'=__load('+id+');';}edits.push([n.start,n.end,s||'__load('+id+');']);}else if(n.type==='ExportNamedDeclaration'){if(n.source)throw Error('Unsupported re-export');if(n.declaration){edits.push([n.start,n.declaration.start,'']);const d=n.declaration;if(d.type==='VariableDeclaration')for(const x of d.declarations){if(x.id.type!=='Identifier')throw Error('Unsupported exported binding');exports.push([x.id.name,x.id.name]);}else exports.push([d.id.name,d.id.name]);}else{for(const s of n.specifiers)exports.push([s.exported.name,s.local.name]);edits.push([n.start,n.end,'']);}}else if(n.type==='ExportDefaultDeclaration')throw Error('Unsupported default export');}let code=src;for(const [a,b,s]of edits.sort((a,b)=>b[0]-a[0]))code=code.slice(0,a)+s+code.slice(b);rec.code=code+'\n'+exports.map(([a,b])=>'exports['+JSON.stringify(a)+']='+b+';').join('');return rec.id;}const id=add(entry);const out='(function(){const __mods={'+[...modules.values()].map(m=>m.id+':function(exports){'+m.code+'\n}').join(',')+'},__cache={};function __load(i){if(__cache[i])return __cache[i];const e=__cache[i]={};__mods[i](e);return e;}__load('+id+');})();';return minifyJS(out);}
module.exports={minifyJS,minifyCSS,terser:{minify:async s=>({code:minifyJS(s)})},esbuild:{transform:async(s,o)=>({code:o.loader==='css'?minifyCSS(s):minifyJS(s)}),buildSync:o=>({outputFiles:[{text:bundle(o.entryPoints[0])}]})}};
