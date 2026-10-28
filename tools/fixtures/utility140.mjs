// Test decks only; existing public deck recipes remain unchanged.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dmrp15-036','dmrp03-086','dmr06-046','dm09-008','dmr01-094','dm06-046'];
export const UTILITY140_DECKS=[
 make('utility140-shields','追加カード検証・シールドとチャージャー',[...added,'dm01-076','dm01-083','dm01-090','dm01-097']),
 make('utility140-control','追加カード検証・ブロッカーと手札調整',[...added,'dm01-076','dm01-080','dm01-108','dm01-097'])
];
