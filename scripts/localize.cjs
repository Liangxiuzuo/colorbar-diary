const fs=require('fs'),path=require('path');
const pairs=fs.readFileSync(path.join(__dirname,'../public/translations.txt'),'utf8').replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.includes('|')).map(x=>{const i=x.indexOf('|');return [x.slice(0,i),x.slice(i+1)]}).sort((a,b)=>b[0].length-a[0].length);
const dict=new Map(pairs),pattern=new RegExp(pairs.map(([x])=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
function english(s){s=s.replace("['一','二','三','四','五','六','日']","['Mon','Tue','Wed','Thu','Fri','Sat','Sun']").replaceAll("['一','二','三','四','五','六','日']","['Mon','Tue','Wed','Thu','Fri','Sat','Sun']").replaceAll("'日一二三四五六'[d.getDay()]","['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]");
 return s.replace(pattern,x=>dict.get(x)).replaceAll('lang="zh-CN"','lang="en"').replaceAll("'zh-CN'","'en-US'").replaceAll(' · 星期',' · ').replaceAll(' 年 ',' / ').replaceAll(' 月 ',' / ').replaceAll(' 年','').replaceAll(' 月','').replaceAll(' 日','');}
module.exports={english,pairs};
