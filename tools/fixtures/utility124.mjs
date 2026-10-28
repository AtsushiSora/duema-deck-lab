// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm06-058','dm20-042','dm21-040','dm26-001','dm07-041','dm04-014'];
export const UTILITY124_DECKS=[
 make('utility124-control','追加カード検証・水闇の除去と手札補充',[...added,'dm08-045','dm01-090','dm06-085','dm01-083']),
 make('utility124-defense','追加カード検証・守備役と相互帰還',[...added,'dm08-045','dm01-090','dm02-011','dm20-040'])
];
