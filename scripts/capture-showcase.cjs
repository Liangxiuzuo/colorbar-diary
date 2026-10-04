// Documentation only: every diary entry is fictional and stored in an OS temporary folder.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const core=require('../core.cjs'),root=path.resolve(__dirname,'..');
const themed=process.argv.includes('--xian-ni');
const data=fs.mkdtempSync(path.join(os.tmpdir(),'colorbar-showcase-'));
const state=core.defaults();state.settings={theme:'blackboard',opacity:55,presentation:'chalk'};
const copy={
 health:['Morning walk by the lake. Fresh air, clear mind.','Slept well. A slow stretch before breakfast.','A quiet evening and an early night.','Walked the long way home. Feeling lighter.'],
 knee:['Gentle stretches after the walk. Taking it slowly.','An easy bike ride, then a short rest.','A little movement between desk sessions.'],
 fever:['Rest day: tea, a book, and plenty of water.','Feeling better. Keeping the afternoon unhurried.','A calm recovery day with a warm bowl of soup.'],
 work:['Sketch the new landing page. Keep the layout simple.','Finished the prototype. Tomorrow: polish the details.','Team review: fewer steps, clearer language.','One focused hour made the hard task feel smaller.'],
 family:['Sunday pancakes and a long conversation at the table.','Called home. Shared the little stories of the week.','Cooked dinner together; saved the recipe for next time.','An evening walk together, with no particular destination.'],
 social:['Coffee with a friend. Time passed without noticing.','Sent a postcard and made plans for next weekend.','Book club: everyone noticed a different detail.','A picnic, a shared playlist, and plenty of laughter.'],
 interest:['Watercolor practice: clouds, reflections, soft edges.','Read a chapter with tea while the rain slowed down.','A few photographs of the changing autumn leaves.','Learned a new melody. Ten patient minutes a day.'],
 software:['Made a tiny tool. The simplest solution worked best.','Tidied the code and wrote a useful example.','Fixed a small bug; added a test so it stays fixed.','Tried a new idea in a small, disposable prototype.'],
 thoughts:['The lake held the last color of the evening.','Some days are better measured in moments than tasks.','Keep a little room for things that are not planned.','A small good thing: sunlight across the kitchen table.']
};
function item(id,date,index){const t=state.tags.find(t=>t.id===id),text=copy[id][index%copy[id].length];return {tagId:id,color:t.color,value:text,records:[{id:'demo-'+date+'-'+id,text,updatedAt:date+'T'+String(9+index%10).padStart(2,'0')+':15:00.000Z'}],...(id==='health'?{rating:4+index%2}:{})};}
const ids=['health','work','family','social','interest','software','thoughts','knee','fever'];
for(let i=0;i<49;i++){const d=new Date(Date.UTC(2026,8,14+i)),date=d.toISOString().slice(0,10);const chosen=[ids[i%ids.length],ids[(i+3)%ids.length]];state.entries[date]={body:'',items:chosen.map((id,j)=>item(id,date,i+j))};}
if(themed)for(let i=0;i<365;i++){const date=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10);if(i%7===2)continue;const chosen=[ids[i%ids.length],ids[(i+3)%ids.length]];state.entries[date]={body:'',items:chosen.map((id,j)=>item(id,date,i+j))};}
const selected='2026-10-04';state.entries[selected]={body:'',items:['health','work','thoughts'].map((id,j)=>{
 const entry=item(id,selected,j),second=item(id,selected,j+1).records[0];
 second.id+='-evening';second.updatedAt=selected+'T'+String(17+j).padStart(2,'0')+':30:00.000Z';
 entry.records.push(second);entry.value=entry.records.map(r=>r.text).join('\n\n');return entry;
})};
fs.writeFileSync(path.join(data,'diary.md'),core.markdown(state));
let server,browser;
(async()=>{try{
 server=spawn(process.execPath,['server.cjs'],{cwd:root,env:{...process.env,PORT:'4338',COLORBAR_DATA_DIR:data},stdio:'pipe'});
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Preview startup timeout')),15000);server.stdout.once('data',()=>{clearTimeout(t);resolve()});server.once('error',reject);});
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 const p=await browser.newPage({viewport:{width:1800,height:1125},deviceScaleFactor:1}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('colorbar-release-language','en');localStorage.setItem('colorbar-release-tag-panel',JSON.stringify({width:220,editorWidth:390}));localStorage.setItem('colorbar-release-background-brightness','48');});
 await p.goto('http://127.0.0.1:4338');await p.locator('.day').first().waitFor();
 await p.locator('#backgroundFile').setInputFiles(path.join(root,'docs/images',themed?'xian-ni-wallpaper.png':'blue-hour-wallpaper.png'));
 await p.waitForFunction(()=>document.documentElement.style.getPropertyValue('--diary-background').includes('blob:'));
 await p.locator('[data-date="2026-10-04"]').click();
 await p.locator('[data-record-tag="work"]').first().click();
 await p.evaluate(()=>{const sc=document.getElementById('timeline'),cell=document.querySelector('[data-date="2026-09-21"]');sc.scrollTop=cell.offsetTop;document.activeElement.blur();});
 await p.waitForTimeout(500);
 if(themed){
   await p.locator('#allFilter').uncheck();
   for(const id of ['work','interest','thoughts'])await p.locator('[data-filter="'+id+'"]').check();
   await p.locator('#toggleTagPanel').click();
   await p.waitForFunction(()=>document.querySelector('.editor').hidden&&document.getElementById('tagPanelContent').hidden);
   await p.evaluate(()=>{const sc=document.getElementById('timeline'),cell=document.querySelector('[data-date="2026-09-21"]');sc.scrollTop=cell.offsetTop;document.activeElement.blur();});
   await p.waitForTimeout(350);
   await p.screenshot({path:path.join(root,'docs/images/english-xian-ni-board.png')});
   await p.locator('#yearView').click();
   await p.locator('#yearTimeline').waitFor();
   await p.evaluate(()=>{const sc=document.getElementById('yearTimeline');sc.scrollTop=sc.querySelector('[data-year="2026"]').offsetTop;document.activeElement.blur();});
   await p.waitForTimeout(350);
   await p.screenshot({path:path.join(root,'docs/images/english-xian-ni-year.png')});
 }else await p.screenshot({path:path.join(root,'docs/images/english-rich.png')});
 if(errors.length)throw Error(errors.join('\n'));
 console.log(themed?'Created collapsed board and year previews with selected tags.':'Created docs/images/english-rich.png using fictional entries and a generated wallpaper.');
 }finally{if(browser)await browser.close();if(server)server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
