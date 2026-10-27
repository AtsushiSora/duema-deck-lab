// These two legal decks are only effect-test fixtures.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY110_DECKS=[
 make('utility110-water','追加カード検証・マナ回収と手札補充',['dm21-039','dm09-011','dm08-026','dmd16-006','dm01-075','dm01-083','dm01-080','dm02-024','dm01-008','dm01-108']),
 make('utility110-defence','追加カード検証・破壊と墓地回収',['dmd27-004','dmrp14-018','dmd16-006','dm01-075','dm01-090','dm01-097','dm01-008','dm01-108','dm06-085','dm01-080'])
];
