const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),allowed=new Set(['public','scripts','tests','docs','dist','.gitignore','package.json','README.md','Colorbar-Diary-需求草案.md','server.cjs','core.cjs','LICENSE','CONTRIBUTING.md','CHANGELOG.md','release']);
const excluded=new Set(['.git','node_modules','.local-private','data','Colorbar-Diary-需求草案.md']);
const errors=[];for(const entry of fs.readdirSync(root)){if(!allowed.has(entry)&&!excluded.has(entry))errors.push('Review unexpected path: '+entry)}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>!excluded.has(e.name)).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}
for(const f of walk(root)){if(/^diary.*\.md$/i.test(path.basename(f)))errors.push('Unreviewed diary file must not be published: '+path.relative(root,f));}
for(const f of walk(root).filter(f=>!f.includes('node_modules')&&!f.includes(path.sep+'.git'+path.sep))){if(/\.(js|cjs|html|json|md|txt)$/.test(f)){const s=fs.readFileSync(f,'utf8');if(/(?:C:[\\/]Users[\\/]|D:[\\/]ChatGPT-|ghp_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY)/.test(s))errors.push('Review possible private content: '+path.relative(root,f));}}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log('PASS: publish paths and common private-path/credential patterns checked. Manual review is still required.');
