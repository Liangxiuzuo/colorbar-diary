const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const files=['server.cjs','core.cjs','scripts/build-static.cjs','scripts/build-id.cjs',...fs.readdirSync(path.join(root,'public')).filter(f=>/\.(js|html|css|txt)$/.test(f)).sort().map(f=>'public/'+f)];
const id=crypto.createHash('sha256').update(files.map(f=>fs.readFileSync(path.join(root,f))).join('\n')).digest('hex');
module.exports=id;if(require.main===module)console.log(id);
