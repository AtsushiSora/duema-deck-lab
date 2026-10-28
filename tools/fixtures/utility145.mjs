// Effect-test decks only. Gyaska follows the one-copy restriction.
const make=(id,name,ids)=>({id,name,format:'original',cards:[...ids.map(id=>({id,count:id==='dm14-055'?1:4})),{id:'dm06-085',count:3}]});
const added=['dm31-028','dm14-055','dm33-046','dm28-003','dm17-041','dm27-048'];
export const UTILITY145_DECKS=[
 make('utility145-resource','追加カード検証・手札と墓地',[...added,'dm01-076','dm01-083','dm01-090','dm01-108']),
 make('utility145-removal','追加カード検証・小型除去',[...added,'dm01-075','dm01-083','dm01-097','dm01-108'])
];
