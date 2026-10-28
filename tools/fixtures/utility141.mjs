// Test decks only; existing public deck recipes remain unchanged.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm25rp2-061','dmrp16-041','dmrp02-049','dmr17-067','dmr21-032','dmrp20-026'];
export const UTILITY141_DECKS=[
 make('utility141-tempo','追加カード検証・手札交換とタップ',[...added,'dm01-076','dm01-083','dm01-097','dm01-108']),
 make('utility141-defense','追加カード検証・シールドと小型除去',[...added,'dm01-004','dm01-076','dm01-097','dm06-085'])
];
