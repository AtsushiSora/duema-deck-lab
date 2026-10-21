import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest]=await Promise.all([read('dist/cards.json'),read('dist/details.json'),read('tools/support-phase-11.json')]);
const spec={"speedAttacker":true,"attackJudge":true,"spellFace":{"name":"オールイン・チャージャー","type":"spell","civ":"火","civilizations":["火"],"cost":3,"text":"相手とガチンコ・ジャッジする。自分が勝ったら、カードを１枚引く。\nチャージャー（この呪文を唱えた後、墓地に置くかわりにマナゾーンに置く）","effect":"judgeDraw","charger":true}};
if(manifest.cards.length!==1||manifest.cards[0].id!=='dm22ex1-030')throw Error('確認済みカード以外は追加できません');
for(const row of manifest.cards){
 const d=details.cards.find(c=>c.id===row.id),f=d?.faces[0];
 if(!d||d.status!=='complete'||d.faces.length!==2||d.name!==row.name||row.source!==(d.detailSource||d.source)||!isDeepStrictEqual(row.faces,d.faces)||!isDeepStrictEqual(row.spec,spec))throw Error('確認済みの公式情報・処理と一致しません');
 const old=data.cards.find(c=>c.id===row.id||c.name===row.name);if(old&&old.supportBatch!=='phase-11')throw Error('既存カードを上書きできません');
 const value={id:d.id,name:d.name,civ:f.civilizationText,civilizations:f.civilizations,manaValue:1,type:'creature',cost:f.cost,power:Number(f.powerText),race:f.race,text:d.faces.map(f=>f.abilityText).join("\n【呪文側】\n"),source:row.source,limit:4,...row.spec,supportBatch:'phase-11',supportKind:'effect'};
 if(old)data.cards[data.cards.indexOf(old)]=value;else data.cards.push(value);
}
const previous=data.supportExpansion;
if(previous.phase<=11){const history=previous.phase===11?previous.history:[...(previous.history||[]),{...previous,history:undefined}];data.supportExpansion={phase:11,checkedAt:manifest.checkedAt,baseCount:590,newEffectCards:1,newVanillaCards:0,totalCount:data.cards.length,history,ruleSource:manifest.rules,targetDeck:'env-gp2026-pinky',next:['環境デッキの残りの効果','デッキ単位の対戦検証','AIの戦略と分析の改善']};}
await writeFile(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({phase:11,added:1,total:data.cards.length}));
