// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm03-002','dm10-079','dm16-013','dm05-011','dm36-078','dm06-016'];
export const UTILITY128_DECKS=[
 make('utility128-aura','追加カード検証・水進化と光闇の攻撃補助',[...added,'dm01-051','dm01-089','dm01-075','dm14-086']),
 make('utility128-recycle','追加カード検証・回収呪文とクロスギア',[...added,'dm01-051','dm01-080','dm01-090','dm14-086'])
];
