// Effect-test decks only.
const added=['dm34-055','dm08-035','dm10-110','dm06-006','dm06-002','dm36-022'];
const make=(id,name,extra)=>({id,name,format:'original',cards:[...added,...extra].map(id=>({id,count:4}))});
export const UTILITY156_DECKS=[make('utility156-spells','追加カード検証・全体強化と呪文',['dm01-076','dm01-083','dm01-108','dm10-017']),make('utility156-defense','追加カード検証・防御とドロー',['dm01-075','dm01-083','dm01-097','dm01-108'])];
