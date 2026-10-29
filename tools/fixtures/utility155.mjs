// Effect-test decks only: twelve additions at two copies plus sixteen supporting cards.
const added=['dm38-009','dm38-028','dm22-045','dm38-024','dm23-029','dm17-053','dm16-024','dm21-046','dm15-054','dm15-039','dm10-049','dm10-054'];
const make=(id,name,extra)=>({id,name,format:'original',cards:[...added.map(id=>({id,count:2})),...extra.map(id=>({id,count:4}))]});
export const UTILITY155_DECKS=[make('utility155-resource','追加カード検証・山札とギア',['dm01-076','dm01-083','dm23ex1-058','dm06-085']),make('utility155-combat','追加カード検証・登場と離脱',['dm01-075','dm01-083','dm01-097','dm01-108'])];
