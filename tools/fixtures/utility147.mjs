// Effect-test decks only.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm28-054','dm38-010','dm28-079','dm10-083','dm21-025','dm17-033'];
export const UTILITY147_DECKS=[
 make('utility147-hands','追加カード検証・手札とマナ',[...added,'dm01-076','dm01-083','dm01-090','dm01-108']),
 make('utility147-creatures','追加カード検証・小型対策',[...added,'dm01-075','dm01-083','dm01-097','dm01-108'])
];
