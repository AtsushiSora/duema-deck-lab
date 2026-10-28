// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=["dm12-042","dm19-096","dm02-004","dm03-019","dm07-054","dm12-014"];
export const UTILITY136_DECKS=[
 make('utility136-water','追加カード検証・手札交換とマナの墓地送り',[...added,'dm01-080','dm06-085','dm01-027','dm01-097']),
 make('utility136-tempo','追加カード検証・墓地からのマナ回収と枚数による強化',[...added,'dm01-083','dm01-051','dm01-086','dm01-097'])
];
