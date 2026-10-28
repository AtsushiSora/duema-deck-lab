// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm11-051','dm15-035','dm04-044','dm03-026','dm11-039','dm06-078'];
export const UTILITY126_DECKS=[
 make('utility126-spells','追加カード検証・呪文による盤面と手札の補助',[...added,'dm02-024','dm01-083','dm01-106','dm01-008']),
 make('utility126-liquid','追加カード検証・リキッド進化とマナ回収',[...added,'dm02-024','dm01-083','dm01-080','dm06-110'])
];
