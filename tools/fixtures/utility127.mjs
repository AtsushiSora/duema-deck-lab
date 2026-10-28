// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm33-040','dm33-052','dm33-055','dm33-048','dm09-026','dm14-085'];
export const UTILITY127_DECKS=[
 make('utility127-strong','追加カード検証・ストロングの除去と補充',[...added,'dm01-008','dm02-024','dm01-083','dm01-106']),
 make('utility127-project','追加カード検証・山札の選択と進化',[...added,'dm01-008','dm02-024','dm01-080','dm01-108'])
];
