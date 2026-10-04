const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {defaults,validate,markdown,migrate,parse,importFile,mergeRestore}=require('./core.cjs');
const {renderStatic,buildStatic}=require('./scripts/build-static.cjs');
const build=require('./scripts/build-id.cjs');
const dir=process.env.COLORBAR_DATA_DIR||path.join(__dirname,'data');fs.mkdirSync(dir,{recursive:true});
const file=path.join(dir,'diary.md'),legacy=path.join(dir,'diary.json');
let loadError=null;
function load(text,current){try{return importFile(text,current).state;}catch(e){loadError=e.message;return migrate(parse(text));}}
let state=fs.existsSync(file)?load(fs.readFileSync(file,'utf8'),undefined):fs.existsSync(legacy)?migrate(JSON.parse(fs.readFileSync(legacy,'utf8'))):defaults();
if(!fs.existsSync(file)){if(fs.existsSync(legacy))fs.copyFileSync(legacy,path.join(dir,'before-v3-'+Date.now()+'.json'));const tmp=file+'.tmp';fs.writeFileSync(tmp,markdown(state),'utf8');fs.renameSync(tmp,file);}
const token=crypto.randomBytes(24).toString('hex');
function save(next){next=migrate(next);const tmp=file+'.tmp';fs.writeFileSync(tmp,markdown(next),'utf8');if(fs.existsSync(file))fs.copyFileSync(file,file+'.previous');fs.renameSync(tmp,file);state=next;loadError=null;}
function importAndSave(text,prefix){const r=importFile(text,state);if(fs.existsSync(file))fs.copyFileSync(file,path.join(dir,prefix+'-'+Date.now()+'.md'));save(r.state);return {state:r.state,source:r.source,changed:r.changed};}
if(!loadError&&fs.existsSync(file)&&JSON.stringify(parse(fs.readFileSync(file,'utf8')))!==JSON.stringify(state)){fs.copyFileSync(file,path.join(dir,'before-data-cleanup-'+Date.now()+'.md'));save(state);}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.headers.host!==`127.0.0.1:${server.address().port}`&&req.headers.host!==`localhost:${server.address().port}`){res.writeHead(403,{'Content-Type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:'页面连接凭据已失效或请求来源不受支持，请保留未保存内容后重新连接',code:'SESSION_EXPIRED'}));}
 if(url.pathname==='/api/background'&&req.method==='POST'){
 if(req.headers['x-colorbar-token']!==token)throw Error('页面连接已更新，请刷新后选择背景');
 const chunks=[];for await(const c of req)chunks.push(c);const bytes=Buffer.concat(chunks);
 if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('背景需为 JPEG 图片');
 const name='bg_pic_'+crypto.createHash('sha256').update(bytes).digest('hex').slice(0,20)+'.jpg';
 fs.writeFileSync(path.join(dir,name),bytes);res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({name}));
 }
 if(req.method==='GET'&&/^\/background\/bg_pic_[a-f0-9]{20}\.jpg$/.test(url.pathname)){
 const target=path.join(dir,path.basename(url.pathname));if(!fs.existsSync(target)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type','image/jpeg');return res.end(fs.readFileSync(target));
 }
 if(req.method==='GET'&&url.pathname==='/api/health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({app:'Colorbar Diary',build,loadError}));}
 if(req.method==='GET'&&url.pathname==='/api/state'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({state,token,loadError}));}
 if(req.method==='PUT'&&url.pathname==='/api/state'){
 if(req.headers['x-colorbar-token']!==token){res.writeHead(403,{'Content-Type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:'页面连接凭据已失效或请求来源不受支持，请保留未保存内容后重新连接',code:'SESSION_EXPIRED'}));}
 if(loadError){res.writeHead(409,{'Content-Type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:'data/diary.md 的正文导入失败，已暂停写入以免覆盖你手改的内容：'+loadError+'。请修正该文件后点击“重新导入”。'}));}
 let chunks=[];for await(const c of req)chunks.push(c);save(JSON.parse(Buffer.concat(chunks).toString('utf8')));return res.end('{}');}
 if(req.method==='POST'&&url.pathname==='/api/reload'){if(req.headers['x-colorbar-token']!==token){res.writeHead(403,{'Content-Type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:'页面连接凭据已失效或请求来源不受支持，请保留未保存内容后重新连接',code:'SESSION_EXPIRED'}));}res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(importAndSave(fs.readFileSync(file,'utf8'),'before-reload')));}
 if(req.method==='POST'&&url.pathname==='/api/import'){if(req.headers['x-colorbar-token']!==token){res.writeHead(403,{'Content-Type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:'页面连接凭据已失效或请求来源不受支持，请保留未保存内容后重新连接',code:'SESSION_EXPIRED'}));}let chunks=[];for await(const c of req)chunks.push(c);res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(importAndSave(Buffer.concat(chunks).toString('utf8'),'before-import')));}
 if(req.method==='POST'&&url.pathname==='/api/restore'){
 if(req.headers['x-colorbar-token']!==token){res.writeHead(403,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'页面连接已失效，请刷新后重试'}));}
 if(loadError)throw Error('主文件正文存在导入错误，请先修正并重新导入后再合并恢复');
 let chunks=[];for await(const c of req)chunks.push(c);
 const result=mergeRestore(Buffer.concat(chunks).toString('utf8'),state);
 if(result.changed){fs.copyFileSync(file,path.join(dir,'before-restore-'+Date.now()+'.md'));save(result.state);}
 res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(result));}
 if(req.method==='GET'&&url.pathname==='/api/export'){res.setHeader('Content-Type','text/markdown; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="Colorbar-Diary.md"');return res.end(markdown(state));}
 if(req.method==='GET'&&url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(require('./scripts/build-static.cjs').renderStatic(true));}
 const files={'/background.js':'background.js','/legacy':'index.html','/archive.js':'archive.js','/colors.js':'colors.js','/app.js':'app.js','/style.css':'style.css'};if(req.method==='GET'&&files[url.pathname]){res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript; charset=utf-8':url.pathname.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');return res.end(fs.readFileSync(path.join(__dirname,'public',files[url.pathname])));}
 res.writeHead(404);res.end('Not found');
 }catch(e){res.writeHead(400,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:e.message}));}});
server.listen(Number(process.env.PORT)||4327,'127.0.0.1',()=>console.log(`Colorbar Diary: http://127.0.0.1:${server.address().port}`));

// Development source is authoritative; keep the distributable up to date.
if(!process.env.COLORBAR_DATA_DIR){
 buildStatic();let rebuildTimer;
 for(const folder of ['public','scripts'])fs.watch(path.join(__dirname,folder),(event,name)=>{if(!name||!String(name).match(/\.(js|css|html|cjs|txt)$/))return;clearTimeout(rebuildTimer);rebuildTimer=setTimeout(()=>{try{delete require.cache[require.resolve('./scripts/build-static.cjs')];const release=require('./scripts/build-static.cjs').buildStatic();console.log('Static release: '+release.file+(release.created?' (new)':' (unchanged)'));}catch(e){console.error('Static build failed:',e.message);}},250);});
}
