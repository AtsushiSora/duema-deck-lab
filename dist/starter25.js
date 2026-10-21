import {nameKey}from'./catalogue.js';
import {STARTER25_DATA}from'./starter25-data.js';
export function resolveStarter25Decks(registry,data=STARTER25_DATA){
 if(data.schemaVersion!==1||data.product!=='DM26-SD1'||data.decks?.length!==25)throw Error('25の王道のデッキ一覧が正しくありません');
 const numbers=new Set();return data.decks.map(list=>{
  if(!Number.isInteger(list.number)||list.number<1||list.number>25||numbers.has(list.number))throw Error('25の王道の番号が正しくありません');numbers.add(list.number);
  const number=String(list.number).padStart(2,'0'),source='https://dm.takaratomy.co.jp/dm26sd1_decklist/deck'+number+'/';
  if(list.source!==source)throw Error('25の王道の出典が正しくありません');
  const seen=new Set(),cards=list.cards.map(row=>{const c=registry.byName.get(nameKey(row.name));if(!c||c.id!==registry.get(row.id)?.id||seen.has(c.id)||!Number.isSafeInteger(row.count)||row.count<1||row.count>40)throw Error('25の王道のカード構成が正しくありません：'+row.name);seen.add(c.id);return{id:c.id,count:row.count};});
  // Some official lists deliberately exceed four copies (No.11: ハチ公 x9).
  const deck={id:'starter25-'+number,name:'No.'+number+' '+list.shortName,cards,format:'original',category:'25の王道',description:list.description,product:{code:data.product,title:data.title,number:list.number,officialName:list.name,source,checkedAt:list.checkedAt}};
  const errors=registry.validate(deck);if(errors.length)throw Error(errors.join(' / '));return deck;
 }).sort((a,b)=>a.product.number-b.product.number);
}
export function starter25Matches(deck,query,registry){
 const normalize=s=>nameKey(s).toLowerCase().replace(/\s+/g,''),q=normalize(query);if(!q)return true;
 return [deck.name,deck.product.officialName,deck.description,...deck.cards.map(r=>registry.get(r.id).name)].some(text=>normalize(text).includes(q));
}
