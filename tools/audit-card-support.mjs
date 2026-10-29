import fs from 'node:fs';
import {standardCardSpec} from './standard-card-spec.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const data=read('../dist/cards.json'),details=read('../dist/details.json'),names=new Set(data.cards.map(c=>c.name));
const pending=details.cards.filter(c=>!names.has(c.name)),reasons={},pendingByType={},ready=[];
for(const row of pending){const type=row.faces?.[0]?.typeText||'不明';pendingByType[type]=(pendingByType[type]||0)+1;try{standardCardSpec(row,{phase:data.supportExpansion.phase});ready.push(row.id);}catch(e){const key=e.message.split(':')[0];reasons[key]=(reasons[key]||0)+1;}}
const report={checkedAt:new Date().toISOString().slice(0,10),catalogueNames:details.cards.length,supportedNames:data.cards.length,pendingNames:pending.length,phase:data.supportExpansion.phase,added:data.supportExpansion.newEffectCards+data.supportExpansion.newVanillaCards,readyForOfficialVerification:ready,pendingByType,reasons};
fs.writeFileSync(new URL('./card-support-progress.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({supported:report.supportedNames,pending:report.pendingNames,ready:ready.length}));
