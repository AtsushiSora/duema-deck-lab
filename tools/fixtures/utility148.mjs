// Effect-test decks only.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm14-029','dm10-s05','dm12-044','dm33-013','dm10-042','dm16-045'];
export const UTILITY148_DECKS=[
 make('utility148-dragon','追加カード検証・ドラゴンと墓地',[...added,'dm01-076','dm01-083','dm01-090','dm01-108']),
 make('utility148-defense','追加カード検証・シールドと手札',[...added,'dm01-075','dm01-083','dm01-097','dm01-108'])
];
