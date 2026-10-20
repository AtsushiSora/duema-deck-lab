import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {phase3Spec} from './phase3-spec.mjs';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest]=await Promise.all([read('dist/cards.json'),read('dist/details.json'),read('tools/support-phase-3.json')]);
const ids=new Set(),names=new Set();
for(const row of manifest.cards){
 if(ids.has(row.id)||names.has(row.name))throw Error('追加リストが重複しています');ids.add(row.id);names.add(row.name);
 const d=details.cards.find(c=>c.id===row.id),f=d?.faces[0];
 if(!d||d.name!==row.name||row.source!==(d.detailSource||d.source)||row.abilityText!==f.abilityText||!isDeepStrictEqual(row.spec,phase3Spec(d)))throw Error('能力文と処理が一致しません：'+row.name);
 const old=data.cards.find(c=>c.id===row.id||c.name===row.name);if(old&&old.supportBatch!=='phase-3')throw Error('既存カードを上書きできません');
 const value={id:d.id,name:d.name,civ:f.civilizationText,civilizations:f.civilizations,manaValue:f.civilizations.length===5?0:1,type:'creature',cost:f.cost,power:Number(f.powerText),race:f.race,text:f.abilityText,source:row.source,limit:4,...row.spec,supportBatch:'phase-3',supportKind:'effect'};
 if(old)data.cards[data.cards.indexOf(old)]=value;else data.cards.push(value);
}
const previous=data.supportExpansion,history=previous.phase===3?previous.history:[...(previous.history||[]),{...previous,history:undefined}];
data.supportExpansion={phase:3,checkedAt:manifest.checkedAt,baseCount:277,newEffectCards:manifest.cards.length,newVanillaCards:0,multicolor:manifest.cards.filter(r=>!r.spec.evolution).length,evolution:manifest.cards.filter(r=>r.spec.evolution).length,totalCount:data.cards.length,history,ruleSource:manifest.rules,next:['進化の固有能力','置換・誘発効果の共通化','環境デッキの固有効果']};
await writeFile(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({phase:3,added:manifest.cards.length,total:data.cards.length}));
