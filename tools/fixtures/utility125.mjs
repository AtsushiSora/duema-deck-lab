// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm14-086','dm36-046','dm08-009','dm14-091','dmrp15-072','dm08-029'];
export const UTILITY125_DECKS=[
 make('utility125-cross','追加カード検証・クロスギアと手札補充',[...added,'dm08-045','dm01-090','dm06-085','dm01-075']),
 make('utility125-dragon','追加カード検証・ドラゴン回収と守備',[...added,'dm08-045','dm01-080','dm02-011','dm01-075'])
];
