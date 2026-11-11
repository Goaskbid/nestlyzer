import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import { optimize,compactOptional } from '../../build/deduplicate_static_assets.mjs';
test('only optional closing tags removed',()=>{assert.equal(compactOptional('<ul><li>one</li><li>two</li></ul>'),'<ul><li>one<li>two</ul>');assert.equal(compactOptional('<p>kept</p><div>kept</div>'),'<p>kept</p><div>kept</div>');});
test('ten copies share scripts; JSON, chart and text stay',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'nz-assets-'));
 try{fs.mkdirSync(path.join(d,'.cache/seo'),{recursive:true});const paths=[];const js='window.fixtureCount=(window.fixtureCount||0)+1;'+('/* identical */'.repeat(30));
 for(let i=0;i<10;i++){const f='/p'+i+'/';paths.push({path:f});fs.mkdirSync(path.join(d,'p'+i));fs.writeFileSync(path.join(d,'p'+i,'index.html'),'<h1>Keep me</h1><svg role="img"><rect width="3"/></svg><script>'+js+'</script><script type="application/ld+json">{"a":1}</script><ul><li>A</li><li>B</li></ul>');}
 fs.writeFileSync(path.join(d,'.cache/seo/pages.json'),JSON.stringify(paths));const r=optimize(d);assert.equal(r.sharedClassicScripts,1);assert.equal(r.scriptReplacements,10);assert.ok(r.bytesSaved>0);
 const h=fs.readFileSync(path.join(d,'p0/index.html'),'utf8');assert.ok(h.includes('Keep me'));assert.ok(h.includes('<svg role="img">'));assert.ok(h.includes('application/ld+json'));assert.ok(!h.includes(' defer'));assert.ok(!h.includes(' async'));
 const again=optimize(d);assert.equal(again.changedHtmlFiles,0);
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('no registry is not silently a successful optimisation',()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'nz-assets-'));try{assert.equal(optimize(d).status,'not_applied_no_complete_registry');}finally{fs.rmSync(d,{recursive:true,force:true});}});
