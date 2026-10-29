// Effect-test decks only; Alchemist observes its one-copy limit.
const make=(id,name,extra)=>({id,name,format:'original',cards:[{id:'dm10-025',count:1},...['dm27-044','dm30-021','dm14-090','dm13-023','dm39-037',...extra].map(id=>({id,count:4})),{id:'dm06-085',count:3}]});
export const UTILITY153_DECKS=[make('utility153-support','追加カード検証・マナと進化',['dm01-076','dm01-083','dm01-108','dm10-017']),make('utility153-recover','追加カード検証・除去と回収',['dm01-075','dm01-083','dm01-097','dm01-108'])];
