// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm01-019','dm06-019','dm31-041','dm12-043','dm15-042','dm12-027'];
export const UTILITY133_DECKS=[
 make('utility133-water','追加カード検証・味方数と水の登場時効果',[...added,'dm01-080','dm06-085','dm01-027','dm01-097']),
 make('utility133-tempo','追加カード検証・小型の再利用とマナ回収',[...added,'dm01-083','dm01-051','dm01-086','dm01-097'])
];
