// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm01-017','dm08-002','dm01-067','dm01-007','dm32-098','dm12-025'];
export const UTILITY130_DECKS=[
 make('utility130-recurring','追加カード検証・再利用する水自然と小型除去',[...added,'dm06-110','dm06-085','dm01-027','dm01-097']),
 make('utility130-offense','追加カード検証・アンタップ攻撃と登場時手札破壊',[...added,'dm06-110','dm01-080','dm01-090','dm01-097'])
];
