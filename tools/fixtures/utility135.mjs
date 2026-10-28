// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=["dm03-009","dm12-045","dm03-010","dm07-048","dm10-046","dm10-003"];
export const UTILITY135_DECKS=[
 make('utility135-water','追加カード検証・双方のマナ回収と登場時の墓地回収',[...added,'dm01-080','dm06-085','dm01-027','dm01-097']),
 make('utility135-tempo','追加カード検証・タップ済みマナとシールドによる強化',[...added,'dm01-083','dm01-051','dm01-086','dm01-097'])
];
