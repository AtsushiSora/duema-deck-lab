// Effect-test decks only.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm14-016','dm16-010','dm04-031','dm29-043','dm07-055','dm22-051'];
export const UTILITY144_DECKS=[
 make('utility144-draw','追加カード検証・手札補充',[...added,'dm01-076','dm01-083','dm01-090','dm01-108']),
 make('utility144-control','追加カード検証・文明と除去',[...added,'dm01-075','dm01-083','dm01-097','dm01-108'])
];
