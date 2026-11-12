import fs from 'node:fs';
import {standardCardSpec} from './standard-card-spec.mjs';
import {scanStandardCandidates} from './scan-standard-candidates.mjs';
import {nameKey} from '../dist/catalogue.js';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const data=read('../dist/cards.json'),details=read('../dist/details.json');
const progressFile='./card-support-progress.json',progressURL=new URL(progressFile,import.meta.url);
const previous=fs.existsSync(progressURL)?read(progressFile):{};
const names=new Set(data.cards.map(c=>nameKey(c.name)));
const uniqueDetails=[...new Map(details.cards.map(c=>[nameKey(c.name),c])).values()];
const pending=uniqueDetails.filter(c=>!names.has(nameKey(c.name))),reasons={},pendingByType={},examples={};
for(const row of pending){
 const type=row.faces?.[0]?.typeText||'不明';pendingByType[type]=(pendingByType[type]||0)+1;
 try{standardCardSpec(row,{phase:data.supportExpansion.phase});}catch(e){const reason=e.message.split(':')[0];reasons[reason]=(reasons[reason]||0)+1;if((examples[reason]||=[]).length<3)examples[reason].push({id:row.id,name:row.name});}
}
const scan=scanStandardCandidates(details.cards,data.cards,{phase:data.supportExpansion.phase});
const nextAbilityGroups=['G・ゼロ','シンカパワー','GR召喚','革命チェンジ','メクレイド','超魂','覚醒','龍解'].map(ability=>{const cards=pending.filter(r=>r.faces.some(f=>f.abilityText?.includes(ability)));return{ability,pendingNames:cards.length,examples:cards.slice(0,3).map(c=>({id:c.id,name:c.name}))};});
const report={checkedAt:new Date().toISOString().slice(0,10),catalogueNames:uniqueDetails.length,supportedNames:names.size,pendingNames:pending.length,phase:data.supportExpansion.phase,added:data.supportExpansion.newEffectCards+data.supportExpansion.newVanillaCards,readyForOfficialVerification:scan.candidates.map(c=>c.id),dependencyBlocked:scan.blocked,nextAbilityGroups,pendingByType,reasons,reasonExamples:examples};
for(const key of ['fullSuiteStatus','batchHistory','resume','registeredCardVerification'])if(previous[key]!==undefined)report[key]=previous[key];
fs.writeFileSync(progressURL,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({supported:report.supportedNames,pending:report.pendingNames,ready:scan.candidates.length,dependencyBlocked:scan.blocked.length}));
