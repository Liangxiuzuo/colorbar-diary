(function(root){
const crypto=typeof module==='object'?require('node:crypto'):root.crypto;const {parse,marker,readView}=typeof module==='object'?require('./archive.js'):root.ColorbarArchive;
const faces=['😣','🙁','😐','🙂','😄'];
const defaults=()=>({version:2,tags:[['health','身心健康',null,'#76b5a0'],['knee','膝盖','health','#95c7b3'],['fever','发烧','health','#e6aa83'],['work','工作',null,'#849bda'],['family','家庭',null,'#e4ac95'],['social','社交',null,'#d2a1c5'],['interest','兴趣',null,'#dbbf70'],['software','软件开发','interest','#a4bddb'],['thoughts','碎碎念',null,'#bcb4d6']].map(([id,name,parent,color])=>({id,name,parent,color,active:true})),entries:{}});
function path(s,id){const t=s.tags.find(t=>t.id===id);return t.parent?`${s.tags.find(p=>p.id===t.parent).name} / ${t.name}`:t.name;}
function validate(s){
 if(!s||![1,2].includes(s.version)||!Array.isArray(s.tags)||!s.entries||typeof s.entries!=='object'||Array.isArray(s.entries))throw Error('备份格式不正确');
 for(const e of Object.values(s.entries)){if(!Array.isArray(e?.items))continue;for(const i of e.items){if(i.records!==undefined){if(!Array.isArray(i.records))throw Error('记录列表格式不正确');const recordIds=new Set();for(const r of i.records){if(!r||typeof r.id!=='string'||!r.id||recordIds.has(r.id)||typeof r.text!=='string'||(r.updatedAt!==undefined&&r.updatedAt!==''&&(typeof r.updatedAt!=='string'||!Number.isFinite(Date.parse(r.updatedAt)))))throw Error('独立记录格式不正确');recordIds.add(r.id);}if(i.value!==i.records.map(r=>r.text).join('\n\n'))throw Error('标签汇总与独立记录不一致');}}}
 for(const e of Object.values(s.entries)){const r=e?.reminder;if(r!==undefined&&(!r||typeof r.id!=='string'||!r.id||typeof r.title!=='string'||r.title.length>100||typeof r.at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.at)||!Number.isFinite(Date.parse(r.at))||!['chime','beep'].includes(r.sound)||(r.firedAt!==undefined&&(typeof r.firedAt!=='string'||!Number.isFinite(Date.parse(r.firedAt))))))throw Error('提醒数据格式不正确');}
 const ids=new Set(),names=new Set();for(const t of s.tags){if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.name!=='string'||!t.name.trim()||!/^#[0-9a-f]{6}$/i.test(t.color)||typeof t.active!=='boolean')throw Error('标签格式不正确');ids.add(t.id);}
 for(const t of s.tags){if(t.parent&&(!s.tags.some(p=>p.id===t.parent&&!p.parent)||t.parent===t.id))throw Error('标签层级不正确');const key=JSON.stringify([t.parent||null,t.name.trim()]);if(names.has(key))throw Error('同一层级的标签不能重名');names.add(key);}
 for(const [d,e] of Object.entries(s.entries)){if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||isNaN(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d||!e||typeof e.body!=='string'||!Array.isArray(e.items))throw Error('日记格式不正确');const used=new Set();for(const i of e.items){if(!i||!ids.has(i.tagId)||used.has(i.tagId)||typeof i.value!=='string'||!/^#[0-9a-f]{6}$/i.test(i.color))throw Error('日记标签格式不正确');used.add(i.tagId);if(i.brightness!==undefined&&(!Number.isFinite(i.brightness)||i.brightness<0||i.brightness>100))throw Error('旧版亮度数据不正确');if(i.rating!==undefined&&(!Number.isInteger(i.rating)||i.rating<1||i.rating>5||i.tagId!=='health'))throw Error('只有身心健康可设置 1–5 笑脸评分');}}
 if(s.settings!==undefined&&(!s.settings||!['blackboard','sage','ocean','rose'].includes(s.settings.theme)||!Number.isFinite(s.settings.opacity)||s.settings.opacity<35||s.settings.opacity>100))throw Error('外观设置不正确');
 if(s.settings?.background!==undefined){const b=s.settings.background;if(!b||typeof b.name!=='string'||typeof b.dataUrl!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(b.dataUrl))throw Error('背景图片格式不正确');}
 return s;
}
function migrate(raw){validate(raw);if(raw.version===2)return cleanEmptyRecords(moveBodies(raw));const s=structuredClone(raw),fresh=defaults(),old=s.tags;s.tags=fresh.tags;s.version=2;
 for(const e of Object.values(s.entries)){const merged=new Map();for(const i of e.items){const t=old.find(t=>t.id===i.tagId),parent=old.find(p=>p.id===t.parent);const name=t.name==='健康'?'身心健康':t.name;const target=s.tags.find(n=>n.name===name&&(!n.parent?!t.parent:parent&&(s.tags.find(p=>p.id===n.parent).name===(parent.name==='健康'?'身心健康':parent.name))));const id=target?.id||'thoughts',item={...i,tagId:id};if(!target)item.value='【原标签：'+(parent?parent.name+' / ':'')+t.name+'】\n'+(i.value||'（仅颜色记录）');if(i.brightness!==undefined){item.legacyBrightness=i.brightness;delete item.brightness;}const previous=merged.get(id);if(previous){previous.value+='\n\n'+item.value;previous.legacyItems=[...(previous.legacyItems||[]),structuredClone(i)];}else{item.legacyItems=[structuredClone(i)];merged.set(id,item);}}e.items=[...merged.values()];}
 s.migration={...(s.migration||{}),previousTags:old,fromVersion:1};return cleanEmptyRecords(moveBodies(s));
}
function block(text,language='markdown'){const fence='`'.repeat(Math.max(3,...(text.match(/`+/g)||[]).map(r=>r.length+1)));return fence+language+'\n'+text+'\n'+fence+'\n';}
function markdown(s){validate(s);if(s.settings?.background){s=structuredClone(s);delete s.settings.background;}let out='# Colorbar Diary\n\n导出格式版本：4 · 此文件可直接恢复全部日记、标签与设置。\n\n> 下方阅读视图即数据本体：同一标签下，一个代码块就是一条记录，增删代码块即增删记录，改文字即改记录。文末 JSON 数据区保留标签层级与外观设置，并在正文缺失时兜底。\n';for(const [d,e] of Object.entries(s.entries).sort(([a],[b])=>a.localeCompare(b))){out+='\n## '+d+'\n';if(e.reminder)out+='\n### ⏰ 日程提醒\n\n'+block(e.reminder.title||'日程提醒')+'\n提醒时间：'+e.reminder.at+'；声音：'+e.reminder.sound+'（5 秒）；'+(e.reminder.firedAt?'已提醒':'待提醒')+'\n';for(const i of e.items){const texts=Array.isArray(i.records)?i.records.map(r=>r.text):(i.value?[i.value]:[]);out+='\n### '+path(s,i.tagId).replace(/[\r\n]/g,' ')+'\n\n颜色：'+i.color+(i.rating?'；身心状态：'+faces[i.rating-1]+'（'+i.rating+'/5）':'')+'\n';for(const t of texts)out+='\n'+block(t);}if(e.body)out+='\n### 当天正文\n\n'+block(e.body);}out+='\n## 完整恢复数据\n\n请保留此区；包括标签层级、颜色、时间、设置与迁移留存信息（正文与评分以阅读视图为准）。\n\n'+marker+'\n'+block(JSON.stringify(s,null,2),'json');return out;}
const canon=v=>JSON.stringify(v,(k,x)=>(x&&typeof x==='object'&&!Array.isArray(x))?Object.fromEntries(Object.keys(x).sort().map(kk=>[kk,x[kk]])):x);
// 导入：整份文本 → 完整 state。v4 以阅读视图为准（正文即数据）；v3 及更早以文末数据区为准（旧格式无法无损反解）。
function importFile(text,current){
 assertNotBlank(text);
 text=String(text).replace(/\r\n/g,'\n');
 const {formatVersion,days}=readView(text);
 if(formatVersion>4)throw Error('此文件格式比当前软件更新，请升级软件后打开');
 const hasData=text.includes('\n'+marker+'\n');
 let base;
 if(hasData)base=migrate(parse(text));
 else if(current)base=migrate(structuredClone(current));
 else throw Error('文件不含完整备份数据，也没有可用的当前数据');
 // 只比“内容行”：忽略围栏、空行、颜色行与文件头版式（旧格式把多记录项写成一个块，逐字节比会误判）
 const prose=s=>String(s).split('\n## 完整恢复数据')[0].split('\n'+marker)[0].split('\n').filter(l=>!/^(导出格式版本：|>|# Colorbar Diary$|颜色：|```)/.test(l)).map(l=>l.trimEnd()).filter(l=>l!=='').join('\n');
 // 旧格式文件正常以数据区为准；但若正文被外部改过（内容行对不上），说明正文是新的，改以正文为准
 if(formatVersion<4&&prose(text)===prose(markdown(base)))return {state:base,source:'数据区(v'+formatVersion+')',changed:canon(base)!==canon(current)};
 if(!Object.keys(days).length){if(formatVersion===4&&hasData)return {state:migrate({...base,entries:{}}),source:'阅读视图(v4)',changed:true};throw Error('未找到任何日期小节，导入已取消');}
 const keyOf=t=>t.parent?(base.tags.find(p=>p.id===t.parent)||{}).name+' / '+t.name:t.name;
 const map=new Map(base.tags.map(t=>[keyOf(t),t]));
 const tagId=name=>{const hit=map.get(name);if(hit)return hit.id;throw Error('未知标签“'+name+'”，文件与标签表不一致，导入已取消');};
 const entries={};
 for(const [d,day] of Object.entries(days)){
  const prevItems=(base.entries[d]||{}).items||[],items=[],pools=new Map();
  const poolOf=id=>{if(!pools.has(id)){const p=prevItems.find(i=>i.tagId===id);pools.set(id,Array.isArray(p&&p.records)?p.records.slice():[]);}return pools.get(id);};
  for(const node of day.nodes){
   const id=tagId(node.path);
   let item=items.find(i=>i.tagId===id);
   if(!item){const prev=prevItems.find(i=>i.tagId===id),tagColor=(base.tags.find(t=>t.id===id)||{}).color;
    // 正文里写的颜色若只是标签色，就沿用数据区中该项自己的颜色（旧文件正文只记标签色，自定义色存在数据区）
    item={tagId:id,color:(node.color&&node.color!==tagColor)?node.color:((prev&&prev.color)||node.color||tagColor),value:'',records:[]};
    if(prev&&prev.legacyItems!==undefined)item.legacyItems=prev.legacyItems;
    if(prev&&prev.legacyBrightness!==undefined)item.legacyBrightness=prev.legacyBrightness;
    if(prev&&prev.updatedAt)item.updatedAt=prev.updatedAt;
    items.push(item);}
   // 文字与旧记录相同则沿用原 id/时间，避免每次导入都换一批 id（文件里就不留无谓噪声）
   for(const t of node.texts){const pool=poolOf(id),k=pool.findIndex(r=>r.text===t);
    if(k>=0)item.records.push(pool.splice(k,1)[0]);
    else item.records.push({id:crypto.randomUUID(),text:t,createdAt:new Date().toISOString(),updatedAt:''});}
   if(node.rating&&id==='health')item.rating=node.rating;
   item.value=item.records.map(r=>r.text).join('\n\n');
  }
  const ent={body:'',items};
  if((base.entries[d]||{}).updatedAt)ent.updatedAt=base.entries[d].updatedAt;
  if(day.reminder){
   if(!day.reminder.meta)throw Error(d+' 的日程提醒缺少“提醒时间：…”一行，导入已取消');
   const meta=day.reminder.meta,prev=(base.entries[d]||{}).reminder;
   ent.reminder={id:(prev&&prev.id)||crypto.randomUUID(),title:day.reminder.title,at:meta[1],sound:meta[2]};
   if(meta[3]==='已提醒')ent.reminder.firedAt=(prev&&prev.firedAt)||new Date().toISOString();
  }
  entries[d]=ent;
 }
 return {state:migrate({...base,entries}),source:'阅读视图(v'+formatVersion+(formatVersion<4?' 正文优先':'')+')',changed:true};
}
function assertNotBlank(text){if(typeof text!=='string'||!text.trim())throw Error('文件内容为空，导入已取消');}
const api={defaults,validate,migrate,markdown,path,parse,faces,readView,importFile,mergeRestore};
if(typeof module==='object')module.exports=api;else root.ColorbarCore=api;

function moveBodies(raw){const s=structuredClone(raw);if(!Object.values(s.entries).some(e=>e.body))return s;let t=s.tags.find(t=>t.id==='thoughts')||s.tags.find(t=>t.name==='碎碎念'&&!t.parent);if(!t){t={id:'thoughts',name:'碎碎念',parent:null,color:'#bcb4d6',active:true};s.tags.push(t);}t.active=true;for(const e of Object.values(s.entries)){if(!e.body)continue;let i=e.items.find(i=>i.tagId===t.id);if(!i){i={tagId:t.id,color:t.color,value:'',records:[]};e.items.push(i);}if(!Array.isArray(i.records))i.records=i.value?[{id:crypto.randomUUID(),text:i.value,updatedAt:i.updatedAt||''}]:[];if(!i.records.some(r=>r.source==='legacy-day-body'&&r.text===e.body))i.records.push({id:crypto.randomUUID(),text:e.body,source:'legacy-day-body',updatedAt:e.bodyUpdatedAt||e.updatedAt||''});i.value=i.records.map(r=>r.text).join('\n\n');e.body='';}return validate(s);}

function cleanEmptyRecords(s){for(const e of Object.values(s.entries)){e.items=e.items.filter(i=>{if(!Array.isArray(i.records))return true;i.records=i.records.filter(r=>r.text.trim());i.value=i.records.map(r=>r.text).join('\n\n');return i.records.length>0||i.rating!==undefined;});}return validate(s);}

// Restore only missing calendar dates. Current dates/settings/tag definitions win.
function mergeRestore(text,current){
 const next=structuredClone(current);validate(next);
 let incoming;
 if(String(text).trimStart().startsWith('{'))incoming=migrate(parse(text));
 else if(readView(text).formatVersion===4&&!Object.keys(readView(text).days).length){incoming=migrate(parse(text));incoming.entries={};}
 else incoming=importFile(text,current).state;
 const added=[],skipped=[],mapped=new Map();
 function mapTag(id){
  if(mapped.has(id))return mapped.get(id);
  const source=incoming.tags.find(t=>t.id===id);
  const parent=source.parent?mapTag(source.parent):null;
  let target=next.tags.find(t=>(t.parent||null)===parent&&t.name.trim()===source.name.trim());
  if(!target){target={...structuredClone(source),parent};if(next.tags.some(t=>t.id===target.id))target.id=crypto.randomUUID();next.tags.push(target);}
  mapped.set(id,target.id);return target.id;
 }
 for(const [date,entry] of Object.entries(incoming.entries)){
  if(Object.hasOwn(next.entries,date)){skipped.push(date);continue;}
  const copy=structuredClone(entry);
  for(const item of copy.items){item.tagId=mapTag(item.tagId);if(item.rating!==undefined&&item.tagId!=='health')throw Error('身心健康评分标签与当前标签冲突，请先统一标签名称后恢复');}
  if(copy.reminder&&Object.values(next.entries).some(e=>e.reminder?.id===copy.reminder.id))copy.reminder.id=crypto.randomUUID();
  next.entries[date]=copy;added.push(date);
 }
 validate(next);return {state:next,added,skipped,changed:added.length>0};
}

})(globalThis);
