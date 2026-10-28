// Effect-test decks only. Drill Squall follows the one-copy restriction.
const make=(id,name,ids)=>({id,name,format:'original',cards:[...ids.map(id=>({id,count:id==='dm16-051'?1:4})),{id:'dm06-085',count:3}]});
const added=['dm05-029','dm16-051','dm06-063','dm07-023','dm25-043','dm11-032'];
export const UTILITY149_DECKS=[
 make('utility149-control','追加カード検証・手札と除去',[...added,'dm01-076','dm01-083','dm01-090','dm01-108']),
 make('utility149-mana','追加カード検証・マナとチャージャー',[...added,'dm01-075','dm01-083','dm01-097','dm01-108'])
];
