// Effect-test decks only.
const added=['dm37-028','dm14-093','dm07-047','dm13-044','dm14-101','dm06-008'];
const make=(id,name,extra)=>({id,name,format:'original',cards:[...added,...extra].map(id=>({id,count:4}))});
export const UTILITY158_DECKS=[make('utility158-control','追加カード検証・防御と反撃',['dm01-076','dm01-083','dm01-097','dm01-090']),make('utility158-attack','追加カード検証・速攻と除去',['dm01-075','dm01-097','dm01-108','dm01-090'])];
