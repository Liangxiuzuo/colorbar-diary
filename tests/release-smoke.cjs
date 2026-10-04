// Native picker/permission dialogs are substituted; diary I/O uses real temporary disk files.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const core=require('../core.cjs');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'colorbar-offline-'));
const diary=path.join(tmp,'diary.md');fs.writeFileSync(diary,core.markdown(core.defaults()));
let browser;
(async()=>{try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 const context=await browser.newContext({offline:true,acceptDownloads:true});
 const p=await context.newPage(),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 await p.exposeFunction('readTestMain',()=>fs.readFileSync(diary,'utf8'));
 await p.exposeFunction('writeTestMain',text=>fs.writeFileSync(diary,text));
 await p.addInitScript(()=>{
   const main={name:'diary.md',queryPermission:async()=> 'granted',requestPermission:async()=> 'granted',
     getFile:async()=>new File([await window.readTestMain()],'diary.md',{type:'text/markdown'}),
     createWritable:async()=>{let text;return {write:async value=>{text=value},close:async()=>window.writeTestMain(text),abort:async()=>{}}}};
   window.showSaveFilePicker=async()=>main;
   window.showOpenFilePicker=async options=>{
     if(options.types?.[0]?.accept?.['image/*']){
       const c=document.createElement('canvas');c.width=8;c.height=8;const x=c.getContext('2d');x.fillStyle='#2468ac';x.fillRect(0,0,8,8);
       const blob=await new Promise(r=>c.toBlob(r));return [{name:'synthetic.png',getFile:async()=>new File([blob],'synthetic.png',{type:'image/png'})}];
     }
     return [main];
   };
 });
 const release=require('../scripts/build-static.cjs').latestReleasePath();
 await p.goto('file:///'+release.replaceAll('\\','/'));
 await p.locator('#chooseMain').click();await p.locator('.day').first().waitFor();
 await p.locator('#body').fill('Offline synthetic note — 测试');assert.equal(await p.evaluate(()=>ensureSaved()),true);
 let saved=core.importFile(fs.readFileSync(diary,'utf8')).state;
 const date=Object.keys(saved.entries)[0];assert.ok(JSON.stringify(saved).includes('Offline synthetic note'));
 await p.reload();await p.locator('#chooseMain').click();await p.locator('.record-text').filter({hasText:'Offline synthetic note'}).waitFor();
 const downloading=p.waitForEvent('download');await p.locator('#backup').click();const download=await downloading;
 assert.match(download.suggestedFilename(),/^Colorbar-Diary-\d{8}\.md$/);
 const backup=path.join(tmp,'backup.md');await download.saveAs(backup);
 assert.deepEqual(core.importFile(fs.readFileSync(backup,'utf8')).state,saved);
 const incoming=core.defaults();incoming.entries[date]={body:'',items:[{tagId:'thoughts',color:'#123456',value:'MUST NOT REPLACE'}]};
 incoming.entries['2001-01-02']={body:'',items:[{tagId:'work',color:'#123456',value:'Restored synthetic note'}],reminder:{id:'expired-test',title:'Past synthetic reminder',at:'2001-01-02T01:00:00.000Z',sound:'beep'}};
 const restore=path.join(tmp,'restore.md');fs.writeFileSync(restore,core.markdown(incoming));
 await p.locator('#restoreFile').setInputFiles(restore);
 await p.waitForFunction(()=>Object.hasOwn(state.entries,'2001-01-02'));
 const merged=core.importFile(fs.readFileSync(diary,'utf8')).state;
 assert.deepEqual(merged.entries[date],saved.entries[date]);assert.ok(merged.entries['2001-01-02']);
 assert.equal(await p.evaluate(()=>heardReminders.has('expired-test')),true);
 await p.locator('#chooseBackground').click();await p.waitForFunction(()=>document.documentElement.style.getPropertyValue('--diary-background').includes('blob:'));
 await p.locator('#backgroundBrightness').fill('35');await p.locator('#backgroundBrightness').dispatchEvent('input');
 assert.equal(await p.evaluate(()=>document.documentElement.style.getPropertyValue('--background-dim')),'0.65');
 assert.equal(fs.readFileSync(diary,'utf8').includes('data:image'),false);
 await p.locator('#resetBackground').click();await p.waitForFunction(()=>document.documentElement.style.getPropertyValue('--diary-background')==='var(--default-background)');
 // A supported legacy v3 archive, without v4's editable reading-view behavior.
 const old=core.defaults();old.entries['2002-02-03']={body:'',items:[{tagId:'work',color:'#123456',value:'Legacy synthetic note'}]};
 const legacy='# Colorbar Diary\n\n导出格式版本：3\n\n## 2002-02-03\n\n### 工作\n\n颜色：#123456\n\n```markdown\nLegacy synthetic note\n```\n\n## 完整恢复数据\n\n<!-- COLORBAR-DIARY-DATA-V3 -->\n```json\n'+JSON.stringify(old)+'\n```\n';
 fs.writeFileSync(diary,legacy);await p.locator('#reimport').click();await p.waitForFunction(()=>Object.hasOwn(state.entries,'2002-02-03'));
 assert.ok(await p.evaluate(()=>JSON.stringify(state).includes('Legacy synthetic note')));
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 console.log('PASS: offline HTML, real temporary-file saves and reopen, dated backup, missing-date restore, expired reminder suppression, synthetic background/brightness/reset, legacy v3 read. Native file dialogs and OS permission prompts are not automated.');
 }finally{if(browser)await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
