const fs=require('node:fs'),path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const releaseDir=path.join(root,'dist');
function manifest(dir=releaseDir){const file=path.join(dir,'releases.json');return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{latest:null,releases:[]};}
function latestReleasePath(){const m=manifest();return path.join(releaseDir,m.latest?.file||'colorbardiary_v1.html');}
function renderPage(preview=false,version=manifest().latest?.version||1,language='zh-CN'){
const tr=text=>language==='en'?require('./localize.cjs').english(text):text;
let html=read('public/index.html');
if(preview)html=html.replace('<body>','<body data-preview="true">');
html=html.replace('<title>Colorbar Diary</title>','<title>colorbardiary_v0 · 离线日记</title>');
html=html.replace('<link rel="stylesheet" href="/style.css">','<style>'+read('public/style.css')+'\n#fileGate{position:fixed;inset:0;z-index:40;background:#eef3f0f5;display:grid;place-items:center}#fileGate[hidden]{display:none}.file-card{max-width:560px;padding:30px;background:white;border:1px solid #ccd8d0;border-radius:15px;margin:20px;line-height:1.8}.file-card button{margin:4px}.file-card p{overflow-wrap:anywhere}#mainFilename{max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}#fileMessage{color:#526c61}#connectMain,#draftBackup{font-size:11px}</style>');
html=html.replace('<div class="file-actions">','<div class="file-actions"><span id="mainFilename">未连接主文件</span><button id="connectMain">连接主文件</button><button id="draftBackup">导出未保存草稿</button>');
html=html.replace('在外部编辑 data/diary.md 后，点此把文件内容导回软件','外部修改所选主文件后，点此重新读取');
let gate='<section id="fileGate" aria-label="连接 Markdown 主文件"><div class="file-card"><h2>colorbardiary_v0</h2><p>选择你自己的 Markdown 主文件。可放在普通文件夹或已同步到本机的云盘目录。</p><p>日记保存在所选文件中。浏览器只记住文件入口与界面偏好，清理缓存后可以重新选择文件。</p><button id="chooseMain">选择主文件</button><button id="createMain">新建主文件</button><button id="reconnectMain" hidden>继续连接上次文件</button><button id="useProjectMain" hidden>使用项目主文件</button><button id="closeFileGate" hidden>返回当前日记</button><p id="fileMessage">首次使用请选择已有 Colorbar Diary 完整 Markdown，或新建一个文件。</p><small>应用版本 v0 · 数据格式 v4 · 无需联网或后台服务</small></div></section>';
html=tr(html);gate=tr(gate.replace('<h2>','<select class="language-picker" aria-label="Language"><option value="en">English</option><option value="zh-CN">中文</option></select><h2>'));
html=html.replace(/<script src="[^\"]+"><\/script>/g,'');
if(preview)html=html.replace('colorbardiary_v0 · 离线日记','Colorbar Diary · 开发测试版');
const scripts=['public/locale.js','public/archive.js','public/core.js','public/colors.js','public/storage-browser.js','public/background.js','public/app.js'].map(f=>'<script>'+( ['public/app.js','public/storage-browser.js','public/background.js'].includes(f)?tr(read(f)):f==='public/locale.js'?read(f).replace('/*TRANSLATIONS*/ []',JSON.stringify(require('./localize.cjs').pairs)):read(f)).replace(/<\/script/gi,'<\\/script')+'</script>').join('\n');
const integration=`ColorbarStatic.onToken=value=>{token=value;};ColorbarStatic.beforeSwitch=()=>ensureSaved();ColorbarStatic.onLoad=next=>{timelineStart=null;timelineEnd=null;adopt(next,'已连接主文件');};document.getElementById('draftBackup').onclick=()=>{if(!state)return;download('Colorbar-Diary-draft-'+localDate(new Date()).replaceAll('-','')+'.md',ColorbarCore.markdown(state),'text/markdown;charset=utf-8');toast('草稿已下载，未覆盖主文件');};`;
html=html.replace('</body>',()=>gate+scripts+'<script>'+tr(integration)+'</script></body>');
return html.replaceAll('colorbardiary_v0','colorbardiary_v'+version).replaceAll('应用版本 v0','应用版本 v'+version);
}

function renderStatic(preview=false,version=manifest().latest?.version||1){
 const pages={en:renderPage(preview,version,'en'),'zh-CN':renderPage(preview,version,'zh-CN')};
 const payload=JSON.stringify(pages).replace(/</g,'\\u003c');
 return '<!doctype html><html lang="en"><meta charset="utf-8"><title>Colorbar Diary</title><script>const pages='+payload+';let lang=new URL(location.href).searchParams.get("lang");if(!lang){try{lang=localStorage.getItem("colorbar-release-language")}catch{}}lang=lang==="zh-CN"?lang:"en";window.ColorbarLanguage=lang;document.open();document.write(pages[lang]);document.close();</script></html>';
}

function publishRelease(base,dir=releaseDir){
 fs.mkdirSync(dir,{recursive:true});const m=manifest(dir),sourceHash=crypto.createHash('sha256').update(base).digest('hex');
 if(m.latest?.sourceHash===sourceHash){const file=path.join(dir,m.latest.file);if(fs.existsSync(file)&&crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')===m.latest.sha256)return {...m.latest,created:false};}
 const existing=fs.readdirSync(dir).map(f=>/^colorbardiary_v(\d+)\.html$/.exec(f)).filter(Boolean).map(m=>Number(m[1]));
 let version=Math.max(0,...existing,...m.releases.map(r=>r.version))+1;
 let html,file;while(true){file='colorbardiary_v'+version+'.html';html=base.replaceAll('colorbardiary_v0','colorbardiary_v'+version).replaceAll('应用版本 v0','应用版本 v'+version);try{fs.writeFileSync(path.join(dir,file),html,{flag:'wx'});break;}catch(e){if(e.code!=='EEXIST')throw e;version++;}}
 const release={version,file,createdAt:new Date().toISOString(),bytes:Buffer.byteLength(html),sourceHash,sha256:crypto.createHash('sha256').update(html).digest('hex')};
 m.releases.push(release);m.latest=release;const tmp=path.join(dir,'releases.'+process.pid+'.tmp');fs.writeFileSync(tmp,JSON.stringify(m,null,2)+'\n');fs.renameSync(tmp,path.join(dir,'releases.json'));
 return {...release,created:true};
}
function buildStatic(){return publishRelease(renderStatic(false,0));}
module.exports={renderStatic,buildStatic,latestReleasePath,publishRelease};
if(require.main===module){const r=buildStatic();console.log((r.created?'Created ':'Unchanged: ')+r.file+' ('+r.bytes+' bytes)');}
