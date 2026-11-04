export function normalizeDeckTags(value){
 const rows=Array.isArray(value)?value:typeof value==='string'?value.normalize('NFKC').split(/[,、\n]+/):[];
 return [...new Set(rows.filter(x=>typeof x==='string').map(x=>x.normalize('NFKC').trim().replace(/^#+/,'').slice(0,20)).filter(Boolean))].slice(0,8);
}
export const deckHasTag=(deck,tag)=>!tag||normalizeDeckTags(deck.tags).includes(tag);
