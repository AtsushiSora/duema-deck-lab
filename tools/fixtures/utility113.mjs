// New-card exercises only; no shipped deck recipe is edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY113_DECKS=[
 make('utility113-mana','追加カード検証・ドラゴン検索とマナ操作',['dmx20-019','dm24rp1-072','dm07-024','dmx22b-107','dm01-008','dmbd16-008','dm01-080','dm06-110','dm06-085','dm01-108']),
 make('utility113-grave','追加カード検証・墓地召喚と手札補充',['dm23rp4-059','dm24ex1-086','dm24rp1-072','dm07-024','dm01-090','dm01-075','dmd08-018','dm01-080','dm06-110','dm06-085'])
];
