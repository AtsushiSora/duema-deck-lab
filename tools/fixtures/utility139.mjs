// Test decks only; official and existing user deck recipes are unchanged.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dmr19-078','dmrp01-072','dmrp06-072'];
export const UTILITY139_DECKS=[
 make('utility139-control','追加カード検証・ドローとSトリガー',[...added,'dm01-083','dm01-086','dm01-097','dm01-108','dm01-106','dm01-110','dm06-085']),
 make('utility139-tempo','追加カード検証・小型除去',[...added,'dm01-083','dm01-080','dm01-097','dm01-098','dm01-101','dm01-104','dm01-108'])
];
