// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm01-003','dm19-054','dm01-035','dm10-035','dm39-054','dm07-051'];
export const UTILITY131_DECKS=[
 make('utility131-control','追加カード検証・登場時ドローと相手が選ぶ除去',[...added,'dm06-110','dm01-080','dm01-027','dm01-097']),
 make('utility131-mana','追加カード検証・マナへ移る防御と攻撃されない小型',[...added,'dm06-110','dm01-083','dm01-090','dm06-085'])
];
