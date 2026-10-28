// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm14-063','dm14-057','dm27-047','dm08-023','dm14-056','dm14-045'];
export const UTILITY129_DECKS=[
 make('utility129-removal','追加カード検証・光闇火の除去とドラゴン',[...added,'dm01-097','dm01-090','dm01-075','dm01-008']),
 make('utility129-defense','追加カード検証・防御呪文とマナ加速',[...added,'dm01-097','dm01-075','dm01-089','dm08-049'])
];
