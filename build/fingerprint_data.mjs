import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const files={};
function walk(relative){for(const name of fs.readdirSync(path.join(root,relative)).sort()){
 const rel=relative+'/'+name,full=path.join(root,rel),st=fs.lstatSync(full);
 if(st.isSymbolicLink())throw Error('Public data symlink not permitted: '+rel);
 if(st.isDirectory())walk(rel);else if(name!=='fingerprints.json')files[rel]=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
}}
walk('data');
const target=path.join(root,'data/fingerprints.json');
fs.writeFileSync(target+'.tmp',JSON.stringify({version,algorithm:'SHA-256',files}));fs.renameSync(target+'.tmp',target);
console.log('Final public data fingerprints: '+Object.keys(files).length);
