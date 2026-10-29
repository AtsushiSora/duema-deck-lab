// Effect-test decks only.
const added=['dm28-094','dm16-034','dm10-016','dm27-039','dm25-047','dm22-013'];
const make=(id,name,extra)=>({id,name,format:'original',cards:[...added,...extra].map(id=>({id,count:4}))});
export const UTILITY157_DECKS=[make('utility157-control','追加カード検証・除去と回収',['dm01-076','dm01-083','dm01-108','dm10-017']),make('utility157-defense','追加カード検証・タップと手札',['dm01-075','dm01-083','dm01-097','dm01-108'])];
