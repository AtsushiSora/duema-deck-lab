export const ORIGINAL='original', ADVANCE='advance';
export const deckFormat=deck=>deck?.format||ORIGINAL;
export const formatLabel=format=>format===ADVANCE?'アドバンス':'オリジナル';
export const sameDeckFormat=(first,second)=>deckFormat(first)===deckFormat(second);

export const EXTRA_DECK_ZONES=Object.freeze({
 extraCards:{label:'超次元ゾーン',max:8,copies:4},
 grCards:{label:'超GRゾーン',max:12,copies:2},
 startCards:{label:'対戦開始時カード',max:1,copies:1}
});
export const extraDeckKeys=Object.keys(EXTRA_DECK_ZONES);
export const extraDeckZone=card=>card?.psychic||card?.dragheart?'extraCards':card?.gr?'grCards':card?.startCard?'startCards':null;
export function copyExtraDeck(deck,copy){
 return Object.fromEntries(extraDeckKeys.filter(key=>deck[key]?.length).map(key=>[key,copy(deck[key])]));
}

export function extraDeckErrors(deck,get){
 const format=deckFormat(deck),rows=deck?.extraCards??[];
 if(![ORIGINAL,ADVANCE].includes(format))return ['対戦フォーマットが正しくありません'];
 if(!Array.isArray(rows)||rows.length>8)return ['超次元ゾーンは最大8枚です'];
 if(format===ORIGINAL&&rows.length)return ['オリジナルでは超次元ゾーンの初期カードを設定できません'];
 const errors=extraZoneErrors(rows,'extraCards',get);
 for(const key of ['grCards','startCards']){
  const list=deck?.[key]??[];
  if(Array.isArray(list)&&!list.length)continue;
  if(format===ORIGINAL){errors.push('オリジナルでは'+EXTRA_DECK_ZONES[key].label+'を設定できません');continue;}
  errors.push(...extraZoneErrors(list,key,get));
 }
 return [...new Set(errors)];
}

function extraZoneErrors(rows,key,get){
 const {label,max,copies}=EXTRA_DECK_ZONES[key];
 if(!Array.isArray(rows)||rows.length>max)return [label+'は最大'+max+'枚です'];
 const counts=new Map(),errors=[];
 let total=0;
 for(const row of rows){
  if(!row||typeof row.id!=='string'||!Number.isSafeInteger(row.count)||row.count<1||row.count>max)
   return [label+'のカードの枚数が正しくありません'];
  total+=row.count;
  const c=get(row.id);
  if(extraDeckZone(c)!==key)errors.push(label+'に設定できる対戦対応カードを選んでください');
  else {const entry=counts.get(c.name)||{card:c,count:0};entry.count+=row.count;counts.set(c.name,entry);}
 }
 if(total>max)errors.push(label+'は最大'+max+'枚です');
 if(key==='grCards'&&total>0&&total<max)errors.push('超GRゾーンを使う場合は12枚必要です');
 for(const {card,count} of counts.values()){
  const limit=Math.min(card.grCopyLimit??copies,card.limit??copies);
  if(count>limit)errors.push(card.name+'は'+limit+'枚までです');
 }
 return [...new Set(errors)];
}
