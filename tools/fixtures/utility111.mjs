// Test fixtures only; the official and character recipes remain unchanged.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY111_DECKS=[
 make('utility111-search','追加カード検証・検索とマナ加速',['dmsd08-007','dmr23-074','dmx22b-163','dmx07-016','dm01-108','dm01-097','dm01-075','dm01-083','dm01-080','dm01-008']),
 make('utility111-deployment','追加カード検証・手札と墓地からの展開',['dmr06-014','dm24ex2-048','dmx07-016','dm25ex1-006','dm25ex1-055','dm01-090','dm16-044','dm01-008','dm01-080','dm06-110'])
];
