// Effect-test decks only.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm09-039','dm10-102','dm36-016','dm07-008','dm03-055','dm27-050'];
export const UTILITY146_DECKS=[
 make('utility146-support','追加カード検証・攻撃と防御',[...added,'dm01-076','dm01-083','dm01-090','dm01-108']),
 make('utility146-control','追加カード検証・5文明と回収',[...added,'dm01-075','dm01-083','dm01-097','dm01-108'])
];
