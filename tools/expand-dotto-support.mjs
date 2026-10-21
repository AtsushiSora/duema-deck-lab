import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [data,details,manifest]=await Promise.all(['dist/cards.json','dist/details.json','tools/support-phase-14.json'].map(read));
const specs={
 'dmex17-021':{breaker:2,effect:'draw2',gaia:true},
 'dmbd16-009':{breaker:2,effect:'superheroSweep',spellFace:{name:'超英雄タイム',type:'spell',civ:'火',civilizations:['火'],cost:2,effect:'destroyBattleCard3'}}
};
if(manifest.cards.length!==2||new Set(manifest.cards.map(x=>x.id)).size!==2)throw Error('確認した2種類だけを追加できます');
for(const row of manifest.cards){
 const d=details.cards.find(x=>x.id===row.id),spec=specs[row.id],f=d?.faces[0];
 if(!spec||!d||d.status!=='complete'||row.name!==d.name||row.source!==(d.detailSource||d.source)||!isDeepStrictEqual(row.faces,d.faces)||!isDeepStrictEqual(row.spec,spec))throw Error('確認済みの公式情報・処理と一致しません');
 const old=data.cards.find(x=>x.id===row.id||x.name===row.name);if(old&&old.supportBatch!=='phase-14')throw Error('既存カードを上書きできません');
 const value={id:d.id,name:d.name,civ:f.civilizationText,civilizations:f.civilizations,manaValue:1,type:'creature',cost:f.cost,power:Number(f.powerText),race:f.race,text:d.faces.map(x=>x.abilityText).join('\n【呪文側】\n'),source:row.source,limit:4,...spec,supportBatch:'phase-14',supportKind:'effect'};
 if(old)data.cards[data.cards.indexOf(old)]=value;else data.cards.push(value);
}
const previous=data.supportExpansion;
if(previous.phase<=14)data.supportExpansion={phase:14,checkedAt:manifest.checkedAt,baseCount:595,newEffectCards:2,newVanillaCards:0,totalCount:data.cards.length,history:previous.phase===14?previous.history:[...(previous.history||[]),{...previous,history:undefined}],ruleSource:manifest.rules,targetDeck:'env-nationals2025-dotto',next:['光水闇邪眼帝の効果対応','バイケンの効果対応']};
await writeFile(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({phase:14,added:2,total:data.cards.length}));
