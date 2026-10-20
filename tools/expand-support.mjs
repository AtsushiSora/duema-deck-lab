// Explicitly reviewed first expansion. Never infer arbitrary effects from ability prose.
import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const data=await read('dist/cards.json'),details=await read('dist/details.json');
const reviewedVanillas=['dm06-083','dm34-052','dm39-043','dm10-098','dm06-107','dm02-041','dm36-084','dm19-089','dm36-063','dm34-024','dm21-053','dm06-100','dm01-066','dm10-106','dm06-081','dm19-106','dm17-048','dm06-092','dm01-036','dm06-067','dm06-104','dm28-073','dm08-049','dm24-088','dm36-087','dm14-105','dm01-012','dm17-036','dm15-036','dm02-038','dm16-050','dm36-098','dm31-040','dm38-054','dm01-072','dm36-075','dm06-075','dm10-087','dm33-037','dm03-048','dm32-094','dm03-027','dm19-084','dm35-054','dm10-076','dm06-074','dm19-109','dm28-106','dm19-074','dm32-106','dm06-089'];
// The alternate printed name 炎のたてがみ(バーニング・ヘアー) is deliberately excluded.
const effects={
 'フェアリー・ライフ':{effect:'ramp1',trigger:true},
 'エナジー・ライト':{effect:'draw2'},
 'デーモン・ハンド':{effect:'destroy',trigger:true},
 'ナチュラル・トラップ':{effect:'manaRemoval',trigger:true},
 'ホーリー・スパーク':{effect:'tapAll',trigger:true},
 'アクア・サーファー':{effect:'bounceOptional',trigger:true},
 'スパイラル・スライダー':{effect:'bounceSmall',trigger:true},
 'ロスト・ソウル':{effect:'discardAll'},
 '解体屋ピーカプ':{speedAttacker:true}
};
const byId=new Map(details.cards.map(c=>[c.id,c])),byName=new Map(details.cards.map(c=>[c.name,c]));
const specifications=[...reviewedVanillas.map(id=>({data:byId.get(id),spec:{},kind:'vanilla'})),...Object.entries(effects).map(([name,spec])=>({data:byName.get(name),spec,kind:'effect'}))];
for(const {data:d,spec,kind} of specifications){
 if(!d||d.status!=='complete'||d.faces.length!==1)throw Error('詳細情報が未確認です：'+d?.name);
 const f=d.faces[0];
 if(!['クリーチャー','呪文'].includes(f.typeText)||f.civilizations.length!==1||!['光','水','闇','火','自然'].includes(f.civilizations[0])||!Number.isSafeInteger(f.cost)||f.cost<1||f.missingFields.length)throw Error('共通ルールで扱えないカードです：'+d.name);
 if(kind==='vanilla'&&(f.typeText!=='クリーチャー'||f.abilityText))throw Error('能力なしの確認と一致しません：'+d.name);
 if(f.typeText==='クリーチャー'&&!/^\d+$/.test(f.powerText))throw Error('数値パワーを確認できません：'+d.name);
 const value={id:d.id,name:d.name,civ:f.civilizations[0],type:f.typeText==='呪文'?'spell':'creature',cost:f.cost,power:f.typeText==='クリーチャー'?Number(f.powerText):0,race:f.race,text:f.abilityText||'能力なし',source:d.detailSource||d.source,limit:4,...spec,supportBatch:'phase-1',supportKind:kind};
 const i=data.cards.findIndex(c=>c.id===value.id||c.name===value.name);if(i>=0)data.cards[i]=value;else data.cards.push(value);
}
// This set contains no restricted cards; live restriction updates still require a separate review.
if((data.supportExpansion?.phase||0)<2)data.supportExpansion={phase:1,checkedAt:'2026-10-20',baseCount:44,newEffectCards:9,newVanillaCards:51,totalCount:data.cards.length,next:['複数ブレイク','多色・進化','置換・誘発効果の共通化','環境デッキの固有効果']};
await writeFile(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data.supportExpansion));
