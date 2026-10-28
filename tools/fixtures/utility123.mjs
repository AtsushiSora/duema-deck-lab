// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm20-040','dm02-010','dm02-011','dm38-055','dm06-060','dm14-110'];
export const UTILITY123_DECKS=[
 make('utility123-resources','追加カード検証・手札補充とドラゴン加速',[...added,'dm01-008','dm01-106','dm06-110','dm06-085']),
 make('utility123-cross','追加カード検証・クロスギアと帰還',[...added,'dm08-045','dm01-106','dm06-110','dm01-108'])
];
