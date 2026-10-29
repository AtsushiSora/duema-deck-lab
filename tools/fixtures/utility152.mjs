// Effect-test decks only.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm24-101','dm04-020','dm34-039','dm22-055','dm14-077','dm25-055'];
export const UTILITY152_DECKS=[
 make('utility152-support','追加カード検証・蘇生と除去',[...added,'dm01-076','dm01-083','dm01-090','dm01-108']),
 make('utility152-mana','追加カード検証・文明強化とマナ',[...added,'dm01-075','dm01-083','dm01-097','dm01-108'])
];
