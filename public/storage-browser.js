/* Browser-only adapter: the selected Markdown is authoritative; IDB stores a handle only. */
(function(root){
 const core=root.ColorbarCore;
 const preview=document.body.dataset.preview==='true';let projectMode=preview;
 let handle=null,baseline=null,current=null,remembered=null,busy=false;
 let resolveReady;const ready=new Promise(resolve=>resolveReady=resolve);
 const el=id=>document.getElementById(id);
 const message=text=>el('fileMessage').textContent=uiMessage(text);
 const supported=()=>isSecureContext&&typeof showOpenFilePicker==='function'&&typeof showSaveFilePicker==='function';
 async function cache(mode,value){
  const db=await new Promise((resolve,reject)=>{let expired=false;const timeout=setTimeout(()=>{expired=true;reject(Error('文件入口缓存不可用'));},2000);const r=indexedDB.open('colorbar-release-file-entry',1);r.onupgradeneeded=()=>r.result.createObjectStore('entry');r.onsuccess=()=>{clearTimeout(timeout);if(expired)r.result.close();else resolve(r.result);};r.onerror=()=>{clearTimeout(timeout);reject(r.error);};});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('entry',mode==='get'?'readonly':'readwrite'),store=tx.objectStore('entry');const r=mode==='get'?store.get('main'):store.put(value,'main');const timeout=setTimeout(()=>{try{tx.abort();}catch{}reject(Error('文件入口缓存超时'));},2000);tx.oncomplete=()=>{clearTimeout(timeout);resolve(r.result);};tx.onerror=tx.onabort=()=>{clearTimeout(timeout);reject(tx.error||Error('文件入口缓存失败'));};});}finally{db.close();}
 }
 function parseMain(text){return core.importFile(text).state;}
 async function permission(h,prompt=false){let value=await h.queryPermission({mode:'readwrite'});if(value!=='granted'&&prompt)value=await h.requestPermission({mode:'readwrite'});if(value!=='granted')throw Error('尚未获得主文件写入权限，请点击“连接主文件”重新授权');}
 async function attach(h,prompt=false){
  await permission(h,prompt);const text=await(await h.getFile()).text(),next=parseMain(text);
  projectMode=false;handle=h;baseline=text;current=next;remembered=h;
  cache('set',h).catch(()=>message('已连接；浏览器未能记住文件入口，下次需重新选择。'));
  el('reconnectMain').hidden=false;el('closeFileGate').hidden=false;el('mainFilename').textContent=h.name;el('fileGate').hidden=true;document.querySelector('main').inert=false;
  resolveReady();if(root.ColorbarStatic.onLoad)root.ColorbarStatic.onLoad(structuredClone(current));
 }
 async function write(next){
  if(!handle)throw Error('请先选择主文件');await permission(handle);
  const run=async()=>{const disk=await(await handle.getFile()).text();if(disk!==baseline)throw Error('主文件已被外部编辑或同步更新，已停止保存。请先“导出未保存草稿”，再重新导入主文件');
   const nextState=core.migrate(structuredClone(next)),text=core.markdown(nextState);let stream;
   try{stream=await handle.createWritable();await stream.write(text);await stream.close();}catch(e){if(stream)try{await stream.abort();}catch{}throw e;}
   baseline=text;current=nextState;
  };
  // Serializes cooperating tabs in the same origin; the disk comparison catches stale baselines.
  if(navigator.locks)await navigator.locks.request('colorbar-release-main-file-write',run);else await run();
 }
 function downloadSnapshot(name,text){const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function request(url,options={}){
  try{await ready;if(projectMode)return await fetch(url,options);let result;
   if(url==='/api/state'&&options.method==='PUT'){await write(JSON.parse(options.body));result={};}
   else if(url==='/api/state'){result={state:structuredClone(current),token:'local-file',loadError:null};}
   else if(url==='/api/export')return new Response(core.markdown(current),{headers:{'Content-Type':'text/markdown'}});
   else if(url==='/api/reload'){const text=await(await handle.getFile()).text(),next=parseMain(text);baseline=text;current=next;result={state:structuredClone(next),source:'所选 Markdown 主文件'};}
   else if(url==='/api/restore'){const merged=core.mergeRestore(options.body,current);if(merged.changed){downloadSnapshot('Colorbar-Diary-before-restore-'+new Date().toISOString().replace(/[:.]/g,'-')+'.md',core.markdown(current));await write(merged.state);}result={...merged,state:structuredClone(current)};}
   else throw Error('不支持的本地操作');
   return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json'}});
  }catch(e){return new Response(JSON.stringify({error:e.message}),{status:400,headers:{'Content-Type':'application/json'}});}
 }
 async function choose(create=false){
  if(busy)return;busy=true;
  try{if(!supported())throw Error('此浏览器不能直接读写本地文件，请使用 Windows Edge 或 Chrome；若仍不可用，请检查浏览器文件权限');
   const options={types:[{description:'Colorbar Diary Markdown',accept:{'text/markdown':['.md']}}]};
   // Call picker before asynchronous preparation so the user gesture is preserved.
   const selected=create?await showSaveFilePicker({...options,suggestedName:'diary.md'}):(await showOpenFilePicker({...options,multiple:false}))[0];
   if(root.ColorbarStatic.beforeSwitch&&!await root.ColorbarStatic.beforeSwitch())throw Error('当前修改尚未保存，请先导出草稿或解决保存失败后再切换');
   if(create){const file=await selected.getFile();if(file.size)throw Error('新建需要空文件，请换一个文件名；已有内容未修改');await permission(selected,true);const stream=await selected.createWritable();await stream.write(core.markdown(core.defaults()));await stream.close();}
   await attach(selected,true);
  }catch(e){if(e.name!=='AbortError'){message(e.message);el('fileGate').hidden=false;}}
  finally{busy=false;}
 }
 root.ColorbarStatic={request,onLoad:null,beforeSwitch:null};
 document.querySelector('main').inert=!preview;
 if(preview){resolveReady();el('fileGate').hidden=true;el('mainFilename').textContent='data/diary.md';el('useProjectMain').hidden=false;el('closeFileGate').hidden=false;el('fileGate').querySelector('small').textContent='开发测试版 · 默认使用项目主文件 · 与分发版共用源码';}
 el('useProjectMain').onclick=async()=>{try{if(root.ColorbarStatic.beforeSwitch&&!await root.ColorbarStatic.beforeSwitch())throw Error('请先保存或导出当前草稿');const r=await fetch('/api/state');if(!r.ok)throw Error('项目主文件读取失败');const data=await r.json();if(data.loadError)throw Error(data.loadError);projectMode=true;handle=null;el('mainFilename').textContent='data/diary.md';el('fileGate').hidden=true;root.ColorbarStatic.onLoad(data.state);if(root.ColorbarStatic.onToken)root.ColorbarStatic.onToken(data.token);}catch(e){message(e.message);}};
 el('chooseMain').onclick=()=>choose();el('createMain').onclick=()=>choose(true);
 el('connectMain').onclick=()=>{el('fileGate').hidden=false;};
 el('closeFileGate').onclick=()=>{if(handle||projectMode)el('fileGate').hidden=true;};
 el('reconnectMain').onclick=async()=>{try{const h=handle||remembered;if(!h)throw Error('没有记住的文件，请重新选择');await permission(h,true);if(handle&&root.ColorbarStatic.beforeSwitch&&!await root.ColorbarStatic.beforeSwitch())throw Error('当前草稿尚未保存，请先导出草稿并处理冲突');await attach(h);}catch(e){message(e.message);}};
 if(!supported())message('请使用支持本地文件读写的 Windows Edge / Chrome 打开本文件。');
 cache('get').then(async h=>{remembered=h;if(h){el('reconnectMain').hidden=false;message('上次主文件：'+h.name+'。点击继续连接，或选择另一个文件。');}}).catch(()=>message('无法记住文件入口，仍可手动选择主文件。'));
})(globalThis);
