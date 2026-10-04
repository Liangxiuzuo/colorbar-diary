(function(root){
 const marker='<!-- COLORBAR-DIARY-DATA-V3 -->';
 function parse(text){
  text=text.replace(/\r\n/g,'\n');if(text.trimStart().startsWith('{'))return JSON.parse(text);
  const at=text.lastIndexOf('\n'+marker+'\n');if(at<0)throw Error('此 Markdown 不含完整备份数据，请使用新版完整导出文件');
  const tail=text.slice(at+marker.length+2),match=tail.match(/^(`{3,})json\n([\s\S]*?)\n\1\s*$/);
  if(!match)throw Error('Markdown 备份数据区损坏');return JSON.parse(match[2]);
 }
 
 function deleteTagState(raw,id,destination){const s=structuredClone(raw),t=s.tags.find(t=>t.id===id),target=s.tags.find(t=>t.id===destination);if(!t)throw Error('标签不存在');if(s.tags.length<2)throw Error('请至少保留一个标签');const used=Object.values(s.entries).some(e=>e.items.some(i=>i.tagId===id));if(used&&(!target||target.id===id))throw Error('请选择接收记录的标签');const children=s.tags.filter(t=>t.parent===id);for(const child of children)if(s.tags.some(x=>x.id!==id&&x.id!==child.id&&!x.parent&&x.name===child.name))throw Error('子标签“'+child.name+'”与一级标签重名，请先改名再删除');
 const previousPath=t.parent?s.tags.find(p=>p.id===t.parent).name+' / '+t.name:t.name;
 s.tagDeletionHistory=s.tagDeletionHistory||[];s.tagDeletionHistory.push({tag:structuredClone(t),children:children.map(t=>structuredClone(t)),deletedAt:new Date().toISOString(),destination,entries:Object.fromEntries(Object.entries(s.entries).filter(([,e])=>e.items.some(i=>i.tagId===id)).map(([d,e])=>[d,structuredClone(e.items.find(i=>i.tagId===id))]))});
 for(const e of Object.values(s.entries)){const old=e.items.find(i=>i.tagId===id);if(!old)continue;let dest=e.items.find(i=>i.tagId===destination);if(!dest){dest={tagId:destination,color:target.color,value:'',records:[]};e.items.push(dest);}if(!Array.isArray(dest.records))dest.records=dest.value?[{id:crypto.randomUUID(),text:dest.value,updatedAt:dest.updatedAt||''}]:[];const records=Array.isArray(old.records)&&old.records.length?old.records:[{text:old.value||'（仅颜色记录）',updatedAt:old.updatedAt||''}];for(const r of records)dest.records.push({...r,id:crypto.randomUUID(),text:'【原标签：'+previousPath+'】\n'+r.text+(old.rating?'\n原身心健康评分：'+old.rating+'/5':''),sourceTagId:id});dest.value=dest.records.map(r=>r.text).join('\n\n');e.items=e.items.filter(i=>i.tagId!==id);}
 for(const child of children)child.parent=null;s.tags=s.tags.filter(t=>t.id!==id);return s;
 }
 // 阅读视图反向解析：文本 → {formatVersion, days{日期:{nodes[{path,color,rating,texts}],reminder}}}
 // 规则：同一标签下「一个 ```markdown 块 = 一条记录」；### 当天正文 归入碎碎念；遇到文末数据区标题即停。
 function readView(text){
  text=String(text).replace(/\r\n/g,'\n');
  const formatVersion=Number((text.match(/^导出格式版本：(\d+)/m)||[])[1]||0);
  const days={};let date=null,kind=null,pathName=null,color=null,rating,texts=[],rem=null,fence=null,buf=null;
  const flushNode=()=>{if(date){if(kind==='reminder'&&rem)days[date].reminder=rem;else if(kind==='tag'&&pathName!==null)days[date].nodes.push({path:pathName,color,rating,texts});}texts=[];color=null;rating=undefined;rem=null;kind=null;pathName=null;};
  for(const line of text.split('\n')){
   if(buf!==null){if(line===fence){if(kind==='reminder')rem.title=buf.join('\n');else texts.push(buf.join('\n'));buf=null;}else buf.push(line);continue;}
   if(/^## 完整恢复数据\s*$/.test(line)){flushNode();date=null;break;}
   let m;
   if((m=line.match(/^## (\d{4}-\d{2}-\d{2})\s*$/))){flushNode();date=m[1];days[date]={nodes:[],reminder:null};continue;}
   if((m=line.match(/^### (.+?)\s*$/))){flushNode();const name=m[1];
    if(name==='当天正文'){kind='tag';pathName='碎碎念';}
    else if(/^⏰/.test(name)){kind='reminder';pathName=null;rem={title:'',meta:null};}
    else{kind='tag';pathName=name;}
    continue;}
   if(!date)continue;
   if(kind==='tag'){
    if((m=line.match(/^颜色：(#[0-9a-f]{6})(?:；身心状态：\S+（([1-5])\/5）)?\s*$/i))){color=m[1].toLowerCase();if(m[2])rating=Number(m[2]);continue;}
    if((m=line.match(/^(`{3,})markdown\s*$/))){fence=m[1];buf=[];continue;}
   }else if(kind==='reminder'){
    if((m=line.match(/^提醒时间：([^；]+)；声音：(chime|beep)（5 秒）；(已提醒|待提醒)/))){rem.meta=m;continue;}
    if((m=line.match(/^(`{3,})markdown\s*$/))){fence=m[1];buf=[];continue;}
   }
  }
  if(buf!==null)throw Error('Markdown 记录代码块未闭合，请补全结束围栏');
  flushNode();
  return {formatVersion,days};
 }
if(typeof module==='object')module.exports={parse,marker,readView,deleteTagState};else {root.ColorbarArchive={parse,marker,readView};root.deleteTagState=deleteTagState;}
})(globalThis);
