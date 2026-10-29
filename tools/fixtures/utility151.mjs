// Effect-test decks only.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm13-041','dm08-011','dm39-039','dm38-013','dm03-008','dm28-069'];
export const UTILITY151_DECKS=[
 make('utility151-support','追加カード検証・進化と除去',[...added,'dm01-076','dm01-083','dm01-090','dm01-108']),
 make('utility151-mana','追加カード検証・ブロック回避とマナ',[...added,'dm01-075','dm01-083','dm01-097','dm01-108'])
];
