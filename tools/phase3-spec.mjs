import {keywordSpec} from './keyword-spec.mjs';
const conditions={
 'リキッド・ピープル':{race:'リキッド・ピープル'},'ビーストフォーク':{race:'ビーストフォーク'},'ヒューマノイド':{race:'ヒューマノイド'},'ガーディアン':{race:'ガーディアン'},'パラサイトワーム':{race:'パラサイトワーム'},'ドラゴン':{category:'ドラゴン'},'ハンター・クリーチャー':{race:'ハンター'},'水のクリーチャー':{civilization:'水'},'「ブロッカー」を持つクリーチャー':{blocker:true},
 '「サイバー」と種族にあるクリーチャーまたはオリジン':{any:[{category:'サイバー'},{race:'オリジン'}]},
 'ライトブリンガーまたはオリジン':{any:[{race:'ライトブリンガー'},{race:'オリジン'}]},
 'ファイアー・バードまたはオリジン':{any:[{race:'ファイアー・バード'},{race:'オリジン'}]},
 'パラサイトワームまたはオリジン':{any:[{race:'パラサイトワーム'},{race:'オリジン'}]},
 'ドリームメイトまたはオリジン':{any:[{race:'ドリームメイト'},{race:'オリジン'}]}
};
const entries={
 'dm02-s02':['このクリーチャーがバトルゾーンに出たとき、バトルゾーンにある「ブロッカー」を持つクリーチャーをすべて、持ち主の手札に戻す。','bounceBlockers'],
 'dm02-s05':['このクリーチャーがバトルゾーンに出たとき、自分の山札の一番上のカードを２枚表にして、自分のマナゾーンに置く。','ramp2']
};
export function phase3Spec(d){
 const f=d.faces[0];if(d.status!=='complete'||d.faces.length!==1||!['クリーチャー','進化クリーチャー'].includes(f.typeText)||f.missingFields.length||!/^\d+$/.test(f.powerText)||!Number.isSafeInteger(f.cost)||f.cost<1||!f.civilizations.length||f.civilizations.some(v=>!['光','水','闇','火','自然'].includes(v)))throw Error('共通処理の対象外です');
 let text=f.abilityText.replace(/マナゾーンに置く時、このカードはタップして置く。/g,'').trim(),evolution=null;
 if(f.typeText==='進化クリーチャー'){
  const m=text.match(/進化[ー―−－-]自分の([^\n。]+?)[１1]体の上に置く。/);
  if(!m||!conditions[m[1]])throw Error('進化条件が未対応です');evolution=conditions[m[1]];text=text.replace(m[0],'').trim();
 }
 let effect=null;if(entries[d.id]){const [sentence,id]=entries[d.id];if(!text.includes(sentence))throw Error('確認した出た時の効果と一致しません');text=text.replace(sentence,'').trim();effect=id;}
 const spec=text?keywordSpec(text):{};
 if(evolution)spec.evolution=structuredClone(evolution);
 if(effect)spec.effect=effect;
 return spec;
}
