// Test decks only; no official deck recipes are edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm30-019','dm03-054','dm10-104','dm04-009','dm07-043','dm17-049'];
export const UTILITY132_DECKS=[
 make('utility132-mana','追加カード検証・攻撃時のマナ回収と墓地交換',[...added,'dm06-110','dm01-080','dm01-027','dm01-097']),
 make('utility132-grave','追加カード検証・墓地に置かれた時の効果',[...added,'dm06-110','dm06-085','dm01-097','dm01-051'])
];
