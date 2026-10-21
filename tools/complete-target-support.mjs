import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest]=await Promise.all([read('dist/cards.json'),read('dist/details.json'),read('tools/support-phase-13.json')]);
const specs={"dm25rp4-DM1":{"neoEvolution":{"any":[{"civilization":"光"},{"civilization":"火"},{"civilization":"自然"}]},"gNeo":true,"dream":true,"ddd":{"cost":8,"attackDiscount":true},"breaker":3,"effect":"deployMulticolor7","multiAssault":true},"dm26rp1-S008":{"manaSummon":true,"machFighter":true,"breaker":4,"entryGate":true,"manaGuard":true},"dmrp15-km1":{"mugenCrime":4,"breaker":"∞","blocker":true,"ignoreSmall":true}};
if(manifest.cards.length!==3||new Set(manifest.cards.map(x=>x.id)).size!==3||manifest.cards.some(x=>!specs[x.id]))throw Error('確認済みカード以外は追加できません');
for(const row of manifest.cards){
 const spec=specs[row.id];
 const d=details.cards.find(c=>c.id===row.id),f=d?.faces[0];
 if(!d||d.status!=='complete'||d.faces.length!==1||d.name!==row.name||row.source!==(d.detailSource||d.source)||!isDeepStrictEqual(row.face,f)||!isDeepStrictEqual(row.spec,spec))throw Error('確認済みの公式情報・処理と一致しません');
 const old=data.cards.find(c=>c.id===row.id||c.name===row.name);if(old&&old.supportBatch!=='phase-13')throw Error('既存カードを上書きできません');
 const value={id:d.id,name:d.name,civ:f.civilizationText,civilizations:f.civilizations,manaValue:1,type:'creature',cost:f.costText==='∞'?'∞':f.cost,power:f.powerText==='∞'?'∞':Number(f.powerText),race:f.race,text:f.abilityText,source:row.source,limit:4,...row.spec,supportBatch:'phase-13',supportKind:'effect'};
 if(old)data.cards[data.cards.indexOf(old)]=value;else data.cards.push(value);
}
const previous=data.supportExpansion;
if(previous.phase<=13){const history=previous.phase===13?previous.history:[...(previous.history||[]),{...previous,history:undefined}];data.supportExpansion={phase:13,checkedAt:manifest.checkedAt,baseCount:592,newEffectCards:3,newVanillaCards:0,totalCount:data.cards.length,history,ruleSource:manifest.rules,targetDeck:'env-gp2026-pinky',next:['AIの戦略と分析の改善','手動対戦UIの改善']};}
await writeFile(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({phase:13,added:3,total:data.cards.length}));
