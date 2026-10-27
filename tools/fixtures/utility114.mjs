// New-card exercises only; no shipped deck recipe is edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY114_DECKS=[
 make('utility114-control','追加カード検証・バウンスと呪文検索',['dm01-018','dmsd01-003','dmr22-065','dm01-008','dm06-085','dm01-080','dm01-075','dm01-083','dm01-086','dm01-097']),
 make('utility114-grave','追加カード検証・墓地召喚とマナ補充',['dm01-010','dmrp04s-088','dm22sd1-005','dm01-090','dmd08-018','dm01-027','dm01-108','dm06-110','dm06-085','dm01-080'])
];
