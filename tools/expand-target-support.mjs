import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest]=await Promise.all([read('dist/cards.json'),read('dist/details.json'),read('tools/support-phase-5.json')]);
const specs={
 'dmx11-012':{effect:'dragonRamp2'},
 'dm23bd4-008':{effect:'ramp2Return1'},
 'dm25sp2-014':{blocker:true,effect:'optionalRamp4Return2'},
 'sp-020':{evolution:{category:'ドラゴン'},breaker:3,effect:'purgeNonDragonMana'}
};
if(manifest.cards.length!==Object.keys(specs).length||new Set(manifest.cards.map(c=>c.id)).size!==manifest.cards.length)throw Error('追加リストが一致しません');
for(const row of manifest.cards){
 const d=details.cards.find(c=>c.id===row.id),f=d?.faces[0];
 if(!specs[row.id]||!d||d.status!=='complete'||d.faces.length!==1||d.name!==row.name||row.source!==(d.detailSource||d.source)||!isDeepStrictEqual(row.face,f)||!isDeepStrictEqual(row.spec,specs[row.id]))throw Error('確認済みの公式情報・処理と一致しません：'+row.name);
 const old=data.cards.find(c=>c.id===row.id||c.name===row.name);if(old&&old.supportBatch!=='phase-5')throw Error('既存カードを上書きできません');
 const value={id:d.id,name:d.name,civ:f.civilizationText,civilizations:f.civilizations,manaValue:1,type:f.typeText==='呪文'?'spell':'creature',cost:f.cost,power:f.typeText==='呪文'?0:Number(f.powerText),race:f.race,text:f.abilityText,source:row.source,limit:4,...row.spec,supportBatch:'phase-5',supportKind:'effect'};
 if(old)data.cards[data.cards.indexOf(old)]=value;else data.cards.push(value);
}
const previous=data.supportExpansion;
if(previous.phase<=5){const history=previous.phase===5?previous.history:[...(previous.history||[]),{...previous,history:undefined}];data.supportExpansion={phase:5,checkedAt:manifest.checkedAt,baseCount:581,newEffectCards:4,newVanillaCards:0,totalCount:data.cards.length,history,ruleSource:manifest.rules,targetDeck:'env-gp2026-pinky',next:['環境デッキの残りの効果','デッキ単位の対戦検証','AIの戦略と分析の改善']};}
await writeFile(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({phase:5,added:4,total:data.cards.length}));
