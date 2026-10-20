import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest]=await Promise.all([read('dist/cards.json'),read('dist/details.json'),read('tools/support-phase-7.json')]);
const spec={costReduction:'ownFourDragonsMana3',speedAttacker:true,breaker:2,dragonEntryTap:true,attackDragonReveal:true};
if(manifest.cards.length!==1||manifest.cards[0].id!=='dm24ex2-019')throw Error('確認済みカード以外は追加できません');
for(const row of manifest.cards){
 const d=details.cards.find(c=>c.id===row.id),f=d?.faces[0];
 if(!d||d.status!=='complete'||d.faces.length!==1||d.name!==row.name||row.source!==(d.detailSource||d.source)||!isDeepStrictEqual(row.face,f)||!isDeepStrictEqual(row.spec,spec))throw Error('確認済みの公式情報・処理と一致しません');
 const old=data.cards.find(c=>c.id===row.id||c.name===row.name);if(old&&old.supportBatch!=='phase-7')throw Error('既存カードを上書きできません');
 const value={id:d.id,name:d.name,civ:f.civilizationText,civilizations:f.civilizations,manaValue:1,type:'creature',cost:f.cost,power:Number(f.powerText),race:f.race,text:f.abilityText,source:row.source,limit:4,...row.spec,supportBatch:'phase-7',supportKind:'effect'};
 if(old)data.cards[data.cards.indexOf(old)]=value;else data.cards.push(value);
}
const previous=data.supportExpansion;
if(previous.phase<=7){const history=previous.phase===7?previous.history:[...(previous.history||[]),{...previous,history:undefined}];data.supportExpansion={phase:7,checkedAt:manifest.checkedAt,baseCount:586,newEffectCards:1,newVanillaCards:0,totalCount:data.cards.length,history,ruleSource:manifest.rules,targetDeck:'env-gp2026-pinky',next:['環境デッキの残りの効果','デッキ単位の対戦検証','AIの戦略と分析の改善']};}
await writeFile(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({phase:7,added:1,total:data.cards.length}));
