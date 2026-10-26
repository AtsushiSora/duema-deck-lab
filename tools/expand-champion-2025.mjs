import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url))),manifest=read('./support-phase-63.json'),data=read('../dist/cards.json'),details=read('../dist/details.json');
for(const row of manifest.cards){
 const detail=details.cards.find(c=>c.id===row.id);assert.equal(detail?.name,row.name);assert.deepEqual(detail.faces,row.faces);
 const old=data.cards.find(c=>c.id===row.id||c.name===row.name);if(old&&old.supportBatch!=='phase-63')throw Error('既存の効果定義は上書きしません：'+row.name);
 const f=row.faces[0],value={id:row.id,name:row.name,civ:f.civilizationText,civilizations:f.civilizations.filter(c=>['光','水','闇','火','自然'].includes(c)),manaValue:1,type:f.typeText==='呪文'?'spell':f.typeText.includes('フィールド')?'field':'creature',cost:f.cost,power:parseInt(f.powerText,10)||0,race:f.race,text:row.faces.map(f=>f.abilityText).join('\n【呪文面】\n'),source:row.source,limit:4,...row.spec,supportBatch:'phase-63',supportKind:'effect'};
 if(old)data.cards[data.cards.indexOf(old)]=value;else data.cards.push(value);
}
const old=data.supportExpansion,history=[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<63);
data.supportExpansion={phase:63,checkedAt:manifest.checkedAt,baseCount:1234,newEffectCards:manifest.cards.length,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history};
assert.equal(data.cards.length,1234+manifest.cards.length);fs.writeFileSync(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log('Implemented champion 2025 '+manifest.cards.length+' card types; '+data.cards.length+' supported types.');
