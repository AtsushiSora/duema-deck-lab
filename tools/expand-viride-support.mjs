import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url)));
const data=read('../dist/cards.json'),details=read('../dist/details.json'),manifest=read('./support-phase-42.json');
for(const row of manifest.cards){
 const detail=details.cards.find(x=>x.id===row.id);assert.equal(detail.name,row.name);assert.deepEqual(detail.faces,row.faces);
 const old=data.cards.find(x=>x.id===row.id||x.name===row.name);if(old&&old.supportBatch!=='phase-42')throw Error('既存カードを上書きできません');
 const f=row.faces[0],value={id:row.id,name:row.name,civ:f.civilizationText,civilizations:f.civilizations,manaValue:1,type:f.typeText==='G城'?'castle':'creature',cost:f.cost,power:parseInt(f.powerText,10)||0,race:f.race,text:f.abilityText,source:row.source,limit:4,...row.spec,supportBatch:'phase-42',supportKind:'effect'};
 if(old)Object.assign(old,value);else data.cards.push(value);
}
const current=data.supportExpansion,history=[...(current.history||[]),Object.fromEntries(Object.entries(current).filter(([k])=>k!=='history'))].filter(x=>x.phase<42);
data.supportExpansion={phase:42,checkedAt:manifest.checkedAt,baseCount:884,newEffectCards:10,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,targetDeck:manifest.targetDeck,next:['対応済みカードの対戦検証と改善'],history};
assert.equal(data.cards.length,894);fs.writeFileSync(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log('894 effect-supported cards; white-green Viride practice deck.');
