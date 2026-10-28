// Test decks only; official and character deck recipes remain unchanged.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dmc40-005','promoy5-013','dmc27-055','dm36-040','dmr16s-021','dm08-045'];
export const UTILITY121_DECKS=[
 make('utility121-grave','追加カード検証・手札と墓地の活用',[...added,'dm01-090','dm01-108','dm06-110','dm01-075']),
 make('utility121-mana','追加カード検証・マナ除去とシールド補充',[...added,'dm24ex4-084','dm32-045','dm01-106','dm06-110'])
];
