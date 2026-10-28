// Test decks only. Official, character and environment recipes are unchanged.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY119_DECKS=[
 make('utility119-dragon','追加カード検証・ドラゴンとクロスギア',['dm06-031','dm22-052','dm15-008','dm14-074','dm24ex4-084','dm32-045','dm01-008','dmc62-002','dm06-110','dm06-085']),
 make('utility119-evolution','追加カード検証・光の進化とマナ補助',['dm06-031','dm22-052','dm15-008','dm14-074','dm24ex4-084','dm32-045','dm04-001','dm12-021','dm06-110','dm06-085'])
];
