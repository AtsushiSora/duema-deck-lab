import {keywordSpec} from './keyword-spec.mjs';
// Build-time verification only. Runtime support comes solely from the reviewed, pinned manifest.
export function simpleSpec(d){
 const f=d?.faces?.[0],colors=['光','水','闇','火','自然'];
 if(d?.status!=='complete'||d.faces.length!==1||f.typeText!=='クリーチャー'||!Number.isInteger(f.cost)||f.cost<1||!/^\d+$/.test(f.powerText)||!f.civilizations.length||f.civilizations.some(c=>!colors.includes(c))||new Set(f.civilizations).size!==f.civilizations.length)throw Error('通常の有色クリーチャーではありません');
 let text=f.abilityText.replace(/[（(][^）)]*[）)]/g,'').replace(/[■\s]/g,'');
 if(f.civilizations.length>1)text=text.replace('マナゾーンに置く時、このカードはタップして置く。','');
 const spec={},bonuses=[...text.matchAll(/パワーアタッカー[+＋]([0-9０-９]+)/g)];
 if(bonuses.length>1)throw Error('複数のパワーアタッカーは対象外です');
 if(bonuses.length){spec.attackBonus=Number(bonuses[0][1].normalize('NFKC'));if(!Number.isSafeInteger(spec.attackBonus)||spec.attackBonus<1)throw Error('パワーが不正です');text=text.replace(bonuses[0][0],'');}
 if(text.includes('S・トリガー')){spec.trigger=true;text=text.replaceAll('S・トリガー','');}
 if(text)Object.assign(spec,keywordSpec(text));
 return spec;
}
export function simpleFields(d){const f=d.faces[0];return{typeText:f.typeText,civilizations:f.civilizations,cost:f.cost,powerText:f.powerText,race:f.race,abilityText:f.abilityText};}
