const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../../src/more/more.js'),'utf8');
const c={};vm.createContext(c);
for(const name of ['cxDim','cxNote','cxTone']) {const m=src.match(new RegExp('function '+name+'\\([^]*?\\n}'));assert(m);vm.runInContext(m[0],c);}
test('monthly normal names distinguish all 12 months',()=>{const a=[];for(let i=1;i<=12;i++)a.push(c.cxDim({dimensions:{calendar_month:i}}));assert.equal(new Set(a).size,12);assert.equal(a[0],'January');assert.equal(a[11],'December');});
test('annual normal remains distinct',()=>assert.equal(c.cxDim({dimensions:{calendar_month:0}}),'annual normal'));
test('station values never get favourable or local tone',()=>{const x=c.cxTone({source_geo_level:'climate_station'},null,false);assert.equal(x[0],'ref');assert.match(x[1],/not a municipal measurement or ranking input/);});
test('station provenance note',()=>assert.match(c.cxNote({source_geo_level:'climate_station'}),/excluded from ranking scores/));
test('separate station group',()=>assert.match(src,/Nearby weather-station normals \(not municipal measurements\)/));
test('distance relation is not municipality',()=>assert.match(src,/station_context_within_25km: 'nearby weather station/));
