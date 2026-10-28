// New-card exercises only; no shipped deck recipe is edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY115_DECKS=[
 make('utility115-control','追加カード検証・展開補助と二段階除去',['dm25-035','dm24-s08','dmd11-012','dm01-080','dm01-008','dm06-110','dm01-108','dm01-090','dm01-083','dm06-085']),
 make('utility115-guard','追加カード検証・軽量防御からの反撃',['dm39-038','dm04-037','dmc40-004','dm25-035','dm01-080','dm01-008','dm06-110','dm01-108','dm01-090','dm06-085'])
];
