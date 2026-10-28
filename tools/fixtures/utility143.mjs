// Test decks only; existing public deck recipes remain unchanged.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm28-048','dm11-007','dm14-076','dm33-023','dmr17-040','dmr17-046'];
export const UTILITY143_DECKS=[
 make('utility143-revolution','追加カード検証・革命2と防御',[...added,'dm01-083','dm01-090','dm01-108','dm06-085']),
 make('utility143-blockers','追加カード検証・ブロッカーの反撃',[...added,'dm01-083','dm01-090','dm01-097','dm01-108'])
];
