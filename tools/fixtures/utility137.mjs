// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=["dm01-020","dm02-006","dm04-047","dm12-004","dm02-053","dm03-013"];
export const UTILITY137_DECKS=[
 make('utility137-water','追加カード検証・登場時の手札戻しと墓地回収',[...added,'dm01-080','dm06-085','dm01-027','dm01-097']),
 make('utility137-tempo','追加カード検証・最小パワーの破壊と攻撃時のマナ加速',[...added,'dm01-083','dm01-051','dm01-086','dm01-097'])
];
