import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {simpleSpec,simpleFields} from './simple-spec.mjs';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest]=await Promise.all([read('dist/cards.json'),read('dist/details.json'),read('tools/support-phase-4.json')]);
const ids=new Set(),names=new Set();
for(const row of manifest.cards){
 if(ids.has(row.id)||names.has(row.name))throw Error('追加リストが重複しています');ids.add(row.id);names.add(row.name);
 const d=details.cards.find(c=>c.id===row.id),f=d?.faces[0];
 if(!d||d.name!==row.name||row.source!==(d.detailSource||d.source)||!isDeepStrictEqual(row.fields,simpleFields(d))||!isDeepStrictEqual(row.spec,simpleSpec(d)))throw Error('公式情報と処理が一致しません：'+row.name);
 const old=data.cards.find(c=>c.id===row.id||c.name===row.name);if(old&&old.supportBatch!=='phase-4')throw Error('既存カードを上書きできません');
 const value={id:d.id,name:d.name,civ:f.civilizationText,civilizations:f.civilizations,manaValue:f.civilizations.length===5?0:1,type:'creature',cost:f.cost,power:Number(f.powerText),race:f.race,text:f.abilityText,source:row.source,limit:4,...row.spec,supportBatch:'phase-4',supportKind:Object.keys(row.spec).length?'effect':'vanilla'};
 if(old)data.cards[data.cards.indexOf(old)]=value;else data.cards.push(value);
}
const previous=data.supportExpansion;
if(previous.phase<=4){const history=previous.phase===4?previous.history:[...(previous.history||[]),{...previous,history:undefined}];
 data.supportExpansion={phase:4,checkedAt:manifest.checkedAt,baseCount:336,newEffectCards:manifest.cards.filter(r=>Object.keys(r.spec).length).length,newVanillaCards:manifest.cards.filter(r=>!Object.keys(r.spec).length).length,powerAttacker:manifest.cards.filter(r=>r.spec.attackBonus).length,shieldTrigger:manifest.cards.filter(r=>r.spec.trigger).length,totalCount:data.cards.length,history,ruleSource:manifest.rules,next:['進化の固有能力','置換・誘発効果の共通化','環境デッキの固有効果']};}
await writeFile(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({phase:4,added:manifest.cards.length,total:data.cards.length}));
