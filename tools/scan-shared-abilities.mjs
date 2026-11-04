// Discovery only: report missing clauses that could unlock several complete cards.
// This never edits card definitions or claims that a candidate is battle-ready.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {standardCardSpec} from './standard-card-spec.mjs';
import {nameKey} from '../dist/catalogue.js';
export function discoverAbilityBatches(details,supported,{phase,maxLines=6}={}){
 if(!Number.isSafeInteger(phase)||phase<165)throw Error('有効な対応段階を指定してください');
 const known=new Set(supported.map(c=>nameKey(c.name))),groups=new Map();
 for(const row of details){
  if(known.has(nameKey(row.name))||row.faces?.length!==1)continue;
  const lines=row.faces[0].abilityText.split('\n').filter(s=>s.trim());if(lines.length>maxLines)continue;
  for(let i=0;i<lines.length;i++){
   const copy=structuredClone(row);copy.faces[0].abilityText=lines.filter((_,j)=>j!==i).join('\n');
   try{standardCardSpec(copy,{phase});}catch{continue;}
   const clause=lines[i],key=clause.normalize('NFKC').replace(/\d+/g,'#').slice(0,37);
   if(!groups.has(key))groups.set(key,new Map());groups.get(key).set(row.id,{id:row.id,name:row.name,source:row.detailSource||row.source,clause});
  }
 }
 return [...groups].map(([pattern,cards])=>({pattern,count:cards.size,cards:[...cards.values()]})).sort((a,b)=>b.count-a.count||a.pattern.localeCompare(b.pattern,'ja'));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8')),data=read('../dist/cards.json'),details=read('../dist/details.json');
 const limit=Number(process.argv.find(x=>x.startsWith('--limit='))?.slice(8)||20);if(!Number.isSafeInteger(limit)||limit<1)throw Error('件数は正の整数にしてください');
 const groups=discoverAbilityBatches(details.cards,data.cards,{phase:data.supportExpansion.phase});
 console.log(JSON.stringify({phase:data.supportExpansion.phase,requiresOfficialVerification:true,groups:groups.slice(0,limit)},null,2));
}
