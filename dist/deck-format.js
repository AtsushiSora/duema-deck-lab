export const ORIGINAL='original', ADVANCE='advance';
export const deckFormat=deck=>deck?.format||ORIGINAL;
export const formatLabel=format=>format===ADVANCE?'アドバンス（超次元のみ対応）':'オリジナル';
export const sameDeckFormat=(first,second)=>deckFormat(first)===deckFormat(second);

export function extraDeckErrors(deck,get){
 const format=deckFormat(deck),rows=deck?.extraCards??[];
 if(![ORIGINAL,ADVANCE].includes(format))return ['対戦フォーマットが正しくありません'];
 if(!Array.isArray(rows)||rows.length>8)return ['超次元ゾーンは最大8枚です'];
 if(format===ORIGINAL&&rows.length)return ['オリジナルでは超次元ゾーンの初期カードを設定できません'];
 if(['grCards','startCards'].some(key=>deck?.[key]!=null&&(!Array.isArray(deck[key])||deck[key].length)))
  return ['この版のアドバンスで設定できる追加ゾーンは超次元のみです'];
 const counts=new Map(),errors=[];
 let total=0;
 for(const row of rows){
  if(!row||typeof row.id!=='string'||!Number.isSafeInteger(row.count)||row.count<1||row.count>8)
   return ['超次元ゾーンのカードの枚数が正しくありません'];
  total+=row.count;
  const c=get(row.id);
  if(!c?.psychic)errors.push('超次元ゾーンに設定できる対戦対応カードを選んでください');
  else counts.set(c,(counts.get(c)||0)+row.count);
 }
 if(total>8)errors.push('超次元ゾーンは最大8枚です');
 for(const [c,count] of counts)if(count>Math.min(4,c.limit??4))errors.push(c.name+'は'+Math.min(4,c.limit??4)+'枚までです');
 return [...new Set(errors)];
}
