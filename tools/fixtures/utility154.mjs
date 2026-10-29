// Effect-test decks only.
const make=(id,name,extra)=>({id,name,format:'original',cards:[...['dm27-025','dm16-038','dm28-066','dm19-059','dm15-034','dm38-040'],...extra].map(id=>({id,count:4}))});
export const UTILITY154_DECKS=[make('utility154-support','追加カード検証・文明とマナ',['dm01-108','dm01-076','dm23ex1-058','dm06-085']),make('utility154-library','追加カード検証・山札とドロー',['dm01-075','dm01-083','dm01-097','dm01-108'])];
