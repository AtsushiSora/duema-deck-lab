import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest]=await Promise.all([read('dist/cards.json'),read('dist/details.json'),read('tools/support-phase-9.json')]);
const spec={"effect":"shieldTop1","shieldEntryTapLock":true,"zRush":true,"hyper":{"power":7500,"blocker":true,"breaker":2,"spellLockMaxCost":5}};
if(manifest.cards.length!==1||manifest.cards[0].id!=='dm26rp1-S002')throw Error('確認済みカード以外は追加できません');
for(const row of manifest.cards){
 const d=details.cards.find(c=>c.id===row.id),f=d?.faces[0];
 if(!d||d.status!=='complete'||d.faces.length!==2||d.name!==row.name||row.source!==(d.detailSource||d.source)||!isDeepStrictEqual(row.faces,d.faces)||!isDeepStrictEqual(row.spec,spec))throw Error('確認済みの公式情報・処理と一致しません');
 const old=data.cards.find(c=>c.id===row.id||c.name===row.name);if(old&&old.supportBatch!=='phase-9')throw Error('既存カードを上書きできません');
 const value={id:d.id,name:d.name,civ:f.civilizationText,civilizations:f.civilizations,manaValue:1,type:'creature',cost:f.cost,power:Number(f.powerText),race:f.race,text:d.faces.map(f=>f.abilityText).join("\n【ハイパーモード】\n"),source:row.source,limit:4,...row.spec,supportBatch:'phase-9',supportKind:'effect'};
 if(old)data.cards[data.cards.indexOf(old)]=value;else data.cards.push(value);
}
const previous=data.supportExpansion;
if(previous.phase<=9){const history=previous.phase===9?previous.history:[...(previous.history||[]),{...previous,history:undefined}];data.supportExpansion={phase:9,checkedAt:manifest.checkedAt,baseCount:588,newEffectCards:1,newVanillaCards:0,totalCount:data.cards.length,history,ruleSource:manifest.rules,targetDeck:'env-gp2026-pinky',next:['環境デッキの残りの効果','デッキ単位の対戦検証','AIの戦略と分析の改善']};}
await writeFile(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({phase:9,added:1,total:data.cards.length}));
