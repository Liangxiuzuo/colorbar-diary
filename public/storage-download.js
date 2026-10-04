/* Download fallback for browsers without user-visible file-system access. */
(function(root){
 if(isSecureContext&&typeof showOpenFilePicker==='function'&&typeof showSaveFilePicker==='function')return;
 const core=root.ColorbarCore,el=id=>document.getElementById(id);let current=null,pending=false,resolve;const ready=new Promise(r=>resolve=r);
 const input=document.createElement('input');input.type='file';input.accept='.md';input.hidden=true;input.id='manualMainFile';document.body.append(input);
 function activate(next,name,isNew=false){const first=current===null;current=next;pending=isNew;el('mainFilename').textContent=name+' · 下载模式';el('fileGate').hidden=true;document.querySelector('main').inert=false;el('closeFileGate').hidden=false;resolve();if(!first&&root.ColorbarStatic.onLoad)root.ColorbarStatic.onLoad(structuredClone(next));}
 function canSwitch(){return !(pending||root.ColorbarStatic.hasDraft?.())||confirm('当前内容需要下载保存。若已保存可继续，否则请取消并先下载。');}
 root.ColorbarStatic={manual:true,get pending(){return pending;},beforeSwitch:null,onLoad:null,async request(url,options={}){try{await ready;let result;if(url==='/api/state'&&options.method==='PUT'){current=core.migrate(JSON.parse(options.body));pending=true;result={};}else if(url==='/api/state')result={state:structuredClone(current),token:'download',loadError:null};else if(url==='/api/export')return new Response(core.markdown(current));else if(url==='/api/restore'){const r=core.mergeRestore(options.body,current);current=r.state;pending=pending||r.changed;result=r;}else if(url==='/api/reload')throw Error('下载模式请点击“连接主文件”重新选择磁盘上的文件');else throw Error('不支持的操作');return new Response(JSON.stringify(result));}catch(e){return new Response(JSON.stringify({error:e.message}),{status:400});}},downloadStarted(){pending=false;}};
 el('chooseMain').onclick=()=>{if(canSwitch())input.click();};input.onchange=async()=>{try{const f=input.files[0];if(f)activate(core.importFile(await f.text()).state,f.name);}catch(e){el('fileMessage').textContent=e.message;}finally{input.value='';}};
 el('createMain').onclick=()=>{if(canSwitch())activate(core.defaults(),'diary.md',true);};el('connectMain').onclick=()=>el('fileGate').hidden=false;el('closeFileGate').onclick=()=>{if(current)el('fileGate').hidden=true;};el('reconnectMain').hidden=true;
 const note=document.createElement('div');note.id='downloadModeNote';note.textContent='下载保存模式：修改只在当前页面，关闭前请下载 Markdown；不会自动覆盖原文件。';note.style.cssText='padding:7px 12px;background:#fff1ca;color:#624c20;font-size:12px';document.querySelector('.board-top').append(note);
 el('fileMessage').textContent='当前浏览器使用下载保存模式。选择 Markdown 或新建日记；编辑后需下载并自行替换主文件。';
 window.addEventListener('beforeunload',e=>{if(pending){e.preventDefault();e.returnValue='';}});
})(globalThis);
