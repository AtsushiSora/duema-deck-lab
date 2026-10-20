import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {keywordSpec} from './keyword-spec.mjs';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest]=await Promise.all([read('dist/cards.json'),read('dist/details.json'),read('tools/support-phase-2.json')]);
const ids=new Set(),names=new Set();
for(const row of manifest.cards){
 if(ids.has(row.id)||names.has(row.name))throw Error('追加リストの重複です');ids.add(row.id);names.add(row.name);
 const d=details.cards.find(c=>c.id===row.id),f=d?.faces[0];
 if(!d||d.name!==row.name||d.status!=='complete'||d.faces.length!==1||f.missingFields.length||f.typeText!=='クリーチャー'||f.civilizations.length!==1||!['光','水','闇','火','自然'].includes(f.civilizations[0])||!Number.isSafeInteger(f.cost)||f.cost<1||!/^\d+$/.test(f.powerText))throw Error('通常単色クリーチャーとして確認できません：'+row.name);
 if(row.source!==(d.detailSource||d.source)||row.abilityText!==f.abilityText||!isDeepStrictEqual(row.spec,keywordSpec(f.abilityText)))throw Error('確認済みの能力文と処理が一致しません：'+row.name);
 const old=data.cards.find(c=>c.id===row.id||c.name===row.name);
 if(old&&old.supportBatch!=='phase-2')throw Error('既存カードを上書きできません：'+row.name);
 const value={id:d.id,name:d.name,civ:f.civilizations[0],type:'creature',cost:f.cost,power:Number(f.powerText),race:f.race,text:f.abilityText,source:row.source,limit:4,...row.spec,supportBatch:'phase-2',supportKind:'effect'};
 if(old)data.cards[data.cards.indexOf(old)]=value;else data.cards.push(value);
}
const history=data.supportExpansion.phase===2?data.supportExpansion.history:[data.supportExpansion];
data.supportExpansion={phase:2,checkedAt:manifest.checkedAt,baseCount:104,newEffectCards:manifest.cards.length,newVanillaCards:0,totalCount:data.cards.length,history,ruleSource:manifest.rules,next:['多色・進化','置換・誘発効果の共通化','環境デッキの固有効果']};
await writeFile(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({phase:2,added:manifest.cards.length,total:data.cards.length}));
