// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=["dm19-097","dm07-049","dm02-014","dm19-105","dm05-042","dm12-008"];
export const UTILITY134_DECKS=[
 make('utility134-water','追加カード検証・墓地回収と味方の強化',[...added,'dm01-080','dm06-085','dm01-027','dm01-097']),
 make('utility134-tempo','追加カード検証・マナ加速と文明別の攻撃制限',[...added,'dm01-083','dm01-051','dm01-086','dm01-097'])
];
